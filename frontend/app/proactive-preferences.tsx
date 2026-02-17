import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { proactiveService, PreferenceCriterionInput } from '@/services/proactiveService';

const presetCriteria: { key: string; value: string; title: string; mustHave?: boolean; weight?: number }[] = [
  { key: 'preference_alignment', value: 'true', title: 'Tercih uyumu', mustHave: true, weight: 100 },
  { key: 'interest', value: 'music', title: 'Müzik ilgisi', weight: 70 },
  { key: 'interest', value: 'travel', title: 'Seyahat ilgisi', weight: 70 },
  { key: 'interest', value: 'sports', title: 'Spor ilgisi', weight: 60 },
];

export default function ProactivePreferencesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proactiveEnabled, setProactiveEnabled] = useState(false);
  const [criteria, setCriteria] = useState<PreferenceCriterionInput[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await proactiveService.getPreferences();
      setProactiveEnabled(Boolean(data.proactiveEnabled));
      setCriteria(data.criteria || []);
    } catch (error: any) {
      Alert.alert('Hata', error?.message || 'Tercihler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedMap = useMemo(() => new Set(criteria.map((c) => `${c.key}:${c.value}`)), [criteria]);

  const togglePreset = (item: { key: string; value: string; mustHave?: boolean; weight?: number }) => {
    const itemKey = `${item.key}:${item.value}`;
    if (selectedMap.has(itemKey)) {
      setCriteria((prev) => prev.filter((x) => `${x.key}:${x.value}` !== itemKey));
      return;
    }

    setCriteria((prev) => [
      ...prev,
      {
        key: item.key,
        value: item.value,
        mustHave: Boolean(item.mustHave),
        weight: item.weight ?? 60,
      },
    ]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await proactiveService.savePreferences({ proactiveEnabled, criteria });
      Alert.alert('Kaydedildi', 'Tercihlerin güncellendi.');
    } catch (error: any) {
      Alert.alert('Hata', error?.message || 'Kaydetme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    try {
      await proactiveService.triggerScan();
      Alert.alert('Başlatıldı', 'Proaktif tarama arka planda başladı.');
    } catch (error: any) {
      Alert.alert('Hata', error?.message || 'Tarama başlatılamadı.');
    }
  };

  if (loading) {
    return <View className="flex-1 bg-black items-center justify-center"><ActivityIndicator color="#FF5A5F" /></View>;
  }

  return (
    <View className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 62, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>AI Proaktif Eşleşme</Text>
        </View>

        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 mb-4">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Proaktif Ara</Text>
              <Text style={{ color: '#9ca3af', marginTop: 4 }}>Açıkken sistem arkaplanda uygun adayları bulur.</Text>
            </View>
            <Switch value={proactiveEnabled} onValueChange={setProactiveEnabled} trackColor={{ false: '#374151', true: '#FF5A5F' }} />
          </View>
        </View>

        <Text style={{ color: '#d1d5db', fontSize: 13, marginBottom: 8 }}>Kriterlerini seç</Text>
        <View style={{ gap: 10 }}>
          {presetCriteria.map((item) => {
            const key = `${item.key}:${item.value}`;
            const selected = selectedMap.has(key);
            const criterion = criteria.find((c) => `${c.key}:${c.value}` === key);
            return (
              <TouchableOpacity
                key={key}
                onPress={() => togglePreset(item)}
                style={{
                  backgroundColor: selected ? 'rgba(255,90,95,0.2)' : '#111',
                  borderWidth: 1,
                  borderColor: selected ? 'rgba(255,90,95,0.5)' : '#27272a',
                  borderRadius: 16,
                  padding: 14,
                }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{item.title}</Text>
                <Text style={{ color: '#9ca3af', marginTop: 4 }}>Ağırlık: {criterion?.weight ?? item.weight ?? 60} • {criterion?.mustHave ? 'Must-have' : 'Nice-to-have'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={runNow} className="mt-5 h-12 rounded-2xl items-center justify-center bg-zinc-800 border border-zinc-700">
          <Text style={{ color: '#fff', fontWeight: '700' }}>Şimdi Tara</Text>
        </TouchableOpacity>

        <TouchableOpacity disabled={saving} onPress={save} className="mt-3 h-14 rounded-2xl items-center justify-center bg-[#FF5A5F]">
          <Text style={{ color: '#fff', fontWeight: '800' }}>{saving ? 'Kaydediliyor...' : 'Tercihleri Kaydet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
