import React from 'react';
import { Text, TextInput, TextInputProps, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const ONBOARDING_COLORS = {
  primary: '#FF5A5F',
  primarySoft: '#FF8A8E',
  secondary: '#F472B6',
  accent: '#A78BFA',
  neutralBorder: 'rgba(113,113,122,0.7)',
  cardBg: 'rgba(24,24,27,0.88)',
  cardBgStrong: 'rgba(9,9,11,0.92)',
};

type StepHeaderProps = {
  progress: number;
  currentStep: number;
  totalSteps: number;
};

export function OnboardingStepHeader({ progress, currentStep, totalSteps }: StepHeaderProps) {
  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-zinc-200 font-medium">%{Math.round(progress)} tamamlandı</Text>
        <Text className="text-zinc-400 text-xs">
          {currentStep + 1}/{totalSteps}
        </Text>
      </View>

      <View className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(39,39,42,0.92)' }}>
        <View className="h-2.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: ONBOARDING_COLORS.primary }} />
      </View>

      <View className="flex-row items-center gap-2 mt-3">
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const active = idx <= currentStep;
          return (
            <View
              key={idx}
              className="h-1.5 flex-1 rounded-full"
              style={{
                backgroundColor: active ? ONBOARDING_COLORS.primarySoft : 'rgba(63,63,70,0.85)',
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

type CardProps = {
  children: React.ReactNode;
};

export function OnboardingCard({ children }: CardProps) {
  return (
    <View className="rounded-3xl border p-5" style={{ backgroundColor: ONBOARDING_COLORS.cardBgStrong, borderColor: 'rgba(82,82,91,0.9)' }}>
      {children}
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  focused?: boolean;
  disabled?: boolean;
};

export function OnboardingTextField({ label, focused, disabled, ...props }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-zinc-200 text-sm font-semibold mb-2">{label}</Text>
      <TextInput
        {...props}
        editable={!disabled}
        className="text-white h-14 px-4 rounded-2xl border"
        style={{
          backgroundColor: disabled ? 'rgba(39,39,42,0.45)' : ONBOARDING_COLORS.cardBg,
          borderColor: focused ? ONBOARDING_COLORS.primary : ONBOARDING_COLORS.neutralBorder,
          opacity: disabled ? 0.7 : 1,
        }}
      />
    </View>
  );
}

type DateFieldProps = {
  label: string;
  value: string;
  focused?: boolean;
  onPress: () => void;
};

export function OnboardingDateField({ label, value, focused, onPress }: DateFieldProps) {
  return (
    <View className="mb-2">
      <Text className="text-zinc-200 text-sm font-semibold mb-2">{label}</Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.86}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        className="h-14 px-4 rounded-2xl border flex-row items-center justify-between"
        style={{
          backgroundColor: ONBOARDING_COLORS.cardBg,
          borderColor: focused ? ONBOARDING_COLORS.primary : ONBOARDING_COLORS.neutralBorder,
        }}
      >
        <Text className="text-white">{value}</Text>
        <Ionicons name="calendar-outline" color={focused ? ONBOARDING_COLORS.primarySoft : '#A1A1AA'} size={18} />
      </TouchableOpacity>
    </View>
  );
}

type ChoiceChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
  compact?: boolean;
};

export function OnboardingChoiceChip({ label, selected, onPress, tone = 'primary', disabled, compact }: ChoiceChipProps) {
  const color = tone === 'secondary' ? ONBOARDING_COLORS.secondary : tone === 'accent' ? ONBOARDING_COLORS.accent : ONBOARDING_COLORS.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
      hitSlop={{ top: 5, bottom: 5, left: 3, right: 3 }}
      className={`rounded-2xl border ${compact ? 'px-4 py-2.5' : 'px-4 py-3'} flex-row items-center gap-2`}
      style={{
        backgroundColor: selected ? color : 'rgba(24,24,27,0.8)',
        borderColor: selected ? color : ONBOARDING_COLORS.neutralBorder,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Text className="text-white font-medium">{label}</Text>
      {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
    </TouchableOpacity>
  );
}

type StickyCtaProps = {
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  helperText?: string;
  containerStyle?: ViewStyle;
};

export function OnboardingStickyCTA({ label, disabled, loading, onPress, helperText, containerStyle }: StickyCtaProps) {
  return (
    <View className="px-6 pb-8 pt-2" style={containerStyle}>
      {!!helperText && <Text className="text-zinc-400 text-xs mb-2 text-center">{helperText}</Text>}
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.9}
        className="h-14 rounded-2xl items-center justify-center flex-row gap-2"
        style={{
          backgroundColor: disabled || loading ? 'rgba(63,63,70,0.95)' : ONBOARDING_COLORS.primary,
        }}
      >
        <Text className="text-white font-bold text-base">{loading ? 'Kaydediliyor...' : label}</Text>
        {!loading && <Ionicons name="arrow-forward" size={18} color="white" />}
      </TouchableOpacity>
    </View>
  );
}
