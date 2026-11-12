# Hospital Management System (HMS)

A responsive hospital operations platform under active development.

## Current product settings

- Arabic is the default language; the interface switches between full RTL Arabic and LTR English.
- Dark navy medical/SaaS visual system.
- Responsive desktop, tablet and mobile layout.
- EGP is the default financial currency.
- Deployment target: hybrid cloud and hospital network.
- Initial business focus: surgical operations, patients, doctors and inventory.

## Technology

- Frontend: React, Vite, JavaScript, custom responsive CSS, Lucide icons.
- API: Node.js, Express 5, Zod validation, Helmet, rate limiting.
- Database: PostgreSQL 17 with Prisma ORM and committed versioned migrations.
- Authentication: bcrypt password verification and short-lived JWT access tokens.
- Authorization: database-resolved role permissions, user overrides and resource scopes.

## Current frontend

- Login screen connected to `POST /api/auth/login`.
- Authenticated dashboard connected to `GET /api/dashboard/summary`.
- Live list views for operations, patients, doctors, inventory and users.
- Permission-denied and network-error states.
- No hardcoded patient records or fake KPI values are shown.

## Current API modules

- Authentication and identity.
- Patients, doctors, departments and appointments.
- Surgical operations and operation-type management.
- Inventory products, stock receipts and stock movements.
- Dashboard analytics, user administration, dashboard preferences, system settings and audit logs.

## Run locally

### 1. Start PostgreSQL

From the repository root:

```bash
docker compose up -d db
```

### 2. Configure and start the API

```bash
cd server
cp .env.example .env
```

Set a unique database URL and a high-entropy `JWT_ACCESS_SECRET` in `.env`.
For first-time setup, set `SEED_ADMIN_EMAIL` and a unique
`SEED_ADMIN_PASSWORD` (at least 14 characters).

Then run:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### 3. Start the frontend

In a second terminal, from the repository root:

```bash
npm install
```

Create a root `.env.local` with the API URL:

```bash
VITE_API_URL=http://localhost:4000
```

Then run:

```bash
npm run dev
```

Open the Vite URL printed in the terminal. The frontend keeps the short-lived
access token in memory; refreshing the page requires signing in again until the
server-side refresh-session lifecycle is implemented.

## Database migration policy

- Commit every schema change together with its reviewed Prisma migration.
- Use `npx prisma migrate dev --name descriptive_change` only in development.
- Apply committed migrations in deployed environments with `npx prisma migrate deploy`.
- Never use `prisma db push` against staging or production.
- Back up the database before production migrations and test restoration.

## CI

GitHub Actions builds the frontend, starts PostgreSQL 17, validates Prisma,
generates the client, applies committed migrations, verifies migration history,
runs unit and API integration tests, and checks API JavaScript syntax.

## Not production approved yet

This is an active development foundation, not a certified or production-ready
clinical system. Do not enter real patient information or use it for clinical
decisions until comprehensive integration and end-to-end testing, refresh-token
rotation, MFA, session revocation, complete authorization review, encryption,
backup/restore drills, monitoring, privacy/legal review and clinical acceptance
testing are complete.
