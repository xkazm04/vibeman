---
phase: 06-goal-analyzer-and-backlog
plan: 01
subsystem: conductor
tags: [goal-analysis, gap-report, file-discovery, migration, types]

requires:
  - phase: 05-triage
    provides: triage_data column pattern and conductor_runs table
provides:
  - GapReport, GapItem, BacklogItemInput, GoalAnalyzerInput, GoalAnalyzerOutput types
  - File discovery utility with context-first and keyword-fallback strategies
  - gap_report TEXT column on conductor_runs (migration 205)
affects: [06-02-goal-analyzer-core, 06-03-backlog-writer]

tech-stack:
  added: []
  patterns: [context-first-file-discovery, gap-categorization-types]

key-files:
  created:
    - src/app/features/Manager/lib/conductor/stages/goalAnalyzer.types.ts
    - src/app/features/Manager/lib/conductor/stages/fileDiscovery.ts
    - src/app/db/migrations/205_goal_analyzer_columns.ts
  modified:
    - src/app/db/migrations/index.ts

key-decisions:
  - "DiscoveredFile type kept minimal (path + content) for flexibility in downstream consumers"
  - "File discovery uses require() for contextDb to avoid circular dependencies at module load"
  - "Keyword extraction threshold set at >4 chars matching existing Phase 5 pattern"

patterns-established:
  - "Context-first file discovery: try contextId lookup, fall back to keyword matching"
  - "Goal analyzer types use BalancingConfig from existing conductor types"

requirements-completed: [GOAL-02, GOAL-03, BACK-03]

duration: 2min
completed: 2026-03-14
---

# Phase 6 Plan 01: Goal Analyzer Types and Infrastructure Summary

**Typed contracts for goal analysis pipeline with GapReport/BacklogItemInput types, context-first file discovery, and migration 205 for gap_report column**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T21:31:27Z
- **Completed:** 2026-03-14T21:33:46Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Defined 6 exported types (GapItem, GapReport, BacklogItemInput, GoalAnalyzerInput, GoalAnalyzerOutput, DiscoveredFile) as contracts for goal analyzer core
- Created file discovery module with context-first DB lookup and keyword-based fallback, including file tree generation
- Added migration 205 for gap_report TEXT column on conductor_runs, following established runOnce + addColumnIfNotExists pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create goal analyzer types and DB migration** - `b455c308` (feat)
2. **Task 2: Create file discovery module** - `a555e2c7` (feat)

## Files Created/Modified
- `src/app/features/Manager/lib/conductor/stages/goalAnalyzer.types.ts` - GapReport, BacklogItemInput, GoalAnalyzerInput/Output, DiscoveredFile types
- `src/app/features/Manager/lib/conductor/stages/fileDiscovery.ts` - Context-first file discovery with keyword fallback
- `src/app/db/migrations/205_goal_analyzer_columns.ts` - gap_report TEXT column on conductor_runs
- `src/app/db/migrations/index.ts` - Register migration 205 in runMigrations

## Decisions Made
- DiscoveredFile type kept minimal (path + content) for flexibility in downstream consumers
- File discovery uses require() for contextDb to avoid circular dependencies at module load
- Keyword extraction threshold set at >4 chars matching existing Phase 5 pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing triage test failure in pipeline.test.ts (unrelated to changes, confirmed by stash/unstash test)
- TypeScript standalone compile needs full project context for path aliases (verified via full tsc --noEmit, zero errors in new files)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Types and infrastructure ready for Plan 02 (goal analyzer core module)
- discoverRelevantFiles provides the file context that the LLM-based gap analyzer will consume
- gap_report column ready to persist analysis results

---
*Phase: 06-goal-analyzer-and-backlog*
*Completed: 2026-03-14*
