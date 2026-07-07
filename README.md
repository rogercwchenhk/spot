# Customer Radar (客户雷达)

AI-native bidding & tender intelligence platform for Guangdong Province.

## Tech Stack

| Layer | Technology |
|---|---|
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Backend | Express 4 + Node.js |
| AI Pipeline | mimo-v2.5-pro (Xiaomi) |
| Frontend | React 19 + Vite + Tailwind CSS |
| CLI | Commander.js |
| Notifications | WeChat Work webhook + Email (Resend/SMTP) |

## Quick Start

```bash
# 1. Install dependencies
npm install
cd src/client && npm install && cd ../..
cd src/cli && npm install && cd ../..

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase, ZLBX, mimo, and WeChat credentials

# 3. Run database migrations
# Execute SQL files in supabase/migrations/ in order via Supabase Dashboard

# 4. Start dev server
npm run dev         # Backend on :3200
cd src/client && npm run dev  # Frontend on :5173

# 5. Verify workspace
npm run check
```

## Environment Variables

See [.env.example](.env.example) for the full list. Key variables:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (backend only) |
| `SUPABASE_ANON_KEY` | Anonymous key (frontend) |
| `ZLBX_API_KEY` | Zhiliao Biaoxun API key |
| `MIMO_API_KEY` | mimo AI pipeline key |
| `WECOM_WEBHOOK_URL` | WeChat Work bot webhook |
| `CORS_ORIGIN` | Allowed origins (comma-separated) |
| `LOG_LEVEL` | pino log level (default: info) |

## Project Structure

```
├── src/
│   ├── server/          # Express backend
│   │   ├── routes/      # API routes (13 endpoints)
│   │   ├── services/    # Business logic (18 services)
│   │   └── middleware/   # Auth, validation
│   ├── client/          # React frontend (Vite)
│   │   └── src/pages/   # 12 pages
│   └── cli/             # cr CLI tool
│       └── commands/     # Viewer + Admin commands
├── supabase/migrations/ # Database schema (26 files)
├── scripts/             # Utilities & test scripts
├── tests/               # Unit + integration + E2E tests
└── docs/                # Design docs (15 files)
```

## CLI Usage

```bash
# Viewer commands
npm run cli -- list             # Browse notices
npm run cli -- search "运维"     # Search notices
npm run cli -- match            # Strong matches
npm run cli -- qual             # Company qualifications
npm run cli -- status           # System status

# Admin commands (requires admin login)
npm run cli -- login
npm run cli -- admin qual:add --type ISO --name "ISO9001"
npm run cli -- admin stats
npm run cli -- admin keyword:list
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check (DB connectivity) |
| POST | `/api/auth/login` | Login |
| GET | `/api/notices` | List bidding notices |
| GET | `/api/notices/:id` | Notice detail |
| GET | `/api/match` | Match results |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/dashboard/trend` | Trend data |
| GET | `/api/qualifications` | Qualifications |
| GET | `/api/contracts` | Contracts |
| GET | `/api/platforms` | Platform sources |
| GET | `/api/config` | System config |
| POST | `/api/crawl` | Trigger crawl |
| GET | `/api/notifications` | Notifications |

Full API spec: [docs/openapi.yaml](docs/openapi.yaml)

## Testing

```bash
npm run test:unit              # Unit tests
node tests/cr-backend-dual-role-test.js --role all  # Backend integration
node scripts/e2e-test.js       # Playwright E2E
```

## Deployment

```bash
# Docker
docker compose up -d

# Manual
NODE_ENV=production npm start
```

See [docs/deployment-checklist.md](docs/deployment-checklist.md) for production deployment guide.
