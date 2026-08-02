# ProcureAI — AI Procurement System

An AI-powered procurement management platform. Manage purchase requests, vendor quotes, purchase orders, deliveries, and inventory — with an autonomous procurement agent that analyzes requests, scores vendors, and recommends the best purchase decisions.

**Live demo credentials** (seeded automatically):

| Role | Email | Password |
| --- | --- | --- |
| Admin | `pashupati@shivnathmill.com` | `password123` |
| Procurement Officer | `ravi@shivnathmill.com` | `password123` |
| Dept Manager | `rikesh@shivnathmill.com` | `password123` |

---

## Tech Stack

- **Frontend:** React 18, Vite, Material UI, Recharts
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL
- **Email (dev):** MailDev
- **AI:** Groq (LLaMA/Qwen/Gemma via `GROQ_API_KEY`) — *optional*

---

## Prerequisites

Pick one:

- **Option A — Docker (recommended, no manual database setup):**
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Docker Compose)
- **Option B — Local development:**
  - Node.js 18+ (tested with 20)
  - A running PostgreSQL server

---

## Quick Start with Docker (recommended)

```bash
# 1. Clone the repo
git clone <repo-url>
cd AI-Procurement-System

# 2. (Optional) Configure environment variables
cp .env.example .env

# 3. Build and start everything (Postgres, backend, frontend, MailDev)
docker compose up --build
```

That's it. On the very first run, the backend container automatically:

1. Waits for Postgres to become healthy
2. Runs `prisma db push` to create all tables
3. Seeds the demo data (users, vendors, purchase requests, quotes, inventory)
4. Starts the API server

### Access the app

| Service | URL |
| --- | --- |
| Website | http://localhost:5173 |
| Backend API | http://localhost:5001/api/health |
| MailDev (email preview) | http://localhost:1080 |
| PostgreSQL | localhost:5432 (`procureai` / `procureai`) |

> **Note:** Skip the seed on a fresh DB by setting `SEED_DATABASE=false` in `.env`. The seed only runs when the database is empty, so your data survives restarts.

### Useful Docker commands

```bash
docker compose up --build -d   # build + start in background
docker compose logs -f backend # watch backend logs
docker compose down            # stop services (data persists)
docker compose down -v         # stop AND delete the database volume (full reset)
docker compose restart         # restart services
```

---

## Local Development (without Docker)

### 1. Install dependencies

```bash
# From the repo root — installs root, backend, and frontend packages
npm run install:all
```

The backend has a `postinstall` hook that runs `prisma generate` automatically, so the Prisma Client is generated for you.

### 2. Configure the database

Create a PostgreSQL database, then copy the example env file and fill it in:

```bash
cp backend/.env.example backend/.env
```

```bash
# backend/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/procureai"
JWT_SECRET="some-long-random-string"
PORT=5001
```

> `PORT` must be `5001` — the frontend dev server proxies `/api` to `http://localhost:5001`.

### 3. Create tables and seed demo data

```bash
npm run db:generate   # generate the Prisma client (already done on install)
npm run db:push       # create/update tables from schema.prisma
npm run db:seed       # seed demo users, vendors, PRs, quotes, inventory
```

### 4. Start the development servers

```bash
npm run dev
```

This starts three processes together:

- **MailDev** — SMTP + web UI (http://localhost:1080) for previewing sent emails
- **Backend** — Express API on http://localhost:5001
- **Frontend** — Vite dev server on http://localhost:5173

Open http://localhost:5173 and log in with one of the demo accounts above.

---

## Environment Variables

### Root `.env` (used by Docker Compose)

| Variable | Default | Description |
| --- | --- | --- |
| `JWT_SECRET` | `dev-secret-change-me` | Secret used to sign auth tokens. **Change in production.** |
| `GROQ_API_KEY` | *(empty)* | Enables AI chat + autonomous agent. Get one free at https://console.groq.com |
| `SEED_DATABASE` | `true` | Whether to seed demo data when the database is empty |

### Backend `backend/.env` (used for local dev)

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | Token signing secret |
| `PORT` | `5001` | Backend port (frontend proxy expects `5001`) |
| `FRONTEND_URL` | `http://localhost:5173` | Base URL used in email links |
| `SMTP_HOST` / `SMTP_PORT` | `localhost` / `1025` | MailDev SMTP endpoint |
| `MAILDEV_URL` | `http://localhost:1080` | MailDev web UI for email previews |
| `GROQ_API_KEY` | *(empty)* | Optional — enables AI features |

The app works without `GROQ_API_KEY`; AI chat and the agent fall back to deterministic local logic.

---

## Project Structure

```
.
├── docker-compose.yml      # Postgres + backend + frontend + MailDev
├── backend/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.js         # Demo data
│   ├── scripts/
│   │   └── bootstrap.js    # Container startup: wait for DB → push → seed → run
│   └── src/
│       ├── index.js        # Express app entry
│       ├── routes/         # API route handlers
│       ├── services/       # Email, AI, notifications, scheduler, agent, ...
│       └── middleware/     # Auth, rate limiting
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf          # Serves the SPA and proxies /api → backend
│   └── src/
│       ├── pages/          # React pages (dashboards, forms, ...)
│       ├── components/     # Reusable UI components
│       └── context/        # Auth, theme, toast providers
├── tests/                  # Playwright end-to-end tests
└── playwright.config.js
```

---

## Running Tests

Playwright end-to-end tests are included (requires the app running at http://localhost:5173):

```bash
npm run test:install   # one-time: installs the Chromium browser for Playwright
npm run test           # run all e2e tests (headless)
npm run test:headed    # run tests in a visible browser
npm run test:report    # open the HTML report
```

> Run tests against **either** the Docker stack **or** the local dev servers — they share port 5173 and cannot run at the same time.

---

## Troubleshooting

**`docker compose up` says the port is already in use (5432 / 5173 / 5001)**
Another service is using the port. Either stop it, or change the host port mapping in `docker-compose.yml` (e.g. `"5173:80"` → `"5273:80"`).

**Backend logs show database connection errors**
The backend waits and retries for up to 60 seconds, so it usually resolves itself. If it persists, run `docker compose up -d db` first and confirm the `db` container is healthy (`docker compose ps`).

**I want a completely fresh database**
`docker compose down -v` deletes the Postgres volume, then `docker compose up --build` re-creates and re-seeds it.

**Email previews aren't showing in MailDev**
Emails are sent through the `maildev` container (localhost:1025). Check http://localhost:1080. If MailDev is unreachable, the backend logs emails instead of failing.

---

## License

Private project — all rights reserved.
