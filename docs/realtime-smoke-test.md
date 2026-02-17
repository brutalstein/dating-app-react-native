# Bloom Realtime Smoke Test (2 User)

## Önkoşullar

- Backend `:8080` çalışıyor
- Frontend çalışıyor
- İki farklı hesap: `userA`, `userB`

## Senaryo-1: Like -> Match -> Explore senkron

1. A, B’ye like atar (`POST /api/likes/{userBId}`)
2. B, `LIKE_RECEIVED` alır
3. B de A’yı beğenir
4. İki tarafta `MATCH_CREATED` + `EXPLORE_HUB_UPDATED`
5. `/api/explore-hub` unread/message/activity alanları doğrulanır

## Senaryo-2: Mesaj state + retry + typing

1. A sohbet ekranında mesaj yazar
2. UI akışı: `sending -> sent`
3. B mesajı alınca `MESSAGE_RECEIVED`, A için `MESSAGE_STATUS_UPDATED` (delivered)
4. B yazmaya başlayınca A’da `TYPING_UPDATED`
5. Ağ kesilip aynı `clientMessageId` ile retry yapılır, duplicate mesaj oluşmadığı doğrulanır

## Senaryo-3: Read receipt tutarlılığı

1. B konuşmayı okur (`POST /api/conversations/{conversationId}/read`)
2. A `MESSAGES_READ` eventinde `conversationId`, `messageIds`, `readAt` görür
3. Hem A hem B’de mesaj durumu `read` olur
4. Explore unread badge düşer

## Senaryo-4: Notification read endpointleri

1. `POST /api/notifications/{id}/read`
2. `POST /api/notifications/read-all`
3. `EXPLORE_HUB_UPDATED` ile unreadNotifications anlık düşer

## Senaryo-5: Reconnect dayanıklılığı

1. Socket bağlantısını kapat/aç
2. Reconnect sonrası `/app/chat.sync` + force refresh ile state drift oluşmadığını doğrula
