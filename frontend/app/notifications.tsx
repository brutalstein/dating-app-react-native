import React, { useCallback } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExploreHub } from '@/hooks/useExploreHub';
import { Avatar, HubEmptyState, HubErrorState, HubLoadingState, hubStyles } from '@/components/explore/hub-ui';
import { formatRelativeTime } from '@/components/explore/formatters';
import { NotificationItem } from '@/types/exploreHub';

export default function NotificationsScreen() {
  const router = useRouter();
  const { status, error, notifications, load, markNotificationAsRead } = useExploreHub();

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => (
      <TouchableOpacity
        style={[hubStyles.card, !item.isRead && { borderColor: 'rgba(255,90,95,0.45)', backgroundColor: '#161010' }]}
        onPress={() => markNotificationAsRead(item.id)}
        activeOpacity={0.9}>
        <Avatar name={item.user.fullName} uri={item.user.avatarUrl} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={hubStyles.title}>{item.user.fullName}</Text>
          <Text style={hubStyles.subtitle}>{item.message}</Text>
        </View>
        <View style={hubStyles.trailing}>
          <Text style={hubStyles.subtitle}>{formatRelativeTime(item.createdAt)}</Text>
          {!item.isRead && (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5A5F', marginTop: 8 }} />
          )}
        </View>
      </TouchableOpacity>
    ),
    [markNotificationAsRead]
  );

  return (
    <View style={hubStyles.screen}>
      <View style={{ paddingTop: 62, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>Bildirimler</Text>
      </View>

      {status === 'loading' && notifications.length === 0 ? (
        <HubLoadingState />
      ) : status === 'error' ? (
        <HubErrorState message={error ?? 'Bilinmeyen hata'} onRetry={load} />
      ) : notifications.length === 0 ? (
        <HubEmptyState title="Temiz görünüyorsun" subtitle="Yeni bildirim geldiğinde burada göreceksin." />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={hubStyles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={8}
          removeClippedSubviews
          refreshControl={<RefreshControl tintColor="#FF5A5F" refreshing={status === 'loading'} onRefresh={load} />}
        />
      )}
    </View>
  );
}
