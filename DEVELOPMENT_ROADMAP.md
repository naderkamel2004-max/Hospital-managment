# Development Roadmap

This roadmap is ordered by dependencies and operational risk. Update it when an increment is implemented and verified.

## Phase 1 — Core clinical and operational workflows
- [x] Patient create/list/detail/update API
- [x] Patient profile and operation/appointment history UI
- [x] Permission-gated patient profile editing UI
- [x] Doctor list/create/update API and edit UI
- [x] Surgical operation creation and status lifecycle
- [x] FIFO stock deduction and cancellation reversal
- [x] Inventory product catalog and stock receipts
- [ ] Patient encounter creation, editing and closure
- [x] Appointment reschedule/status/cancel API with scope checks, concurrency protection and audit trail (CI verification pending)\n- [ ] Appointment create/reschedule/status/cancel UI and schedule conflict UX
- [ ] Operation detail, edit safeguards and complete UI
- [ ] Doctor deactivate/reactivate with audit trail
- [x] Inventory adjustment API with count-based quantity correction, concurrency guard, movement and audit records (CI verification pending)\n- [ ] Inventory stock count UI, movement history, returns and transfers
- [ ] Department CRUD and assignment workflows
- [ ] Admission, discharge, transfer, ward and bed management

## Phase 2 — Administration and reporting
- [ ] User create/edit/deactivate and session administration
- [ ] Role and permission administration UI
- [ ] Resource-scope assignment UI
- [ ] Complete operational reports and exports
- [ ] System Studio settings and dashboard preferences

## Phase 3 — Clinical extensions
- [ ] Prescriptions and dispensing
- [ ] Laboratory orders and results
- [ ] Billing, invoices and payments
- [ ] Patient document/attachment handling with access controls

## Phase 4 — Release readiness
- [ ] Exhaustive route-level RBAC and resource-scope test matrix
- [ ] End-to-end multi-user and concurrency testing
- [ ] Security and privacy review
- [ ] Backup automation, off-site retention and restore drills
- [ ] Hybrid deployment topology, monitoring, alerting and rollback
- [ ] Clinical acceptance, staff training and regulatory review

## Working rules
- Implement small increments and preserve existing architecture.
- Validate each increment in CI before marking it complete.
- Never count a UI-only or schema-only feature as complete.
- Never use real patient data in development or CI.
- Production deployment and destructive data operations require explicit authorization.
