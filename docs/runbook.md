# Runbook (Quick)

## 1) Backend up
```bash
cd backend
./mvnw spring-boot:run
```

## 2) Frontend up
```bash
cd frontend
npm install
npm start
```

## 3) Quality gates
### Frontend
```bash
cd frontend
npm run typecheck
npm run lint
npm run build:web
```

### Backend
```bash
cd backend
./mvnw test
./mvnw -DskipTests package
```

## 4) AI Proaktif Eşleşme Operasyon Kontrolü
- `V3__proactive_recommendations.sql` migration'ı başarıyla geçti mi?
- `GET /api/recommendations/preferences` ve `PUT /api/recommendations/preferences` endpointleri 200 dönüyor mu?
- `POST /api/recommendations/scan` sonrası activity akışına öneri düşüyor mu?
- Activity'den gönderilen `POST /api/recommendations/{id}/action` aksiyonu status güncelliyor mu?
- Realtime `EXPLORE_HUB_UPDATED` event'i frontend store'u güncelliyor mu?

## 5) Rate-limit operasyon kontrolü
- `429 TOO_MANY_REQUESTS` response body + `Retry-After` header dönüyor mu?
- `/api/auth/*` endpointleri sıkı limite takıldığında frontend anlamlı hata gösterebiliyor mu?
- Başarısız login/verify denemeleri arttıkça backoff süresi uzuyor mu?
- `chat.send` yoğun spam denemesinde flood limiti devreye giriyor mu?

## 6) Release checklist
- `docs/environment.md` içindeki env değişkenleri set edildi mi?
- API base URL production'a yönlendi mi?
- DB migration/Flyway başarılı mı?
- Test ve build adımları geçti mi?
