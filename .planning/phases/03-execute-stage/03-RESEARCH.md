# Phase 3: Execute Stage - Research

**Researched:** 2026-03-14
**Domain:** CLI session orchestration with file-domain isolation, verification, and checkpoints
**Confidence:** HIGH

## Summary

Phase 3 replaces the existing DAG-dependency-based `executeStage.ts` with a file-overlap-aware execution scheduler. The current implementation dispatches specs based on DAG dependencies from the batch stage -- the new implementation must instead compute file-path intersections from each spec's `affectedFiles` JSON and serialize overlapping specs while parallelizing non-overlapping ones across 1-4 CLI sessions.

The key additions beyond the existing execute stage are: (1) a domain isolation scheduler that replaces DAGScheduler with file-overlap detection, (2) post-execution file modification verification that catches silent CLI failures, (3) per-task status persistence to `conductor_specs` table with polling via `/api/conductor/status`, (4) configurable pre-execute and post-review checkpoints using the existing pause/resume pattern, and (5) a `tsc --noEmit` build validation gate after all tasks complete.

**Primary recommendation:** Refactor `executeStage.ts` to replace DAG-dependency scheduling with a file-overlap-aware queue, add file verification after each task, wire checkpoint pauses into the orchestrator loop, and add a `tsc --noEmit` subprocess call as a post-execution validation step.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- File-path intersection determines overlap: union of all paths across create/modify/delete for each spec
- When two specs have overlapping affected files, the second spec queues serially -- waits until first completes
- No spec merging or rejection -- serial queuing is the conflict resolution strategy
- Non-overlapping specs dispatch in parallel (up to 4 concurrent sessions)
- After CLI session exits, check that at least one file in the spec's `modify` list was actually changed (mtime or content hash comparison)
- A session that exits cleanly (exit code 0) but did NOT modify any claimed file is marked FAILED, not successful
- Files in `create` list must exist after session completes
- Files in `delete` list must not exist after session completes
- Standard exit code non-zero = failed (no file check needed)
- Per-task execution status (pending/running/completed/failed) persisted in `conductor_specs` table status column
- UI polls `/api/conductor/status` endpoint -- consistent with Phase 1 DB-first pattern
- Status updates written to DB before and after each task dispatch
- No real-time events -- polling is sufficient
- Pre-execute and post-review checkpoints use pipeline pause with status API
- Pipeline writes 'paused' status with checkpoint type to `conductor_runs` table
- User approves via API call (POST to status endpoint)
- Checkpoints are configurable toggles -- can be disabled per-goal or globally
- TypeScript compile check (`tsc --noEmit`) runs after ALL tasks complete
- Result (pass/fail + error output) recorded on the pipeline run record
- Build failure does not auto-retry -- recorded for Review Stage to evaluate

### Claude's Discretion
- Exact file modification detection mechanism (mtime vs content hash)
- Polling interval for status updates
- How checkpoint toggle configuration is stored (goal-level vs global config)
- Internal queue data structure for serial overlap resolution

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXEC-01 | Conductor assigns non-overlapping file domains to each CLI session based on spec affected files | File-overlap scheduler replaces DAGScheduler; intersection algorithm on `affectedFiles` JSON |
| EXEC-02 | Conductor distributes specs across 1-4 CLI sessions with domain-isolated parallel execution | Parallel dispatch loop with overlap-aware queue, maxConcurrentTasks from config |
| EXEC-03 | Per-task execution status is visible (running, completed, failed) with stage indicator | `conductor_specs.status` column already exists; update via `specRepository.updateSpecStatus()` |
| EXEC-04 | Configurable checkpoints available at pre-execute and post-review stages | Goal's `checkpoint_config` (triage/preExecute/postReview) persisted in DB; orchestrator pauses with `waitForResume()` pattern |
| VALD-01 | Build validation gate runs TypeScript compile check (tsc --noEmit) after execution completes | `child_process.execSync('npx tsc --noEmit')` in project path; result stored on run record |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | existing | Persist spec status + run state | Project DB layer; all state DB-first |
| child_process | Node built-in | Spawn `tsc --noEmit` for build validation | Already used by cli-service for CLI spawning |
| node:fs | Node built-in | File existence/mtime checks for verification | Lightweight, no external deps |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid (v4) | existing | Generate unique IDs | Already used throughout conductor |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| mtime comparison | Content hash (crypto.createHash) | Hash is more accurate but slower; mtime is sufficient for detecting "CLI did work" |
| Custom overlap queue | Graph coloring / interval scheduling | Over-engineered for file-path sets; simple Set intersection is correct |

## Architecture Patterns

### Recommended Project Structure
```
src/app/features/Manager/lib/conductor/
  stages/
    executeStage.ts          # Refactored: overlap-aware dispatch + verification
  execution/
    domainScheduler.ts       # NEW: file-overlap detection + serial queue
    fileVerifier.ts          # NEW: post-execution file check
    buildValidator.ts        # NEW: tsc --noEmit runner
```

### Pattern 1: File-Overlap Domain Scheduler
**What:** Replaces DAGScheduler for execute stage. Computes file-path intersection between all pending specs, builds a conflict graph, and dispatches non-conflicting specs in parallel while queuing conflicting ones serially.
**When to use:** Every time the execute stage needs to pick the next batch of specs to dispatch.
**Example:**
```typescript
// domainScheduler.ts
import type { SpecMetadata, AffectedFiles } from '../types';

interface SchedulerState {
  pending: SpecMetadata[];
  running: Map<string, Set<string>>; // specId -> claimed file paths
  completed: Set<string>;
  failed: Set<string>;
}

function getAllPaths(af: AffectedFiles): Set<string> {
  return new Set([...af.create, ...af.modify, ...af.delete]);
}

function hasOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const path of a) {
    if (b.has(path)) return true;
  }
  return false;
}

function getNextBatch(state: SchedulerState, maxParallel: number): SpecMetadata[] {
  const availableSlots = maxParallel - state.running.size;
  if (availableSlots <= 0) return [];

  // Collect all currently claimed paths (from running tasks)
  const claimedPaths = new Set<string>();
  for (const paths of state.running.values()) {
    for (const p of paths) claimedPaths.add(p);
  }

  const batch: SpecMetadata[] = [];
  const batchPaths = new Set<string>();

  for (const spec of state.pending) {
    if (batch.length >= availableSlots) break;
    const specPaths = getAllPaths(spec.affectedFiles);

    // Check against running tasks AND other specs in this batch
    if (!hasOverlap(specPaths, claimedPaths) && !hasOverlap(specPaths, batchPaths)) {
      batch.push(spec);
      for (const p of specPaths) {
        batchPaths.add(p);
        claimedPaths.add(p);
      }
    }
  }

  return batch;
}
```

### Pattern 2: Post-Execution File Verification
**What:** After a CLI session exits with code 0, verify that the spec's claimed file operations actually happened.
**When to use:** After every successful CLI execution, before marking the spec as completed.
**Example:**
```typescript
// fileVerifier.ts
import * as fs from 'node:fs';
import type { AffectedFiles } from '../types';

interface VerificationResult {
  passed: boolean;
  reason?: string;
}

interface FileSnapshot {
  path: string;
  exists: boolean;
  mtimeMs: number;
}

function snapshotFiles(projectPath: string, paths: string[]): FileSnapshot[] {
  return paths.map(p => {
    const fullPath = path.join(projectPath, p);
    try {
      const stat = fs.statSync(fullPath);
      return { path: p, exists: true, mtimeMs: stat.mtimeMs };
    } catch {
      return { path: p, exists: false, mtimeMs: 0 };
    }
  });
}

function verifyExecution(
  projectPath: string,
  affectedFiles: AffectedFiles,
  beforeSnapshots: FileSnapshot[]
): VerificationResult {
  // Check creates: must exist now
  for (const filePath of affectedFiles.create) {
    const fullPath = path.join(projectPath, filePath);
    if (!fs.existsSync(fullPath)) {
      return { passed: false, reason: `Expected created file not found: ${filePath}` };
    }
  }

  // Check deletes: must NOT exist now
  for (const filePath of affectedFiles.delete) {
    const fullPath = path.join(projectPath, filePath);
    if (fs.existsSync(fullPath)) {
      return { passed: false, reason: `Expected deleted file still exists: ${filePath}` };
    }
  }

  // Check modifies: at least one must have changed mtime
  if (affectedFiles.modify.length > 0) {
    const beforeMap = new Map(beforeSnapshots.map(s => [s.path, s]));
    let anyModified = false;
    for (const filePath of affectedFiles.modify) {
      const fullPath = path.join(projectPath, filePath);
      try {
        const stat = fs.statSync(fullPath);
        const before = beforeMap.get(filePath);
        if (!before || stat.mtimeMs !== before.mtimeMs) {
          anyModified = true;
          break;
        }
      } catch {
        // File missing -- counts as not modified
      }
    }
    if (!anyModified) {
      return { passed: false, reason: 'No files in modify list were actually changed' };
    }
  }

  return { passed: true };
}
```

### Pattern 3: Checkpoint Pause in Orchestrator
**What:** Before execute stage and after review stage, check goal's checkpoint config and pause if enabled.
**When to use:** In `conductorOrchestrator.ts` pipeline loop, at the pre-execute and post-review positions.
**Example:**
```typescript
// In conductorOrchestrator.ts pipeline loop, before execute stage:
const goalRun = conductorRepository.getRunById(runId);
const goalCheckpoints = getCheckpointConfig(goalRun); // from goal or config

if (goalCheckpoints.preExecute) {
  log('execute', 'info', 'Pre-execute checkpoint -- waiting for approval');
  // Store checkpoint type so UI knows what to show
  updateRunInDb(runId, { checkpoint_type: 'pre_execute' });
  conductorRepository.updateRunStatus(runId, 'paused');
  await waitForResume(runId);
  if (shouldAbort(runId)) return;
  log('execute', 'info', 'Pre-execute checkpoint approved -- proceeding');
}
```

### Pattern 4: Build Validation Gate
**What:** Run `tsc --noEmit` via child_process after all execution tasks complete.
**When to use:** After execute stage completes, before review stage.
**Example:**
```typescript
// buildValidator.ts
import { execSync } from 'child_process';

interface BuildResult {
  passed: boolean;
  errorOutput?: string;
  durationMs: number;
}

function runBuildValidation(projectPath: string): BuildResult {
  const start = Date.now();
  try {
    execSync('npx tsc --noEmit', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 120000, // 2 minute timeout
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { passed: true, durationMs: Date.now() - start };
  } catch (error: any) {
    return {
      passed: false,
      errorOutput: error.stderr || error.stdout || String(error),
      durationMs: Date.now() - start,
    };
  }
}
```

### Anti-Patterns to Avoid
- **Using DAGScheduler for file isolation:** The existing DAGScheduler resolves task-ID dependencies, not file-path conflicts. Don't try to encode file overlap as DAG edges -- build a dedicated overlap scheduler.
- **Checking file modifications during execution:** Only verify AFTER the CLI process exits. Mid-execution checks create race conditions with write buffering.
- **Blocking the Node event loop with tsc:** Use `execSync` with a timeout, not an unbounded blocking call. Or use `execFile` async if the pipeline loop is async (it is).
- **Storing checkpoint state in memory:** All checkpoint state must go through `conductor_runs` DB table. The `waitForResume()` pattern already polls DB -- use it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI process spawning | Custom spawn wrapper | Existing `cli-service.ts` startExecution/getExecution/abortExecution | Battle-tested, handles multi-provider, logging, timeout |
| Run state persistence | In-memory state tracking | `conductorRepository` + `specRepository` | DB-first pattern established in Phase 1 |
| Pause/resume mechanics | Custom event system | Existing `waitForResume()` in orchestrator | Already works with DB polling, abort detection |
| Requirement file reading | Direct fs.readFile | `readRequirement()` from folderManager | Handles path resolution, .md extension normalization |

**Key insight:** The execute stage already exists with dispatch loop, task state tracking, polling, and abort support. Phase 3 is a *refactor* that replaces DAG scheduling with file-overlap scheduling and adds verification -- not a ground-up rewrite.

## Common Pitfalls

### Pitfall 1: Worktree Isolation Conflicts
**What goes wrong:** Claude CLI with `-w` (worktree) flag creates isolated git worktrees. File verification checks the main project path, but modifications happen in the worktree.
**Why it happens:** The existing executeStage uses `useWorktree: provider === 'claude'` for parallel Claude executions.
**How to avoid:** When worktree is enabled, file verification must either (a) skip mtime checks and rely only on exit code, or (b) check the worktree path instead of the main project path. Recommendation: disable worktree (`useWorktree: false`) since domain isolation replaces it, or defer worktree handling.
**Warning signs:** All Claude tasks pass exit code 0 but fail file verification.

### Pitfall 2: Race Between Spec Status Update and Polling
**What goes wrong:** UI polls `/api/conductor/status` and sees stale spec status because DB write hasn't committed yet.
**Why it happens:** SQLite WAL mode can have brief read delays.
**How to avoid:** Update spec status BEFORE dispatching (set to 'executing') and AFTER completion (set to 'completed'/'failed'). The polling interval is already 2-5 seconds -- WAL latency is sub-millisecond.
**Warning signs:** UI shows task as "pending" when it's actually running.

### Pitfall 3: tsc --noEmit on Projects Without tsconfig
**What goes wrong:** `tsc --noEmit` fails with "no input files" or config errors on projects that don't have a tsconfig.json, or where the config excludes relevant paths.
**Why it happens:** Not all managed projects are TypeScript, or tsconfig.json may use `include` patterns that miss generated files.
**How to avoid:** Check for `tsconfig.json` existence before running `tsc`. If missing, skip build validation and record `{ passed: true, skipped: true, reason: 'No tsconfig.json found' }`.
**Warning signs:** Build validation fails on every run with config errors rather than type errors.

### Pitfall 4: File Path Normalization in Overlap Detection
**What goes wrong:** Two specs claim `src/lib/auth.ts` and `src\\lib\\auth.ts` -- overlap not detected because string comparison fails.
**Why it happens:** Windows paths vs Unix paths in spec metadata.
**How to avoid:** Normalize all paths using `path.normalize()` and convert to forward slashes before intersection checks. Also resolve relative vs absolute paths consistently.
**Warning signs:** Specs with overlapping files run concurrently, causing file corruption.

### Pitfall 5: Checkpoint Config Source Confusion
**What goes wrong:** Checkpoint toggles are checked from `BalancingConfig` but the user set them on the `GoalInput.checkpointConfig`.
**Why it happens:** Two separate config structures exist -- `BalancingConfig` (pipeline config) and `GoalInput.checkpointConfig` (goal-level config).
**How to avoid:** Read checkpoint config from the goal record (via `goal.checkpoint_config` in DB), not from `BalancingConfig`. The goal's `checkpoint_config` has `{ triage, preExecute, postReview }` toggles.
**Warning signs:** Checkpoints never trigger because the wrong config source returns `undefined`.

## Code Examples

### Reading Specs for Execution
```typescript
// Existing pattern from specRepository
const specs = specRepository.getSpecsByRunId(runId);
// Returns SpecMetadata[] with affectedFiles parsed from JSON
```

### Updating Spec Status
```typescript
// Existing method in specRepository
specRepository.updateSpecStatus(specId, 'executing');
// Valid statuses: 'pending' | 'executing' | 'completed' | 'failed'
```

### CLI Execution Polling Pattern (existing)
```typescript
// From current executeStage.ts -- this pattern continues
const executionId = startExecution(projectPath, prompt, undefined, undefined, providerConfig, extraEnv);
while (Date.now() - startTime < maxWaitMs) {
  const execution = getExecution(executionId);
  if (execution?.status === 'completed') { /* success */ }
  if (execution?.status === 'error' || execution?.status === 'aborted') { /* failure */ }
  await new Promise(r => setTimeout(r, 5000));
}
```

### Checkpoint Config from Goal
```typescript
// Goal's checkpoint_config is stored as JSON in goals table
// Access pattern from goal.repository.ts
const goal = goalRepository.getGoalById(goalId);
const checkpoints = goal?.checkpoint_config
  ? JSON.parse(goal.checkpoint_config)
  : { triage: false, preExecute: false, postReview: false };
```

### Storing Build Validation Result on Run
```typescript
// Extend the updateRunInDb helper to store build result
updateRunInDb(runId, {
  build_validation: JSON.stringify({
    passed: false,
    errorOutput: 'src/auth.ts(12,5): error TS2304: Cannot find name...',
    durationMs: 4500,
    ranAt: new Date().toISOString(),
  }),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DAG dependency scheduling | File-overlap domain isolation | Phase 3 (now) | Specs dispatched based on actual file conflict, not declared dependencies |
| Exit-code-only success | Exit code + file verification | Phase 3 (now) | Catches silent CLI failures where no files were modified |
| No build validation | tsc --noEmit gate | Phase 3 (now) | Type errors caught before review stage |

**Key codebase observation:** The existing `executeStage.ts` reads requirement files from `.claude/commands/` via `readRequirement()`, but Phase 2 writes spec files to `.conductor/runs/{runId}/specs/`. The execute stage must be updated to read specs from the new location using `specFileManager` or direct fs read from the spec directory.

## Open Questions

1. **Worktree vs domain isolation interaction**
   - What we know: Claude CLI `-w` flag creates git worktrees for parallel isolation. Domain isolation by file paths is the Phase 3 approach.
   - What's unclear: Whether worktree should be disabled since domain isolation replaces its purpose, or kept as defense-in-depth.
   - Recommendation: Disable worktree (`useWorktree: false`) to avoid file verification conflicts. Domain isolation is the intended mechanism.

2. **Spec file reading path**
   - What we know: Old execute stage uses `readRequirement()` which reads from `.claude/commands/`. New specs are in `.conductor/runs/{runId}/specs/`.
   - What's unclear: Whether to modify `readRequirement()` or add a new reader.
   - Recommendation: Read spec files directly via `fs.readFileSync(path.join(specDir, filename))` since spec paths are already known from `specFileManager`.

3. **Build validation column in conductor_runs**
   - What we know: No `build_validation` column exists in `conductor_runs` table.
   - What's unclear: Whether to add a new column via migration or reuse the `metrics` JSON blob.
   - Recommendation: Add a `build_validation` TEXT column via a new migration (nullable, JSON string). Keeps it queryable and separate from metrics.

4. **Checkpoint type storage**
   - What we know: `conductor_runs` has no `checkpoint_type` column. The `status` column can be set to 'paused'.
   - What's unclear: How to differentiate between manual pause vs checkpoint pause, and between pre-execute vs post-review checkpoint.
   - Recommendation: Add a `checkpoint_type` TEXT column (nullable) to `conductor_runs`. Values: null, 'triage', 'pre_execute', 'post_review'. Set alongside status='paused', cleared on resume.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via vitest.config.ts) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/conductor/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXEC-01 | Non-overlapping file domains assigned to concurrent sessions | unit | `npx vitest run tests/conductor/domain-scheduler.test.ts -x` | No -- Wave 0 |
| EXEC-02 | Specs distributed across 1-4 sessions with parallel dispatch | unit | `npx vitest run tests/conductor/domain-scheduler.test.ts -x` | No -- Wave 0 |
| EXEC-03 | Per-task status visible in DB with stage indicator | unit | `npx vitest run tests/conductor/execute-stage.test.ts -x` | No -- Wave 0 |
| EXEC-04 | Pre-execute and post-review checkpoints configurable | unit | `npx vitest run tests/conductor/checkpoints.test.ts -x` | No -- Wave 0 |
| VALD-01 | tsc --noEmit runs after execution, result recorded | unit | `npx vitest run tests/conductor/build-validator.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/conductor/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/conductor/domain-scheduler.test.ts` -- covers EXEC-01, EXEC-02 (overlap detection, parallel dispatch, serial queuing)
- [ ] `tests/conductor/execute-stage.test.ts` -- covers EXEC-03 (spec status updates in DB during execution)
- [ ] `tests/conductor/checkpoints.test.ts` -- covers EXEC-04 (checkpoint toggle, pause/resume behavior)
- [ ] `tests/conductor/build-validator.test.ts` -- covers VALD-01 (tsc --noEmit result capture)
- [ ] `tests/conductor/file-verifier.test.ts` -- covers EXEC-01 success/failure detection logic
- [ ] DB migration for `build_validation` and `checkpoint_type` columns on `conductor_runs`

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/app/features/Manager/lib/conductor/stages/executeStage.ts` -- current DAG-based dispatch implementation
- Existing codebase: `src/lib/claude-terminal/cli-service.ts` -- CLI spawning, polling, status tracking
- Existing codebase: `src/app/features/Manager/lib/conductor/conductorOrchestrator.ts` -- pipeline loop, pause/resume, stage persistence
- Existing codebase: `src/app/features/Manager/lib/conductor/spec/specRepository.ts` -- spec CRUD with status column
- Existing codebase: `src/app/features/Manager/lib/conductor/types.ts` -- SpecMetadata, AffectedFiles, GoalInput with checkpointConfig
- Existing codebase: `src/app/db/repositories/goal.repository.ts` -- checkpoint_config persistence

### Secondary (MEDIUM confidence)
- Node.js `child_process.execSync` for `tsc --noEmit` -- standard Node.js API, well-documented
- SQLite migration pattern from existing codebase (migration.utils.ts `runOnce()` pattern)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new dependencies
- Architecture: HIGH -- patterns derived directly from existing codebase with clear extension points
- Pitfalls: HIGH -- identified from reading actual code (worktree flag, path normalization, config sources)

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- internal project patterns, no external API changes)
