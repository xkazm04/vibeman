# Phase 3: Execute Stage - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Specs are dispatched to CLI sessions with true file-level domain isolation and success is only declared when the implementation is verified. The Execute Stage consumes structured specs from Phase 2, assigns non-overlapping file domains, distributes work across 1-4 CLI sessions, tracks per-task status, runs build validation, and supports configurable checkpoints.

This phase does NOT cover: spec generation (Phase 2), code review (Phase 4), or triage (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Domain Isolation Logic
- File-path intersection determines overlap: union of all paths across create/modify/delete for each spec
- When two specs have overlapping affected files, the second spec queues serially — waits until first completes
- No spec merging or rejection — serial queuing is the conflict resolution strategy
- Non-overlapping specs dispatch in parallel (up to 4 concurrent sessions)

### Success/Failure Detection
- After CLI session exits, check that at least one file in the spec's `modify` list was actually changed (mtime or content hash comparison)
- A session that exits cleanly (exit code 0) but did NOT modify any claimed file is marked FAILED, not successful
- Files in `create` list must exist after session completes
- Files in `delete` list must not exist after session completes
- Standard exit code non-zero = failed (no file check needed)

### Task Status Visibility
- Per-task execution status (pending/running/completed/failed) persisted in `conductor_specs` table status column
- UI polls `/api/conductor/status` endpoint — consistent with Phase 1 DB-first pattern
- Status updates written to DB before and after each task dispatch
- No real-time events — polling is sufficient for this use case

### Checkpoint Behavior
- Pre-execute and post-review checkpoints use pipeline pause with status API
- Pipeline writes 'paused' status with checkpoint type to `conductor_runs` table
- UI shows checkpoint prompt based on run status
- User approves via API call (POST to status endpoint)
- Pipeline resumes from paused state — matches Phase 1 pause/resume pattern
- Checkpoints are configurable toggles — can be disabled per-goal or globally

### Build Validation
- TypeScript compile check (`tsc --noEmit`) runs after ALL tasks complete
- Result (pass/fail + error output) recorded on the pipeline run record
- Build failure does not auto-retry — recorded for Review Stage to evaluate

### Claude's Discretion
- Exact file modification detection mechanism (mtime vs content hash)
- Polling interval for status updates
- How checkpoint toggle configuration is stored (goal-level vs global config)
- Internal queue data structure for serial overlap resolution

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `executeStage.ts`: Existing DAG-aware parallel dispatch — has the dispatch loop pattern, task state map, abort signal handling
- `cli-service.ts`: `startExecution()`, `getExecution()`, `abortExecution()` — process spawning and management
- `DAGScheduler` (`src/lib/dag/dagScheduler.ts`): Ready-batch scheduling with maxParallel — can be reused or replaced with file-overlap-aware scheduler
- `conductorRepository`: DB persistence pattern for run state updates
- `conductor_specs` table: Already has status column for per-task tracking

### Established Patterns
- DB-first state: all status in SQLite, UI polls API — Phase 1 pattern
- AbortController for signal propagation with persistent state in DB
- `onTaskUpdate` callback pattern in existing executeStage for status emission

### Integration Points
- Spec writer outputs specs to `.conductor/runs/{runId}/specs/` with metadata in `conductor_specs`
- Execute stage reads spec files and `conductor_specs` records as input
- Orchestrator dispatches via `conductorOrchestrator.ts` — execute stage already registered
- CLI sessions managed through `cli-service.ts` startExecution/getExecution
- Blocker from STATE.md: CLI Service completion callback contract unverified — confirm whether cli-service supports event emission or only polling

</code_context>

<specifics>
## Specific Ideas

- The domain isolation intersection algorithm should consume `affectedFiles` JSON directly from specs without transformation (decided in Phase 2)
- File modification verification should feel like a "trust but verify" approach — trust the CLI session did work, but catch silent failures

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-execute-stage*
*Context gathered: 2026-03-14*
