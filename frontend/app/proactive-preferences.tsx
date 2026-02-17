import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { proactiveService, PreferenceCriterionInput, PreferenceTemplate } from '@/services/proactiveService';

type RangeState = { min: string; max: string };

const RELATIONSHIP_INTENT_OPTIONS = [
  { label: 'Gecelik', value: 'casual' },
  { label: 'Ciddi ilişki', value: 'serious' },
  { label: 'Arkadaşlık', value: 'friendship' },
];

export default function ProactivePreferencesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proactiveEnabled, setProactiveEnabled] = useState(false);
  const [criteria, setCriteria] = useState<PreferenceCriterionInput[]>([]);
  const [templates, setTemplates] = useState<PreferenceTemplate[]>([]);

  const [heightRange, setHeightRange] = useState<RangeState>({ min: '', max: '' });
  const [weightRange, setWeightRange] = useState<RangeState>({ min: '', max: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, catalog] = await Promise.all([proactiveService.getPreferences(), proactiveService.getCatalog()]);
      setProactiveEnabled(Boolean(data.proactiveEnabled));
      setCriteria(data.criteria || []);
      setTemplates(catalog || []);

      setHeightRange({
        min: data.criteria?.find((c) => c.key === 'height_min_cm')?.value || '',
        max: data.criteria?.find((c) => c.key === 'height_max_cm')?.value || '',
      });
      setWeightRange({
        min: data.criteria?.find((c) => c.key === 'weight_min_kg')?.value || '',
        max: data.criteria?.find((c) => c.key === 'weight_max_kg')?.value || '',
      });
    } catch (error: any) {
      Alert.alert('Hata', error?.message || 'Tercihler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byKey = useMemo(() => {
    const map = new Map<string, PreferenceCriterionInput[]>();
    criteria.forEach((item) => {
      const list = map.get(item.key) || [];
      list.push(item);
      map.set(item.key, list);
    });
    return map;
  }, [criteria]);

  const setCriterion = (key: string, value: string, mustHave = false, weight = 50) => {
    setCriteria((prev) => {
      const next = prev.filter((c) => c.key !== key);
      if (!value.trim()) return next;
      return [...next, { key, value: value.trim().toLowerCase(), mustHave, weight }];
    });
  };

  const save = async () => {
    if (heightRange.min && heightRange.max && Number(heightRange.min) > Number(heightRange.max)) {
      Alert.alert('Geçersiz aralık', 'Boy minimum değeri maksimumdan büyük olamaz.');
      return;
    }
    if (weightRange.min && weightRange.max && Number(weightRange.min) > Number(weightRange.max)) {
      Alert.alert('Geçersiz aralık', 'Kilo minimum değeri maksimumdan büyük olamaz.');
      return;
    }

    const withoutRanges = criteria.filter((c) => !['height_min_cm', 'height_max_cm', 'weight_min_kg', 'weight_max_kg'].includes(c.key));
    const nextCriteria = [...withoutRanges];

    if (heightRange.min) nextCriteria.push({ key: 'height_min_cm', value: heightRange.min, mustHave: false, weight: 45 });
    if (heightRange.max) nextCriteria.push({ key: 'height_max_cm', value: heightRange.max, mustHave: false, weight: 45 });
    if (weightRange.min) nextCriteria.push({ key: 'weight_min_kg', value: weightRange.min, mustHave: false, weight: 40 });
    if (weightRange.max) nextCriteria.push({ key: 'weight_max_kg', value: weightRange.max, mustHave: false, weight: 40 });

    setSaving(true);
    try {
      await proactiveService.savePreferences({ proactiveEnabled, criteria: nextCriteria });
      setCriteria(nextCriteria);
      Alert.alert('Kaydedildi', 'Tercihlerin güncellendi.');
    } catch (error: any) {
      Alert.alert('Hata', error?.message || 'Kaydetme başarısız.');
    } finally { setSaving(false); }
  };

  if (loading) return <View className="flex-1 bg-black items-center justify-center"><ActivityIndicator color="#FF5A5F" /></View>;

  return (
    <View className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 62, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
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

        <View style={{ backgroundColor: '#111', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 10 }}>İlişki arayışı</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {RELATIONSHIP_INTENT_OPTIONS.map((item) => {
              const active = byKey.get('relationship_intent')?.some((c) => c.value === item.value);
              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setCriterion('relationship_intent', item.value, true, 95)}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: active ? 'rgba(255,90,95,0.7)' : '#3f3f46', backgroundColor: active ? 'rgba(255,90,95,0.22)' : '#18181b' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ color: '#9ca3af', marginTop: 8, fontSize: 12 }}>Must-have (weight: 95)</Text>
        </View>

        <View style={{ backgroundColor: '#111', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 10 }}>Boy aralığı (cm)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={heightRange.min} onChangeText={(txt) => setHeightRange((p) => ({ ...p, min: txt.replace(/[^0-9]/g, '') }))} keyboardType="numeric" placeholder="Min" placeholderTextColor="#6b7280" style={{ flex: 1, color: '#fff', borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }} />
            <TextInput value={heightRange.max} onChangeText={(txt) => setHeightRange((p) => ({ ...p, max: txt.replace(/[^0-9]/g, '') }))} keyboardType="numeric" placeholder="Max" placeholderTextColor="#6b7280" style={{ flex: 1, color: '#fff', borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }} />
          </View>
        </View>

        <View style={{ backgroundColor: '#111', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 10 }}>Kilo aralığı (kg)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={weightRange.min} onChangeText={(txt) => setWeightRange((p) => ({ ...p, min: txt.replace(/[^0-9]/g, '') }))} keyboardType="numeric" placeholder="Min" placeholderTextColor="#6b7280" style={{ flex: 1, color: '#fff', borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }} />
            <TextInput value={weightRange.max} onChangeText={(txt) => setWeightRange((p) => ({ ...p, max: txt.replace(/[^0-9]/g, '') }))} keyboardType="numeric" placeholder="Max" placeholderTextColor="#6b7280" style={{ flex: 1, color: '#fff', borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }} />
          </View>
        </View>

        <Text style={{ color: '#d1d5db', fontSize: 13, marginBottom: 8 }}>Diğer kriterler</Text>
        <View style={{ gap: 10 }}>
          {templates.filter((item) => !['relationship_intent', 'height_min_cm', 'height_max_cm', 'weight_min_kg', 'weight_max_kg'].includes(item.key)).map((item) => {
            const selected = criteria.some((c) => c.key === item.key);
            return (
              <TouchableOpacity key={item.key} onPress={() => setCriterion(item.key, item.options?.[0] || '', Boolean(item.defaultMustHave), item.defaultWeight ?? 60)} style={{ backgroundColor: selected ? 'rgba(255,90,95,0.2)' : '#111', borderWidth: 1, borderColor: selected ? 'rgba(255,90,95,0.5)' : '#27272a', borderRadius: 16, padding: 14 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{item.label}</Text>
                <Text style={{ color: '#9ca3af', marginTop: 4 }}>key: {item.key} • weight: {item.defaultWeight} • {item.defaultMustHave ? 'must-have' : 'nice-to-have'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity disabled={saving} onPress={save} className="mt-3 h-14 rounded-2xl items-center justify-center bg-[#FF5A5F]">
          <Text style={{ color: '#fff', fontWeight: '800' }}>{saving ? 'Kaydediliyor...' : 'Tercihleri Kaydet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
