# Bloom Expo Monorepo (Frontend + Backend)

Bu repo Bloom dating uygulamasının **Expo frontend** + **Spring Boot backend** kaynak kodlarını içerir.

## Realtime mesajlaşma: production-ready güncellemeler

- **Durum modeli:** `sending -> sent -> delivered -> read` (+ client-side `failed`)
- **Retry güvenliği:** `clientMessageId` tabanlı idempotent gönderim (aynı mesaj tekrar gönderimde duplicate üretmez)
- **Typing indicator:** `/app/chat.typing` ile iki yönlü canlı yazıyor bilgisi
- **Delivered ack:** alıcı `/app/chat.delivered` ile teslim bilgisini server’a bildirir
- **Read receipt:** `POST /api/conversations/{id}/read` sonrası iki taraf için tutarlı read event/payload
- **Reconnect state sync:** socket reconnect sonrası istemci force-refresh + `/app/chat.sync`
- **Event envelope standardı:** `eventId`, `eventType`, `occurredAt`, `payload`

## API ve Socket Yüzeyi

### REST endpointleri

- `POST /api/likes/{targetUserId}`
- `GET /api/explore-hub`
- `GET /api/conversations`
- `GET /api/conversations/{conversationId}/messages`
- `POST /api/conversations/{conversationId}/read`
- `POST /api/notifications/{notificationId}/read` ✅
- `POST /api/notifications/read-all` ✅

### WebSocket/STOMP

- Endpoint: `ws://<host>:8080/ws`
- Client app prefix: `/app`
- User queue: `/user/queue/events`
- Ack queue: `/user/queue/ack`

**Client publish:**
- `/app/chat.send`
- `/app/chat.typing`
- `/app/chat.delivered`
- `/app/chat.sync`

**Server events (`/user/queue/events`):**
- `LIKE_RECEIVED`
- `MATCH_CREATED`
- `MESSAGE_RECEIVED`
- `MESSAGE_SENT`
- `MESSAGE_STATUS_UPDATED`
- `MESSAGES_READ`
- `TYPING_UPDATED`
- `EXPLORE_HUB_UPDATED`

## Veri katmanı

- `messages.client_message_id` ile retry dedup
- `messages.delivered_at`, `messages.read_at` ile teslim/görüldü takibi
- Migration eklendi:
  - `V2__message_retry_and_notification_indexes.sql`

## Kurulum

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
./mvnw -DskipTests package
```

### Frontend

```bash
cd frontend
npm run typecheck
npm run lint
npm run build:web
```

## Smoke testi

Detaylı akış: `docs/realtime-smoke-test.md`
