# Production Deployment Guide

This guide covers production deployment of the Bloom Dating App.

## Prerequisites

- Docker & Docker Compose installed
- Domain name configured (optional but recommended)
- SSL certificate (Let's Encrypt recommended)
- PostgreSQL credentials
- SMTP credentials for email verification
- FCM/APNS credentials for push notifications

## Quick Start with Docker Compose

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your production values
nano .env
```

**Critical variables to configure:**
- `DB_PASSWORD` - Strong database password
- `JWT_SECRET` - Generate with: `openssl rand -base64 64`
- `MAIL_*` - SMTP credentials
- `FCM_SERVER_KEY` - Firebase Cloud Messaging key
- `APNS_*` - Apple Push Notification credentials
- `EXPO_PUBLIC_API_BASE_URL` - Your production API URL

### 2. Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up -d --build

# Check service health
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 3. Verify Deployment

```bash
# Health checks
curl http://localhost:8080/api/health
curl http://localhost/health

# Check backend is running
curl http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

## Manual Deployment (Without Docker)

### Backend Deployment

```bash
cd backend

# Build JAR
./mvnw clean package -DskipTests

# Run with production profile
java -jar target/backend-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=prod \
  --DB_URL=jdbc:postgresql://localhost:5432/bloomDb \
  --DB_USERNAME=postgres \
  --DB_PASSWORD=your-password \
  --JWT_SECRET=your-secret
```

### Frontend Deployment

```bash
cd frontend

# Install dependencies
npm ci

# Build for web
npm run build:web

# Deploy dist/ folder to your web server (nginx, Apache, etc.)
```

## Database Migration

Flyway migrations run automatically on startup. To verify:

```bash
docker-compose exec backend curl http://localhost:8080/actuator/flyway
```

## Monitoring & Observability

### Health Endpoints

- Backend: `GET /api/health`
- Frontend: `GET /health`

### Logs

```bash
# Docker logs
docker-compose logs -f backend

# Application logs are structured JSON in production
```

## Security Checklist

- [ ] All secrets in `.env` file (never commit)
- [ ] JWT secret is cryptographically random (min 32 chars)
- [ ] Database password is strong
- [ ] HTTPS enabled (via reverse proxy)
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Admin endpoints protected
- [ ] Banned user check active

## Performance Tuning

### Backend JVM Options

Edit `backend/Dockerfile`:
```dockerfile
ENV JAVA_OPTS="-Xms512m -Xmx2g -XX:+UseG1GC"
```

### Database Connection Pool

Add to `application-prod.properties`:
```properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.idle-timeout=300000
```

## Troubleshooting

### Backend won't start

```bash
# Check database connectivity
docker-compose exec backend ping postgres

# View detailed logs
docker-compose logs backend | tail -100
```

### Database migration fails

```bash
# Check Flyway history
docker-compose exec postgres psql -U postgres -d bloomDb \
  -c "SELECT * FROM flyway_schema_history ORDER BY installed_on DESC;"
```

### Frontend can't connect to backend

1. Verify `EXPO_PUBLIC_API_BASE_URL` in `.env`
2. Rebuild frontend: `docker-compose up -d --build frontend`
3. Check network connectivity between containers

## Backup & Restore

### Database Backup

```bash
docker-compose exec postgres pg_dump -U postgres bloomDb > backup.sql
```

### Database Restore

```bash
docker-compose exec -T postgres psql -U postgres bloomDb < backup.sql
```

## Scaling Considerations

For high-traffic deployments:

1. **Horizontal Scaling**: Run multiple backend instances behind a load balancer
2. **Database**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
3. **Session Management**: Use Redis for distributed session storage
4. **CDN**: Serve static assets through CDN
5. **Monitoring**: Integrate with Prometheus/Grafana or similar

## CI/CD Integration

The repository includes GitHub Actions workflow (`.github/workflows/quality-gate.yml`) that:
- Runs typecheck and lint on frontend
- Runs tests on backend
- Builds production artifacts

For automated deployment, extend the workflow to:
1. Build Docker images
2. Push to container registry
3. Deploy to production environment
