# Environment & Config (Production Hygiene)

## Frontend (Expo)
Create `frontend/.env` (or set CI/CD env vars):

```env
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.com/api
```

Notes:
- `EXPO_PUBLIC_API_BASE_URL` yoksa app, Expo host IP fallback kullanır.
- Production buildlerde mutlaka explicit API URL verin.

## Backend (Spring Boot)
Önerilen minimum env değişkenleri:

```env
DB_URL=jdbc:postgresql://<host>:5432/<db>
DB_USERNAME=<db_user>
DB_PASSWORD=<db_password>
JWT_SECRET=<strong_random_secret>
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<smtp_user>
MAIL_PASSWORD=<smtp_app_password>
JPA_DDL_AUTO=validate
FLYWAY_ENABLED=true
JPA_SHOW_SQL=false
RATE_LIMIT_DEFAULT_LIMIT=120
RATE_LIMIT_DEFAULT_WINDOW_SECONDS=60
RATE_LIMIT_AUTH_LIMIT=12
RATE_LIMIT_AUTH_WINDOW_SECONDS=60
RATE_LIMIT_CRITICAL_LIMIT=40
RATE_LIMIT_CRITICAL_WINDOW_SECONDS=60
RATE_LIMIT_AUTH_FAILURE_THRESHOLD=5
RATE_LIMIT_AUTH_FAILURE_BASE_BLOCK_SECONDS=30
RATE_LIMIT_AUTH_FAILURE_MAX_BLOCK_SECONDS=900
RATE_LIMIT_MESSAGE_FLOOD_LIMIT=15
RATE_LIMIT_MESSAGE_FLOOD_WINDOW_SECONDS=20
```

Notes:
- `application.properties` içindeki default değerler local geliştirme içindir.
- Production'da tüm kritik alanları env ile override edin.
- `JWT_SECRET` güçlü ve ortam bazlı olmalı; dev/stage/prod ayrı tutulmalı.
- Rate limit ayarları endpoint sınıfına göre uygulanır (auth/critical/default + websocket chat).
