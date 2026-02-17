import React, { useMemo } from 'react';
import { RefreshControl, SectionList, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExploreHub } from '@/hooks/useExploreHub';
import { Avatar, HubEmptyState, HubErrorState, HubLoadingState, hubStyles } from '@/components/explore/hub-ui';
import { formatRelativeTime } from '@/components/explore/formatters';
import { NotificationItem } from '@/types/exploreHub';

function getSectionTitle(createdAt: string) {
  const now = new Date();
  const date = new Date(createdAt);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays <= 0) return 'Bugün';
  if (diffDays <= 7) return 'Bu Hafta';
  return 'Daha Önce';
}

const priorityOrder = { high: 0, medium: 1, low: 2 };

export default function NotificationsScreen() {
  const router = useRouter();
  const { status, error, notifications, load, markNotificationAsRead } = useExploreHub();

  const sections = useMemo(() => {
    const grouped: Record<string, NotificationItem[]> = {
      'Bugün': [],
      'Bu Hafta': [],
      'Daha Önce': [],
    };

    notifications
      .slice()
      .sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      })
      .forEach((item) => {
        grouped[getSectionTitle(item.createdAt)].push(item);
      });

    return Object.entries(grouped)
      .filter(([, data]) => data.length > 0)
      .map(([title, data]) => ({ title, data }));
  }, [notifications]);

  return (
    <View style={hubStyles.screen}>
      <View style={{ paddingTop: 62, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>Bildirimler</Text>
      </View>

      {status === 'loading' && sections.length === 0 ? (
        <HubLoadingState />
      ) : status === 'error' ? (
        <HubErrorState message={error ?? 'Bilinmeyen hata'} onRetry={load} />
      ) : sections.length === 0 ? (
        <HubEmptyState title="Temiz görünüyorsun" subtitle="Yeni bildirim geldiğinde burada göreceksin." />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={{ color: '#9ca3af', fontWeight: '700', fontSize: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 }}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[hubStyles.card, { marginHorizontal: 16 }, !item.isRead && { borderColor: 'rgba(255,90,95,0.45)', backgroundColor: '#161010' }]}
              onPress={() => markNotificationAsRead(item.id)}
              activeOpacity={0.9}>
              <Avatar name={item.user.fullName} uri={item.user.avatarUrl} size={46} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={hubStyles.title}>{item.user.fullName}</Text>
                  {item.priority === 'high' && <Ionicons name="flash" size={13} color="#f97316" />}
                </View>
                <Text style={hubStyles.subtitle}>{item.message}</Text>
                {!!item.actionLabel && <Text style={[hubStyles.subtitle, { color: '#fda4af', marginTop: 3 }]}>{item.actionLabel}</Text>}
              </View>
              <View style={hubStyles.trailing}>
                <Text style={hubStyles.subtitle}>{formatRelativeTime(item.createdAt)}</Text>
                {!item.isRead && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5A5F', marginTop: 8 }} />}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={8}
          removeClippedSubviews
          refreshControl={<RefreshControl tintColor="#FF5A5F" refreshing={status === 'loading'} onRefresh={() => load(true)} />}
        />
      )}
    </View>
  );
}
