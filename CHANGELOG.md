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
