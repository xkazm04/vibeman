---
phase: 06-goal-analyzer-and-backlog
plan: 02
subsystem: conductor
tags: [goal-analysis, llm-prompt, brain-integration, gap-report, backlog-generation]

requires:
  - phase: 06-goal-analyzer-and-backlog
    provides: GapReport, BacklogItemInput, GoalAnalyzerInput/Output types, file discovery, migration 205
provides:
  - executeGoalAnalysis function for single-pass LLM codebase analysis
  - Brain pattern injection as institutional knowledge constraints
  - Structured gap report and backlog item generation from LLM response
affects: [06-03-backlog-writer, conductor-orchestrator-integration]

tech-stack:
  added: []
  patterns: [single-pass-llm-analysis, brain-constraint-injection, scan-type-perspectives]

key-files:
  created:
    - src/app/features/Manager/lib/conductor/stages/goalAnalyzer.ts
  modified: []

key-decisions:
  - "Brain section formatted as institutional knowledge constraints that guide gap detection but not scoring"
  - "Context list queried via dynamic require() matching fileDiscovery pattern for circular dep avoidance"
  - "LLM response parsed with code fence stripping + JSON regex extraction matching diffReviewer pattern"
  - "Validation clamps effort/impact/risk to 1-10 and relevanceScore to 0-1 with sensible defaults"

patterns-established:
  - "Single-pass LLM analysis: goal + files + Brain + 3 scan type perspectives in one prompt"
  - "Brain constraint injection: topInsights + patterns as active analysis guidance, not scoring influence"

requirements-completed: [GOAL-02, GOAL-03, BACK-01, BACK-02, BRAIN-01, BRAIN-02]

duration: 2min
completed: 2026-03-14
---

# Phase 6 Plan 02: Goal Analyzer Core Summary

**Single-pass LLM goal analyzer with Brain pattern injection, three scan type lenses, and structured gap report + backlog output**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T21:36:33Z
- **Completed:** 2026-03-14T21:38:15Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Built executeGoalAnalysis function performing single-pass LLM analysis with goal + files + Brain context + 3 scan type perspectives
- Brain patterns injected as institutional knowledge constraints guiding gap detection (not scoring)
- Response parser handles code fences, malformed JSON, and validates all fields with sensible defaults
- Three scan type perspectives (zen_architect, bug_hunter, ui_perfectionist) woven as analysis lenses in single prompt
- Non-blocking error handling returns empty output on LLM failure matching Phase 4 pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Build goal analyzer with LLM prompt and Brain integration** - `0c17cc07` (feat)

## Files Created/Modified
- `src/app/features/Manager/lib/conductor/stages/goalAnalyzer.ts` - Core goal analysis: file discovery, Brain injection, LLM call, response parsing

## Decisions Made
- Brain section formatted as "This project has learned..." constraints with explicit instruction that Brain must NOT influence effort/impact/risk scoring
- Context list queried via dynamic require('@/app/db') matching fileDiscovery.ts pattern to avoid circular dependencies
- LLM response parsing uses code fence stripping before JSON regex extraction for robustness
- Validation clamps numeric fields to valid ranges (effort/impact/risk 1-10, relevanceScore 0-1) with defaults on parse failure
- contextId validated against project's actual context IDs, falling back to null for unmatched domains

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Goal analyzer core ready for Plan 03 (backlog writer and orchestrator integration)
- executeGoalAnalysis returns structured GoalAnalyzerOutput ready for persistence and triage

---
*Phase: 06-goal-analyzer-and-backlog*
*Completed: 2026-03-14*
