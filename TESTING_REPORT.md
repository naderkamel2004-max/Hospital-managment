# Testing Report

**Assessment date:** 2026-11-12

## Latest completed CI run before the patient-profile editing increment

- Workflow: Build Hospital Management System
- Run: [43137138590](https://github.com/naderkamel2004-max/Hospital-managment/actions/runs/43137138590)
- Commit: `7072d48eee5caa5accd369d22601ec27e5a87939`
- Overall result: **success**
- `backend-check`: success
  - Install API dependencies
  - Validate Prisma schema
  - Generate Prisma client
  - Apply versioned migrations to clean PostgreSQL 17
  - Verify migration history
  - Run backend unit/integration tests included in `npm test`
  - Check API JavaScript syntax
- `frontend-build`: success
  - Install frontend dependencies
  - Run `npm run build`

## Verification limitations

The coding session has GitHub repository and Actions access, but no attached local checkout or shell execution environment for this repository. Therefore no local command execution is claimed. GitHub Actions is the execution evidence.

The patient-profile editing UI increment added after the run above still requires its own Actions result. Do not describe that increment as CI-verified until its run completes successfully.

## Known coverage gaps
- No complete end-to-end browser test suite for all clinical workflows.
- No exhaustive route-by-route permission and resource-scope matrix yet.
- No production-like multi-user concurrency or load acceptance.
- No backup/restore drill or disaster-recovery evidence.
- No clinical user acceptance or regulatory sign-off.


## New increment awaiting CI
Inventory adjustment API and integration coverage were added after the last successful run. The integration test checks denial without `inventory.adjust`, successful count correction from 5 to 6, and creation of a `STOCK_ADJUSTMENT` movement. This code has not been locally executed; await GitHub Actions for validation.


## Failure analysis and correction
The inventory-adjustment CI run exposed a stale expectation in the pre-existing operation stock test: the new physical count raised the initial batch from 5 to 6, so consuming 2 leaves 4 (not 3), and cancellation restores 6 (not 5). The assertions were corrected to reflect the actual ledger sequence. This is a test-fixture expectation correction, not a production-code workaround; rerun CI is required.


## Teardown failure found in CI
The inventory and appointment assertions executed, but the integration test after-hook failed because it attempted to delete the patient before deleting the appointment referencing that patient. The fixture cleanup order is corrected to delete the appointment first. CI must be rerun to verify teardown succeeds.


## Appointment management UI increment
Added the appointment screen with live API integration and permission-gated creation/status actions. The screen loads patient, doctor and department choices only when appointment creation is permitted. Frontend build and CI for this increment are pending.
