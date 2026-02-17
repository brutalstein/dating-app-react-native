import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { profileService, UserProfile } from '@/services/profileService';
import BloomBrand from '@/components/ui/bloom-brand';
import AuroraBackground from '@/components/ui/aurora-background';

type GenderType = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER';

const ilgiAlanlari = ['Müzik', 'Kahve', 'Sinema', 'Yürüyüş', 'Yazılım', 'Fotoğraf', 'Masa Oyunları', 'Girişimcilik', 'Spor', 'Seyahat'];
const genderOptions: { label: string; value: GenderType }[] = [
  { label: 'Erkek', value: 'MALE' },
  { label: 'Kadın', value: 'FEMALE' },
  { label: 'Non-binary', value: 'NON_BINARY' },
  { label: 'Diğer', value: 'OTHER' },
];

const stepMeta = [
  { title: '1/4 Kimliğin', subtitle: 'Seni doğru eşleştirelim.' },
  { title: '2/4 Vibe seçimi', subtitle: 'Ne aradığını hızlıca seç.' },
  { title: '3/4 Mini intro', subtitle: 'Kısa ve samimi bir profil.' },
  { title: '4/4 Foto vitrin', subtitle: 'En az 3 fotoğraf ekle.' },
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

  return (
    <View className="flex-1 bg-black">
      <AuroraBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="px-6 pt-14 pb-2">
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity onPress={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="w-10 h-10 rounded-full bg-black/35 items-center justify-center border border-white/10">
              <Ionicons name="chevron-back" size={20} color={step === 0 ? '#666' : '#fff'} />
            </TouchableOpacity>
            <Text className="text-zinc-300">%{Math.round(progress)} tamamlandı</Text>
          </View>
          <View className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <View className="h-2 bg-[#22D3EE]" style={{ width: `${progress}%` }} />
          </View>
        </View>

        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="py-4">
            <BloomBrand compact subtitle={stepMeta[step].subtitle} />
            <Text className="text-white text-2xl font-bold mt-6">{stepMeta[step].title}</Text>
          </View>

          {step === 0 && (
            <View className="gap-3">
              <TextInput value={department} onChangeText={setDepartment} placeholder="Bölümün (örn: Bilgisayar Müh.)" placeholderTextColor="#A1A1AA" className="bg-zinc-900/80 text-white h-12 px-4 rounded-xl border border-zinc-700" />
              <TouchableOpacity onPress={() => setShowDatePicker(true)} className="bg-zinc-900/80 h-12 px-4 rounded-xl border border-zinc-700 justify-center">
                <Text className="text-white">{birthDate ? `${birthDate.toLocaleDateString()} (${age(birthDate)} yaş)` : 'Doğum tarihi seç'}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={birthDate || new Date(2003, 0, 1)}
                  mode="date"
                  maximumDate={new Date()}
                  onChange={(_, selected) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selected) setBirthDate(selected);
                  }}
                />
              )}
            </View>
          )}

          {step === 1 && (
            <View className="gap-4">
              <View>
                <Text className="text-zinc-300 mb-2">Cinsiyetin</Text>
                <View className="flex-row flex-wrap gap-2">
                  {genderOptions.map((g) => (
                    <TouchableOpacity key={g.value} onPress={() => setGender(g.value)} className={`px-4 py-2 rounded-full border ${gender === g.value ? 'bg-[#A78BFA] border-[#A78BFA]' : 'bg-zinc-900/80 border-zinc-700'}`}>
                      <Text className="text-white">{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View>
                <Text className="text-zinc-300 mb-2">Kimlerle tanışmak istersin?</Text>
                <View className="flex-row flex-wrap gap-2">
                  {genderOptions.map((g) => (
                    <TouchableOpacity key={`p-${g.value}`} onPress={() => setPreference(g.value)} className={`px-4 py-2 rounded-full border ${preference === g.value ? 'bg-[#F472B6] border-[#F472B6]' : 'bg-zinc-900/80 border-zinc-700'}`}>
                      <Text className="text-white">{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {step === 2 && (
            <View className="gap-4">
              <TextInput
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={180}
                placeholder="Seni anlatan kısa bir cümle yaz..."
                placeholderTextColor="#A1A1AA"
                className="bg-zinc-900/80 text-white min-h-[100px] px-4 py-3 rounded-xl border border-zinc-700"
                textAlignVertical="top"
              />
              <Text className="text-zinc-500 text-xs">{bio.length}/180</Text>

              <Text className="text-zinc-300">İlgi alanı seç (2-5)</Text>
              <View className="flex-row flex-wrap gap-2">
                {ilgiAlanlari.map((item) => {
                  const selected = interests.includes(item);
                  return (
                    <TouchableOpacity key={item} onPress={() => toggleInterest(item)} className={`px-4 py-2 rounded-full border ${selected ? 'bg-cyan-500 border-cyan-500' : 'bg-zinc-900/80 border-zinc-700'}`}>
                      <Text className="text-white">{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text className="text-zinc-300 mb-3">Fotoğraf ekle (3-8)</Text>
              <View className="flex-row flex-wrap gap-3">
                {photoUrls.map((uri, i) => (
                  <View key={`${i}-${uri}`} className="relative">
                    <Image source={{ uri }} style={{ width: 88, height: 118, borderRadius: 12 }} />
                    <TouchableOpacity onPress={() => setPhotoUrls((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-rose-500 rounded-full w-6 h-6 items-center justify-center">
                      <Ionicons name="close" color="#fff" size={14} />
                    </TouchableOpacity>
                  </View>
                ))}

                {photoUrls.length < 8 && (
                  <TouchableOpacity onPress={selectPhoto} className="w-[88px] h-[118px] rounded-xl border border-dashed border-zinc-600 items-center justify-center bg-zinc-900/70">
                    <Ionicons name="add" size={24} color="#22D3EE" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        <View className="px-6 pb-8 pt-3">
          <TouchableOpacity onPress={next} disabled={!validStep() || saving} className={`h-12 rounded-xl items-center justify-center ${!validStep() || saving ? 'bg-zinc-700' : 'bg-[#22D3EE]'}`}>
            <Text className="text-black font-bold">{saving ? 'Kaydediliyor...' : step === 3 ? 'Profili Tamamla' : 'Devam'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
