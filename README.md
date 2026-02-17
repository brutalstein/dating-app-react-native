# Expo Monorepo (Frontend + Backend)

## Project Structure

- `frontend/` → Expo Router mobile/web app
  - `app/(auth)` authentication flow (login/register/verify)
  - `app/onboarding.tsx` onboarding wizard
  - `app/(tabs)` authenticated tab screens (explore/profile/settings)
  - `components/ui/bloom-brand.tsx` Bloom brand component
  - `components/ui/aurora-background.tsx` animated procedural background
  - `api/` axios client and API base URL resolution
  - `services/` domain services (`authService`, `profileService`)
- `backend/` → Spring Boot REST API
  - `controller/` HTTP endpoints (`AuthController`)
  - `service/` business logic (`AuthService`, `JwtService`)
  - `entity/` JPA entities
  - `repos/` repository layer
  - `dto/` request/response contracts

## UX/UI Notes (2026-02)

- Login/Register ekranları Bloom marka diliyle yeniden tasarlandı.
- Eski GIF temelli arka plan yerine **procedural (kodla üretilen) animasyonlu aurora arka planı** kullanıldı.
- Bu yaklaşımda dış görsel asset kaynağı yoktur; telif riski düşüktür ve mobilde daha hafiftir.
- Onboarding kısa, adımlı ve üniversite kullanıcı senaryosuna odaklı hale getirildi.

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
1. `feat(frontend): redesign bloom auth and onboarding experience`
2. `chore(backend): trim pom dependencies and keep only required starters`
3. `docs: document ui/background licensing approach and runbook`
