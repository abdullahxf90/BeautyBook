# BeautyBook Deployment Guide

## Prerequisites
- Docker & Docker Compose (local/staging)
- Kubernetes cluster (production)
- GitHub account with Actions enabled
- Domain names configured

## Local Development

```bash
# 1. Start all services
docker compose -f docker/docker-compose.yml up -d

# 2. Run database migrations
npx prisma db push --schema=packages/database/prisma/schema.prisma

# 3. Seed data (optional)
npx ts-node packages/database/prisma/seed.ts

# 4. Access
# API: http://localhost:4000
# Website: http://localhost:3000
# Redis Commander: http://localhost:8081 (monitoring profile only)
```

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (64+ chars) |
| `JWT_REFRESH_SECRET` | JWT refresh secret (64+ chars) |
| `CORS_ORIGIN` | Allowed CORS origins |

### Optional
| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Redis connection string |
| `STRIPE_SECRET_KEY` | Stripe payment processing |
| `JAZZCASH_MERCHANT_ID` | JazzCash merchant ID |
| `EASYPAISA_MERCHANT_ID` | EasyPaisa merchant ID |
| `LOG_LEVEL` | Logging level (error/warn/info/debug) |

## Staging Deployment

1. Push to `staging` branch → triggers CI + CD
2. Staging URL: `https://staging.beauty-book.com`
3. Auto-deploys from GitHub Actions

## Production Deployment

### Docker Compose (Single VPS)

```bash
# 1. Clone & configure
git clone https://github.com/abdullahxf90/BeautyBook.git /opt/beautybook
cd /opt/beautybook
cp .env.production.example .env.production
nano .env.production  # Fill in secrets

# 2. Deploy
docker compose -f docker/docker-compose.prod.yml up -d

# 3. Run migrations
docker compose -f docker/docker-compose.prod.yml exec api npx prisma db push

# 4. Verify
curl https://beauty-book.com/api/health
```

### Kubernetes (Production Cluster)

```bash
# 1. Create namespace & secrets
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# 2. Deploy services
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/redis-service.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/api-service.yaml
kubectl apply -f k8s/api-hpa.yaml
kubectl apply -f k8s/website-deployment.yaml
kubectl apply -f k8s/website-service.yaml
kubectl apply -f k8s/website-hpa.yaml
kubectl apply -f k8s/worker-deployment.yaml

# 3. Configure ingress
kubectl apply -f k8s/ingress.yaml

# 4. Verify
kubectl get pods -n beautybook
kubectl get svc -n beautybook
kubectl get hpa -n beautybook
```

## CI/CD Pipeline

```
Push to main/staging
       │
       ▼
   CI Pipeline
   ├── Lint & TypeCheck
   ├── Test (with PostgreSQL + Redis)
   ├── Build Docker images
   └── Push to GHCR
       │
       ▼
  CD Pipeline (Production)
   ├── Canary deploy (10% traffic)
   ├── Health check (automatic rollback on failure)
   └── Full rollout
```

## Rollback

```bash
# Docker Compose
docker compose -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.prod.yml up -d

# Kubernetes
kubectl rollout undo deployment/api -n beautybook
kubectl rollout undo deployment/website -n beautybook
```

## Monitoring

| Tool | Endpoint | Purpose |
|------|----------|---------|
| Health | `GET /api/infra/health` | Service health |
| Metrics | `GET /api/infra/metrics` | Performance metrics |
| System | `GET /api/infra/system` | System information |
| Queue | `GET /api/infra/queue` | Queue status |

## Backup

Automated daily at 2:00 AM UTC:

```bash
# Manual backup
bash scripts/backup.sh full

# Restore
bash scripts/restore.sh /path/to/backup.sql.gz
```
