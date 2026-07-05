# BeautyBook Monitoring Guide

## Infrastructure Monitoring

### Health Checks
All services expose standard health endpoints:

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| API | `GET /api/infra/health` | `{"status":"healthy"}` |
| API | `GET /api/infra/health/readiness` | `{"status":"ready"}` |
| API | `GET /api/infra/health/liveness` | `{"status":"alive"}` |

### Prometheus Metrics (Future)
```
beautybook_requests_total{method,path,status}
beautybook_request_duration_seconds{method,path}
beautybook_db_query_duration_seconds{query}
beautybook_cache_hit_ratio
beautybook_queue_depth{queue}
```

## Application Monitoring

### Tracked Metrics
- Request count & duration
- Database query performance
- Cache hit/miss ratio
- Queue depth & processing time
- AI processing time & costs
- Error rates by endpoint

### Dashboard Metrics (`GET /api/infra/metrics`)
- Summary statistics for last hour
- Aggregated by metric name
- Min/max/avg/count

## Logging

### Log Format (JSON)
```json
{
  "timestamp": "2026-07-05T12:00:00.000Z",
  "level": "info",
  "module": "http",
  "message": "GET /api/salons 200",
  "meta": {
    "method": "GET",
    "path": "/api/salons",
    "status": 200,
    "duration": 45,
    "userId": "user_abc123"
  }
}
```

### Log Levels
- `error` — Critical errors requiring immediate attention
- `warn` — Warnings that should be investigated
- `info` — Normal operational information
- `debug` — Detailed debugging information

## Alerting

### Critical Alerts (PagerDuty/Email)
- API down for > 1 minute
- Database connection failures
- Payment processing errors
- Authentication service failures

### Warning Alerts (Slack/Email)
- Response time > 500ms (p95)
- Error rate > 5%
- Queue backlog > 1000 jobs
- Redis memory > 80%

## Cost Monitoring

### AI Costs
Track per-model spending:
- Requests per model
- Token usage
- Processing time
- Cost per request

### Infrastructure Costs
- Database connections
- Bandwidth usage
- Storage consumption
- API compute units

## Runbooks

### API Slow Response
1. Check `GET /api/infra/health` for database/Redis status
2. Review recent metrics for bottlenecks
3. Check database query performance
4. Verify Redis cache hit ratio
5. Scale horizontally if needed

### Queue Backlog
1. Check `GET /api/infra/queue` for queue depths
2. Verify worker pods are running
3. Check dead letter queue for failed jobs
4. Review worker logs for errors
5. Restart workers if stuck

### Database Connection Spike
1. Check connection pool usage
2. Verify no slow queries running
3. Review recent deployment changes
4. Increase pool size if needed
5. Add query optimization indexes
