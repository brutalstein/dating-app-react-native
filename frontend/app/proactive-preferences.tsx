import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { proactiveService, PreferenceCriterionInput, PreferenceTemplate } from '@/services/proactiveService';

type RangeState = { min: string; max: string };

const RELATIONSHIP_INTENT_OPTIONS = [
  { label: 'Gündelik', value: 'casual' },
  { label: 'Ciddi ilişki', value: 'serious' },
  { label: 'Arkadaşlık', value: 'friendship' },
];

const RANGE_KEYS = ['height_min_cm', 'height_max_cm', 'weight_min_kg', 'weight_max_kg'];

const getTemplateDescription = (template: PreferenceTemplate) => {
  switch (template.key) {
    case 'preference_alignment':
      return 'Profilindeki cinsiyet tercihine uygun adayları öne çıkarır.';
    case 'interest':
      return 'Seçtiğin ilgi alanına sahip adaylara ekstra puan verir.';
    case 'department':
      return 'Aynı/benzer bölüm bilgisini eşleşme skorunda dikkate alır.';
    default:
      return 'Bu kriter eşleşme skorunu etkiler.';
  }
};

const criterionValue = (criteria: PreferenceCriterionInput[], key: string) => criteria.find((c) => c.key === key)?.value ?? '';

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

  useEffect(() => {
    load();
  }, [load]);

  const upsertCriterion = useCallback((key: string, value: string, mustHave: boolean, weight: number) => {
    setCriteria((prev) => {
      const next = prev.filter((c) => c.key !== key);
      if (!value.trim()) return next;
      return [...next, { key, value: value.trim().toLowerCase(), mustHave, weight }];
    });
  }, []);

  const removeCriterion = useCallback((key: string) => {
    setCriteria((prev) => prev.filter((c) => c.key !== key));
  }, []);
  const save = async () => {
    if (heightRange.min && heightRange.max && Number(heightRange.min) > Number(heightRange.max)) {
      Alert.alert('Geçersiz aralık', 'Boy minimum değeri maksimumdan büyük olamaz.');
      return;
    }
    if (weightRange.min && weightRange.max && Number(weightRange.min) > Number(weightRange.max)) {
      Alert.alert('Geçersiz aralık', 'Kilo minimum değeri maksimumdan büyük olamaz.');
      return;
    }

    const withoutRanges = criteria.filter((c) => !RANGE_KEYS.includes(c.key));
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
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View className="flex-1 bg-black items-center justify-center"><ActivityIndicator color="#FF5A5F" /></View>;

  const otherTemplates = templates.filter((item) => !['relationship_intent', ...RANGE_KEYS].includes(item.key));

  return (
    <View className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 62, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>Akıllı Eşleşme Tercihleri</Text>
        </View>

        <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 mb-4">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Proaktif Ara</Text>
              <Text style={{ color: '#9ca3af', marginTop: 4 }}>Açıkken sistem arka planda profiline uygun adayları tarar.</Text>
            </View>
            <Switch value={proactiveEnabled} onValueChange={setProactiveEnabled} trackColor={{ false: '#374151', true: '#FF5A5F' }} />
          </View>
        </View>

        <View style={{ backgroundColor: '#111', borderWidth: 1, borderColor: '#27272a', borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 10 }}>İlişki arayışı</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {RELATIONSHIP_INTENT_OPTIONS.map((item) => {
              const active = criterionValue(criteria, 'relationship_intent') === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => {
                    if (active) {
                      removeCriterion('relationship_intent');
                      return;
                    }
                    upsertCriterion('relationship_intent', item.value, true, 95);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: active ? 'rgba(255,90,95,0.7)' : '#3f3f46', backgroundColor: active ? 'rgba(255,90,95,0.22)' : '#18181b' }}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ color: '#9ca3af', marginTop: 8, fontSize: 12 }}>Bu kriter zorunlu olarak uygulanır (yüksek öncelik).</Text>
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

        <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 6 }}>Diğer kriterler</Text>
        <Text style={{ color: '#9ca3af', fontSize: 12, marginBottom: 10 }}>
          Buradaki seçimler eşleşme motorunda puan hesabını etkiler. Aktif kriterler adayı elemek yerine çoğunlukla skoru yükseltir; zorunlu olanlar ise filtre gibi davranır.
        </Text>

        <View style={{ gap: 10 }}>
          {otherTemplates.map((item) => {
            const current = criteria.find((c) => c.key === item.key);
            const selected = Boolean(current);
            const weight = current?.weight ?? item.defaultWeight ?? 60;
            const mustHave = current?.mustHave ?? Boolean(item.defaultMustHave);

            return (
              <View key={item.key} style={{ backgroundColor: selected ? 'rgba(255,90,95,0.18)' : '#111', borderWidth: 1, borderColor: selected ? 'rgba(255,90,95,0.45)' : '#27272a', borderRadius: 16, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{item.label}</Text>
                    <Text style={{ color: '#9ca3af', marginTop: 4, fontSize: 12 }}>{getTemplateDescription(item)}</Text>
                    <Text style={{ color: '#9ca3af', marginTop: 4, fontSize: 11 }}>{mustHave ? 'Zorunlu filtre' : 'Skor etkisi'} • ağırlık: {weight}</Text>
                  </View>
                  <Switch
                    value={selected}
                    onValueChange={(enabled) => {
                      if (!enabled) {
                        removeCriterion(item.key);
                        return;
                      }

                      const defaultValue = item.type === 'boolean' ? 'true' : (item.options?.[0] || current?.value || '');
                      upsertCriterion(item.key, defaultValue, Boolean(item.defaultMustHave), item.defaultWeight ?? 60);
                    }}
                    trackColor={{ false: '#374151', true: '#FF5A5F' }}
                  />
                </View>

                {selected && item.type === 'select' && item.options && item.options.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {item.options.map((option) => {
                      const active = current?.value === option.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={option}
                          onPress={() => upsertCriterion(item.key, option, mustHave, weight)}
                          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: active ? 'rgba(255,90,95,0.65)' : '#3f3f46', backgroundColor: active ? 'rgba(255,90,95,0.22)' : '#18181b' }}>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{option}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {selected && item.type === 'text' ? (
                  <TextInput
                    value={current?.value ?? ''}
                    onChangeText={(txt) => upsertCriterion(item.key, txt, mustHave, weight)}
                    placeholder={`${item.label} yaz`}
                    placeholderTextColor="#6b7280"
                    style={{ marginTop: 10, color: '#fff', borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}
                  />
                ) : null}
              </View>
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

