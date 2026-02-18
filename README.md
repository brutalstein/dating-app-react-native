# Bloom Dating App Monorepo

Bloom is a full-stack dating app monorepo with:
- **Frontend:** Expo + React Native + TypeScript
- **Backend:** Spring Boot + WebSocket/STOMP + PostgreSQL

This repository is prepared for open-source collaboration.

---

## Tech Stack

### Frontend
- Expo (React Native)
- Expo Router
- TypeScript
- Axios
- STOMP client for realtime events

### Backend
- Java 17+
- Spring Boot 4
- Spring Security (JWT)
- Spring Data JPA (Hibernate)
- Spring WebSocket + STOMP
- Flyway migrations

### Database
- PostgreSQL

---

## Realtime Architecture

Realtime messaging and social updates are server-authoritative:
- WebSocket endpoint: `/ws`
- STOMP publish:
  - `/app/chat.send`
  - `/app/chat.typing`
  - `/app/chat.delivered`
- User queue: `/user/queue/events`

Typical events:
- `LIKE_RECEIVED`
- `MATCH_CREATED`
- `MESSAGE_RECEIVED`
- `MESSAGE_SENT`
- `MESSAGE_DELIVERED`
- `MESSAGES_READ`
- `EXPLORE_HUB_UPDATED`

---

## Project Structure

- `frontend/` → Expo application
- `backend/` → Spring Boot API + realtime services
- `docs/` → operational and architecture docs
- `scripts/` → helper scripts (including DB backup/restore)

---

## Quick Start

### 1) Backend
```bash
cd backend
./mvnw spring-boot:run
```

### 2) Frontend
```bash
cd frontend
npm install
npx expo start
```

---

## Build & Validation

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

---

## Environment Variables

See detailed docs in `docs/environment.md`.

Important variables include:
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`
- `RATE_LIMIT_*`
- `FCM_SERVER_KEY`, `APNS_*`

> Never commit real secrets. Use environment variables in local/dev/prod setups.

---

## Key Documentation

- `docs/environment.md`
- `docs/runbook.md`
- `docs/e2e-runbook.md`
- `docs/db-migration-disaster-runbook.md`
- `docs/ci-observability.md`

---

## Open Source Notes

- This repo excludes private credentials by default.
- Keep configuration secrets in your local environment only.
- Contributions should pass all frontend/backend validation commands.

---

## License

Add your preferred license file before public release (for example: MIT, Apache-2.0, or GPL).
