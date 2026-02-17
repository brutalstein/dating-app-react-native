# E2E Test Runbook (Like → Match → Chat → Read)

## Backend
```bash
cd backend
./mvnw -Dtest=SocialFlowE2ETest test
```

This test creates two users, performs:
1. userA likes userB
2. userB likes back => match + conversation
3. userA sends message
4. userB marks conversation read

## CI-friendly full backend suite
```bash
cd backend
./mvnw test
```

## Frontend checks
```bash
cd frontend
npm run typecheck
npm run lint
npm run build:web
```
