# Phase 01: Foundation - Research

**Researched:** 2026-03-14
**Domain:** SQLite-persisted pipeline state machine, typed stage contracts, structured goals
**Confidence:** HIGH

## Summary

This phase replaces the current `globalThis`-based in-memory conductor state with SQLite-persisted pipeline runs that survive process restarts and HMR. The existing codebase already has a `conductor_runs` table (migration 134) with JSON-serialized `stages_state`, `metrics`, and `config_snapshot` columns -- these need to evolve with new columns for goal linkage and per-stage durability. The orchestrator (`conductorOrchestrator.ts`) currently uses `globalForConductor.conductorActiveRuns` Map for runtime state; this must be replaced with DB-first writes where each stage completion persists before proceeding.

The existing Goals module (`goal.repository.ts`) provides CRUD for goals with `title`, `description`, `status`, and `context_id`. The structured goal input (constraint fields, checkpoint config, brain context flag) requires schema evolution via `addColumnIfNotExists` -- never drop/recreate. Stage typing currently uses a loose `Record<string, unknown>` in `StageState.details`; the redesign should use discriminated unions or generic stage contracts so wrong-shape input fails at compile time.

**Primary recommendation:** Evolve existing `conductor_runs` schema with new nullable columns, build a `conductor.repository.ts` with atomic stage-commit writes, replace globalThis state with DB reads, and introduce typed stage I/O contracts using discriminated unions (fits the existing pattern of `PipelineStage` union type).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Pipeline state persists in SQLite -- each stage completion is written to DB before proceeding
- On process restart, interrupted runs resume from the last completed stage (not retry current, not fail)
- DB is the single source of truth -- no globalThis for run state
- Multiple pipeline runs can execute simultaneously (queue/schedule multiple goals)
- DB polling via existing `usePolling` hook pattern (2-5s interval), no SSE
- Each stage must have a typed input/output contract -- wrong shape fails at compile time
- Replace current loose `Record<string, unknown>` in `StageState.details`
- Full structured goal with: title, description, constraint fields (target files/dirs, excluded paths, max sessions, priority), checkpoint config, brain context flag
- Goals module already has CRUD -- Conductor consumes goals via the existing Goals API
- Stage-level detail: per-stage status, duration, items in/out
- Not task-level or full LLM logs at this phase

### Claude's Discretion
- Exact DB schema design for conductor_runs evolution
- Stage contract pattern choice (generics vs discriminated union)
- Migration strategy for existing conductor_runs data
- Run queue implementation for multiple concurrent runs

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Conductor pipeline state persists in SQLite, not globalThis -- surviving process restarts and HMR | DB-first writes per stage, recovery logic on startup to mark interrupted runs, conductor.repository.ts pattern |
| FOUND-02 | Each pipeline stage is a pure async function receiving context and returning typed output | Discriminated union StageIO type with per-stage input/output shapes, compile-time enforcement |
| FOUND-03 | Pipeline run records (status, metrics, stage logs, duration) persist in SQLite with queryable history | Evolved conductor_runs schema with per-stage timing columns, process_log JSON column, history query endpoints |
| GOAL-01 | User can define a structured goal with goal statement and optional constraint fields | Evolve goals table with nullable constraint columns, checkpoint config as JSON column |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | (existing) | SQLite database driver | Already in use, synchronous API fits server-side pipeline |
| Vitest | (existing) | Test framework | Already configured in project |
| uuid (v4) | (existing) | Run/stage ID generation | Already imported in orchestrator |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | (existing) | Client-side conductor store | UI state for polling results, NOT for pipeline truth |
| usePolling hook | (existing) | DB polling for UI updates | 2-5s interval status checks from client |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Discriminated unions | Generic `Stage<TIn, TOut>` | Generics add complexity; discriminated unions match existing `PipelineStage` union pattern and are simpler to serialize/deserialize from DB |
| JSON columns for stage state | Separate stage_runs table | JSON columns are simpler and match existing pattern (stages_state TEXT); separate table is more normalized but overkill for 5 stages |

## Architecture Patterns

### Recommended Project Structure
```
src/app/features/Manager/lib/conductor/
  types.ts              # Evolved: StageIO discriminated union, GoalInput type
  conductor.repository.ts  # NEW: DB access layer for pipeline runs
  conductorOrchestrator.ts # EVOLVED: DB-first state, no globalThis
  conductorStore.ts        # EVOLVED: reads from DB via API, display-only
  stages/                  # Existing stage implementations (unchanged this phase)

src/app/db/migrations/
  XXX_conductor_foundation.ts  # NEW: schema evolution migration

src/app/db/repositories/
  goal.repository.ts       # EVOLVED: add constraint fields

src/app/api/conductor/
  run/route.ts             # EVOLVED: start run linked to goal
  status/route.ts          # EVOLVED: return DB-persisted state
  history/route.ts         # EVOLVED: queryable run history
```

### Pattern 1: DB-First Stage Commit
**What:** Each stage writes its result to DB before the orchestrator advances to the next stage.
**When to use:** Every stage transition in the pipeline loop.
**Example:**
```typescript
// In conductorOrchestrator.ts — replaces globalThis pattern
async function executeStageAndPersist(
  runId: string,
  stage: PipelineStage,
  input: StageInput<typeof stage>
): Promise<StageOutput<typeof stage>> {
  // Mark stage as running
  conductorRepository.updateStageStatus(runId, stage, 'running');

  const result = await executeStage(stage, input);

  // Persist result BEFORE advancing
  conductorRepository.completeStage(runId, stage, result);

  return result;
}
```

### Pattern 2: Startup Recovery
**What:** On process start, scan for runs with status='running' and mark them as 'interrupted' or resume from last completed stage.
**When to use:** Application startup / HMR recovery.
**Example:**
```typescript
// Called on module load or app init
export function recoverInterruptedRuns(): void {
  const db = getDatabase();
  const stuck = db.prepare(
    `SELECT id, current_stage, stages_state FROM conductor_runs WHERE status = 'running'`
  ).all();

  for (const run of stuck) {
    const stages = JSON.parse(run.stages_state);
    const lastCompleted = findLastCompletedStage(stages);
    // Update to resume from next stage after last completed
    conductorRepository.markForResume(run.id, lastCompleted);
  }
}
```

### Pattern 3: Discriminated Union Stage Contracts
**What:** Type-safe stage I/O using discriminated unions keyed by stage name.
**When to use:** All stage function signatures and orchestrator dispatch.
**Example:**
```typescript
// Typed stage I/O — wrong shape fails at compile time
type StageIO = {
  scout: { input: ScoutInput; output: ScoutResult };
  triage: { input: TriageInput; output: TriageResult };
  batch: { input: BatchInput; output: BatchDescriptor };
  execute: { input: ExecuteInput; output: ExecutionResult[] };
  review: { input: ReviewInput; output: ReviewDecision };
};

type StageInput<S extends PipelineStage> = StageIO[S]['input'];
type StageOutput<S extends PipelineStage> = StageIO[S]['output'];

// Stage function type — enforced per stage
type StageFn<S extends PipelineStage> = (
  ctx: PipelineContext,
  input: StageInput<S>
) => Promise<StageOutput<S>>;
```

### Anti-Patterns to Avoid
- **globalThis for state:** The entire point of this phase is removing it. All run state lives in SQLite.
- **Serializing AbortController to DB:** AbortController is runtime-only. Store a `should_abort` flag in DB instead; orchestrator checks it between stages.
- **Non-nullable migration columns:** Never add NOT NULL columns without defaults to existing tables. Use nullable or DEFAULT.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration tracking | Custom migration runner | `runOnce()` from `migration.utils.ts` | Already handles idempotency, tracking table |
| UUID generation | Custom ID scheme | `uuid.v4()` | Already in use throughout codebase |
| DB connection | New connection logic | `getDatabase()` from `@/app/db/connection` | Singleton pattern already established |
| Repository boilerplate | Raw SQL everywhere | `createGenericRepository` pattern | Used by goal.repository.ts and others |
| Polling | Custom setInterval | `usePolling` hook | Handles cleanup, interval management |

## Common Pitfalls

### Pitfall 1: Race Condition on Concurrent Runs
**What goes wrong:** Two pipeline runs modify the same DB row or file simultaneously.
**Why it happens:** Decision to allow multiple concurrent runs.
**How to avoid:** Each run has its own row. Stage writes use `UPDATE WHERE id = ?` scoped to run ID. File-domain isolation (later phases) prevents file conflicts.
**Warning signs:** Corrupted stages_state JSON, status flicker.

### Pitfall 2: JSON Column Corruption on Partial Write
**What goes wrong:** Process crashes mid-JSON-write, leaving unparseable stages_state.
**Why it happens:** SQLite TEXT columns with JSON require full replacement.
**How to avoid:** Use `db.transaction()` for any multi-column update. Keep individual stage updates small and atomic. Consider separate columns for critical state (status, current_stage) vs JSON blobs (stages_state).
**Warning signs:** JSON.parse errors on startup recovery.

### Pitfall 3: HMR Re-importing Module Triggers Recovery
**What goes wrong:** Next.js HMR reloads the orchestrator module, triggering recovery logic that marks active runs as interrupted.
**Why it happens:** Module-level initialization code runs on every HMR.
**How to avoid:** Recovery should only run on cold start. Use a process-level flag (e.g., `globalThis.__conductorRecoveryDone`) to prevent re-running. This is the ONE acceptable use of globalThis -- a boolean guard, not state storage.
**Warning signs:** Active runs getting marked interrupted during development.

### Pitfall 4: goals Table Schema Drift
**What goes wrong:** Adding columns to goals table breaks other devices with older schemas.
**Why it happens:** Multi-device SQLite usage.
**How to avoid:** All new columns MUST be nullable or have DEFAULT values. Use `addColumnIfNotExists()`. Never assume column exists without checking.
**Warning signs:** INSERT/UPDATE failures on other devices.

### Pitfall 5: Blocking DB Reads in Stage Execution
**What goes wrong:** Long-running stage execution blocks the event loop because better-sqlite3 is synchronous.
**Why it happens:** Calling DB reads inside async stage functions.
**How to avoid:** Keep DB reads/writes small and fast. Stage execution itself is async (LLM calls, CLI sessions). DB operations are just bookkeeping.
**Warning signs:** UI polling hangs during execution.

## Code Examples

### Conductor Repository Pattern
```typescript
// src/app/features/Manager/lib/conductor/conductor.repository.ts
import { getDatabase } from '@/app/db/connection';

export const conductorRepository = {
  createRun(run: { id: string; projectId: string; goalId: string; config: object }): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO conductor_runs (id, project_id, goal_id, status, current_stage, config_snapshot, stages_state, metrics, started_at)
      VALUES (?, ?, ?, 'running', 'scout', ?, ?, ?, datetime('now'))
    `).run(run.id, run.projectId, run.goalId, JSON.stringify(run.config),
      JSON.stringify(createEmptyStages()), JSON.stringify(createEmptyMetrics()));
  },

  completeStage(runId: string, stage: PipelineStage, stageState: StageState): void {
    const db = getDatabase();
    const run = this.getRunById(runId);
    if (!run) return;
    const stages = JSON.parse(run.stages_state);
    stages[stage] = stageState;
    db.prepare(`
      UPDATE conductor_runs SET stages_state = ?, current_stage = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(stages), stage, runId);
  },

  getRunHistory(projectId: string, limit = 20): PipelineRunSummary[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, project_id, status, cycle as cycles, metrics, started_at, completed_at
      FROM conductor_runs WHERE project_id = ? ORDER BY started_at DESC LIMIT ?
    `).all(projectId, limit) as any[];
  },
};
```

### Goal Schema Evolution
```typescript
// In new migration — extends goals table for conductor consumption
addColumnsIfNotExist(db, 'goals', [
  { name: 'target_paths', definition: 'TEXT' },         // JSON array of target files/dirs
  { name: 'excluded_paths', definition: 'TEXT' },        // JSON array of excluded paths
  { name: 'max_sessions', definition: 'INTEGER DEFAULT 2' },
  { name: 'priority', definition: 'TEXT DEFAULT "normal"' },
  { name: 'checkpoint_config', definition: 'TEXT' },     // JSON: { triage: true, preExecute: false, postReview: true }
  { name: 'use_brain', definition: 'INTEGER DEFAULT 1' },
], logger);
```

### Recovery on Startup
```typescript
// Safe to call on module load — idempotent via globalThis guard
const g = globalThis as any;
if (!g.__conductorRecoveryDone) {
  g.__conductorRecoveryDone = true;
  const db = getDatabase();
  db.prepare(`
    UPDATE conductor_runs SET status = 'interrupted'
    WHERE status = 'running' OR status = 'paused'
  `).run();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| globalThis Map for active runs | DB-persisted state per stage | This phase | Runs survive restarts, queryable history |
| Loose `Record<string, unknown>` stage details | Discriminated union StageIO | This phase | Compile-time safety on stage contracts |
| Goals with title/description only | Structured goals with constraints | This phase | Conductor receives actionable goal input |
| Single run at a time (implicit) | Multiple concurrent runs | This phase | Queue/schedule multiple goals |

## Open Questions

1. **Resume vs. restart semantics for interrupted runs**
   - What we know: Interrupted runs should resume from last completed stage
   - What's unclear: Should there be a UI action to explicitly restart from scratch vs. resume? Or always resume?
   - Recommendation: Auto-resume on next pipeline start referencing same goal. Provide a "restart" option that creates a new run.

2. **Existing conductor_runs data migration**
   - What we know: Table exists with data from old orchestrator
   - What's unclear: Whether old runs have meaningful data worth preserving
   - Recommendation: Add new columns, leave old data as-is. Old rows will have NULL in new columns. No destructive migration.

3. **AbortController replacement for run cancellation**
   - What we know: Current AbortController is in-memory only
   - What's unclear: Exact mechanism for cancelling a DB-persisted run
   - Recommendation: Add `should_abort INTEGER DEFAULT 0` column. Orchestrator checks between stages. UI sets flag via API.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | vitest.config.ts (existing) |
| Quick run command | `npx vitest run tests/api/conductor/ --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Pipeline state persists in SQLite, survives restart | integration | `npx vitest run tests/conductor/persistence.test.ts -x` | No -- Wave 0 |
| FOUND-02 | Stage functions have typed I/O, wrong shape fails compile | unit (type test) | `npx tsc --noEmit` | No -- Wave 0 |
| FOUND-03 | Run history queryable with stage logs/duration/status | integration | `npx vitest run tests/conductor/history.test.ts -x` | No -- Wave 0 |
| GOAL-01 | Structured goal with constraints persists correctly | integration | `npx vitest run tests/conductor/goal-input.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/conductor/ --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `tests/conductor/persistence.test.ts` -- covers FOUND-01: create run, persist stage, simulate restart, verify recovery
- [ ] `tests/conductor/history.test.ts` -- covers FOUND-03: create runs, query history, verify metrics
- [ ] `tests/conductor/goal-input.test.ts` -- covers GOAL-01: create structured goal, verify constraint fields
- [ ] `tests/conductor/stage-types.test.ts` -- covers FOUND-02: type-level tests ensuring wrong shapes fail
- [ ] Test DB setup helper for conductor tables (reuse pattern from existing `tests/api/conductor/pipeline.test.ts`)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/app/features/Manager/lib/conductor/types.ts` -- current type definitions
- Existing codebase: `src/app/db/migrations/134_conductor_pipeline.ts` -- current schema
- Existing codebase: `src/app/features/Manager/lib/conductor/conductorOrchestrator.ts` -- current globalThis pattern
- Existing codebase: `src/app/db/migrations/migration.utils.ts` -- migration utilities
- Existing codebase: `src/app/db/repositories/goal.repository.ts` -- goal CRUD pattern

### Secondary (MEDIUM confidence)
- Project memory (CLAUDE.md context) -- migration system rules, TypeScript gotchas

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use in the project
- Architecture: HIGH -- patterns derived directly from existing codebase conventions
- Pitfalls: HIGH -- identified from actual codebase patterns (globalThis, HMR, migration system)

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable domain, internal project patterns)
