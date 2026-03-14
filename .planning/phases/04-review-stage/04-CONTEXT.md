# Phase 4: Review Stage - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Every completed pipeline run produces an LLM code review, a Brain signal write, and an execution report. Successful runs can optionally auto-commit. The review stage replaces the existing metric-only reviewStage.ts with actual diff-based code review, richer Brain signal integration, structured report generation, and git commit capability.

This phase does NOT cover: self-healing/retry (Phase 7), triage (Phase 5), or goal analysis (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### LLM Code Review
- Per-file review: each changed file gets its own pass/fail with rationale (maps to VALD-03)
- Quality rubric evaluates three dimensions: logic correctness (spec acceptance criteria satisfied), naming & conventions (matches project patterns), type safety (proper TypeScript, no `any`)
- Review failure does NOT block the pipeline — failure is recorded with rationale in the run record, pipeline continues
- Review model is configurable per-goal — add `reviewModel` field to GoalInput (default to Sonnet if unset)

### Brain Signal Writing
- Per-spec outcome signals: one signal per spec with pass/fail, rubric scores, and reviewer rationale
- Signals include the review rationale (why it passed/failed) so Brain can learn patterns like "naming inconsistent with repository pattern"
- Use `brainService.recordSignal()` directly — no HTTP round-trip (replaces current HTTP POST approach in reviewStage.ts)
- Failed Brain signal writes silently continue — log error, don't block the pipeline (Brain is enrichment, not critical path)

### Execution Report
- Stored as JSON TEXT in a new `execution_report` column on `conductor_runs` table
- Structured summary: goal, items executed (count + titles), files changed (list), build status, per-file review outcomes, overall pass/fail
- No cost/token estimate in report — deferred to v2 (OPS-01)
- Surfaced via existing `/api/conductor/history/{runId}` endpoint — report is just another field on the run. No new UI this phase

### Auto-Commit Behavior
- Commits all changed files plus the execution report in a single commit
- Commit message format: conventional commit — `feat(conductor): [goal title] - [N] specs executed, [M] files changed`
- Commit gate: BOTH build validation (tsc) AND LLM review must pass before auto-commit proceeds
- Toggle lives on GoalInput as `autoCommit` field (default: false) — matches Phase 3's checkpoint config pattern on the goal record
- Uses `child_process.execSync` for git operations (same pattern as buildValidator from Phase 3)

### Claude's Discretion
- Exact review prompt template design
- How git diff is extracted per file for review input
- DB migration details for `execution_report` and `review_results` columns
- Internal structure of the review result JSON

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `reviewStage.ts` (`src/app/features/Manager/lib/conductor/stages/reviewStage.ts`): Has metric aggregation, error classification, and Brain signal recording — will be refactored to add diff review, report generation, and commit logic
- `brainService.recordSignal()` (`src/lib/brain/brainService.ts`): Direct signal recording — replaces current HTTP fetch approach
- `buildValidator.ts` (`src/app/features/Manager/lib/conductor/execution/buildValidator.ts`): `execSync` pattern for shell commands — reuse for git operations
- `conductorRepository` (`src/app/features/Manager/lib/conductor/conductor.repository.ts`): DB persistence pattern for run state updates
- `GoalInput` type (`src/app/features/Manager/lib/conductor/types.ts`): Already has `checkpointConfig` — add `autoCommit` and `reviewModel` alongside

### Established Patterns
- Repository pattern: functional objects with `getDatabase()` calls
- JSON column serialization: `JSON.stringify` on write, `JSON.parse` on read
- Migration system: `addColumnIfNotExists()`, nullable columns, `runOnce()` wrapper
- Stage functions: pure async receiving typed input, returning typed output (Phase 1 FOUND-02)

### Integration Points
- Orchestrator calls `executeReviewStage()` after execute stage — already wired in `conductorOrchestrator.ts`
- Build validation result from Phase 3 available on `conductor_runs.build_validation` — review stage reads this
- Spec metadata in `conductor_specs` table — review reads affected files and status per spec
- Goal record has `checkpoint_config` JSON — extend for `autoCommit` and `reviewModel` fields

</code_context>

<specifics>
## Specific Ideas

- The review should evaluate each file's diff against the spec that claimed it — "did this change actually satisfy the acceptance criteria?"
- Brain signals should be rich enough that over multiple runs, Brain learns things like "this codebase prefers functional objects over classes" from repeated review feedback
- The execution report should be self-contained — reading it alone tells you everything about what happened in the run

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-review-stage*
*Context gathered: 2026-03-14*
