import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExploreHub } from '@/hooks/useExploreHub';
import { Avatar, HubEmptyState, HubErrorState, HubLoadingState, hubStyles } from '@/components/explore/hub-ui';
import { formatRelativeTime } from '@/components/explore/formatters';
import { ActivityItem } from '@/types/exploreHub';
import { proactiveService } from '@/services/proactiveService';

type ActivityFilter = 'all' | 'highIntent' | 'system';

const activityIconMap: Record<ActivityItem['type'], keyof typeof Ionicons.glyphMap> = {
  profile_view: 'eye-outline',
  super_like: 'star-outline',
  new_match: 'heart-outline',
  reaction: 'happy-outline',
  boost: 'flash-outline',
  recommendation: 'sparkles-outline',
  system: 'shield-checkmark-outline',
};

export default function ActivityScreen() {
  const router = useRouter();
  const { status, error, activities, load, refresh, isRefreshing, authReady, authenticated } = useExploreHub();
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    if (filter === 'system') return activities.filter((item) => Boolean(item.isSystem));
    return activities.filter((item) => (item.score ?? 0) >= 80);
  }, [activities, filter]);

  const handleRecommendationAction = useCallback(
    async (item: ActivityItem, action: 'LIKE' | 'PASS') => {
      if (!item.referenceId) return;
      try {
        await proactiveService.actionRecommendation(item.referenceId, action);
        await refresh();
      } catch (error: any) {
        Alert.alert('İşlem başarısız', error?.message || 'Öneri aksiyonu kaydedilemedi.');
      }
    },
    [refresh]
  );

  const renderItem = useCallback(
    ({ item }: { item: ActivityItem }) => (
      <View style={hubStyles.card}>
        <Avatar name={item.actor.fullName} uri={item.actor.avatarUrl} size={48} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={hubStyles.title}>{item.actor.fullName}</Text>
            <Ionicons name={activityIconMap[item.type]} size={14} color={item.isSystem ? '#60a5fa' : '#FF5A5F'} />
            {item.isSystem && (
              <View style={{ borderRadius: 999, backgroundColor: 'rgba(59,130,246,0.16)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)', paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: '#bfdbfe', fontSize: 10, fontWeight: '700' }}>SİSTEM</Text>
              </View>
            )}
          </View>
          <Text style={hubStyles.subtitle}>{item.summary}</Text>
          {item.reason ? <Text style={[hubStyles.subtitle, { marginTop: 4, color: '#d1d5db' }]}>{item.reason}</Text> : null}
          {item.explainability && item.explainability.length > 0 ? (
            <View style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 8, gap: 6 }}>
              <Text style={{ color: '#f3f4f6', fontSize: 11, fontWeight: '700' }}>Neden önerildi?</Text>
              {item.explainability.slice(0, 3).map((entry) => (
                <View key={entry.key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ color: '#d1d5db', fontSize: 11, flex: 1 }}>{entry.label}: {entry.detail}</Text>
                  <Text style={{ color: '#fda4af', fontSize: 11, fontWeight: '700' }}>{entry.score}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            {item.type === 'recommendation' && item.referenceId ? (
              <>
                <TouchableOpacity
                  onPress={() => handleRecommendationAction(item, 'LIKE')}
                  style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(34,197,94,0.2)' }}>
                  <Text style={{ color: '#86efac', fontWeight: '700', fontSize: 11 }}>Beğen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRecommendationAction(item, 'PASS')}
                  style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.12)' }}>
                  <Text style={{ color: '#e5e7eb', fontWeight: '700', fontSize: 11 }}>Geç</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(255,90,95,0.2)' }}>
                <Text style={{ color: '#fda4af', fontWeight: '700', fontSize: 11 }}>Yanıt Ver</Text>
              </TouchableOpacity>
            )}
            <Text style={hubStyles.subtitle}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
        </View>
        <View style={hubStyles.trailing}>
          {typeof item.score === 'number' && (
            <View style={[hubStyles.chip, { marginTop: 6 }]}>
              <Text style={hubStyles.chipText}>Skor {item.score}</Text>
            </View>
          )}
        </View>
      </View>
    ),
    [handleRecommendationAction]
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
          { key: 'system', label: 'Sistem' },
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

      {!authReady ? (
        <HubLoadingState />
      ) : !authenticated ? (
        <HubEmptyState title="Giriş yapman gerekiyor" subtitle="Aktivitelerini görmek için hesabına giriş yap." />
      ) : status === 'loading' && filteredActivities.length === 0 ? (
        <HubLoadingState />
      ) : status === 'error' ? (
        <HubErrorState message={error ?? 'Bilinmeyen hata'} onRetry={() => load(true)} />
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
          refreshControl={<RefreshControl tintColor="#FF5A5F" refreshing={isRefreshing} onRefresh={refresh} />}
        />
      )}
    </View>
  );
}
