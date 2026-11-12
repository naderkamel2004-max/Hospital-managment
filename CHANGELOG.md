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
