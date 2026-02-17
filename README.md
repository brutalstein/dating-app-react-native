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

## Smoke test

2 kullanıcı senaryosu: `docs/realtime-smoke-test.md`
