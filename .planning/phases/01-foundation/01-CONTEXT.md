# Phase 1: Foundation - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Durable state machine, typed stage contracts, and DB schema that survive process restarts and HMR. Includes structured goal input as the pipeline entry point. This phase replaces the globalThis-based orchestrator state with SQLite-persisted pipeline runs.

</domain>

<decisions>
## Implementation Decisions

### State Persistence Model
- Pipeline state persists in SQLite — each stage completion is written to DB before proceeding
- On process restart, interrupted runs resume from the last completed stage (not retry current, not fail)
- DB is the single source of truth — no globalThis for run state
- Multiple pipeline runs can execute simultaneously (queue/schedule multiple goals)

### UI Tracking
- DB polling via existing `usePolling` hook pattern (2-5s interval)
- No server-sent events — keep infrastructure simple, consistent with existing patterns

### Stage Contract Design
- Claude's Discretion: Choose between strict generics (`Stage<TInput, TOutput>`) or discriminated union based on what fits the codebase patterns
- Each stage must have a typed input/output contract — wrong shape fails at compile time
- Replace current loose `Record<string, unknown>` in `StageState.details`

### Goal Input Structure
- Full structured goal with all options:
  - Title and description (core)
  - Constraint fields: target files/dirs, excluded paths, max sessions, priority
  - Checkpoint config: per-goal toggle for which checkpoints are active (triage, pre-execute, post-review)
  - Brain context flag: whether to query Brain for this goal
- Goals module already has CRUD — Conductor consumes goals via the existing Goals API

### Run History & Observability
- Stage-level detail: per-stage status, duration, items in/out
- Enough to diagnose which stage failed and why
- Not task-level or full LLM logs at this phase (can be added later)

### Claude's Discretion
- Exact DB schema design for conductor_runs evolution
- Stage contract pattern choice (generics vs discriminated union)
- Migration strategy for existing conductor_runs data
- Run queue implementation for multiple concurrent runs

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the existing codebase conventions.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `conductorOrchestrator.ts`: Current orchestrator with globalThis pattern — reference for stage execution flow, but state management must be replaced
- `types.ts`: `PipelineRun`, `StageState`, `PipelineMetrics`, `BalancingConfig` — starting point for redesigned types
- `conductor_runs` DB table: Existing schema to evolve (not recreate)
- `usePolling` hook: For UI status tracking
- `useConductorStatus` hook: Existing status polling — adapt for new DB-driven state

### Established Patterns
- Zustand stores with persist middleware for client state
- Repository pattern for DB access (`*.repository.ts`)
- Migration system with `addColumnIfNotExists()` — never drop/recreate
- API routes at `/api/conductor/*` — existing endpoints to adapt
- Goals module at `src/app/features/Goals/` — existing goal CRUD

### Integration Points
- `src/app/db/migrations/` — new migration for schema evolution
- `src/app/db/repositories/` — new or updated conductor repository
- `src/app/api/conductor/` — existing API routes to update
- `src/app/features/Goals/` — Conductor consumes goals from here
- `src/app/features/Manager/` — Conductor lives within Manager feature

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-14*
