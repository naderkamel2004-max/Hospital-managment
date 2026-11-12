# HMS API foundation

Requires Node.js 22+ and PostgreSQL 17+.

1. Copy `.env.example` to `.env` and replace every secret/password.
2. Start PostgreSQL from the repository root: `docker compose up -d db`.
3. From this directory run `npm install`.
4. Run `npx prisma generate` then `npx prisma migrate dev --name init`.
5. Start API: `npm run dev`.

Endpoints:
- `GET /api/health` — liveness.
- `POST /api/auth/login` — email/password; returns a short-lived bearer access token.
- `GET /api/me` — authenticated identity.

No default/admin account is seeded. Provision users and roles through a controlled administrative process before enabling login.
