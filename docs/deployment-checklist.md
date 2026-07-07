# Production Deployment Checklist

## Pre-deploy

- [ ] `.env` configured with production values
- [ ] `CORS_ORIGIN` set to production domain(s)
- [ ] `LOG_LEVEL` set to `warn` or `info`
- [ ] All migrations applied in Supabase Dashboard
- [ ] `npm run check` passes
- [ ] `npm run test:unit` passes
- [ ] Frontend built: `cd src/client && npm run build`

## Deploy

```bash
# Docker
docker compose up -d

# Verify

curl http://localhost:3200/api/health
```

## Post-deploy

- [ ] Health endpoint returns `ok`
- [ ] Login works with admin credentials
- [ ] Dashboard loads with data
- [ ] Crawl trigger works
- [ ] WeChat push test

## Monitoring

- Health: `GET /api/health`
- Logs: `docker logs -f customer-radar`
- Structured JSON logs via pino
- Request IDs in `X-Request-Id` header

## Rollback

```bash
docker compose down
docker compose up -d --build
```
