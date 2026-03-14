# Phase 2: Spec Writer - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Approved backlog items become structured markdown specs with machine-readable acceptance criteria and explicit file claims. Each spec is a self-contained instruction document that the Execute Stage consumes. Specs include Brain-injected code conventions when relevant.

This phase does NOT cover: backlog generation (Phase 6), triage/approval (Phase 5), or spec execution (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Spec Structure
- Acceptance criteria use structured assertions: `GIVEN x WHEN y THEN z` format — machine-parseable by Execute Stage
- Implementation approach is strategy-level outline with key decisions noted (not step-by-step instructions, not minimal constraints)
- Each spec includes a T-shirt size complexity signal (S/M/L) for downstream model routing
- Every spec has a Constraints section listing things the executor must NOT do — always present, not conditional

### Sections per spec (ordered):
1. Goal — what this backlog item achieves
2. Acceptance Criteria — structured assertions
3. Affected Files — categorized JSON (see File Claims below)
4. Approach — strategy outline with key decisions
5. Code Conventions — Brain-injected rules (omitted if no Brain data)
6. Constraints — explicit prohibitions for the executor
7. Complexity — T-shirt size (S/M/L)

### File Claims Format
- Affected files structured as `{ create: [...], modify: [...], delete: [...] }` — categorized by operation type
- Exact paths only — no directory-level wildcards or globs
- File discovery uses ts-morph AST analysis to find imports, exports, and references
- Validation at spec time: files in `modify` and `delete` must exist on disk; files in `create` must NOT exist
- This structured format feeds directly into Execute Stage's domain isolation intersection algorithm

### Brain Integration
- Brain conventions appear as a dedicated "Code Conventions" section with short actionable rules
- Brain queried per-spec with the spec's specific domain/affected files — not batched
- All relevant Brain insights included, labeled by confidence: "Strong pattern" vs "Emerging pattern"
- If Brain has no data for the spec's domain, the Code Conventions section is omitted entirely (not an error)
- Uses `getBehavioralContext()` from `src/lib/brain/behavioralContext.ts` and `brainService` from `src/lib/brain/brainService.ts`

### Spec Storage & Naming
- Specs stored in per-run directory: `.conductor/runs/{runId}/specs/`
- File naming: sequential with slug — `001-fix-auth-middleware.md`, `002-add-user-store.md`
- Ordered by backlog priority, slug derived from backlog item title
- Auto-delete spec files on successful run completion (no filesystem artifacts after run)
- Spec metadata persisted in `conductor_specs` DB table: runId, backlogItemId, title, affectedFiles JSON, complexity, status — enables queries without filesystem

### Claude's Discretion
- Exact structured assertion syntax (GIVEN/WHEN/THEN vs alternative machine-parseable formats)
- How ts-morph analysis scopes file discovery (import chain depth, test file inclusion)
- DB migration details for conductor_specs table
- Spec template rendering implementation (string interpolation vs template engine)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `conductorRepository` (`src/app/features/Manager/lib/conductor/conductor.repository.ts`): Pattern for DB CRUD with JSON field serialization — same pattern needed for spec metadata
- `getBehavioralContext()` (`src/lib/brain/behavioralContext.ts`): Returns structured patterns, signals, insights for a project — use for Brain convention injection
- `brainService` (`src/lib/brain/brainService.ts`): Unified Brain orchestration layer — may provide higher-level query methods
- `BatchDescriptor` type (`src/app/features/Manager/lib/conductor/types.ts`): Represents approved backlog items — input to spec writer

### Established Patterns
- Repository pattern: functional objects (not classes) with `getDatabase()` calls — `conductorRepository`, `goalRepository`
- JSON column serialization: `JSON.stringify` on write, `JSON.parse` on read — used for stages_state, config_snapshot, metrics
- Migration system: `addColumnIfNotExists()`, nullable columns, `runOnce()` wrapper — must follow for conductor_specs table
- API routes: Next.js App Router with `NextResponse.json()`, try/catch error handling

### Integration Points
- Spec writer runs as a pipeline stage between Batch (which produces approved backlog items) and Execute (which consumes specs)
- Orchestrator dispatches stages via `conductorOrchestrator.ts` — spec writer needs to be registered as a stage function
- Brain data accessed via `getBehavioralContext(projectId)` — returns `BehavioralContext` with patterns, trending, signals
- ts-morph is used in Phase 6 (Goal Analyzer) — may need to be added as dependency now or share utility

</code_context>

<specifics>
## Specific Ideas

- Specs should feel like the markdown requirement docs this project already uses (PLAN.md format) — structured, section-based, machine-readable frontmatter
- The affectedFiles JSON must be directly consumable by Execute Stage's file-path intersection algorithm without transformation
- Brain convention injection should be visible in the spec — a reader should be able to see "oh, Brain told it to use repository pattern here"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-spec-writer*
*Context gathered: 2026-03-14*
