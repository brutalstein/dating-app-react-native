# Bloom Realtime Smoke Test (2 User)

## Önkoşullar
- Backend çalışıyor (`:8080`)
- Frontend çalışıyor
- İki farklı hesap: userA, userB

## Senaryo-1: Like -> Match
1. A, B’ye like atar (`POST /api/likes/{bId}`)
2. B `LIKE_RECEIVED` alır
3. B de A’ya like atar
4. İki tarafta `MATCH_CREATED` + `EXPLORE_HUB_UPDATED`

## Senaryo-2: Mesaj durum akışı
1. A sohbet ekranında mesaj gönderir
2. A’da mesaj önce `sending`, sonra `sent` olur (`MESSAGE_SENT`)
3. B mesajı alınca `MESSAGE_RECEIVED` alır ve `chat.delivered` ack yollar
4. A tarafında mesaj `delivered` olur (`MESSAGE_DELIVERED`)
5. B konuşmayı read yapar (`POST /api/conversations/{id}/read`)
6. A tarafı `MESSAGES_READ` alır, mesaj `read` olur

## Senaryo-3: Typing indicator
1. A yazmaya başlar
2. B ekranında `yazıyor...` görünür (`TYPING`)
3. A durunca indicator kapanır

## Senaryo-4: Failed + Retry
1. Socket kesilirken mesaj gönderilir
2. Mesaj `failed` olur
3. Failed balona dokunup retry
4. Bağlantı geldiğinde mesaj `sent -> delivered -> read` akışına girer

## Beklenen sonuç
- Typing, delivery, read receipt ve retry davranışları iki kullanıcıda tutarlı ve canlı çalışır.
