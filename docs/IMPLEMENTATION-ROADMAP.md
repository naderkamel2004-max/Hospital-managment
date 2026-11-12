# HMS Implementation Roadmap

## Completed foundation
- React/Vite frontend build with Arabic default, RTL Arabic and LTR English.
- Express API bootstrap with Helmet, CORS, JSON size limit and rate-limited login.
- Prisma/PostgreSQL schema for identity, RBAC, departments, patients,
  appointments, encounters, admissions, pharmacy inventory, prescriptions,
  laboratory orders, invoices, operations and audit logs.
- Password verification with bcrypt and short-lived signed access JWT.
- Authorization is resolved from the database on every authenticated request,
  so account status, role grants, user overrides and scopes take effect promptly.
- Unit tests cover role permission grants, user allow/deny overrides and empty inputs.
- Initial PostgreSQL migration is committed and CI applies it to a clean PostgreSQL
  17 service with `prisma migrate deploy`, then verifies migration status.
- CI builds the frontend, validates/generates Prisma Client, runs backend tests
  and checks API JavaScript syntax.

## Next milestones — ordered

### 1. Database and backend reliability
- Add integration tests against PostgreSQL for login, RBAC, patient scopes,
  operation creation, stock deduction and audit logging.
- Add transaction and concurrency tests for stock movements and operation workflows.
- Add database constraints and indexes based on actual query plans.
- Implement safe edit/cancel/reversal workflows with immutable stock movement history.
- Review and test data retention, deletion and audit policies.

### 2. Authentication and security
- Refresh-token rotation with hashed, revocable server-side sessions and
  HttpOnly, Secure, SameSite cookies.
- MFA, account lockout, password reset and session/device management.
- Review CORS, rate limits, secret management, transport encryption and security headers.
- Add authorization tests for every route and every resource scope.

### 3. Frontend integration
- Replace hardcoded dashboard sample data with authenticated API calls.
- Add login, protected routes, session expiry handling, loading/error/empty states.
- Build responsive dark-navy application shell with Arabic RTL and English LTR.
- Add role-aware navigation and per-user dashboard preferences.

### 4. Hospital workflows
- Complete patients, doctors, departments and appointments.
- Complete operation management, configurable operation types, consumables,
  medication costs, inventory receipts, FIFO stock, cancellations and analytics.
- Then implement admissions, encounters, prescriptions, laboratory and invoices.
- Add exports, search, filters and audit visibility where permissions allow.

### 5. Deployment and operational readiness
- Define hybrid on-prem/cloud topology and environment-specific deployment.
- Add automated backups, off-site copies, restore drills, monitoring and alerting.
- Add CI integration/e2e coverage, deployment approvals and rollback runbooks.
- Complete privacy/legal review, clinical acceptance testing and user training.

## Safety and scope

This is an actively developed foundation, not a production-ready or certified
clinical system. Do not store real patient data or use it for clinical decisions
until all relevant workflows, access controls, audit coverage, privacy/security
review, disaster recovery and local regulatory requirements have been implemented
and independently validated.
