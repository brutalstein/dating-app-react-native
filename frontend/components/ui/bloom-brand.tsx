import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface BloomBrandProps {
  subtitle?: string;
  compact?: boolean;
}

export default function BloomBrand({ subtitle, compact = false }: BloomBrandProps) {
  const iconSize = compact ? 30 : 44;

  return (
    <View className="items-center">
      <LinearGradient
        colors={['#F472B6', '#A78BFA', '#22D3EE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="w-20 h-20 rounded-3xl items-center justify-center border border-white/20"
      >
        <Ionicons name="flower-outline" size={iconSize} color="#fff" />
      </LinearGradient>
      <Text className="text-white text-4xl font-extrabold mt-4 tracking-wide">Bloom</Text>
      {subtitle ? <Text className="text-zinc-300 text-center mt-1">{subtitle}</Text> : null}
    </View>
  );
}
