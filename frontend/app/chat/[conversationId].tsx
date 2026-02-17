import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';
import { chatService } from '@/services/chatService';
import { ackDelivered, connectRealtime, sendRealtimeMessage, sendTypingEvent } from '@/services/realtimeService';
import { ChatMessage } from '@/types/chat';

const statusLabel: Record<ChatMessage['status'], string> = {
  sending: '⏳ gönderiliyor',
  sent: '✓ gönderildi',
  delivered: '✓✓ iletildi',
  read: '✓✓ görüldü',
  failed: '⚠ gönderilemedi',
};

export default function ChatScreen() {
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = String(params.conversationId || '');
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [myEmail, setMyEmail] = useState('');
  const [typing, setTyping] = useState(false);
  const typingTimeout = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        try {
          const payload = token.split('.')[1];
          const decoded = typeof atob !== 'undefined'
            ? atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
            : Buffer.from(payload, 'base64').toString('utf8');
          setMyEmail(JSON.parse(decoded).sub || '');
        } catch {
          setMyEmail('');
        }
      }

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
      await chatService.markRead(conversationId);
    })();
  }, [conversationId]);

  useEffect(() => {
    connectRealtime({
      onEvent: (eventType: string, payload: any) => {
        if (eventType === 'MESSAGE_RECEIVED' && payload.conversationId === conversationId) {
          setMessages((prev) => [...prev, {
            id: payload.id,
            clientMessageId: payload.clientMessageId,
            conversationId: payload.conversationId,
            senderId: payload.senderId,
            senderEmail: payload.senderEmail,
            content: payload.content,
            createdAt: payload.createdAt,
            deliveredAt: payload.deliveredAt,
            readAt: payload.readAt,
            status: 'delivered',
          }]);
          ackDelivered(conversationId, payload.id);
        }

        if (eventType === 'MESSAGE_SENT' && payload.conversationId === conversationId) {
          setMessages((prev) => prev.map((m) => (
            m.clientMessageId === payload.clientMessageId
              ? { ...m, id: payload.id, status: 'sent', createdAt: payload.createdAt }
              : m
          )));
        }

        if (eventType === 'MESSAGE_DELIVERED' && payload.conversationId === conversationId) {
          setMessages((prev) => prev.map((m) => (m.id === payload.id ? { ...m, deliveredAt: payload.deliveredAt, status: 'delivered' } : m)));
        }

        if (eventType === 'MESSAGES_READ') {
          const ids = Array.isArray(payload) ? payload : [];
          setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, status: 'read', readAt: new Date().toISOString() } : m)));
        }

        if (eventType === 'TYPING' && payload.conversationId === conversationId) {
          setTyping(Boolean(payload.typing));
        }
      },
    });
  }, [conversationId]);

  const onType = (v: string) => {
    setText(v);
    sendTypingEvent(conversationId, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTypingEvent(conversationId, false), 1200);
  };

  const send = () => {
    const content = text.trim();
    if (!content) return;
    const clientMessageId = `${Date.now()}-${Math.random()}`;

    setMessages((prev) => [...prev, {
      id: clientMessageId,
      clientMessageId,
      conversationId,
      senderId: myEmail,
      senderEmail: myEmail,
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
    }]);

    setText('');

    try {
      sendRealtimeMessage(conversationId, content, clientMessageId);
    } catch {
      setMessages((prev) => prev.map((m) => (m.clientMessageId === clientMessageId ? { ...m, status: 'failed' } : m)));
      return;
    }

    setTimeout(() => {
      setMessages((prev) => prev.map((m) => (
        m.clientMessageId === clientMessageId && m.status === 'sending'
          ? { ...m, status: 'failed' }
          : m
      )));
    }, 5000);
  };

  const retry = (m: ChatMessage) => {
    if (m.status !== 'failed') return;
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: 'sending' } : x)));
    try {
      sendRealtimeMessage(conversationId, m.content, m.clientMessageId || `${Date.now()}`);
    } catch {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: 'failed' } : x)));
    }
  };

  const sorted = useMemo(() => messages.slice().sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)), [messages]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: 56 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: '#fff' }}>Geri</Text></TouchableOpacity>
        <Text style={{ color: '#fff', marginLeft: 12, fontWeight: '700' }}>Sohbet</Text>
      </View>

      {typing ? <Text style={{ color: '#9ca3af', marginLeft: 16, marginBottom: 6 }}>yazıyor...</Text> : null}

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        renderItem={({ item }) => {
          const mine = !!myEmail && item.senderEmail === myEmail;
          return (
            <TouchableOpacity disabled={item.status !== 'failed'} onPress={() => retry(item)} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: mine ? '#1d4ed8' : '#1f2937', borderRadius: 14, padding: 10 }}>
              <Text style={{ color: '#fff' }}>{item.content}</Text>
              <Text style={{ color: '#cbd5e1', fontSize: 11, marginTop: 4 }}>{statusLabel[item.status]}</Text>
              {item.status === 'failed' ? <Text style={{ color: '#fca5a5', fontSize: 11 }}>Tekrar denemek için dokun</Text> : null}
            </TouchableOpacity>
          );
        }}
      />

      <View style={{ flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#111' }}>
        <TextInput value={text} onChangeText={onType} placeholder="Mesaj" placeholderTextColor="#6b7280" style={{ flex: 1, color: '#fff', backgroundColor: '#111', borderRadius: 12, paddingHorizontal: 12 }} />
        <TouchableOpacity onPress={send} style={{ marginLeft: 8, backgroundColor: '#FF5A5F', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
