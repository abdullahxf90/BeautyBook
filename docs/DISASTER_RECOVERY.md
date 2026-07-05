# BeautyBook Disaster Recovery Guide

## Overview
This guide covers recovery procedures for various failure scenarios.

## Backup Strategy

### Schedule
| Type | Frequency | Retention | Storage | 
|------|-----------|-----------|---------|
| Full | Daily (2 AM UTC) | 30 days | S3 / Local |
| Weekly | Sunday | 60 days | S3 / Local |
| Monthly | 1st of month | 365 days | S3 / Archive |

### Backup Contents
- Full database dump (pg_dump)
- Schema-only snapshot
- Media files (Supabase Storage)
- Configuration files

## Recovery Scenarios

### 1. Database Corruption

**Symptoms**: Data inconsistencies, application errors, failing queries

**Recovery**:
```bash
# 1. Stop API traffic
kubectl scale deployment/api --replicas=0 -n beautybook

# 2. Identify latest clean backup
ls -lt /opt/beautybook/backups/daily/

# 3. Restore database
bash scripts/restore.sh /opt/beautybook/backups/daily/beautybook_full_20260705_020000.sql.gz

# 4. Verify data integrity
psql "$DATABASE_URL" -c "SELECT count(*) FROM \"User\""
psql "$DATABASE_URL" -c "SELECT count(*) FROM \"Booking\""

# 5. Restore API traffic
kubectl scale deployment/api --replicas=3 -n beautybook

# Expected RTO: 30 minutes | RPO: 24 hours
```

### 2. Complete Service Outage

**Symptoms**: All services unreachable

**Recovery**:
```bash
# 1. Verify cloud provider status
# 2. Deploy to secondary region
kubectl config use-context beautybook-secondary

# 3. Apply infrastructure
kubectl apply -f k8s/

# 4. Verify database is replicated
# 5. Update DNS records to secondary IP
# 6. Verify health checks pass

# Expected RTO: 1 hour | RPO: 5 minutes (if streaming replicas)
```

### 3. Security Breach

**Symptoms**: Unauthorized access, data exfiltration, ransom demands

**Recovery**:
1. **Isolate** — Take affected systems offline immediately
2. **Rotate** — All credentials, API keys, and secrets
3. **Preserve** — Forensics data (logs, snapshots)
4. **Restore** — Clean instance from last known good backup
5. **Patch** — Vulnerability that caused breach
6. **Notify** — Affected users and authorities if required

### 4. Redis Failure

**Symptoms**: Slow API, cache misses, queue jobs stuck

**Recovery**:
```bash
# Auto-recovery: Docker/K8s will restart
docker compose -f docker/docker-compose.prod.yml restart redis

# If data loss is acceptable (cache only):
docker compose -f docker/docker-compose.prod.yml up -d redis

# Queue jobs in dead letter can be replayed:
kubectl exec deployment/redis -n beautybook -- redis-cli LLEN queue:dead
kubectl exec deployment/redis -n beautybook -- redis-cli LRANGE queue:dead 0 -1

# Expected RTO: 5 minutes | RPO: 0 (cache loss acceptable)
```

### 5. Payment System Failure

**Symptoms**: Payment processing errors, failed transactions

**Recovery**:
1. **Stop** — New payment processing
2. **Verify** — Payment provider status (Stripe/JazzCash/EasyPaisa)
3. **Enable** — Cash-only mode as fallback
4. **Process** — Pending transactions manually if needed
5. **Reconcile** — Payments with provider dashboard

## Failover Architecture

### Multi-Region (Future)
Primary: ap-northeast-1 (Tokyo)
Secondary: ap-southeast-1 (Singapore)

### Database Replication
Primary → Read replica (async)
Failover: Promote replica in < 5 minutes

## Testing Recovery

Conduct quarterly DR drills:
1. Database restore from backup
2. Secondary region failover
3. Cache cluster rebuild
4. Full application redeployment

## Contact

| Role | Contact |
|------|---------|
| Lead DevOps | Infrastructure team |
| Security | Security team |
| Database Admin | DBA team |
| Emergency | On-call rotation |
