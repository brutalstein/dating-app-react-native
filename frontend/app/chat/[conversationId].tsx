import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatService } from '@/services/chatService';
import { ackDelivered, connectRealtime, sendRealtimeMessage, sendTypingEvent } from '@/services/realtimeService';
import { enqueueMessage, flushQueue, getQueueSnapshot, initOfflineQueue, markSent } from '@/services/chatOfflineQueue';
import { ChatMessage } from '@/types/chat';

const statusMeta: Record<ChatMessage['status'], { label: string; color: string }> = {
  sending: { label: 'Gönderiliyor…', color: '#fbbf24' },
  queued: { label: 'Kuyrukta (offline)', color: '#f59e0b' },
  sent: { label: 'Gönderildi ✓', color: '#cbd5e1' },
  delivered: { label: 'İletildi ✓✓', color: '#93c5fd' },
  read: { label: 'Görüldü ✓✓', color: '#34d399' },
  failed: { label: 'Gönderilemedi', color: '#fca5a5' },
};

export default function ChatScreen() {
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = String(params.conversationId || '');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [myEmail, setMyEmail] = useState('');
  const [typing, setTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const typingTimeout = useRef<any>(null);

  const syncStatusesWithQueue = () => {
    const queue = getQueueSnapshot();
    if (!queue.length) return;

    setMessages((prev) =>
      prev.map((message) => {
        const key = message.clientMessageId || message.id;
        const queued = queue.find((item) => item.clientMessageId === key || item.id === key);
        if (!queued) return message;
        if (queued.status === 'failed') return { ...message, status: 'failed' };
        if (queued.status === 'sending') return { ...message, status: 'sending' };
        return { ...message, status: 'queued' };
      })
    );
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(nextOnline);
      if (nextOnline) {
        flushQueue();
      }
      syncStatusesWithQueue();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        try {
          const payload = token.split('.')[1];
          const decoded =
            typeof atob !== 'undefined'
              ? atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
              : Buffer.from(payload, 'base64').toString('utf8');
          setMyEmail(JSON.parse(decoded).sub || '');
        } catch {
          setMyEmail('');
        }
      }

      await initOfflineQueue();
      const list = await chatService.getMessages(conversationId);
      setMessages(
        list.map((m: any) => ({
          id: m.id,
          clientMessageId: m.clientMessageId,
          conversationId: m.conversationId,
          senderId: m.senderId,
          senderEmail: m.senderEmail,
          content: m.content,
          createdAt: m.createdAt,
          deliveredAt: m.deliveredAt,
          readAt: m.readAt,
          status: m.readAt ? 'read' : m.deliveredAt ? 'delivered' : 'sent',
        }))
      );
      syncStatusesWithQueue();
      await chatService.markRead(conversationId);
    })();
  }, [conversationId]);

  useEffect(() => {
    connectRealtime({
      onConnected: () => {
        flushQueue();
        syncStatusesWithQueue();
      },
      onEvent: (eventType: string, payload: any) => {
        if (eventType === 'MESSAGE_RECEIVED' && payload.conversationId === conversationId) {
          setMessages((prev) => [
            ...prev,
            {
              id: payload.id,
              clientMessageId: payload.clientMessageId,
              conversationId: payload.conversationId,
              senderId: payload.senderId,
              senderEmail: payload.senderEmail,
              content: payload.content,
              createdAt: payload.createdAt,
              deliveredAt: payload.deliveredAt,
              readAt: payload.readAt,
              status: payload.readAt ? 'read' : payload.deliveredAt ? 'delivered' : 'sent',
            },
          ]);
          ackDelivered(conversationId, payload.id);
        }

        if (eventType === 'MESSAGE_SENT' && payload.conversationId === conversationId) {
          markSent(payload.clientMessageId);
          setMessages((prev) =>
            prev.map((m) =>
              m.clientMessageId === payload.clientMessageId
                ? { ...m, id: payload.id, status: 'sent', createdAt: payload.createdAt }
                : m
            )
          );
          setIsSending(false);
        }

        if (eventType === 'MESSAGE_DELIVERED' && payload.conversationId === conversationId) {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.id ? { ...m, deliveredAt: payload.deliveredAt, status: 'delivered' } : m))
          );
        }

        if (eventType === 'MESSAGES_READ') {
          const ids = Array.isArray(payload) ? payload : [];
          setMessages((prev) =>
            prev.map((m) => (ids.includes(m.id) ? { ...m, status: 'read', readAt: new Date().toISOString() } : m))
          );
        }

        if (eventType === 'TYPING' && payload.conversationId === conversationId) {
          setTyping(Boolean(payload.typing));
        }
      },
    });
  }, [conversationId]);

  useEffect(() => {
    const interval = setInterval(syncStatusesWithQueue, 1500);
    return () => clearInterval(interval);
  }, []);

  const onType = (v: string) => {
    setText(v);
    sendTypingEvent(conversationId, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTypingEvent(conversationId, false), 1200);
  };

  const send = async () => {
    const content = text.trim();
    if (!content || isSending) return;

    setIsSending(true);
    const clientMessageId = `${Date.now()}-${Math.random()}`;

    const state = await NetInfo.fetch();
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);

    setMessages((prev) => [
      ...prev,
      {
        id: clientMessageId,
        clientMessageId,
        conversationId,
        senderId: myEmail,
        senderEmail: myEmail,
        content,
        createdAt: new Date().toISOString(),
        status: online ? 'sending' : 'queued',
      },
    ]);

    setText('');

    if (!online) {
      await enqueueMessage({ id: clientMessageId, conversationId, content, clientMessageId });
      syncStatusesWithQueue();
      setIsSending(false);
      return;
    }

    try {
      sendRealtimeMessage(conversationId, content, clientMessageId);
    } catch {
      await enqueueMessage({ id: clientMessageId, conversationId, content, clientMessageId });
      setMessages((prev) => prev.map((m) => (m.clientMessageId === clientMessageId ? { ...m, status: 'queued' } : m)));
      setIsSending(false);
      return;
    }

    setTimeout(async () => {
      let shouldQueue = false;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.clientMessageId === clientMessageId && m.status === 'sending') {
            shouldQueue = true;
            return { ...m, status: 'queued' };
          }
          return m;
        })
      );

      if (shouldQueue) {
        await enqueueMessage({ id: clientMessageId, conversationId, content, clientMessageId });
        syncStatusesWithQueue();
      }
      setIsSending(false);
    }, 5000);
  };

  const retry = async (m: ChatMessage) => {
    if (m.status !== 'failed' && m.status !== 'queued') return;
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: 'queued' } : x)));
    await enqueueMessage({
      id: m.clientMessageId || m.id,
      conversationId,
      content: m.content,
      clientMessageId: m.clientMessageId || `${Date.now()}`,
    });
    await flushQueue();
    syncStatusesWithQueue();
  };

  const sorted = useMemo(
    () => messages.slice().sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [messages]
  );

  const canSend = text.trim().length > 0 && !isSending;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ paddingTop: insets.top + 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#fff' }}>Geri</Text>
          </TouchableOpacity>
          <Text style={{ color: '#fff', marginLeft: 12, fontWeight: '700' }}>Sohbet</Text>
        </View>
      </View>

      {!isOnline ? (
        <View
          style={{
            marginHorizontal: 12,
            marginBottom: 6,
            backgroundColor: 'rgba(245, 158, 11, 0.2)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.6)',
            borderRadius: 10,
            padding: 8,
          }}>
          <Text style={{ color: '#fbbf24', fontSize: 12 }}>
            Çevrimdışısın. Mesajlar kuyruğa alınır ve bağlantı gelince otomatik gönderilir.
          </Text>
        </View>
      ) : null}

      {typing ? <Text style={{ color: '#9ca3af', marginLeft: 16, marginBottom: 6 }}>yazıyor...</Text> : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 6 : 0}>
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 20 }}
          renderItem={({ item }) => {
            const mine = !!myEmail && item.senderEmail === myEmail;
            const meta = statusMeta[item.status];

            return (
              <TouchableOpacity
                disabled={!mine || (item.status !== 'failed' && item.status !== 'queued')}
                onPress={() => retry(item)}
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  backgroundColor: mine ? '#1d4ed8' : '#1f2937',
                  borderRadius: 14,
                  padding: 10,
                }}>
                <Text style={{ color: '#fff' }}>{item.content}</Text>
                {mine ? <Text style={{ color: meta.color, fontSize: 11, marginTop: 4 }}>{meta.label}</Text> : null}
                {mine && (item.status === 'failed' || item.status === 'queued') ? (
                  <Text style={{ color: '#fca5a5', fontSize: 11 }}>Tekrar denemek için dokun</Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#111',
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            backgroundColor: '#000',
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              borderWidth: 1,
              borderColor: '#222',
              backgroundColor: '#0f0f0f',
              borderRadius: 24,
              paddingLeft: 14,
              paddingRight: 8,
              paddingVertical: 6,
            }}>
            <TextInput
              value={text}
              onChangeText={onType}
              placeholder="Mesaj"
              placeholderTextColor="#6b7280"
              multiline
              maxLength={1000}
              style={{
                flex: 1,
                color: '#fff',
                maxHeight: 120,
                paddingTop: 8,
                paddingBottom: 8,
                paddingRight: 10,
              }}
            />
            <TouchableOpacity
              onPress={send}
              disabled={!canSend}
              activeOpacity={0.9}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: canSend ? '#FF5A5F' : '#2a2a2a',
                opacity: canSend ? 1 : 0.75,
              }}>
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color={canSend ? '#fff' : '#9ca3af'} />
              )}
            </TouchableOpacity>
          </View>
          {!isOnline ? <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 6 }}>Çevrimdışı modda kuyruğa alınır</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
