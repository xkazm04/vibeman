# Phase 6: Goal Analyzer and Backlog - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

A user-defined goal is transformed into a prioritized, domain-tagged backlog through codebase analysis constrained by the goal and enriched by Brain patterns. The goal analyzer examines the codebase relative to the stated goal, produces a categorized gap report, and generates prioritized backlog items that include creative suggestions from Ideas module scan type perspectives. Brain patterns serve as explicit constraints during analysis and as a pattern library during the process.

This phase does NOT cover: triage checkpoint UI (Phase 5), spec generation (Phase 2), execution (Phase 3), self-healing (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Codebase Analysis Approach
- LLM-only analysis: feed goal + relevant file contents to LLM to identify gaps — no ts-morph dependency
- File discovery: context-first with keyword fallback. If goal has a contextId, focus on that context's file list. If no contextId, use file tree + grep keywords to find relevant files
- Gap report stored as structured JSON TEXT column on conductor_runs (like triage_data, execution_report)
- Gaps categorized by type: missing_feature, tech_debt, missing_tests, missing_docs — helps prioritize backlog

### Ideas Module Integration
- Single LLM pass: include scan type perspectives (zen_architect, bug_hunter, ui_perfectionist) as prompt sections in the goal analysis call — no separate scout stage dispatch
- Only the core three scan types specified in BACK-02 (zen_architect, bug_hunter, ui_perfectionist)
- Each backlog item tagged with source: 'structural_analysis' or 'creative_suggestion' (with originating scan type)
- No auto-filtering of off-topic items — show all items at triage with relevance scores, let user decide

### Brain as Decision Engine
- Brain constraints injected into the LLM analysis prompt — topInsights + patterns section from getBehavioralContext()
- Brain data guides what gaps are found (analysis guidance), but does NOT influence priority scoring — effort/impact/risk scoring stays objective
- When Brain has no data (getBehavioralContext().hasData === false), skip the Brain constraints section entirely and analyze normally — matches Phase 5 conflictDetector no-data pattern

### Backlog Item Shape and Storage
- Backlog items stored in the existing ideas table — reuses tinder UI for approve/reject at triage
- Conductor-generated items distinguished via source field + run_id in metadata — filter by run_id to get backlog for a specific pipeline run
- Effort expressed as 1-10 numeric scale — matches existing effort/impact scoring in ideas table and triage UI
- Affected domain assigned by LLM from the project's existing context list — ties into domain isolation for execution

### Claude's Discretion
- Exact LLM prompt template for goal analysis (structure, ordering of sections)
- How file contents are chunked/summarized if they exceed context limits
- Gap report JSON schema details (beyond the categorization decision)
- How scan type perspectives are woven into the analysis prompt
- How context list is formatted for domain assignment

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getBehavioralContext()` (`src/lib/brain/behavioralContext.ts`): Returns topInsights, patterns, trending — use topInsights + patterns for prompt injection
- `ideaDb` (`src/app/db/repositories/idea.repository.ts`): Full CRUD for ideas table — use for backlog item persistence
- `contextDb` (`src/app/db`): Project contexts with file lists — use for context-scoped file discovery
- `conductorRepository` (`src/app/features/Manager/lib/conductor/conductor.repository.ts`): Run state management — extend for gap_report and backlog columns
- `scanTypes.ts` (`src/app/features/Ideas/lib/scanTypes.ts`): ScanType enum with zen_architect, bug_hunter, ui_perfectionist definitions
- `conflictDetector.ts` (`src/lib/brain/conflictDetector.ts`): Brain conflict matching pattern — reference for Brain data extraction approach

### Established Patterns
- JSON TEXT columns on conductor_runs for stage-specific data (triage_data, execution_report, checkpoint_type)
- Stage functions as pure async: typed input, typed output (Phase 1 FOUND-02)
- `addColumnIfNotExists()` for migrations, nullable columns, `runOnce()` wrapper
- LLM calls via project's existing /api/ai/chat proxy route (Phase 4 pattern)

### Integration Points
- Orchestrator calls goal analyzer after goal creation, before scout stage
- Gap report feeds into backlog generation (same LLM call, single pass)
- Backlog items land in ideas table, triage checkpoint (Phase 5) reads them for user review
- Brain's getBehavioralContext() called at analysis start for prompt injection
- Domain assignment from contexts feeds into Phase 3 domain isolation for execution

</code_context>

<specifics>
## Specific Ideas

- The goal analysis should feel like "a senior dev reading the codebase with the goal in mind" — not a generic code audit
- Brain patterns should appear in the prompt as "this project has learned..." constraints, making them feel like institutional knowledge rather than decorative metadata
- The three scan type perspectives (architect, bug hunter, UI perfectionist) should feel like different lenses on the same codebase, not separate analyses

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-goal-analyzer-and-backlog*
*Context gathered: 2026-03-14*
