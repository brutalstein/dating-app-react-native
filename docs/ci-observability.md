# CI/CD Quality Gate ve Observability

Bu doküman CI pipeline ve izlenebilirlik (observability) kurulumunu açıklar.

## 1) CI/CD Quality Gate

Workflow dosyası:
- `.github/workflows/quality-gate.yml`

Tetikleyiciler:
- `pull_request`
- `push` (main/master)

### Frontend gate (zorunlu)
Sırasıyla çalışır ve herhangi bir adım fail olursa job fail olur:
1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build:web`

### Backend gate (zorunlu)
Sırasıyla çalışır ve herhangi bir adım fail olursa job fail olur:
1. `./mvnw test`
2. `./mvnw -DskipTests package`

### Cache optimizasyonu
- Node cache: `actions/setup-node@v4` + `cache: npm` + `frontend/package-lock.json`
- Maven cache: `actions/setup-java@v4` + `cache: maven`

Bu sayede aynı dependency seti için pipeline süresi kısalır.

---

## 2) Observability

### Backend structured logging + correlation id
Eklenen/aktif dosyalar:
- `backend/src/main/java/org/api/backend/config/CorrelationIdFilter.java`
- `backend/src/main/resources/logback-spring.xml`

Özet:
- Her request için `X-Correlation-Id` ve `X-Trace-Id` üretilir/aktarılır.
- MDC key’leri (`correlationId`, `traceId`) log pattern’e yazılır.
- Response header’a aynı değerler geri basılır.

Log formatı key=value structured pattern ile tutulur.

### Kritik sinyal log noktaları
- Auth fail spike:
  - `AbuseProtectionService#registerAuthFailure`
  - event: `auth_fail_spike_detected`
- Message error:
  - `RealtimeMessageController#send`
  - event: `message_send_failed`
- WS disconnect:
  - `WebSocketPresenceListener#onDisconnect`
  - event: `ws_disconnected`

Bu event’ler dashboard/alert pipeline’ına kolay bağlanabilir.

### Frontend monitoring scaffold (env yoksa kırmadan)
Eklenen dosya:
- `frontend/services/monitoring.ts`

Entegrasyon:
- `frontend/app/_layout.tsx` içinde `initMonitoring()` çağrılır.
- `frontend/api/config.ts` request/response interceptor hataları `captureException` ile raporlar.

Davranış:
- `EXPO_PUBLIC_SENTRY_DSN` yoksa monitoring sessiz fallback ile çalışır, app kırılmaz.
- `@sentry/react-native` kuruluysa otomatik init/capture kullanır.
- SDK yoksa console fallback devreye girer.

### Sentry’yi açma (opsiyonel)
1. Frontend’e paket ekle:
   - `npm i @sentry/react-native`
2. Env ekle:
   - `EXPO_PUBLIC_SENTRY_DSN=...`
3. Uygulamayı yeniden başlat.

---

## 3) Lokal doğrulama komutları

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

Not: CI’da da aynı quality gate adımları zorunlu koşul olarak çalışır.
