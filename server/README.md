# HMS API

Node.js / Express API backed by PostgreSQL and Prisma.

## Local setup
1. Copy `.env.example` to `.env` and set a strong, unique `JWT_ACCESS_SECRET`.
2. Start PostgreSQL using `docker compose up -d db` from the repository root.
3. From this directory run `npm install`, `npx prisma generate`, then `npx prisma migrate dev --name init`.
4. Start the API with `npm run dev`.

## Endpoints
- `GET /api/health` — liveness check.
- `POST /api/auth/login` — email/password login.
- `GET /api/me` — current authenticated user.
- `GET /api/departments` — active departments (permission: `departments.read`).
- `GET /api/patients?page=1&pageSize=20&q=` — paginated patient search (permission: `patients.read`).
- `GET /api/patients/:id` — patient profile and recent encounters/appointments.
- `POST /api/patients` and `PATCH /api/patients/:id` — patient registration and update.
- `GET /api/appointments?from=ISO&to=ISO` — appointments in a date range.
- `POST /api/appointments` — create an appointment with patient/doctor/department validation.

All clinical endpoints require authentication and explicit RBAC permissions. Patient data is not seeded with real information. Do not use production patient data until deployment security, backup/restore, privacy, audit, and clinical acceptance testing are complete.
