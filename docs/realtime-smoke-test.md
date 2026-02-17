# Bloom Realtime Smoke Test (2 User)

## Önkoşullar

- Backend çalışıyor (`:8080`)
- Frontend çalışıyor
- DB temiz/erişilebilir
- İki farklı hesap: `userA`, `userB`

## Senaryo-1: Like -> Match -> Activity/Notification

1. User-A login olur
2. User-B login olur
3. A, `POST /api/likes/{userBId}` çağrısı yapar
4. B tarafında `/user/queue/events` kanalında `LIKE_RECEIVED` beklenir
5. B, `POST /api/likes/{userAId}` yapar
6. Her iki kullanıcıda:
   - `MATCH_CREATED`
   - `EXPLORE_HUB_UPDATED`
   - `/api/explore-hub` içinde yeni activity/notification kayıtları doğrulanır

## Senaryo-2: Realtime Mesaj + Read

1. Match ile açılan `conversationId` alınır
2. A -> `/app/chat.send` payload: `{ conversationId, content }`
3. B tarafında `MESSAGE_RECEIVED` event’i doğrulanır
4. B, `POST /api/conversations/{conversationId}/read`
5. A tarafında `MESSAGES_READ` event’i doğrulanır
6. `/api/explore-hub` unread counts güncellemesi doğrulanır

## Beklenen Sonuç

- Like/match/message/read akışları hem REST hem websocket eventleriyle tutarlı çalışır
- Explore Hub unread badge değerleri canlı güncellenir
