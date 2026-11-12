# HMS API

Node.js / Express API backed by PostgreSQL and Prisma.

## Local setup
1. Copy `.env.example` to `.env` and set a strong, unique `JWT_ACCESS_SECRET`.
2. Start PostgreSQL using `docker compose up -d db` from the repository root.
3. From this directory run `npm install`, `npx prisma generate`, then `npx prisma migrate dev --name init`.
4. Set `SEED_ADMIN_EMAIL` and a unique `SEED_ADMIN_PASSWORD` in `.env` (at least 14 characters), then run `npm run db:seed` once.
5. Start the API with `npm run dev`.

## API routes
- `GET /api/health`, `POST /api/auth/login`, `GET /api/me`.
- Patients: `GET/POST /api/patients`, `GET/PATCH /api/patients/:id`.
- Departments: `GET /api/departments`.
- Doctors: `GET/POST /api/doctors`.
- Appointments: `GET/POST /api/appointments`.
- Operations: `GET/POST /api/operations`, `GET /api/operations/:id`, `GET /api/operations/analytics`, `GET/POST /api/operations/types`.
- Dashboard: `GET /api/dashboard/summary`.
- User administration (Super Admin only): `GET/POST /api/users`, `PATCH /api/users/:id`, `PUT /api/users/:id/permissions`, `PUT /api/users/:id/scopes`, `GET /api/users/permissions`.
- System Studio: `GET/PUT /api/studio/dashboard`, `GET/PUT /api/studio/settings` (system settings are owner-only).

All clinical endpoints require authentication and explicit permissions. Financial operation fields require `operations.costs.read`. User scopes can limit records to selected doctors and/or patients. The Super Admin role is protected from user-management changes. The seed creates common operation types and base permissions but no patient data.

This is an actively developed foundation, not yet a certified or production-approved clinical system. Before real patient data: complete migrations, automated integration tests, deployment hardening, MFA/session revocation, backup/restore drills, privacy/legal review, and clinical acceptance testing.
