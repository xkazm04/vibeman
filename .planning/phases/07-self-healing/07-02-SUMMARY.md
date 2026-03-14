---
phase: 07-self-healing
plan: 02
subsystem: self-healing
tags: [error-classification, patch-lifecycle, retry-tracking, pruning]

requires:
  - phase: 07-self-healing-01
    provides: healing lifecycle migration (columns expires_at, application_count, success_count) and test scaffold
provides:
  - Patch lifecycle with expiry, pruning, and effectiveness tracking
  - Repository methods for classification persistence and retry tracking
  - Consolidated canonical classifier usage in reviewStage
affects: [07-self-healing-03, conductor-orchestrator]

tech-stack:
  added: []
  patterns: [direct-db-access-for-healing, patch-pruning-lifecycle]

key-files:
  created: []
  modified:
    - src/app/features/Manager/lib/conductor/selfHealing/promptPatcher.ts
    - src/app/features/Manager/lib/conductor/conductor.repository.ts
    - src/app/features/Manager/lib/conductor/stages/reviewStage.ts
    - src/app/features/Manager/lib/conductor/selfHealing/healingAnalyzer.ts
    - src/app/features/Manager/lib/conductor/review/reviewTypes.ts
    - tests/conductor/self-healing.test.ts

key-decisions:
  - "Direct DB access in promptPatcher (matching orchestrator savePatchToDb pattern) instead of HTTP fetch"
  - "Patch pruning uses two criteria: expiry date and low success rate (< 30% after 3+ applications)"
  - "healingAnalyzer expiresAt moved into Task 1 to unblock test verification (Rule 3 deviation)"

patterns-established:
  - "Patch lifecycle: prunePatches before pipeline start, updatePatchStats after each run"
  - "Repository retry tracking: incrementRetryCount creates/updates conductor_errors rows"

requirements-completed: [HEAL-01, HEAL-02, HEAL-03, HEAL-04]

duration: 4min
completed: 2026-03-14
---

# Phase 7 Plan 2: Healing Lifecycle Summary

**Patch lifecycle with pruning/expiry/effectiveness tracking, canonical classifier consolidation, and repository retry methods**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T22:10:29Z
- **Completed:** 2026-03-14T22:14:38Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- promptPatcher converted from HTTP fetch to direct DB access with full lifecycle: savePatch with expires_at, prunePatches, updatePatchStats
- conductorRepository extended with saveClassificationsOnRun, getRetryCount, and incrementRetryCount methods
- reviewStage consolidated to use canonical classifyError from errorClassifier.ts (removed duplicate local functions)
- healingAnalyzer sets expiresAt on all generated patches
- All 17 self-healing tests passing (HEAL-01 through HEAL-04, no skipped tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Patch lifecycle and repository methods** - `46f6bbe8` (feat)
2. **Task 2: Consolidate classifier and update reviewStage** - `f56f83a3` (feat)

## Files Created/Modified
- `src/app/features/Manager/lib/conductor/selfHealing/promptPatcher.ts` - Direct DB patch lifecycle: save, prune, update stats, build context with expiry filter
- `src/app/features/Manager/lib/conductor/conductor.repository.ts` - Classification persistence and retry tracking methods
- `src/app/features/Manager/lib/conductor/stages/reviewStage.ts` - Uses canonical classifyError, local duplicates removed
- `src/app/features/Manager/lib/conductor/selfHealing/healingAnalyzer.ts` - Sets expiresAt on generated patches
- `src/app/features/Manager/lib/conductor/review/reviewTypes.ts` - Added optional runId to ReviewStageInput
- `tests/conductor/self-healing.test.ts` - 17 active tests covering all HEAL requirements

## Decisions Made
- Direct DB access in promptPatcher (matching orchestrator savePatchToDb pattern) replaces HTTP fetch for reliability
- Patch pruning uses two criteria: time-based expiry AND low success rate (< 30% after 3+ applications)
- Added optional runId to ReviewStageInput to pass pipeline run ID to canonical classifier

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved healingAnalyzer expiresAt to Task 1**
- **Found during:** Task 1 (test verification)
- **Issue:** Test for expiresAt on generated patches needed healingAnalyzer change (planned for Task 2) to pass during Task 1 verification
- **Fix:** Applied healingAnalyzer expiresAt change in Task 1 alongside promptPatcher/repository changes
- **Files modified:** src/app/features/Manager/lib/conductor/selfHealing/healingAnalyzer.ts
- **Verification:** All 17 tests pass
- **Committed in:** 46f6bbe8 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added runId to ReviewStageInput**
- **Found during:** Task 2 (reviewStage classifier consolidation)
- **Issue:** Canonical classifyError needs pipelineRunId but ReviewStageInput had no runId field
- **Fix:** Added optional runId field to ReviewStageInput interface
- **Files modified:** src/app/features/Manager/lib/conductor/review/reviewTypes.ts
- **Verification:** TypeScript compiles, falls back to empty string if not provided
- **Committed in:** f56f83a3 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Healing lifecycle fully wired: patches have expiry, pruning, and effectiveness tracking
- Canonical classifier consolidated in reviewStage
- Repository supports retry counting for bounded retry implementation
- Ready for Plan 03 (orchestrator integration of lifecycle methods)

---
*Phase: 07-self-healing*
*Completed: 2026-03-14*
