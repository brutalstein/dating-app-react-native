import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PremiumPlan, premiumService } from '@/services/premiumService';

const formatTry = (value: number) => `₺${value.toFixed(2)}`;

export default function PremiumPurchaseScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseState, setPurchaseState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await premiumService.getPlans();
      setPlans(catalog.plans || []);
      setActivePlanId(catalog.activePlanId);
      setSelectedPlanId(catalog.activePlanId ?? catalog.plans?.[0]?.id ?? null);
    } catch (err: any) {
      setError(err?.message || 'Premium planları alınamadı.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  const startPurchase = useCallback(async () => {
    if (!selectedPlanId) {
      Alert.alert('Plan Seçin', 'Devam etmek için bir plan seçmelisiniz.');
      return;
    }

    setPurchaseState('loading');
    try {
      const checkout = await premiumService.createPurchase(selectedPlanId);
      setPurchaseState('success');
      Alert.alert(
        'Ödeme başlatıldı',
        `${checkout.message}\n\nProvider: ${checkout.provider}\nCheckout ID: ${checkout.checkoutId}`
      );
    } catch (err: any) {
      setPurchaseState('error');
      Alert.alert('Satın alma hatası', err?.message || 'İşlem başlatılamadı.');
    }
  }, [selectedPlanId]);

  return (
    <View className="flex-1 bg-black">
      <LinearGradient colors={['#1A0A0D', '#0B0B0B', '#000000']} style={{ position: 'absolute', inset: 0 }} />

      <View style={{ paddingTop: 62, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>Premium Satın Al</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}>
        <Text className="text-zinc-400">Daha fazla görünürlük, kilitli profiller ve öncelikli eşleşme avantajları.</Text>

        {loading ? (
          <View className="mt-8 items-center"><ActivityIndicator color="#FF5A5F" /></View>
        ) : error ? (
          <View className="mt-6 bg-red-950/40 border border-red-900 rounded-2xl p-4">
            <Text className="text-red-300 font-semibold">{error}</Text>
            <TouchableOpacity onPress={loadPlans} className="mt-3 bg-zinc-800 rounded-xl px-4 py-2 self-start">
              <Text className="text-white">Tekrar dene</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mt-4 gap-3">
            {plans.map((plan) => {
              const selected = plan.id === selectedPlanId;
              const active = plan.id === activePlanId;
              return (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => setSelectedPlanId(plan.id)}
                  className={`rounded-2xl p-4 border ${selected ? 'border-[#FF5A5F] bg-[#FF5A5F]/15' : 'border-zinc-800 bg-zinc-900/80'}`}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white text-lg font-bold">{plan.title}</Text>
                    {plan.recommended && <Text className="text-xs text-[#FF9CA0] font-bold">ÖNERİLEN</Text>}
                  </View>
                  <Text className="text-zinc-400 mt-1">{plan.description}</Text>
                  <Text className="text-white mt-3 font-semibold">{formatTry(plan.price)} / {plan.period.toLowerCase()}</Text>
                  {active && <Text className="text-emerald-400 mt-2 text-xs">Aktif planın</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View className="mt-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4">
          <Text className="text-zinc-400 text-xs uppercase">Entegrasyon Durumu</Text>
          <Text className="text-white mt-2">Seçili plan: {selectedPlan?.title || '-'}</Text>
          <Text className="text-zinc-400 mt-1">Satın alma state: {purchaseState}</Text>
          <Text className="text-zinc-500 mt-2 text-xs">Backend hook: POST /api/premium/purchase (checkout contract hazır)</Text>
        </View>

        <TouchableOpacity
          onPress={startPurchase}
          disabled={!selectedPlanId || purchaseState === 'loading' || loading}
          className={`mt-6 h-14 rounded-2xl items-center justify-center ${purchaseState === 'loading' ? 'bg-zinc-700' : 'bg-[#FF5A5F]'}`}>
          <Text className="text-white font-bold text-base">{purchaseState === 'loading' ? 'Başlatılıyor...' : 'Ödemeye Devam Et'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
