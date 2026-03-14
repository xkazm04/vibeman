---
phase: 01-foundation
plan: 01
subsystem: database, types
tags: [typescript, sqlite, discriminated-union, migration, conductor, tdd]

requires: []
provides:
  - StageIO discriminated union with per-stage type safety
  - GoalInput type with structured constraint fields
  - PipelineContext type for stage function signatures
  - Migration 200 adding conductor_runs and goals columns
  - Wave 0 test stubs for FOUND-01, FOUND-02, FOUND-03, GOAL-01
affects: [01-02, 01-03, 01-04]

tech-stack:
  added: []
  patterns:
    - "StageIO mapped type pattern for stage-level type discrimination"
    - "StageFn<S> generic for typed stage function signatures"

key-files:
  created:
    - src/app/db/migrations/200_conductor_foundation.ts
    - tests/conductor/stage-contracts.test.ts
    - tests/conductor/state-persistence.test.ts
    - tests/conductor/run-history.test.ts
    - tests/conductor/goal-input.test.ts
  modified:
    - src/app/features/Manager/lib/conductor/types.ts
    - src/app/db/migrations/index.ts
    - src/app/features/Manager/components/conductor/PipelineControls.tsx
    - src/app/features/Manager/components/conductor/RunHistoryTimeline.tsx
    - src/app/features/Manager/lib/conductor/conductorStore.ts

key-decisions:
  - "Existing stage I/O types (ScoutResult, TriageResult, etc.) kept as-is; new input types added alongside"
  - "StageIO uses existing BatchDescriptor and ExecutionResult[] rather than redefining"
  - "process_log column added idempotently (already exists in some DBs from original schema)"

patterns-established:
  - "StageIO[S]['input'] / StageIO[S]['output'] for compile-time stage contract enforcement"
  - "StageFn<S> = (ctx: PipelineContext, input: StageInput<S>) => Promise<StageOutput<S>>"

requirements-completed: [FOUND-01, FOUND-02, FOUND-03, GOAL-01]

duration: 4min
completed: 2026-03-14
---

# Phase 01 Plan 01: Foundation Types and Schema Summary

**StageIO discriminated union with per-stage type contracts, migration 200 for conductor_runs/goals columns, and Wave 0 test stubs for all four phase requirements**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T10:18:09Z
- **Completed:** 2026-03-14T10:22:30Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- StageIO mapped type enforces compile-time type safety across all 5 pipeline stages
- GoalInput interface captures all structured goal constraint fields (targetPaths, excludedPaths, maxSessions, priority, checkpointConfig, useBrain)
- Migration 200 adds 11 new columns across conductor_runs and goals tables idempotently
- 4 test files created: 7 passing type-level tests + 11 todo stubs for Plan 02

## Task Commits

Each task was committed atomically:

1. **Task 1: Evolve types.ts with StageIO discriminated union and GoalInput type** - `93424eca` (feat)
2. **Task 2: Create DB migration for conductor_runs and goals schema evolution** - `aaf86647` (feat)
3. **Task 3: Create Wave 0 test stubs for all phase requirements** - `96777bdd` (test)

## Files Created/Modified
- `src/app/features/Manager/lib/conductor/types.ts` - StageIO union, GoalInput, PipelineContext, stage input types, updated PipelineRun/PipelineStatus
- `src/app/db/migrations/200_conductor_foundation.ts` - Migration adding columns to conductor_runs and goals
- `src/app/db/migrations/index.ts` - Registered m200 migration
- `tests/conductor/stage-contracts.test.ts` - 7 passing type-level tests for FOUND-02
- `tests/conductor/state-persistence.test.ts` - 4 todo stubs for FOUND-01
- `tests/conductor/run-history.test.ts` - 4 todo stubs for FOUND-03
- `tests/conductor/goal-input.test.ts` - 3 todo stubs for GOAL-01
- `src/app/features/Manager/components/conductor/PipelineControls.tsx` - Added 'queued' status badge
- `src/app/features/Manager/components/conductor/RunHistoryTimeline.tsx` - Added 'queued' status style
- `src/app/features/Manager/lib/conductor/conductorStore.ts` - Added goalId to PipelineRun construction

## Decisions Made
- Kept existing stage I/O types (ScoutResult, TriageResult, BatchDescriptor, ExecutionResult, ReviewDecision) unchanged; new input types added alongside
- StageIO uses existing BatchDescriptor directly and ExecutionResult[] (array) for execute stage output
- process_log column added idempotently since it already exists in some DB instances from original schema creation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed PipelineStatus Record exhaustiveness in UI components**
- **Found during:** Task 1 (types evolution)
- **Issue:** Adding 'queued' to PipelineStatus union caused TS errors in PipelineControls.tsx and RunHistoryTimeline.tsx which had exhaustive Record<PipelineStatus, ...> mappings
- **Fix:** Added 'queued' entry to both STATUS_BADGES and STATUS_STYLES records
- **Files modified:** PipelineControls.tsx, RunHistoryTimeline.tsx
- **Verification:** `npx tsc --noEmit` passes clean
- **Committed in:** 93424eca (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed PipelineRun construction missing goalId**
- **Found during:** Task 1 (types evolution)
- **Issue:** Adding goalId to PipelineRun interface caused TS error in conductorStore.ts startRun
- **Fix:** Added `goalId: ''` to the PipelineRun object literal in startRun
- **Files modified:** conductorStore.ts
- **Verification:** `npx tsc --noEmit` passes clean
- **Committed in:** 93424eca (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary to maintain TypeScript compilation after additive type changes. No scope creep.

## Issues Encountered
- Pre-existing triage test failure in tests/api/conductor/pipeline.test.ts (1 of 15 tests) confirmed as not caused by our changes. Out of scope.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Types and schema foundation complete for Plan 02 (conductorRepository implementation)
- Wave 0 test stubs provide TDD targets for Plan 02
- All existing tests unaffected (pre-existing failure confirmed)

---
*Phase: 01-foundation*
*Completed: 2026-03-14*
