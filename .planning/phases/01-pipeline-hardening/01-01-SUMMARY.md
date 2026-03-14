---
phase: 01-pipeline-hardening
plan: 01
subsystem: database, api
tags: [ts-morph, sqlite, migration, template-discovery, path-normalization]

# Dependency graph
requires: []
provides:
  - "status and parse_error columns on discovered_templates table"
  - "markStale/markError/clearError repository methods for safe template lifecycle"
  - "shared ts-morph Project instance pattern for memory-efficient parsing"
  - "centralized normalizePath usage across template discovery pipeline"
affects: [01-pipeline-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared ts-morph Project instance passed through call chain for memory efficiency"
    - "markStale over deleteStale pattern for non-destructive state management"
    - "normalizePath import from pathUtils.ts instead of inline .replace calls"

key-files:
  created:
    - "src/app/db/migrations/146_template_status.ts"
    - "tests/unit/lib/template-discovery/scanner.test.ts"
  modified:
    - "src/app/db/migrations/index.ts"
    - "src/app/db/repositories/discovered-template.repository.ts"
    - "src/app/db/models/types.ts"
    - "src/lib/template-discovery/parser.ts"
    - "src/lib/template-discovery/scanner.ts"
    - "src/app/api/template-discovery/route.ts"

key-decisions:
  - "Used addColumnsIfNotExist (not addColumnIfNotExists) for batch column addition in migration 146"
  - "Empty currentTemplateIds array returns 0 from markStale as safety guard against total parse failure"
  - "Stale marking skipped entirely when any parse errors occur (partial failure safety)"
  - "Upsert type signature excludes status/parse_error from input since they are managed internally"

patterns-established:
  - "markStale pattern: non-destructive lifecycle management for discovered entities"
  - "Shared ts-morph Project: create once, pass through, removeSourceFile after each parse"
  - "normalizePath centralization: all path normalization via pathUtils.ts import"

requirements-completed: [PIPE-01, PIPE-03, PIPE-04]

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 01 Plan 01: Pipeline Hardening Summary

**Fixed ts-morph memory waste via shared Project instance, centralized path normalization to normalizePath(), and replaced destructive deleteStale with safe markStale lifecycle management**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-14T08:40:37Z
- **Completed:** 2026-03-14T08:46:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Migration 146 adds status and parse_error columns to discovered_templates for lifecycle tracking
- Repository gains markStale (with empty-array safety guard), markError, and clearError methods
- Parser accepts optional shared Project instance, removes source files in finally block to prevent memory accumulation
- All inline `.replace(/\\/g, '/')` calls replaced with `normalizePath()` import across scanner and route
- Route uses markStale instead of deleteStale, marks errors per-file on parse failure, skips stale marking during partial failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration + repository markStale + error state support** - `be5579a3` (feat)
2. **Task 2: ts-morph Project reuse + path normalization + safe stale cleanup** - `a5102e5c` (feat)

## Files Created/Modified
- `src/app/db/migrations/146_template_status.ts` - Migration adding status/parse_error columns
- `src/app/db/migrations/index.ts` - Registered migration 146
- `src/app/db/repositories/discovered-template.repository.ts` - markStale/markError/clearError methods, updated upsert
- `src/app/db/models/types.ts` - Added status and parse_error fields to DbDiscoveredTemplate
- `src/lib/template-discovery/parser.ts` - Optional shared Project param, source file cleanup
- `src/lib/template-discovery/scanner.ts` - normalizePath import replacing inline replace
- `src/app/api/template-discovery/route.ts` - Single Project, markStale, error marking, normalizePath
- `tests/unit/lib/template-discovery/scanner.test.ts` - Scanner path normalization tests

## Decisions Made
- Used `addColumnsIfNotExist` batch helper for the migration rather than two separate `addColumnIfNotExists` calls
- Empty `currentTemplateIds` array returns 0 from markStale (not marking all as stale) as safety against total parse failure
- Stale marking skipped entirely when any parse errors occur (partial failure safety per CONTEXT.md)
- Updated `DbDiscoveredTemplate` type to include status and parse_error, excluded from upsert input type since managed internally

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed upsert type signature after adding status/parse_error to DbDiscoveredTemplate**
- **Found during:** Task 2 (route.ts compilation)
- **Issue:** Adding status/parse_error to DbDiscoveredTemplate caused upsert callers to fail TypeScript checks since Omit no longer excluded those fields
- **Fix:** Added 'status' | 'parse_error' to the Omit type in upsert and upsertMany signatures
- **Files modified:** src/app/db/repositories/discovered-template.repository.ts
- **Verification:** npx tsc --noEmit passes with no errors
- **Committed in:** a5102e5c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary type fix for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Template discovery pipeline is now safe against partial failures and memory efficient
- Status tracking enables future UI to show stale/error states
- Ready for remaining pipeline hardening plans in phase 01

## Self-Check: PASSED
- All 8 created/modified files verified on disk
- Both task commits (be5579a3, a5102e5c) verified in git log
