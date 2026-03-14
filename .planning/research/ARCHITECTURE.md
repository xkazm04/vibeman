# Architecture Research

**Domain:** Autonomous development orchestration in a local Next.js app
**Researched:** 2026-03-14
**Confidence:** HIGH (based on direct codebase inspection of existing implementation)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UI Layer (React / Next.js)                        │
├───────────────────┬─────────────────────────────┬───────────────────────────┤
│   Goals Module    │   Manager / Conductor UI    │   TaskRunner UI           │
│  (goal CRUD,      │  (pipeline controls,        │  (session columns,        │
│   status display) │   stage viz, process log)   │   requirement preview)    │
└───────┬───────────┴──────────────┬──────────────┴───────────┬───────────────┘
        │ API calls                │ API calls                │ polling
        ▼                          ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Route Layer (Next.js App Router)              │
│                                                                             │
│  /api/goals          /api/conductor/{run,status,config,history,healing}     │
│  /api/ideas          /api/ideas/claude   /api/tinder/actions                │
│  /api/brain/signals  /api/contexts       /api/claude-code/requirement       │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │ imports
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Conductor Orchestrator (server-side singleton)    │
│                                                                             │
│   globalThis.conductorActiveRuns  ──  in-memory run contexts               │
│                                                                             │
│   Pipeline Loop:                                                            │
│   Goal Analyzer → Backlog Builder → Triage → Spec Writer → Execute → Review│
│                                                                             │
│   Integrations:                                                             │
│   ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────────────┐  │
│   │ Brain Module │  │  Ideas / Triage │  │  CLI Service (cli-service.ts)│  │
│   │(behavioral   │  │  (backlog store) │  │  (startExecution, poll)      │  │
│   │ context,     │  │                 │  │                              │  │
│   │ insights)    │  │                 │  │  max 4 concurrent sessions   │  │
│   └──────────────┘  └─────────────────┘  └──────────────────────────────┘  │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │ reads/writes
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Data Layer (SQLite via better-sqlite3)            │
│                                                                             │
│  conductor_runs  conductor_errors  conductor_healing_patches                │
│  ideas           goals             brain_insights  behavioral_signals       │
│  contexts        implementation_logs                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| Goals Module | CRUD for high-level goals; tracks goal status and lifecycle | Conductor (starts run for a goal), Goals DB table |
| Conductor Orchestrator | Server-side singleton; owns pipeline state machine and loop control | All stages, Brain, CLI Service, SQLite |
| Goal Analyzer (new) | Translates active goal into codebase gap analysis; produces raw backlog candidates | Goals DB, Brain (behavioral context), Ideas API |
| Backlog Builder (new) | Groups gap analysis output into prioritized, scored backlog items with domain tags | Ideas DB, Brain (insights for prioritization) |
| Triage Stage | CLI-powered scoring of backlog items (effort, impact, risk); checkpoint for optional user approval | Ideas API, Tinder API, Brain behavioral context |
| Spec Writer (new, was Batch) | Generates one Markdown `.md` spec file per accepted backlog item with acceptance criteria, affected files, approach | claude-code/requirement API, Brain for code conventions |
| Execute Stage | DAG-aware parallel dispatch of specs to CLI sessions; 1-4 concurrent; domain-isolated | CLI Service, DAGScheduler, TaskRunner |
| Review Stage | Aggregates results, scores success rate, triggers self-healing, decides continue/stop | Brain signals API, error classifier, self-healing |
| Brain Module | Passive pattern library + active decision engine; provides behavioral context and learned insights | Behavioral signals DB, brain_insights DB |
| Ideas Module | Stores generated backlog ideas; used as the shared backlog store | SQLite ideas table |
| CLI Service | Spawns and polls CLI process executions; abstracts provider differences | `startExecution`, `getExecution`, `abortExecution` |
| Self-Healing | Classifies errors, generates prompt/config patches, persists patches for next cycle | conductor_errors, conductor_healing_patches |
| TaskRunner | Manages 4 CLI session slots; Conductor uses its execution infrastructure indirectly via CLI Service | cli-service.ts, session tracking |

## Recommended Project Structure

The current structure is sound. The redesign maps onto the same folder layout with renamed/refactored stage files:

```
src/app/features/Manager/
├── lib/
│   └── conductor/
│       ├── conductorOrchestrator.ts    # Pipeline loop + state machine (rebuild)
│       ├── conductorStore.ts           # Zustand client store for UI state
│       ├── balancingEngine.ts          # Scan type + model routing decisions
│       ├── types.ts                    # All pipeline types
│       ├── useConductorStatus.ts       # Polling hook for run status
│       ├── useConductorRecovery.ts     # Orphan run recovery on startup
│       └── stages/
│           ├── goalAnalyzer.ts         # NEW: goal -> codebase gap analysis
│           ├── backlogBuilder.ts       # NEW: gaps -> scored backlog items
│           ├── triageStage.ts          # KEEP: CLI scoring + threshold accept/reject
│           ├── specWriter.ts           # RENAME from batchStage: idea -> .md spec
│           ├── executeStage.ts         # KEEP: DAG parallel CLI dispatch
│           └── reviewStage.ts          # KEEP + EXTEND: Brain signal write, commit trigger
│       └── selfHealing/
│           ├── errorClassifier.ts      # KEEP
│           ├── healingAnalyzer.ts      # KEEP
│           └── promptPatcher.ts        # KEEP
└── components/
    └── conductor/
        ├── ConductorView.tsx           # Main conductor UI
        ├── PipelineFlowViz.tsx         # Stage visualization
        ├── StageCard.tsx               # Per-stage status
        ├── ProcessLog.tsx              # Live log stream
        ├── BalancingPanel.tsx          # Config panel
        ├── MetricsBar.tsx              # Run metrics
        ├── HealingPanel.tsx            # Healing patches view
        └── RunHistoryTimeline.tsx      # Past runs
```

### Structure Rationale

- **stages/**: Each stage is a pure async function taking typed input, returning typed output. No cross-stage imports. This makes each stage independently testable and replaceable.
- **selfHealing/**: Separated from stages because healing is cross-cutting — it fires after any stage failure, not just one specific stage.
- **conductorOrchestrator.ts**: The only file allowed to import all stage functions. It owns the loop and all DB writes for run state.
- **balancingEngine.ts**: Stateless decision functions (scan type selection, model routing, quota check). Imported by stages that need routing decisions.

## Architectural Patterns

### Pattern 1: Singleton Orchestrator via globalThis

**What:** The pipeline loop runs as a background async Promise on the Next.js server. The in-memory run context (AbortController, status) is stored in `globalThis` to survive Next.js HMR module reloads.

**When to use:** Any long-running server-side process in a Next.js App Router app that must outlive route handler lifetime.

**Trade-offs:** Simple and reliable for single-user local use. Not suitable for multi-instance deployments. Crash recovery is handled by the orphan run detector on startup.

**Example:**
```typescript
const globalForConductor = globalThis as unknown as {
  conductorActiveRuns: Map<string, ConductorRunContext>;
};
if (!globalForConductor.conductorActiveRuns) {
  globalForConductor.conductorActiveRuns = new Map();
}
```

### Pattern 2: Stage as Pure Async Function

**What:** Each stage is a single exported async function with a strongly-typed input object and output type. The orchestrator calls each stage in sequence, passing output from one as input to the next.

**When to use:** Pipeline architectures where stages need to be individually testable and the data contract between stages matters.

**Trade-offs:** Very easy to test, easy to replace one stage independently. The downside is the orchestrator becomes large — mitigate by keeping each stage small and well-bounded.

**Example:**
```typescript
export async function executeGoalAnalyzer(input: GoalAnalyzerInput): Promise<GoalAnalyzerResult>
export async function executeBacklogBuilder(input: BacklogBuilderInput): Promise<BacklogItem[]>
export async function executeTriageStage(input: TriageInput): Promise<TriageResult>
export async function executeSpecWriter(input: SpecWriterInput): Promise<BatchDescriptor>
export async function executeExecuteStage(input: ExecuteInput): Promise<ExecuteStageResult>
export async function executeReviewStage(input: ReviewInput): Promise<ReviewResult>
```

### Pattern 3: CLI-as-Executor with Diff Counting

**What:** Stages that need LLM reasoning dispatch CLI executions and measure output by counting DB row changes before and after. The CLI session reads the project, performs analysis, and writes results via API calls (PATCH /api/ideas, log_implementation MCP tool, etc.).

**When to use:** Any stage where the LLM needs filesystem access, tool use, or codebase context that cannot be reasonably serialized into a single prompt payload.

**Trade-offs:** Adds polling complexity and latency (5s poll intervals). But it enables the full power of the CLI environment (file read, tool calls, bash commands) within each stage.

**Build order implication:** CLI Service must be stable before any stage can be implemented. Scout/Triage/Spec Writer all depend on this pattern.

### Pattern 4: Brain as Both Reader and Writer

**What:** Brain is read by stages needing context (Triage reads behavioral context for scoring, Goal Analyzer reads insights for gap prioritization). Brain is written by Review after each execution cycle (implementation signals, outcome records).

**When to use:** Any module that wants to inform future decisions based on outcomes. Write signals at completion, read them at the start of the next run.

**Trade-offs:** Brain data quality improves over time with more runs. First runs have no Brain data — all stages must degrade gracefully when Brain returns `hasData: false`.

**Data flow:**
```
Review Stage writes → behavioral_signals, implementation outcomes
                                    ↓ (next run)
Goal Analyzer reads ← Brain behavioral context (active areas, neglected areas)
Triage reads        ← Brain insights (scoring bias for neglected areas)
Spec Writer reads   ← Brain code conventions (formatting, patterns)
```

### Pattern 5: DAG Scheduler for Parallel Execution

**What:** The Execute stage builds a DAG from task dependencies (currently inferred by category — same category tasks run sequentially, different categories run in parallel up to `maxConcurrentTasks`). The redesign should refine this to use actual affected file paths.

**When to use:** Any parallel execution where some tasks may conflict on shared files. The DAG prevents concurrent writes to the same file.

**Trade-offs:** Category-based DAG is a heuristic — it will sometimes over-serialize (different tasks in same category that touch different files). File-based DAG is more precise but requires the spec to declare affected files explicitly (which the Spec Writer should produce in the redesign).

**Build order implication:** DAGScheduler exists and works. The Spec Writer redesign should add an `affectedFiles` field to each spec so the Execute stage can build a more accurate DAG.

### Pattern 6: Configurable Checkpoints

**What:** The pipeline has optional pause points where the user can inspect and approve before proceeding. Currently implemented as a `status === 'paused'` polling loop in the orchestrator. In the redesign, checkpoints should be explicit: after Triage (user approves backlog), optionally after Spec Writer (user approves specs before execution).

**When to use:** Any autonomous process where intermediate human review reduces risk.

**Trade-offs:** Checkpoints add latency and require the UI to surface the right information. But they are the key trust mechanism — users run long pipelines more confidently when they have control points.

**Implementation pattern:**
```typescript
// In orchestrator after triage:
if (config.checkpoints.requireTriageApproval) {
  updateRunInDb(runId, { status: 'awaiting_approval', approval_stage: 'triage' });
  await waitForApproval(context); // polls context.status
}
```

## Data Flow

### Goal-to-Commit Flow (the full pipeline)

```
User selects Goal
        ↓
POST /api/conductor/run  {goalId, projectId, config}
        ↓
Orchestrator.startPipeline()
        ↓
┌─── CYCLE LOOP ──────────────────────────────────────────────────────────┐
│                                                                         │
│  1. GOAL ANALYZER                                                       │
│     reads: goals table (goal text, status)                              │
│     reads: Brain behavioral context (active areas, recent commits)      │
│     dispatches: CLI with goal + codebase scan prompt                    │
│     writes: raw gap candidates to ideas table (via /api/ideas)          │
│     output: list of idea IDs                                            │
│                                                                         │
│  2. BACKLOG BUILDER                                                     │
│     reads: ideas table (gap candidates)                                 │
│     reads: Brain insights (prioritization hints)                        │
│     output: scored, tagged BacklogItem[] with domain isolation tags     │
│                                                                         │
│  3. TRIAGE                                                              │
│     [optional checkpoint: user approval]                                │
│     reads: BacklogItem[] from previous stage                            │
│     dispatches: CLI to score effort/impact/risk per idea                │
│     writes: scores back via PATCH /api/ideas                            │
│     calls: /api/tinder/actions to accept or reject each idea            │
│     output: TriageResult {acceptedIds, rejectedIds}                     │
│                                                                         │
│  4. SPEC WRITER (was Batch)                                             │
│     reads: accepted ideas from ideas table                              │
│     reads: Brain code conventions for the project                       │
│     writes: one .md spec file per idea via /api/claude-code/requirement │
│     assigns: provider/model via balancingEngine.routeModel()            │
│     builds: DAG from affectedFiles overlap                              │
│     output: BatchDescriptor {requirementNames, modelAssignments, dag}   │
│                                                                         │
│  5. EXECUTE                                                             │
│     reads: BatchDescriptor (spec file names + model assignments)        │
│     reads: each .md spec file from filesystem                           │
│     dispatches: CLI sessions (up to 4) respecting DAG order            │
│     polls: CLI execution status every 5s                                │
│     output: ExecutionResult[] {success, filesChanged, durationMs}       │
│                                                                         │
│  6. REVIEW                                                              │
│     reads: ExecutionResult[] from execute stage                         │
│     writes: implementation signals to Brain via /api/brain/signals      │
│     classifies: errors from failed tasks                                │
│     triggers: self-healing if errorCount >= healingThreshold            │
│     updates: goal progress in goals table                               │
│     triggers: git commit if all tasks succeeded (optional, configurable)│
│     decides: continue to next cycle or stop                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
        ↓
Goal marked complete / run record updated
```

### State Management

```
Server-side:
  globalThis.conductorActiveRuns (Map<runId, ConductorRunContext>)
    ↓ mutated by
  Orchestrator (status, abortController)
    ↓ persisted to
  SQLite conductor_runs (status, stages_state JSON, metrics JSON, process_log JSON)

Client-side:
  conductorStore (Zustand)
    ↑ polls via usePolling → GET /api/conductor/status
    ↓ drives
  ConductorView components (stage cards, process log, metrics bar)
```

### Key Data Flows Between Modules

1. **Goal → Conductor:** User selects an active goal in the Goals UI and clicks "Run Conductor." The goal's `id`, `title`, and `description` are passed to the pipeline start API. The Goal Analyzer translates these into a codebase scan prompt.

2. **Brain → Triage:** `getBehavioralContext(projectId)` returns success rates, neglected areas, active contexts. This is injected into the triage prompt so the CLI evaluator scores ideas with awareness of what has been recently worked on.

3. **Brain → Spec Writer (new integration):** Before generating specs, query Brain for code conventions (preferred patterns, naming conventions learned from past implementations). Inject these into the spec template as a "follow these conventions" section.

4. **Execute → Brain:** After each execution, Review Stage POSTs implementation signals to `/api/brain/signals`. These inform future runs about which tasks succeed or fail, which contexts are most active, and average task duration.

5. **Ideas as shared backlog:** The Ideas module's DB table (`ideas`) serves as the backlog store for Conductor. Ideas are created by the Goal Analyzer, scored by Triage, and consumed by Spec Writer. This reuses the existing Ideas infrastructure without duplicating it.

6. **TaskRunner as execution substrate:** Conductor does not directly manage CLI session slots — it calls `startExecution()` from `cli-service.ts`, which is the same infrastructure TaskRunner uses. The 4-session limit is enforced at the CLI service layer, not by Conductor.

## Scaling Considerations

This is a single-user local tool. Scaling is not a concern. The relevant reliability concern at the only operating scale (1 user, 1 project, 1-4 sessions) is:

| Concern | Approach |
|---------|----------|
| HMR crashes the pipeline | globalThis singleton pattern preserves run context across HMR |
| App restart kills in-flight runs | Orphan recovery on startup marks interrupted runs, allows UI to show correct state |
| Rate limit from LLM provider | Execute stage detects rate limit errors, backs off 60s before next wave |
| Session slot exhaustion | DAG scheduler respects maxConcurrentTasks cap (default 2, max 4) |
| File conflict between parallel tasks | Domain isolation via DAG dependencies (same-category tasks serialize) |

## Anti-Patterns

### Anti-Pattern 1: Orchestrator Calls Stages Over HTTP

**What people do:** Stage functions make `fetch()` calls to their own Next.js API routes instead of calling the stage's business logic directly.

**Why it's wrong:** Adds network round-trips, serialization overhead, and error surface within a single process. The current Scout Stage already correctly calls `startExecution()` directly while the Spec Writer (batchStage) correctly calls `/api/claude-code/requirement` (which writes a file — that is legitimately a separate concern). The distinction: stage business logic should be a direct import, not an HTTP call. Only writes to shared resources (ideas, requirements) should use APIs.

**Do this instead:** Import stage functions directly from their modules. Only use fetch for cross-cutting writes (ideas API, tinder API) where the API route provides validation and consistency guarantees.

### Anti-Pattern 2: Goal Analyzer That Ignores Brain Context

**What people do:** Build the Goal Analyzer as a generic "scan the codebase and generate ideas" step without injecting what the Brain has learned about this project.

**Why it's wrong:** The Brain's behavioral context (active areas, neglected areas, recent commit themes, success rates) is the primary mechanism for ensuring the backlog is relevant to what the developer is actually working on. Without it, the Goal Analyzer produces generic suggestions that may not align with current momentum.

**Do this instead:** Always call `getBehavioralContext(projectId)` before building the Goal Analyzer prompt. Inject the formatted context. Degrade gracefully when `hasData: false`.

### Anti-Pattern 3: Flat Parallelism Without Domain Isolation

**What people do:** Dispatch all tasks simultaneously without checking for file conflicts, relying on LLM sessions to "figure it out."

**Why it's wrong:** Concurrent sessions writing to the same file cause merge conflicts, partial writes, and TypeScript errors that make the whole batch fail. Even with optimistic locking at the DB level, filesystem-level conflicts are silent.

**Do this instead:** The Spec Writer should write `affectedFiles` into each spec's metadata. The Execute stage should use this to build a file-overlap-aware DAG, ensuring no two concurrent tasks touch the same file. Same-category heuristic is the current fallback but file-level is more precise.

### Anti-Pattern 4: Checkpoints as Blocking Sleeps

**What people do:** Implement a checkpoint as `while (status === 'paused') { await sleep(2000); }` without a timeout.

**Why it's wrong:** If the user never resumes (closes the browser, walks away), the orchestrator loop hangs indefinitely. On the next app restart, the run is orphaned but the in-memory context is gone.

**Do this instead:** Checkpoint waits should have a maximum timeout (e.g., 24 hours). After timeout, the run is auto-stopped and marked `interrupted`. This is the same orphan recovery that already exists — extend it to timed checkpoint expiry.

### Anti-Pattern 5: Writing Specs Without Acceptance Criteria

**What people do:** Generate requirement files that are only descriptions of what to do, with no testable acceptance criteria or affected file hints.

**Why it's wrong:** The executing CLI agent has no way to verify success without acceptance criteria. It either under-implements (misses key parts) or over-implements (changes things that weren't requested). Without affected files, the DAG cannot be built accurately.

**Do this instead:** The Spec Writer should produce specs with explicit sections: `## Acceptance Criteria`, `## Affected Files`, `## Approach`. The Review stage can then validate against the acceptance criteria after execution.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Conductor Orchestrator ↔ Brain | Direct import of `getBehavioralContext()` and `formatBehavioralForPrompt()` from `src/lib/brain/` | Read-only from Conductor's perspective. Brain writes happen via API in Review Stage. |
| Conductor Orchestrator ↔ CLI Service | Direct import of `startExecution`, `getExecution`, `abortExecution` from `src/lib/claude-terminal/cli-service` | CLI Service is the only place that knows about session slots and process management. |
| Conductor Orchestrator ↔ Ideas | HTTP via `/api/ideas` and `/api/tinder/actions` | Using the HTTP API preserves the Ideas module's validation logic and event bus. Do not import idea DB functions directly from conductor stages. |
| Conductor Orchestrator ↔ Goals | HTTP via `/api/goals` to update goal status on completion | Goal status update (in_progress → completed) should happen in Review Stage after a successful cycle. |
| Conductor UI ↔ Orchestrator | HTTP polling via GET `/api/conductor/status` + POST `/api/conductor/run` | The UI never imports server-side orchestrator code. Status is polled; commands are sent via API routes. |
| Spec Writer ↔ Requirement Filesystem | HTTP via POST `/api/claude-code/requirement` | This is intentionally not a direct file write — the API route handles path validation and ensures the file lands in the right project directory. |
| Execute Stage ↔ TaskRunner | Indirect — both use `cli-service.ts` | Conductor does not call into TaskRunner. They share the CLI execution infrastructure. Do not create a direct dependency between Conductor and TaskRunner components. |

### Build Order Implications

Dependencies flow bottom-up. Build in this order to avoid blocking:

1. **Types and DB schema** — `types.ts` redesign, migration for any new columns (e.g., `goal_id` on `conductor_runs`, `affected_files` on `ideas`)
2. **Spec Writer** — generates the `.md` files that Execute Stage depends on; simplest stage to get right independently
3. **Execute Stage** — already works; only change is reading `affectedFiles` from spec metadata for better DAG
4. **Review Stage** — extend to write goal progress and optionally trigger git commit
5. **Triage Stage** — already works; extend with checkpoint support
6. **Goal Analyzer** — net-new stage; must produce output in the same format as current Scout Stage (idea IDs) to keep Backlog Builder and Triage working
7. **Backlog Builder** — net-new; sits between Goal Analyzer and Triage
8. **Orchestrator** — rebuild last, once all stages are individually tested; wires everything together

## Sources

- Direct codebase inspection of `src/app/features/Manager/lib/conductor/` (HIGH confidence)
- Direct codebase inspection of `src/lib/brain/behavioralContext.ts` (HIGH confidence)
- Direct codebase inspection of `src/app/features/TaskRunner/lib/executionStrategy.ts` (HIGH confidence)
- Project requirements in `.planning/PROJECT.md` (HIGH confidence)
- Existing DB migrations in `src/app/db/migrations/134_conductor_pipeline.ts` (HIGH confidence)

---
*Architecture research for: Conductor redesign — autonomous development orchestration*
*Researched: 2026-03-14*
