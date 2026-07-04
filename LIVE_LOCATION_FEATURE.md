# 📍 Canlı Konum Paylaşımı Özelliği (Live Location Sharing)

## Genel Bakış

Bu özellik, kullanıcıların eşleştiği diğer kullanıcılarla gerçek zamanlı konum paylaşımı yapmasını sağlar. Privacy-first yaklaşımla tasarlanmıştır ve yalnızca mutual match'ler birbirlerinin konumunu görebilir.

## ✨ Özellikler

### Backend
- **Gerçek Zamanlı Takip**: WebSocket ile anlık konum güncellemeleri
- **Zaman Sınırlı Paylaşım**: 1-480 dakika arası özelleştirilebilir süreler
- **Otomatik Temizleme**: Eski konum verilerinin periyodik temizlenmesi
- **Rate Limiting**: Stalking'i önlemek için güncelleme sıklığı sınırı
- **Platform Desteği**: iOS, Android ve Web için optimize edilmiş
- **Battery Optimization**: Düşük pil durumunda güncelleme optimizasyonu

### Frontend (React Native / Expo)
- **Modern Harita Arayüzü**: react-native-maps ile interaktif harita
- **Canlı Markerlar**: Kullanıcı fotoğraflarıyla kişiselleştirilmiş markerlar
- **Mesafe Göstergesi**: Eşleşmeler arası mesafe hesaplama
- **Permission Yönetimi**: iOS ve Android için otomatik izin yönetimi
- **Background Tracking**: Arka planda konum takibi desteği
- **WebSocket Entegrasyonu**: Gerçek zamanlı güncellemeler

## 🚀 Kurulum

### Backend Yapılandırması

`.env` dosyasına ekleyin:

```bash
# Live Location Configuration
BLOOM_LOCATION_ENABLED=true
BLOOM_LOCATION_DEFAULT_TTL_MINUTES=60
BLOOM_LOCATION_MAX_TTL_MINUTES=480
BLOOM_LOCATION_UPDATE_INTERVAL_SECONDS=30
BLOOM_LOCATION_CLEANUP_INTERVAL_MS=300000
BLOOM_LOCATION_MIN_ACCURACY_METERS=50
BLOOM_LOCATION_MAX_SPEED_MPS=100
```

### Frontend Yapılandırması

#### 1. Bağımlılıkları Yükleyin

```bash
cd frontend
npm install expo-location react-native-maps
```

#### 2. Platform İzinleri

**iOS (app.json)** - Zaten yapılandırılmış:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Eşleştiğiniz kullanıcılarla konumunuzu paylaşmak için konum erişimi gereklidir.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Eşleştiğiniz kullanıcılarla sürekli konum paylaşımı yapabilmek için arka planda konum erişimi gereklidir.",
        "NSLocationAlwaysUsageDescription": "Eşleştiğiniz kullanıcılarla konumunuzu paylaşmak için konum erişimi gereklidir."
      }
    }
  }
}
```

**Android (app.json)** - Zaten yapılandırılmış:
```json
{
  "expo": {
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    }
  }
}
```

#### 3. Google Maps API Key (Opsiyonel ama önerilir)

`app.config.js` veya `app.json` dosyasına ekleyin:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY"
      }
    }
  }
}
```

## 📱 Kullanım

### Hook Kullanımı

```typescript
import { useLiveLocation } from '@/hooks/useLiveLocation';

function MyComponent() {
  const {
    isEnabled,
    isSharing,
    isLoading,
    error,
    currentLocation,
    matchedLocations,
    permissionStatus,
    requestPermission,
    toggleSharing,
    fetchMatchedLocations,
    stopSharing,
    remainingMinutes,
  } = useLiveLocation();

  // Konum paylaşımını başlat (60 dakika)
  const handleStartSharing = async () => {
    try {
      await toggleSharing(60);
    } catch (err) {
      console.error('Failed to start sharing:', err);
    }
  };

  // Eşleşmelerin konumlarını getir
  const handleRefresh = async () => {
    const locations = await fetchMatchedLocations();
    console.log('Matched locations:', locations);
  };

  return (
    <View>
      {isSharing ? (
        <Text>Kalan süre: {remainingMinutes} dakika</Text>
      ) : (
        <Button title="Konumu Paylaş" onPress={handleStartSharing} />
      )}
    </View>
  );
}
```

### Harita Bileşeni Kullanımı

```typescript
import { LiveLocationMap } from '@/components/maps/LiveLocationMap';

function MapScreen() {
  const handleLocationPress = (location) => {
    console.log('Location pressed:', location);
    // Navigate to chat or show user profile
  };

  return (
    <LiveLocationMap
      initialRegion={{
        latitude: 41.0082,
        longitude: 28.9784,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      onLocationPress={handleLocationPress}
    />
  );
}
```

## 🔐 Güvenlik ve Gizlilik

### Privacy Features

1. **Mutual Match Only**: Sadece karşılıklı eşleşen kullanıcılar birbirlerinin konumunu görebilir
2. **Explicit Consent**: Kullanıcı açıkça konum paylaşımını etkinleştirmeli
3. **Time-Limited**: Paylaşım otomatik olarak süresi dolunca kapanır
4. **No History**: Eski konum verileri düzenli olarak silinir (7 gün)
5. **Accuracy Filtering**: Düşük doğruluklu konumlar paylaşılmaz

### Security Measures

1. **Authentication Required**: Tüm endpoint'ler JWT authentication gerektirir
2. **Rate Limiting**: 30 saniyede bir güncelleme sınırı (stalking önleme)
3. **Platform Validation**: X-Platform header ile platform doğrulaması
4. **Session Tracking**: Her paylaşım oturumu benzersiz ID ile takip edilir
5. **Coordinate Validation**: Latitude/longitude range check (-90/90, -180/180)

## 📊 API Endpoints

### 1. Konum Paylaşımını Aç/Kapa

```http
POST /api/location/sharing/toggle
Authorization: Bearer {token}
Content-Type: application/json

{
  "enabled": true,
  "durationMinutes": 60
}
```

**Response:**
```json
{
  "enabled": true,
  "expiresAt": "2025-07-05T01:30:00",
  "message": "Konum paylaşımı 60 dakika süreyle etkinleştirildi."
}
```

### 2. Konum Güncelle

```http
POST /api/location/update
Authorization: Bearer {token}
Content-Type: application/json
X-Platform: IOS

{
  "latitude": 41.0082,
  "longitude": 28.9784,
  "accuracyMeters": 10.5,
  "altitudeMeters": 50.2,
  "speedMps": 1.5,
  "headingDegrees": 180,
  "batteryLevel": 75,
  "isForeground": true,
  "sessionId": "abc-123-def"
}
```

### 3. Eşleşmelerin Konumlarını Getir

```http
GET /api/location/matches
Authorization: Bearer {token}
```

**Response:**
```json
{
  "locations": [
    {
      "userId": "uuid-123",
      "firstName": "Ayşe",
      "photoUrl": "https://...",
      "latitude": 41.0100,
      "longitude": 28.9800,
      "accuracyMeters": 15.0,
      "distanceKm": 0.5,
      "isOnline": true,
      "expiresAt": "2025-07-05T01:30:00"
    }
  ],
  "totalCount": 1,
  "retrievedAt": "2025-07-05T00:30:00"
}
```

### 4. Belirli Kullanıcının Konumunu Getir

```http
GET /api/location/user/{userId}
Authorization: Bearer {token}
```

### 5. Paylaşım Durumunu Öğren

```http
GET /api/location/sharing/status
Authorization: Bearer {token}
```

## 🎯 iOS Özel Gereksinimleri

### App Store Review Guidelines

1. **Location Usage Descriptions**: Info.plist'de açıklayıcı metinler olmalı
2. **Background Location**: Ek gerekçe sunmanız gerekebilir
3. **Privacy Policy**: Gizlilik politikasında konum kullanımını açıklayın

### Best Practices

```typescript
// iOS'ta background location için ek ayarlar
if (Platform.OS === 'ios') {
  const { granted } = await Location.requestBackgroundPermissionsAsync();
  if (!granted) {
    Alert.alert(
      'Arka Plan Konumu Gerekli',
      'Sürekli konum paylaşımı için arka plan izni gereklidir.',
      [{ text: 'Ayarları Aç', onPress: () => Linking.openSettings() }]
    );
  }
}
```

## 🤖 Android Özel Gereksinimleri

### Android 10+ (API 29+)

Background location için ek izin flow'u:

```typescript
if (Platform.OS === 'android' && Platform.Version >= 29) {
  const { granted } = await Location.requestBackgroundPermissionsAsync();
  
  if (!granted) {
    // Kullanıcıyı ayarlara yönlendir
    Alert.alert(
      'Arka Plan Konumu Gerekli',
      'Android 10+ için arka plan konum izni manuel olarak verilmelidir.',
      [{ text: 'Ayarları Aç', onPress: () => Linking.openSettings() }]
    );
  }
}
```

### Battery Optimization

```typescript
// Battery optimization bypass request (opsiyonel)
// Not: Bu özellik Expo'da doğrudan desteklenmez, native module gerekir
```

## 🧪 Test Senaryoları

### Unit Tests

```typescript
describe('useLiveLocation', () => {
  it('should request location permission', async () => {
    const { result } = renderHook(() => useLiveLocation());
    const granted = await result.current.requestPermission();
    expect(granted).toBe(true);
  });

  it('should toggle location sharing', async () => {
    const { result } = renderHook(() => useLiveLocation());
    await result.current.toggleSharing(60);
    expect(result.current.isSharing).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('LiveLocation API', () => {
  it('should update location successfully', async () => {
    const response = await api.post('/api/location/update', {
      latitude: 41.0082,
      longitude: 28.9784,
    });
    expect(response.status).toBe(200);
  });
});
```

## 🔧 Troubleshooting

### Yaygın Sorunlar

1. **Konum güncellenmiyor**
   - İzinleri kontrol edin
   - Background refresh'in açık olduğundan emin olun
   - Network bağlantısını kontrol edin

2. **Harita görünmüyor**
   - Google Maps API key yapılandırmasını kontrol edin
   - react-native-maps kurulumunu doğrulayın

3. **WebSocket bağlantısı kopuyor**
   - Reconnect logic otomatik çalışır
   - Token expiration'ı kontrol edin

## 📈 Gelecek Geliştirmeler

- [ ] Geofencing (belirli bölgeye giriş/çıkış bildirimleri)
- [ ] Activity recognition (yürüme/araba modu optimizasyonu)
- [ ] Location history (opt-in, premium özellik)
- [ ] Safety features (panic button, trusted contacts)
- [ ] Offline mode (konum önbellekleme)

## 📝 Compliance

### GDPR Uyumluluğu

- Kullanıcı verileri açık rıza ile toplanır
- Veriler sadece belirtilen amaçla kullanılır
- Kullanıcı her zaman paylaşımı durdurabilir
- Veriler otomatik olarak silinir (7 gün)

### CCPA Uyumluluğu

- Kullanıcı verilerinin silinmesini talep edebilir
- Veri satışı yapılmaz
- Gizlilik politikası şeffaftır

---

**Son Güncelleme**: 2025-07-05  
**Versiyon**: 1.0.0  
**Durum**: Production Ready ✅
