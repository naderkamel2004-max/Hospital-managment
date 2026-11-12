# Hospital Management System (HMS)

**Milestone 1: Professional Dashboard & Frontend Foundation**

## Approved product settings
- Design: Professional Light (blue, white, light gray)
- Default language: Arabic
- Arabic direction: RTL across the document and application
- English direction: LTR across the document and application
- Sidebar: right in Arabic; left in English
- Scope: all hospital departments
- Deployment target: hybrid (cloud + hospital local network)

## Frontend stack
- React
- Vite
- JavaScript (ES modules)
- Custom responsive CSS
- Lucide React icons
- Cairo and Inter typography

## Dashboard features
- Hospital overview and KPI cards
- Weekly activity chart
- Department activity distribution
- Recent patient activity table with search
- Quick navigation actions
- Responsive layout

## Department navigation
Dashboard, Patients, Appointments, Doctors, Medical Records, Pharmacy, Inventory, Laboratory, Radiology, Nursing, Billing, Reports, Users & Roles, Settings.

## Run locally
```bash
npm install
npm run dev
npm run build
```

## CI
GitHub Actions workflow at `.github/workflows/build.yml` installs dependencies and runs `npm run build` on pushes and pull requests targeting `main`.

## Planned backend architecture
- REST API and domain services
- PostgreSQL database
- Secure authentication with sessions or JWT and refresh-token rotation
- Server-side role-based access control (RBAC)
- Audit logs, backups, encryption and hybrid deployment

## Important implementation status
The current milestone is a frontend starter using sample dashboard data. Authentication, database integration, real patient records, clinical workflows, pharmacy transactions, billing and audit logging are **not implemented yet**. Do not use real patient data until security, privacy, backups and applicable healthcare requirements have been implemented and reviewed.
