# BeautyBook Security Guide

## Overview
Enterprise-grade security protecting customer data, payments, and platform integrity.

## Authentication & Authorization

### JWT Token Strategy
- **Access Token**: 15-minute TTL, signed with HS256
- **Refresh Token**: 30-day TTL, rotation-enabled
- **Token Storage**: HTTP-only cookies (production)
- **Password Hashing**: bcrypt (12 rounds)

### Role-Based Access Control
| Role | Permissions |
|------|-------------|
| `SUPER_ADMIN` | Full system access |
| `ADMIN` | All admin features |
| `OWNER` | Own salon management |
| `MANAGER` | Salon operations |
| `STAFF` | Service delivery |
| `RECEPTIONIST` | Booking management |
| `CUSTOMER` | Personal bookings |

## API Security

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| General | 300 req/min | 1 min |
| Auth | 20 req/15min | 15 min |
| AI | 30 req/min | 1 min |
| Uploads | 10 req/min | 1 min |

### Security Headers
```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=63072000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### CSRF Protection
- Same-origin validation for mutating requests
- Token-based CSRF for cookie auth (future)

## Data Security

### Database
- Parameterized queries (Prisma ORM)
- Connection pooling (Supabase pooler)
- Encryption at rest (PostgreSQL)
- Automated daily backups

### Storage
- Public bucket: non-sensitive assets only
- Signed URLs for private content
- File type validation
- Size limits (1MB API, 10MB uploads)

### Secrets Management
- Environment variables (never in code)
- Kubernetes Secrets (production)
- GitHub Secrets (CI/CD)
- `.env` files in `.gitignore`

## Infrastructure Security

### Network
- HTTPS enforced (TLS 1.3)
- HSTS preload
- CORS whitelist
- DDoS protection (Cloudflare)

### Container Security
- Non-root users
- Read-only root filesystem
- Dropped Linux capabilities
- Minimal base images (Alpine)

## Monitoring & Incident Response

### Logging
- All auth attempts logged
- Payment events logged
- Admin actions audited
- API request logging

### Alerts
- Failed login spikes
- Payment failures
- Database errors
- Unusual traffic patterns

### Incident Response
1. Isolate affected service
2. Rotate compromised credentials
3. Restore from backup if needed
4. Document and review

## Compliance

- Password minimum length: 6 characters
- Email verification required
- Session management with rotation
- Rate limiting on auth endpoints
- Input validation on all endpoints
- Audit trail for sensitive operations
