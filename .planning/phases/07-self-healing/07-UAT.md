---
status: complete
phase: 07-self-healing
source: 07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md
started: 2026-03-14T22:30:00Z
updated: 2026-03-14T22:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Start the application from scratch (`npm run dev`). Server boots without errors, migrations run (including new migration 206 for healing lifecycle columns), and the app loads in the browser without errors.
result: pass

### 2. Error Classification Visible on Run Record
expected: Trigger a conductor run that encounters an execution error. After the run completes (or fails), check the run record — the error classification (syntax, dependency, logic, or timeout) should be visible on the run status, stored as error_classifications JSON on the conductor_runs record.
result: pass

### 3. Healing Retry on Failure
expected: When an execution failure occurs, the system should automatically generate a healing patch and retry the task. Retries are bounded to a maximum of 3 attempts per error class. If the error persists after 3 retries, it stops retrying and reports the failure.
result: pass

### 4. Healing History Shows Lifecycle Fields
expected: Open the healing history (GET /api/conductor/healing). Each patch entry should show: expiresAt (timestamp ~7 days from creation), applicationCount, successCount, and successRate (computed ratio). These fields should be visible in the healing panel UI.
result: pass

### 5. Stale Patch Pruning at Startup
expected: If expired or ineffective patches exist (expired = past expires_at date, ineffective = success rate < 30% after 3+ applications), they should be automatically pruned when the conductor pipeline starts a new run. The pruned patches should no longer appear in the active healing context.
result: pass

### 6. Patch Effectiveness Tracking
expected: After a conductor run completes, patches that were active during the run should have their stats updated — application_count incremented, and success_count incremented if the run succeeded. This tracking enables the pruning of ineffective patches over time.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
