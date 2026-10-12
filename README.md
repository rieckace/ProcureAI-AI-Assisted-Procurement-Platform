# ProcureAI

ProcureAI is an AI-assisted procurement platform for managing the full purchasing workflow—from purchase requests and vendor sourcing through quote comparison, purchase-order approval, delivery tracking, inventory monitoring, and procurement analytics.

The application is designed for organizations with role-based procurement workflows:

- **Managers** create and track purchase requests for their departments.
- **Procurement officers** manage vendors, collect and compare quotes, generate purchase orders, and track deliveries.
- **Administrators** manage users, invitations, organization settings, and system-wide activity.

## Highlights

- Multi-organization accounts with organization slugs
- JWT authentication with `admin`, `officer`, and `manager` roles
- Purchase-request lifecycle with validated status transitions
- Vendor directory with ratings, delivery performance, defect rates, and product catalogs
- Quote collection, vendor comparison, and vendor quote submission links
- Purchase-order generation, approval, status updates, and printable order views
- Delivery tracking with tracking numbers, estimated arrival, and delivery status
- Inventory management with minimum stock thresholds and low-stock visibility
- Activity logs and in-app notifications
- AI chat assistant and autonomous procurement workflows when a Groq API key is configured
- Procurement analytics and pipeline views
- Email previews through MailDev during local development
- Docker Compose setup for PostgreSQL, MailDev, the Express API, and the React frontend

## Technology stack

### Frontend

- React 18
- Vite
- React Router
- Material UI and Emotion
- Axios
- Recharts
- Vitest and Testing Library

### Backend

- Node.js 20+
- Express 4
- Prisma ORM
- PostgreSQL 16
- JWT and bcryptjs authentication
- Multer for attachments
- Nodemailer and MailDev for email workflows
- OpenAI-compatible client integration for AI features
- `node-cron` for scheduled background work

### Deployment

- Docker Compose
- Nginx serves the built React single-page application
- Nginx proxies `/api` requests to the backend container

## Architecture

```text
                            ┌─────────────────────┐
                            │      PostgreSQL      │
                            │  Prisma data model  │
                            └──────────▲──────────┘
                                       │
┌───────────────┐       /api       ┌───┴────────────┐
│ React + Vite  │ ───────────────▶ │ Express API    │
│ Material UI   │ ◀─────────────── │ JWT + services │
└───────▲───────┘                 └───┬────────────┘
        │                              │
        │                         ┌────┴─────┐
        │                         │ MailDev  │
        │                         │ SMTP/UI  │
        │                         └──────────┘
        │
   Nginx in the production-style frontend container
```

The backend entry point is `backend/src/index.js`. It configures CORS, JSON parsing, request logging, rate limiting, the `/api` routes, the health check, error handling, and the background scheduler. Prisma models the organization, user, vendor, product, purchase-request, quote, purchase-order, delivery, inventory, notification, activity-log, and procurement-pipeline entities in `backend/prisma/schema.prisma`.

The frontend entry point is `frontend/src/main.jsx`, with routes and lazy-loaded pages assembled in `frontend/src/App.jsx`. `frontend/src/api/index.js` provides the Axios client and attaches the JWT stored by `AuthContext` to API requests. In Docker, `frontend/nginx.conf` serves the SPA and proxies API calls to the backend service.

## Prerequisites

For the local development workflow:

- Node.js 20 or newer
- npm
- PostgreSQL 16 or a compatible PostgreSQL instance

For the containerized workflow:

- Docker
- Docker Compose

## Quick start with Docker Compose

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/rieckace/ProcureAI-AI-Assisted-Procurement-Platform.git
   cd ProcureAI-AI-Assisted-Procurement-Platform
   ```

2. Create the root environment file:

   ```bash
   cp .env.example .env
   ```

3. Review `.env` and change `JWT_SECRET`. Add `GROQ_API_KEY` if you want to enable the AI assistant and autonomous procurement features.

4. Build and start the services:

   ```bash
   docker compose up --build
   ```

5. Open the application at [http://localhost:5173](http://localhost:5173).

The Compose stack starts:

| Service | Address | Purpose |
| --- | --- | --- |
| `frontend` | [http://localhost:5173](http://localhost:5173) | React application served by Nginx |
| `backend` | [http://localhost:5001](http://localhost:5001) | Express API |
| `db` | `localhost:5432` | PostgreSQL database |
| `maildev` | [http://localhost:1080](http://localhost:1080) | Development email inbox |

The backend container waits for PostgreSQL, runs `prisma db push`, and seeds demo data on an empty database when `SEED_DATABASE=true`.

To stop the stack:

```bash
docker compose down
```

To stop it and remove the persisted database and uploaded-file volumes:

```bash
docker compose down -v
```

> **Warning:** removing volumes deletes the local PostgreSQL data and uploaded files.

## Local development

### 1. Start PostgreSQL and MailDev

You can start only the infrastructure services with Compose:

```bash
docker compose up -d db maildev
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run seed
```

Update `backend/.env` if your local PostgreSQL credentials differ. The default local configuration expects:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/procureai"
PORT=5001
SMTP_HOST="localhost"
SMTP_PORT="1025"
MAILDEV_URL="http://localhost:1080"
FRONTEND_URL="http://localhost:5173"
```

Start the backend in watch mode:

```bash
npm run dev
```

The API will be available at [http://localhost:5001](http://localhost:5001), with a health check at [http://localhost:5001/api/health](http://localhost:5001/api/health).

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server runs at [http://localhost:5173](http://localhost:5173) and proxies `/api` requests to `http://localhost:5001`.

## Environment variables

The root `.env.example` is used by Docker Compose. The backend also includes `backend/.env.example` for direct local development.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes for the backend | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret used to sign seven-day JWTs; use a long random value outside local development |
| `PORT` | No | Backend port; defaults to `5001` |
| `FRONTEND_URL` | No | Allowed frontend origin; defaults to `http://localhost:5173` |
| `GROQ_API_KEY` | No | Enables configured AI assistant and autonomous-agent features |
| `SMTP_HOST` | No | SMTP host for email workflows; Compose uses `maildev` |
| `SMTP_PORT` | No | SMTP port; Compose uses `1025` |
| `MAILDEV_URL` | No | MailDev web UI URL; Compose uses `http://localhost:1080` |
| `SEED_DATABASE` | No | Set to `false` to skip automatic demo seeding in the backend container |

Do not commit `.env` files or production secrets.

## Demo accounts

When the database is seeded, the demo organization is `shivnath-mill` and all demo accounts use the password `password123`:

| Role | Email |
| --- | --- |
| Admin | `pashupati@shivnathmill.com` |
| Procurement officer | `ravi@shivnathmill.com` |
| Procurement officer | `rithiga@shivnathmill.com` |
| Department manager | `rikesh@shivnathmill.com` |
| Department manager | `kritika@shivnathmill.com` |
| Department manager | `bishal@shivnathmill.com` |

These credentials are for local/demo use only. Change or remove them before exposing an instance publicly.

## Useful commands

Run commands from the relevant application directory.

### Backend

```bash
npm run dev      # Start with Node's watch mode
npm start        # Start the API normally
npm run seed     # Reset and repopulate the database with demo data
npm test         # Run backend authentication middleware tests
```

### Frontend

```bash
npm run dev      # Start the Vite development server
npm run build    # Create a production build in dist/
npm run preview  # Preview the production build locally
npm test         # Run frontend tests once with Vitest
npm run test:watch
```

## API surface

The API is mounted under `/api` and uses Bearer JWT authentication for protected routes. Major route groups include:

- `/api/auth` — registration, login, invitations, profiles, organization lookup, users, and data export
- `/api/purchase-requests` — create, list, edit, cancel, inspect, and transition purchase requests
- `/api/vendors` — manage vendors and vendor product catalogs
- `/api/purchase-requests` and `/api/quotes` — quote collection and vendor quote workflows
- `/api/purchase-orders` — generate, approve, list, and update purchase orders
- `/api/deliveries` — delivery tracking and status updates
- `/api/inventory` — inventory records and stock monitoring
- `/api/analytics` — procurement reporting data
- `/api/activity-logs` — organization activity history
- `/api/notifications` — user notifications
- `/api/chat` — AI assistant messages, suggestions, and provider status
- `/api/agent` — autonomous procurement pipeline operations
- `/api/attachments` — purchase-request attachments
- `/api/email` — email-related development workflows

Use `GET /api/health` to verify that the API is running and can reach PostgreSQL.

## Procurement lifecycle

Purchase requests use the following primary states:

```text
pending → quoted → ordered → delivered
    └──────────────→ rejected
```

The backend validates normal transitions in `backend/src/routes/purchaseRequests.js`. Purchase orders have their own approval and delivery lifecycle, represented by `PurchaseOrder` and `Delivery` records in the Prisma schema.

## Project structure

```text
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # PostgreSQL data model
│   │   └── seed.js             # Demo organization and procurement data
│   ├── scripts/
│   │   └── bootstrap.js        # Wait for DB, sync schema, optionally seed
│   └── src/
│       ├── index.js             # Express application entry point
│       ├── lib/                 # Prisma client, logging, formatting helpers
│       ├── middleware/           # JWT authentication and authorization
│       ├── routes/               # REST API route modules
│       ├── services/             # AI, chat, email, PO, notifications, scheduler, and domain services
│       └── templates/            # Email/document templates
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios API client and tests
│   │   ├── components/           # Shared UI components
│   │   ├── context/              # Auth, theme, and toast providers
│   │   ├── pages/                # Role-aware application screens
│   │   ├── App.jsx               # Routes and lazy-loaded pages
│   │   └── constants.js          # Categories, units, statuses, and visual mappings
│   ├── nginx.conf                # SPA serving and API reverse proxy
│   └── vite.config.js            # Vite development proxy and build settings
├── docker-compose.yml             # PostgreSQL, MailDev, backend, and frontend services
├── .env.example                  # Compose environment template
└── .gitignore
```

## Security and deployment notes

- Replace the development `JWT_SECRET` before deployment.
- Do not use the seeded demo passwords in a public or production environment.
- Configure `FRONTEND_URL` to the real frontend origin in deployed environments.
- Provide a production PostgreSQL connection string and keep database credentials out of version control.
- Set `GROQ_API_KEY` only when AI features are required, and review the data sent to external model providers.
- Review upload storage, SMTP credentials, reverse-proxy settings, and rate limits before production use.

## License

No license file is currently included in this repository. Add a license before distributing or reusing the project publicly.
