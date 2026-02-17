import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExploreHub } from '@/hooks/useExploreHub';
import { Avatar, HubEmptyState, HubErrorState, HubLoadingState, hubStyles } from '@/components/explore/hub-ui';
import { formatRelativeTime } from '@/components/explore/formatters';
import { ActivityItem } from '@/types/exploreHub';

type ActivityFilter = 'all' | 'highIntent';

export default function ActivityScreen() {
  const router = useRouter();
  const { status, error, activities, load } = useExploreHub();
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    return activities.filter((item) => (item.score ?? 0) >= 80);
  }, [activities, filter]);

  const renderItem = useCallback(
    ({ item }: { item: ActivityItem }) => (
      <View style={hubStyles.card}>
        <Avatar name={item.actor.fullName} uri={item.actor.avatarUrl} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={hubStyles.title}>{item.actor.fullName}</Text>
          <Text style={hubStyles.subtitle}>{item.summary}</Text>
        </View>
        <View style={hubStyles.trailing}>
          <Text style={hubStyles.subtitle}>{formatRelativeTime(item.createdAt)}</Text>
          {typeof item.score === 'number' && (
            <View style={[hubStyles.chip, { marginTop: 6 }]}>
              <Text style={hubStyles.chipText}>Skor {item.score}</Text>
            </View>
          )}
        </View>
      </View>
    ),
    []
  );

  return (
    <View style={hubStyles.screen}>
      <View style={{ paddingTop: 62, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>Aktivite</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
        {([
          { key: 'all', label: 'Tümü' },
          { key: 'highIntent', label: 'Yüksek Niyet' },
        ] as { key: ActivityFilter; label: string }[]).map((item) => (
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

      {status === 'loading' && filteredActivities.length === 0 ? (
        <HubLoadingState />
      ) : status === 'error' ? (
        <HubErrorState message={error ?? 'Bilinmeyen hata'} onRetry={load} />
      ) : filteredActivities.length === 0 ? (
        <HubEmptyState title="Aktivite yok" subtitle="Etkileşim aldığında burada listelenecek." />
      ) : (
        <FlatList
          data={filteredActivities}
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
