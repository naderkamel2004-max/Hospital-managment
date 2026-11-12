# Hospital Management System — API

Node.js / Express API backed by PostgreSQL and Prisma ORM.

## Current status

The repository contains the initial versioned PostgreSQL migration at
`prisma/migrations/20261112010000_init/migration.sql`. CI applies this migration
to a fresh PostgreSQL 17 instance using `prisma migrate deploy`, checks migration
history, runs unit tests, validates the Prisma schema, and builds the frontend.

This is an actively developed foundation, not a production-approved clinical
system. Do not enter real patient information until the production-readiness
items below have been completed and independently reviewed.

## Local setup

1. Install Docker Desktop (or another PostgreSQL 17 service) and Node.js 22.
2. Copy `.env.example` to `.env`; set `DATABASE_URL` and a unique,
   high-entropy `JWT_ACCESS_SECRET` (at least 32 random bytes).
3. From the repository root, start PostgreSQL: `docker compose up -d db`.
4. From this directory run:
   ```bash
   npm install
   npx prisma generate
   npx prisma migrate deploy
   ```
5. Set `SEED_ADMIN_EMAIL` and a unique `SEED_ADMIN_PASSWORD` (at least
   14 characters) in `.env`, then run `npm run db:seed`.
6. Start the API with `npm run dev`. Run unit tests with `npm test`.

## Database migration policy

- Never use `prisma db push` against staging or production databases.
- For a schema change, edit `prisma/schema.prisma`, then create and review a
  migration locally with `npx prisma migrate dev --name descriptive_change`.
- Commit both the schema and the generated
  `prisma/migrations/<timestamp>_<name>/migration.sql` directory.
- Review generated SQL for destructive changes, data backfills, indexes,
  foreign-key behavior and lock duration before merging.
- Apply committed migrations in deployed environments with
  `npx prisma migrate deploy`; do not use `migrate dev` in production.
- Back up the database before production migrations and verify restore procedures.

## API routes

- Health and identity: `GET /api/health`, `POST /api/auth/login`,
  `GET /api/me`.
- Patients: `GET/POST /api/patients`, `GET/PATCH /api/patients/:id`.
- Departments: `GET /api/departments`.
- Doctors: `GET/POST /api/doctors`.
- Appointments: `GET/POST /api/appointments`.
- Operations: `GET/POST /api/operations`, `GET /api/operations/:id`,
  `GET /api/operations/analytics`, `GET/POST /api/operations/types`.
- Dashboard: `GET /api/dashboard/summary`.
- User administration (Super Admin only): `GET/POST /api/users`,
  `PATCH /api/users/:id`, `PUT /api/users/:id/permissions`,
  `PUT /api/users/:id/scopes`, `GET /api/users/permissions`.
- System Studio: `GET/PUT /api/studio/dashboard`,
  `GET/PUT /api/studio/settings` (system settings are owner-only).
- Inventory: see route implementation under `src/routes/inventory.js`.
- Audit logs: `GET /api/audit-logs` (Super Admin only).

Clinical endpoints require authentication and explicit permissions. Financial
operation fields require `operations.costs.read`. User scopes can limit records
to selected doctors and/or patients. The Super Admin role is protected from
user-management changes. The seed creates common operation types and base
permissions but no patient data.

## Production-readiness gates

Before real patient data or clinical use: add integration and end-to-end tests
for all critical workflows; complete refresh-token rotation, session revocation,
MFA and password recovery; review authorization scopes on every endpoint;
complete backup/restore drills, monitoring, encryption/key management and
incident response; perform privacy/legal review and clinical acceptance testing.
