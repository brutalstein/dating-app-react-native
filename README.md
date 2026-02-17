# Bloom Expo Monorepo (Frontend + Backend)

Bu repo Bloom dating uygulamasının **Expo frontend** + **Spring Boot backend** kaynak kodlarını içerir.

## Seçilen realtime mimari

- Backend: **Spring WebSocket + STOMP**
- Frontend: **Expo + @stomp/stompjs**
- Auth: JWT (REST + socket CONNECT header)
- Realtime DB zorunlu değil; server push mimarisiyle canlı akış sağlanıyor.

## Ek gereksinim: WhatsApp-benzeri mesaj UX

Bu sürümde aşağıdakiler entegre edildi:

- **Typing indicator:** `TYPING` event’i ile anlık `yazıyor...`
- **Mesaj durumları:** `sending / sent / delivered / read / failed`
- **Durum görünürlüğü:** chat balonunda ikon/etiket ile net gösterim
- **Retry:** failed mesaja dokununca tekrar gönderim
- **Read receipt senkronu:** `MESSAGES_READ` event’i iki tarafı eşitler
- **Delivery senkronu:** alıcı `chat.delivered` ack gönderir, gönderici `MESSAGE_DELIVERED` alır
- **Online / last seen:** websocket presence + `lastSeen` ile conversation listesi

## Veri katmanı

Eklenen ana tablolar/entity’ler:

- `likes` (`LikeInteraction`)
- `matches` (`MatchEntity`)
- `conversations` (`Conversation`)
- `messages` (`MessageEntity`)
- `notifications` (`NotificationEntity`)
- `activities` (`ActivityEntity`)
- `user_preference_profiles` (`UserPreferenceProfile`)
- `user_preference_criteria` (`PreferenceCriterion`)
- `recommendations` (`RecommendationEntity`)

Mesaj durum alanları:
- `messages.client_message_id`
- `messages.delivered_at`
- `messages.read_at`

Migration:
- `backend/src/main/resources/db/migration/V1__realtime_social_chat.sql`

## API ve socket yüzeyi

### REST
- `POST /api/likes/{targetUserId}`
- `GET /api/explore-hub`
- `GET /api/conversations`
- `GET /api/conversations/{conversationId}/messages`
- `POST /api/conversations/{conversationId}/read`
- `GET /api/recommendations/preferences`
- `PUT /api/recommendations/preferences`
- `POST /api/recommendations/scan`
- `POST /api/recommendations/{recommendationId}/action` (`LIKE` / `PASS`)

### WebSocket/STOMP
- Endpoint: `/ws`
- Publish:
  - `/app/chat.send`
  - `/app/chat.typing`
  - `/app/chat.delivered`
- User queue: `/user/queue/events`

Server eventleri:
- `LIKE_RECEIVED`
- `MATCH_CREATED`
- `MESSAGE_RECEIVED`
- `MESSAGE_SENT`
- `MESSAGE_DELIVERED`
- `MESSAGES_READ`
- `TYPING`
- `EXPLORE_HUB_UPDATED`

## Frontend optimizasyon notu (MVP+)

- Login ekranındaki ağır `pet-lover.gif` yerine optimize edilmiş `pet-lover.jpg` kullanılır.
- Görsel `expo-image` ile cache (`memory-disk`) + kısa transition ile yüklenir.
- Bu değişiklik ilgili asset yükünü ~2.06MB -> ~0.04MB seviyesine indirir (aynı ekran akışını koruyarak).

## Çalıştırma

### Backend
```bash
cd backend
./mvnw spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Doğrulama

### Backend
```bash
cd backend
./mvnw test
```

### Frontend
```bash
cd frontend
npm run typecheck
npm run lint
npm run build:web
```

## AI Proaktif Eşleşme Asistanı

Akış:
1. Kullanıcı `Settings > AI Proaktif Eşleşme Asistanı` ekranından kriterlerini (`must-have / nice-to-have / weight`) kaydeder.
2. `Proaktif Ara` açıkken backend async tarama başlatır.
3. Deterministik scoring motoru (kural + ağırlık + ortak ilgi bonusu) uygun adayları seçer.
4. Öneri `activities` akışına `Sana özel bulundu` formatında düşer (`reason`, `score`, `referenceId`).
5. Activity ekranından `Beğen / Geç` aksiyonu gönderilir.

## Smoke test

Kısa feature smoke:
1. En az 2 onboarding tamamlamış kullanıcı oluştur.
2. Kullanıcı-A ile `proactive-preferences` ekranında kriter seç + `Proaktif Ara` aç.
3. `Şimdi Tara` butonuna bas.
4. Activity ekranında `Sana özel bulundu` kartı, `reason` metni ve skor görünmeli.
5. `Beğen` veya `Geç` sonrası backend `recommendations.status` güncellenmeli.

Realtime/chat smoke: `docs/realtime-smoke-test.md`

## Rate limit & abuse koruması

Backend tarafında düşük riskli in-memory korumalar aktiftir (tek instance için uygundur, multi-instance için Redis benzeri ortak store önerilir).

- Auth (`/api/auth/*`): sıkı limit + failed auth backoff (IP + email anahtarı)
- Kritik (`POST /api/likes/*`, `POST /api/conversations/*/read`, `POST /api/recommendations/**`): orta limit
- Genel (`/api/**`): makul default limit
- Realtime (`/app/chat.send`, `/app/chat.typing`, `/app/chat.delivered`, `/app/chat.sync`): websocket inbound limit + mesaj flood koruması

Limit aşımında API `429` döner:

```json
{
  "status": 429,
  "error": "TOO_MANY_REQUESTS",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfterSeconds": 12
}
```

Header: `Retry-After`.

## Operasyon dokümanları

- Environment/config: `docs/environment.md`
- Runbook: `docs/runbook.md`
