import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExploreHub } from '@/hooks/useExploreHub';
import { Avatar, HubEmptyState, HubErrorState, HubLoadingState, hubStyles } from '@/components/explore/hub-ui';
import { formatRelativeTime } from '@/components/explore/formatters';
import { MessageThread } from '@/types/exploreHub';

type MessageFilter = 'all' | 'unread';

export default function MessagesScreen() {
  const router = useRouter();
  const { status, error, messages, load, refresh, isRefreshing, markThreadAsRead } = useExploreHub();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MessageFilter>('all');

  const filteredMessages = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return messages
      .filter((item) => (filter === 'unread' ? item.unreadCount > 0 : true))
      .filter((item) => {
        if (!normalized) return true;
        return (
          item.user.fullName.toLowerCase().includes(normalized) ||
          item.lastMessage.toLowerCase().includes(normalized)
        );
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt);
      });
  }, [messages, query, filter]);

  const renderItem = useCallback(
    ({ item }: { item: MessageThread }) => (
      <TouchableOpacity style={hubStyles.card} onPress={() => { markThreadAsRead(item.id); router.push(`/chat/${item.id}` as any); }} activeOpacity={0.9}>
        <View>
          <Avatar name={item.user.fullName} uri={item.user.avatarUrl} />
          {item.isOnline && (
            <View
              style={{
                position: 'absolute',
                right: 2,
                bottom: 2,
                width: 11,
                height: 11,
                borderRadius: 6,
                backgroundColor: '#22c55e',
                borderWidth: 2,
                borderColor: '#111',
              }}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={hubStyles.title}>{item.user.fullName}</Text>
            {item.isPinned && <Ionicons name="bookmark" size={13} color="#FF5A5F" />}
          </View>
          <Text style={[hubStyles.subtitle, { fontSize: 11 }]}>{item.isOnline ? 'online' : item.lastSeenAt ? `son görülme ${formatRelativeTime(item.lastSeenAt)}` : 'offline'}</Text>
          <Text
            style={[hubStyles.subtitle, { color: item.unreadCount > 0 ? '#d1d5db' : '#9ca3af' }]}
            numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>
        <View style={hubStyles.trailing}>
          <Text style={hubStyles.subtitle}>{formatRelativeTime(item.lastMessageAt)}</Text>
          {item.unreadCount > 0 && (
            <View style={[hubStyles.chip, { marginTop: 6 }]}>
              <Text style={hubStyles.chipText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
    [markThreadAsRead, router]
  );

  return (
    <View style={hubStyles.screen}>
      <View style={{ paddingTop: 62, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>Mesajlar</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#252525',
            backgroundColor: '#101010',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
          }}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Sohbetlerde ara"
            placeholderTextColor="#6b7280"
            style={{ color: '#fff', paddingVertical: 10, marginLeft: 8, flex: 1 }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {([
            { key: 'all', label: 'Tümü' },
            { key: 'unread', label: 'Okunmamış' },
          ] as { key: MessageFilter; label: string }[]).map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: filter === item.key ? 'rgba(255,90,95,0.45)' : '#2a2a2a',
                paddingHorizontal: 14,
                paddingVertical: 7,
                backgroundColor: filter === item.key ? 'rgba(255,90,95,0.18)' : '#111',
              }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {status === 'loading' && filteredMessages.length === 0 ? (
        <HubLoadingState />
      ) : status === 'error' ? (
        <HubErrorState message={error ?? 'Bilinmeyen hata'} onRetry={() => load(true)} />
      ) : filteredMessages.length === 0 ? (
        <HubEmptyState title="Henüz mesaj yok" subtitle="Yeni eşleşmelerin burada görünecek." />
      ) : (
        <FlatList
          data={filteredMessages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={hubStyles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          refreshControl={<RefreshControl tintColor="#FF5A5F" refreshing={isRefreshing} onRefresh={refresh} />}
        />
      )}
    </View>
  );
}
