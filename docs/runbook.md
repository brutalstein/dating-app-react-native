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

## 4) Release checklist
- `docs/environment.md` içindeki env değişkenleri set edildi mi?
- API base URL production'a yönlendi mi?
- DB migration/Flyway başarılı mı?
- Test ve build adımları geçti mi?
