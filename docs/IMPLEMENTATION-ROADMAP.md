# HMS Implementation Roadmap

## Milestone 1 — Frontend foundation (existing)
- React/Vite dashboard, Arabic default, RTL Arabic and LTR English.
- Department navigation and sample dashboard data.

## Milestone 2 — Backend foundation (this commit)
- Express API bootstrap with Helmet, CORS, JSON size limit and rate-limited login.
- Prisma/PostgreSQL data model for identity, RBAC, departments, patients, appointments, encounters, admissions, pharmacy inventory, prescriptions, laboratory orders, invoices and audit logs.
- Password verification with bcrypt; short-lived signed access JWT; permission middleware.
- Health endpoint and authenticated identity endpoint.

## Milestone 3 — Domain APIs
Implement validated, permission-protected CRUD and workflows for each clinical and administrative module, with pagination, transactions, concurrency controls and audit events.

## Milestone 4 — Production security and operations
Refresh-token rotation using hashed, revocable server-side tokens and HttpOnly Secure SameSite cookies; MFA; account lockout; password reset; session revocation; encryption and key management; backups and restore drills; monitoring; retention policy; threat modeling and security testing.

## Milestone 5 — Integration and deployment
Connect the UI to the API, add integration/e2e tests, CI for frontend and backend, containerized deployment, environment-specific configuration, and hybrid on-prem/cloud topology.

## Safety and scope
This is a foundation, not a production-ready clinical system. Do not store real patient data or use for clinical decisions until domain workflows, access controls, audit coverage, privacy/security review, disaster recovery and local regulatory requirements have been implemented and validated. The initial login endpoint returns an access token; refresh-token/session lifecycle and user provisioning are not implemented yet.
