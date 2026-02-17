import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

export default function TeaserProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ locked?: string; cta?: string }>();
  const locked = params.locked === '1';
  const cta = typeof params.cta === 'string' ? decodeURIComponent(params.cta) : 'Profili görmek için premium al';

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: 58, paddingHorizontal: 18 }}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ color: '#fff', marginBottom: 16 }}>Geri</Text>
      </TouchableOpacity>

      <View style={{ backgroundColor: '#111', borderRadius: 22, borderWidth: 1, borderColor: '#2a2a2a', padding: 18 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>Profil</Text>
        {locked ? (
          <View style={{ marginTop: 14 }}>
            <Text style={{ color: '#fda4af', fontWeight: '700' }}>🔒 Premium Kilidi</Text>
            <Text style={{ color: '#d1d5db', marginTop: 8 }}>{cta}</Text>
            <TouchableOpacity
              onPress={() => router.push('/premium-purchase' as any)}
              style={{ marginTop: 14, backgroundColor: '#FF5A5F', borderRadius: 14, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Premium Al</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={{ color: '#fff', marginTop: 12 }}>Profil detayı yakında.</Text>
        )}
      </View>
    </View>
  );
}
