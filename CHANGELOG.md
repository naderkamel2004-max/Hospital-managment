# Changelog

All notable project increments are recorded here.

## 2026-11-12
- Added permission-gated doctor editing UI connected to the doctor update API.
- Verified preceding commit `7072d48` with GitHub Actions: backend checks and frontend build succeeded.
- Added permission-gated patient profile editing UI connected to the existing scoped patient update API.
- Added responsive styling for patient profile editing and doctor edit actions.
- Added durable project completion, roadmap, testing, changelog and autonomous-work-state documents.
- Patient profile editing awaits its own GitHub Actions result.

- Added inventory adjustment endpoint using an optimistic quantity check, immutable stock movement and audit event; introduced `inventory.adjust` permission and integration coverage.

- Added appointment rescheduling and controlled status transitions with resource-scope enforcement, exact-time doctor collision detection, optimistic concurrency and audit logging; added `appointments.update` permission and integration coverage.

- Corrected operation stock integration expectations to include the prior physical-count adjustment (6 counted, 2 consumed, 4 remaining, 6 restored).

- Fixed integration-test fixture teardown order so appointment records are deleted before their referenced patient, avoiding a PostgreSQL foreign-key violation.

- Added Arabic/English appointment management UI for booking, confirmation, rescheduling, cancellation, check-in and completion; actions are permission-gated and refresh the live API list.

- Added inventory movement history API and UI, plus per-batch physical count correction with reason capture and permission-gated submission. Zero-quantity batches remain visible for reconciliation.

- Added department create/update/deactivate API with normalized unique codes, strict validation, dedicated `departments.manage` permission and audit records; added integration coverage for permission enforcement and update.

- Added department administration UI for create/edit/activate/deactivate with live API integration and permission-gated controls.

- Corrected department route permission layering so users with `departments.manage` can write without an unnecessary `departments.read` grant; GET remains protected by `departments.read`.
