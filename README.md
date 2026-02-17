# Expo Monorepo (Frontend + Backend)

## Project Structure

- `frontend/` → Expo Router mobile/web app
  - `app/(auth)` authentication flow (login/register/verify)
  - `app/onboarding.tsx` onboarding wizard
  - `app/(tabs)` authenticated tab screens (explore/profile/settings)
  - `api/` axios client and API base URL resolution
  - `services/` domain services (`authService`, `profileService`)
- `backend/` → Spring Boot REST API
  - `controller/` HTTP endpoints (`AuthController`)
  - `service/` business logic (`AuthService`, `JwtService`)
  - `entity/` JPA entities
  - `repos/` repository layer
  - `dto/` request/response contracts

## Quality Commands

### Frontend

```bash
cd frontend
npm install
npm run lint
npm run typecheck
npm run build:web
```

### Backend

```bash
cd backend
./mvnw test
```

> Note: Backend commands require Java 17+ and `JAVA_HOME` configured.

## Runtime Configuration

- Frontend API base URL priority:
  1. `EXPO_PUBLIC_API_BASE_URL`
  2. Expo host-based local URL (`http://<host>:8080/api`)
  3. fallback URL from `frontend/api/config.ts`

## Branch/Commit Recommendation

Use focused commits:
1. `chore(frontend): add explicit quality scripts and normalize comment language`
2. `chore(backend): remove duplicate security dependency and normalize comment language`
3. `docs: add monorepo architecture and runbook`
