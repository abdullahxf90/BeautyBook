# BeautyBook Architecture

## Overview
BeautyBook is Pakistan's smartest beauty marketplace — a multi-tenant SaaS platform connecting customers with salons.

## Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, CSS Modules
- **Backend**: Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL 16 (Supabase)
- **Cache**: Redis 7
- **Storage**: Supabase Storage / S3-compatible
- **Auth**: JWT (access + refresh tokens), Supabase Auth
- **CI/CD**: GitHub Actions
- **Container**: Docker, Docker Compose
- **Orchestration**: Kubernetes-ready (manifests in `/k8s`)

## Architecture Diagram

```
┌─────────┐     ┌──────────┐     ┌────────────┐
│  Users  │────▶│  CDN     │────▶│  Website   │
└─────────┘     └──────────┘     │ (Next.js)  │
                                 └─────┬──────┘
                                       │ HTTP/REST
┌─────────┐     ┌──────────┐     ┌─────▼──────┐     ┌────────────┐
│ Admins  │────▶│  API GW  │────▶│  API       │────▶│ PostgreSQL │
└─────────┘     └──────────┘     │ (Express)  │     └────────────┘
                                 └─────┬──────┘
                                       │
                          ┌────────────┼────────────┐
                          ▼            ▼            ▼
                     ┌─────────┐ ┌─────────┐ ┌──────────┐
                     │ Redis   │ │ Worker  │ │ Supabase │
                     │ (Cache) │ │ (Queue) │ │ Storage  │
                     └─────────┘ └─────────┘ └──────────┘
```

## Service Boundaries

### API (`apps/api`)
- Express.js REST API on port 4000
- 40+ route modules organized by domain
- JWT authentication middleware
- Zod request validation
- Rate limiting per endpoint

### Website (`apps/website`)
- Next.js 14 App Router on port 3000
- 46 routes (static + dynamic)
- Server-side rendering where needed
- Client-side data fetching to API

### Database (`packages/database`)
- Prisma ORM with 140+ models
- Shared type definitions
- Migration management
- Seed data for development

## Caching Strategy

| Data | Cache Key | TTL | Invalidation |
|------|-----------|-----|--------------|
| Salon list | `salons:list:{page}` | 5 min | On create/update |
| Salon detail | `salon:{slug}` | 5 min | On update |
| Services | `services:{salonId}` | 10 min | On service change |
| Search results | `search:{query}` | 2 min | N/A (time-based) |
| Dashboard | `dashboard:*` | 1 min | On booking/payment |
| User session | `session:{userId}` | 15 min | On logout |

## Queue Architecture

### Job Types
- `email:send` — Transactional emails
- `sms:send` — SMS notifications
- `push:send` — Push notifications
- `image:process` — Image optimization
- `analytics:process` — Analytics aggregation
- `ai:process` — AI processing jobs

### Retry Policy
- 3 retries with exponential backoff (1s, 5s, 30s)
- Dead letter queue after 3 failures
- Manual replay from admin panel

## Security Architecture

See [SECURITY.md](./SECURITY.md) for full details.

### Layers
1. **Network**: HTTPS, WAF, DDoS protection
2. **Transport**: TLS 1.3, HSTS
3. **Application**: Helmet, CORS, CSRF, Rate limiting
4. **Auth**: JWT with rotation, bcrypt passwords
5. **Data**: Input validation, parameterized queries

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full details.

### Environments
- **Development**: Local Docker Compose
- **Staging**: VPS + Docker Compose
- **Production**: Kubernetes cluster (or Docker Swarm)
