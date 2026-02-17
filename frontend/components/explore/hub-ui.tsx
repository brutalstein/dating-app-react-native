import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BLOOM = '#FF5A5F';

export function Avatar({ name, uri, size = 52 }: { name: string; uri?: string; size?: number }) {
  if (!uri) {
    return (
      <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
}

export function HubEmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name="sparkles-outline" size={32} color={BLOOM} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

export function HubErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name="alert-circle-outline" size={32} color="#f87171" />
      <Text style={styles.emptyTitle}>Bir şeyler ters gitti</Text>
      <Text style={styles.emptySubtitle}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Tekrar Dene</Text>
      </TouchableOpacity>
    </View>
  );
}

export function HubLoadingState() {
  return (
    <View style={styles.centerState}>
      <Ionicons name="refresh" size={28} color={BLOOM} />
      <Text style={styles.emptySubtitle}>Yükleniyor...</Text>
    </View>
  );
}

export const hubStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 },
  card: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    borderRadius: 18,
    marginBottom: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  subtitle: { color: '#9ca3af', fontSize: 13, marginTop: 4 },
  trailing: { marginLeft: 'auto', alignItems: 'flex-end' },
  chip: {
    backgroundColor: 'rgba(255,90,95,0.18)',
    borderColor: 'rgba(255,90,95,0.3)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  chipText: { color: BLOOM, fontSize: 12, fontWeight: '700' },
});

const styles = StyleSheet.create({
  avatarFallback: { backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 8 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
  retryButton: {
    marginTop: 10,
    backgroundColor: BLOOM,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
