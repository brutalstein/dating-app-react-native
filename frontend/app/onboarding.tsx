import React, { useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { profileService, UserProfile } from '@/services/profileService';
import BloomLogo from '@/components/ui/bloom-logo';
import OnboardingBackground from '@/components/ui/onboarding-background';
import {
  OnboardingCard,
  OnboardingChoiceChip,
  OnboardingDateField,
  ONBOARDING_COLORS,
  OnboardingStepHeader,
  OnboardingStickyCTA,
  OnboardingTextField,
} from '@/components/ui/onboarding-controls';

type GenderType = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER';
type FocusField = 'department' | 'birthDate' | 'bio' | null;

const interestsPool = ['Müzik', 'Kahve', 'Sinema', 'Yürüyüş', 'Yazılım', 'Fotoğraf', 'Masa Oyunları', 'Girişimcilik', 'Spor', 'Seyahat'];
const genderOptions: { label: string; value: GenderType }[] = [
  { label: 'Erkek', value: 'MALE' },
  { label: 'Kadın', value: 'FEMALE' },
  { label: 'Non-binary', value: 'NON_BINARY' },
  { label: 'Diğer', value: 'OTHER' },
];

const stepMeta = [
  { title: '1/4 Kimliğin', subtitle: 'Seni doğru eşleştirelim.', prompt: 'Temel bilgilerinle başlayalım.' },
  { title: '2/4 Vibe seçimi', subtitle: 'Ne aradığını hızlıca seç.', prompt: 'Eşleşme filtresini birlikte netleştirelim.' },
  { title: '3/4 Mini intro', subtitle: 'Kısa ve samimi bir profil.', prompt: 'İlk izlenim için profil kartını güçlendirelim.' },
  { title: '4/4 Foto vitrin', subtitle: 'En az 3 fotoğraf ekle.', prompt: 'Profilini öne çıkaracak kareleri seç.' },
];

const formatDate = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
const age = (date: Date) => {
  const now = new Date();
  let v = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) v--;
  return v;
};

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [department, setDepartment] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<GenderType | null>(null);
  const [preference, setPreference] = useState<GenderType | null>(null);
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusField>(null);

  const progress = useMemo(() => ((step + 1) / stepMeta.length) * 100, [step]);

  const toggleInterest = (item: string) => {
    setInterests((prev) => {
      if (prev.includes(item)) return prev.filter((x) => x !== item);
      if (prev.length >= 5) return prev;
      return [...prev, item];
    });
  };

  const selectPhoto = async () => {
    if (photoUrls.length >= 8) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin Gerekli', 'Fotoğraf eklemek için galeri izni vermelisin.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.72, allowsEditing: true, aspect: [4, 5], base64: true });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset) return;
    const value = asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : asset.uri;
    if (!value) return;

    setPhotoUrls((prev) => [...prev, value]);
  };

  const validStep = () => {
    if (step === 0) return !!birthDate && age(birthDate) >= 18 && department.trim().length > 1;
    if (step === 1) return !!gender && !!preference;
    if (step === 2) return bio.trim().length >= 12 && interests.length >= 2;
    if (step === 3) return photoUrls.length >= 3;
    return true;
  };

  const next = async () => {
    if (!validStep()) {
      Alert.alert('Eksik Alan', 'Bu adımı tamamlayıp devam et.');
      return;
    }

    if (step < stepMeta.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }

    if (!birthDate || !gender || !preference) return;

    setSaving(true);
    try {
      const res: UserProfile = await profileService.completeOnboarding({
        birthDate: formatDate(birthDate),
        department: department.trim(),
        bio: bio.trim(),
        gender,
        preference,
        interests,
        photoUrls,
      });

      if (!res.onboardingCompleted) throw new Error('Profil tamamlanamadı.');
      Alert.alert('Hazır!', 'Bloom profilin aktif.', [{ text: 'Keşfet', onPress: () => router.replace('/(tabs)' as any) }]);
    } catch (error: any) {
      Alert.alert('Hata', error?.message || 'Onboarding tamamlanamadı.');
    } finally {
      setSaving(false);
    }
  };

  const helperText =
    step === 0
      ? 'Yaş doğrulaması için 18+ olmalısın.'
      : step === 1
        ? 'Bu seçimler eşleşme önerilerini belirler.'
        : step === 2
          ? `İlgi alanı: ${interests.length}/5`
          : `Fotoğraf: ${photoUrls.length}/8 (min 3)`;

  return (
    <View className="flex-1 bg-black">
      <OnboardingBackground />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="px-6 pt-14 pb-1">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full items-center justify-center border" style={{ backgroundColor: 'rgba(0,0,0,0.45)', borderColor: 'rgba(255,255,255,0.2)' }}>
                <Ionicons name="heart" size={16} color={ONBOARDING_COLORS.primarySoft} />
              </View>
              <Text className="text-white text-lg font-semibold">Bloom</Text>
            </View>
          </View>

          <OnboardingStepHeader progress={progress} currentStep={step} totalSteps={stepMeta.length} />
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View className="items-center mb-5">
            <BloomLogo size="lg" showStatusDot />
            <Text className="text-white text-3xl font-bold mt-5">Profilini Tamamla</Text>
            <Text className="text-zinc-300 mt-2 text-center">{stepMeta[step].subtitle}</Text>

            <View className="mt-4 px-4 py-2 rounded-full border" style={{ borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(9,9,11,0.7)' }}>
              <Text className="text-zinc-200 text-xs font-semibold tracking-wide">{stepMeta[step].title}</Text>
            </View>
            <Text className="text-zinc-400 text-sm mt-3">{stepMeta[step].prompt}</Text>
          </View>

          <OnboardingCard>
            {step === 0 && (
              <View>
                <OnboardingTextField
                  label="Bölüm"
                  value={department}
                  onChangeText={setDepartment}
                  onFocus={() => setFocusedField('department')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Bölümün (örn: Bilgisayar Müh.)"
                  placeholderTextColor="#8A8A8F"
                  focused={focusedField === 'department'}
                  returnKeyType="done"
                />

                <OnboardingDateField
                  label="Doğum Tarihi"
                  onPress={() => {
                    setFocusedField('birthDate');
                    setShowDatePicker(true);
                  }}
                  focused={focusedField === 'birthDate'}
                  value={birthDate ? `${birthDate.toLocaleDateString()} (${age(birthDate)} yaş)` : 'Doğum tarihi seç'}
                />

                {showDatePicker && (
                  <View className="mt-3 rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(82,82,91,0.9)', backgroundColor: 'rgba(24,24,27,0.98)' }}>
                    <DateTimePicker
                      value={birthDate || new Date(2003, 0, 1)}
                      mode="date"
                      maximumDate={new Date()}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_, selected) => {
                        if (Platform.OS !== 'ios') setShowDatePicker(false);
                        if (selected) setBirthDate(selected);
                        setFocusedField(null);
                      }}
                    />
                  </View>
                )}
              </View>
            )}

            {step === 1 && (
              <View className="gap-5">
                <View>
                  <Text className="text-zinc-200 text-sm font-semibold mb-2">Cinsiyetin</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {genderOptions.map((g) => (
                      <OnboardingChoiceChip key={g.value} label={g.label} selected={gender === g.value} onPress={() => setGender(g.value)} tone="secondary" />
                    ))}
                  </View>
                </View>

                <View>
                  <Text className="text-zinc-200 text-sm font-semibold mb-2">Kimlerle tanışmak istersin?</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {genderOptions.map((g) => (
                      <OnboardingChoiceChip
                        key={`p-${g.value}`}
                        label={g.label}
                        selected={preference === g.value}
                        onPress={() => setPreference(g.value)}
                        tone="accent"
                      />
                    ))}
                  </View>
                </View>
              </View>
            )}

            {step === 2 && (
              <View>
                <Text className="text-zinc-200 text-sm font-semibold mb-2">Kendini Anlat</Text>
                <View
                  className="rounded-2xl px-3 border"
                  style={{
                    backgroundColor: 'rgba(24,24,27,0.9)',
                    borderColor: focusedField === 'bio' ? ONBOARDING_COLORS.primary : ONBOARDING_COLORS.neutralBorder,
                  }}
                >
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    onFocus={() => setFocusedField('bio')}
                    onBlur={() => setFocusedField(null)}
                    multiline
                    maxLength={180}
                    placeholder="Seni anlatan kısa bir cümle yaz..."
                    placeholderTextColor="#8A8A8F"
                    className="text-white min-h-[108px] py-3"
                    textAlignVertical="top"
                  />
                </View>
                <Text className="text-zinc-500 text-xs self-end mt-1">{bio.length}/180</Text>

                <Text className="text-zinc-200 text-sm font-semibold mt-4 mb-2">İlgi alanı seç (2-5)</Text>
                <View className="flex-row flex-wrap gap-2">
                  {interestsPool.map((item) => {
                    const selected = interests.includes(item);
                    return (
                      <OnboardingChoiceChip key={item} label={item} selected={selected} onPress={() => toggleInterest(item)} compact />
                    );
                  })}
                </View>
              </View>
            )}

            {step === 3 && (
              <View>
                <Text className="text-zinc-200 text-sm font-semibold mb-3">Fotoğraf ekle (3-8)</Text>
                <View className="flex-row flex-wrap gap-3">
                  {photoUrls.map((uri, i) => (
                    <View key={`${i}-${uri}`} className="relative">
                      <Image source={{ uri }} style={{ width: 90, height: 122, borderRadius: 16 }} />
                      <View className="absolute bottom-2 left-2 rounded-full px-2 py-1" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                        <Text className="text-white text-[10px]">#{i + 1}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setPhotoUrls((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full items-center justify-center"
                        style={{ backgroundColor: ONBOARDING_COLORS.primary }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="close" color="#fff" size={14} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {photoUrls.length < 8 && (
                    <TouchableOpacity
                      onPress={selectPhoto}
                      className="w-[90px] h-[122px] rounded-2xl border border-dashed items-center justify-center"
                      style={{ borderColor: ONBOARDING_COLORS.primarySoft, backgroundColor: 'rgba(39,39,42,0.78)' }}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    >
                      <Ionicons name="add" size={24} color={ONBOARDING_COLORS.primarySoft} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </OnboardingCard>
        </ScrollView>

        <OnboardingStickyCTA label={step === 3 ? 'Profili Tamamla' : 'Devam Et'} disabled={!validStep()} loading={saving} onPress={next} helperText={helperText} />
      </KeyboardAvoidingView>
    </View>
  );
}
