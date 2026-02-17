# Bloom Expo Monorepo (Frontend + Backend)

Bu repo Bloom dating uygulamasının **Expo frontend** + **Spring Boot backend** kaynak kodlarını içerir.

## Seçilen Real-time Altyapı

- **Backend:** Spring Boot + Spring WebSocket + STOMP
- **Neden:**
  - Realtime DB zorunluluğu olmadan server-authoritative event akışı sağlar
  - JWT ile hem REST hem socket kanalını güvenli kullanmaya uygun
  - Activity / Notification / Message gibi farklı domain eventlerini ölçekli şekilde yönetmeye uygun
- **Frontend:** Expo + `@stomp/stompjs` abonelik katmanı

## Yeni Domainler ve Veri Katmanı

Eklenen tablolar/entity’ler:

- `likes` (`LikeInteraction`)
- `matches` (`MatchEntity`)
- `conversations` (`Conversation`)
- `messages` (`MessageEntity`, `readAt` ile read durumu)
- `notifications` (`NotificationEntity`)
- `activities` (`ActivityEntity`)

Migration:

- `backend/src/main/resources/db/migration/V1__realtime_social_chat.sql`

## API ve Socket Yüzeyi

### REST endpointleri

- `POST /api/likes/{targetUserId}` → like gönderir, karşılıklıysa match + conversation üretir
- `GET /api/explore-hub` → messages/notifications/activity + unread sayılarını döner
- `GET /api/conversations` → kullanıcının sohbet listesi
- `GET /api/conversations/{conversationId}/messages` → conversation mesajları
- `POST /api/conversations/{conversationId}/read` → conversation unread mesajlarını read yapar

### WebSocket/STOMP

- Endpoint: `ws://<host>:8080/ws`
- Client app prefix: `/app`
- User queue: `/user/queue/events`
- Message gönderimi: `/app/chat.send`
- Event tipleri:
  - `LIKE_RECEIVED`
  - `MATCH_CREATED`
  - `MESSAGE_RECEIVED`
  - `MESSAGE_SENT`
  - `MESSAGES_READ`
  - `EXPLORE_HUB_UPDATED`

## Frontend Değişiklikleri

- `services/exploreHubService.ts` mock data yerine backend’den gerçek payload çeker
- `services/realtimeService.ts` ile STOMP bağlantı/abonelik eklendi
- `store/exploreHub/*` realtime payload apply + canlı unread yönetimi eklendi
- `api/config.ts` içerisine `WS_BASE_URL` eklendi
- `package.json` içerisine `@stomp/stompjs` eklendi

## Kurulum ve Çalıştırma

### 1) Backend

```bash
cd backend
./mvnw spring-boot:run
```

Varsayılan DB: `jdbc:postgresql://localhost:5432/bloomDb`

### 2) Frontend

```bash
cd frontend
npm install
npm start
```

Opsiyonel env:

- `EXPO_PUBLIC_API_BASE_URL=http://<ip>:8080/api`

## Doğrulama Komutları

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

## E2E Smoke Senaryosu (2 kullanıcı)

Detaylı adımlar için: `docs/realtime-smoke-test.md`

Özet akış:

1. User-A ve User-B login olur
2. A, B’ye like gönderir → B anlık `LIKE_RECEIVED`
3. B de A’ya like atar → iki tarafta `MATCH_CREATED` + explore hub update
4. A mesaj yollar (`/app/chat.send`) → B anlık `MESSAGE_RECEIVED`
5. B konuşmayı read yapar → A `MESSAGES_READ` eventi alır

## Not

Realtime DB kullanımı bu kurulum için zorunlu değildir; backend + websocket ile uçtan uca anlık akış sağlanmıştır.
