import React, { useCallback } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExploreHub } from '@/hooks/useExploreHub';
import { Avatar, HubEmptyState, HubErrorState, HubLoadingState, hubStyles } from '@/components/explore/hub-ui';
import { formatRelativeTime } from '@/components/explore/formatters';
import { MessageThread } from '@/types/exploreHub';

export default function MessagesScreen() {
  const router = useRouter();
  const { status, error, messages, load, markThreadAsRead } = useExploreHub();

  const renderItem = useCallback(
    ({ item }: { item: MessageThread }) => (
      <TouchableOpacity style={hubStyles.card} onPress={() => markThreadAsRead(item.id)} activeOpacity={0.9}>
        <Avatar name={item.user.fullName} uri={item.user.avatarUrl} />
        <View style={{ flex: 1 }}>
          <Text style={hubStyles.title}>{item.user.fullName}</Text>
          <Text style={hubStyles.subtitle} numberOfLines={1}>
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
    [markThreadAsRead]
  );

  return (
    <View style={hubStyles.screen}>
      <View style={{ paddingTop: 62, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>Mesajlar</Text>
      </View>

      {status === 'loading' && messages.length === 0 ? (
        <HubLoadingState />
      ) : status === 'error' ? (
        <HubErrorState message={error ?? 'Bilinmeyen hata'} onRetry={load} />
      ) : messages.length === 0 ? (
        <HubEmptyState title="Henüz mesaj yok" subtitle="Yeni eşleşmelerin burada görünecek." />
      ) : (
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={hubStyles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          refreshControl={<RefreshControl tintColor="#FF5A5F" refreshing={status === 'loading'} onRefresh={load} />}
        />
      )}
    </View>
  );
}
