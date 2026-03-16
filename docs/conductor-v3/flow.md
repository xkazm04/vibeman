# Conductor v3 - Pipeline Flow

## Run Lifecycle

### 1. Run Startup

```
Frontend (ConductorView)
  |
  |- User selects goal
  |- Optional: IntentRefinementModal opens
  |   |- POST /api/conductor/refine-intent
  |   |- LLM generates 3-5 clarifying questions
  |   |- User answers -> refinedIntent string
  |
  |- POST /api/conductor/run { action: 'start', goalId, config, refinedIntent? }
  |   |- Backend generates runId (UUID)
  |   |- conductorRepository.createRun() inserts DB row
  |   |- startV3Pipeline() fires async loop (fire-and-forget)
  |   |- Returns { runId, status: 'running' } immediately
  |
  |- Frontend begins polling GET /api/conductor/status every 3s
```

### 2. Main Cycle Loop

The orchestrator (`runV3Loop` in `conductorV3.ts`) runs up to `maxCyclesPerRun` (default 3) cycles. Each cycle has 3 phases.

#### Pre-Cycle: Brain Questions (optional)

If `config.brainQuestionsEnabled`:
- Call `generateBrainQuestions()` with goal context
- LLM produces 3-5 clarifying questions
- Stored in run's `brain_qa` DB field
- Displayed in UI (future: pause for answers)

#### Phase 1: PLAN

**Purpose:** Single LLM call that replaces v2's Scout + Triage + Goal Analyzer + Planner.

**Input assembly:**
1. **Codebase context** -- `discoverRelevantFiles()` builds file tree + reads key files
2. **Behavioral context** -- Brain patterns, insights, success rates from signal history
3. **Brain warnings** -- `getBrainWarnings()` returns active constraints:
   - High-confidence (>70%) insights flagged as warnings
   - Revert pattern detection
   - Low success rate alerts (<50%)
4. **Previous reflection** -- On cycle 2+, includes last cycle's lessons + follow-up tasks
5. **Refined intent** -- User's answers from intent refinement (cycle 1 only)

**LLM prompt structure:**
```
Role: Senior development lead planning tasks for autonomous pipeline
Goal: {title} - {description}
[Refined Intent: user answers]
[Previous Cycle: reflection summary + lessons]
[Brain Warnings: active constraints]
[Behavioral Context: project patterns]
File tree + key file contents
[Target Paths: if goal has constraints]
Available contexts/domains

Output: JSON { tasks: [...], rationale: "...", brainWarningsApplied: [...] }
```

**Output parsing:**
- Strip markdown code fences
- Extract JSON from response
- Validate each task: title, description, targetFiles, complexity (1-3), dependsOn
- Convert `task_0`, `task_1` dependency references to UUID map
- Remap `dependsOn` indices to UUIDs (only earlier tasks allowed, no cycles)

**Fallback:** If LLM fails, creates single task = goal title + description, complexity 2.

#### Phase 2: DISPATCH

**Purpose:** Zero-LLM orchestration. Routes tasks to CLI sessions with dependency-aware parallelism.

**Scheduler algorithm** (`getNextBatch`):
```
while pending tasks exist:
  ready = tasks where all dependsOn are completed
  for each ready task:
    if task.targetFiles overlaps with running task files: skip
    if batch.size >= maxConcurrentTasks: break
    add to batch, track file paths
  dispatch batch in parallel (Promise.all)
  poll running tasks every 2s
```

**Per-task dispatch** (`dispatchTask`):
1. **Route model** -- Map complexity to effort (1->2, 2->5, 3->8), apply routing rules -> provider + model
2. **Compose prompt** (static, no LLM):
   ```
   Role: Expert software engineer
   Goal: {title} - {description}
   Task: {task.title}
   Description: {task.description}
   Target files: {task.targetFiles}
   [Previous error: if retrying]
   Quality checklist (5 items)
   ```
3. **Snapshot files** -- Record existence + mtime before execution
4. **Start CLI session** -- `startExecution()` with prompt + provider config
5. **Poll** -- `getExecution()` every 5s until complete/failed/timeout
6. **Verify** -- `verifyExecution()` checks file creates/modifies/deletes against snapshot
7. **Commit** -- `commitPerTask()` if successful and `autoCommit` enabled
8. **Retry** -- Up to 2 retries on failure (rate limit -> 60s backoff)

**Post-dispatch:** Run `tsc --noEmit` build validation if tsconfig.json exists.

#### Phase 3: REFLECT

**Purpose:** Single LLM call analyzing results. Decides whether the goal is achieved.

**Input assembly:**
1. Task results summary (completed/failed counts, error messages, files changed)
2. Git diffs for changed files (truncated to 500 lines per file)
3. Error classifications from `errorClassifier`
4. Build validation result (passed/failed/skipped + error output)

**LLM prompt:**
```
Role: Senior code reviewer reflecting on cycle results
Goal: {title} - {description}
Cycle: {current}/{max}, {N} tasks completed so far
Task results: [status, error, filesChanged per task]
Build validation: passed/failed/skipped
File diffs: [truncated git diffs]

Output: JSON { status, summary, brainFeedback, lessonsLearned, nextTasks? }
```

**Decision outcomes:**

| Status | Action |
|--------|--------|
| `done` | Goal achieved. Exit loop, complete run. |
| `continue` | More work needed. `nextTasks` fed to next PLAN cycle as context. cycle++ |
| `needs_input` | Blocked, needs human input. Pause run, poll DB every 2s until resumed. |

**Post-reflect:**
- Record Brain signals for each task (non-blocking `feedBrainOutcome`)
- Store reflection in `reflection_history` JSON array
- If `continue` and at cycle limit: force to `done`

### 3. Run Completion

```
runV3Loop exits
  |
  |- Calculate final metrics (totalDurationMs, totalCycles)
  |- Determine status: 'completed' (normal) or 'interrupted' (aborted)
  |- conductorRepository.updateRunStatus(finalStatus, metrics)
  |- Log final message to process_log
  |- Clean up AbortController
```

## Control Flow: Pause/Resume/Stop

```
POST /api/conductor/run { action: 'pause' }
  -> conductorRepository.updateRunStatus(runId, 'paused')
  -> Loop detects pause at next checkpoint

POST /api/conductor/run { action: 'resume' }
  -> conductorRepository.updateRunStatus(runId, 'running')
  -> waitForResume() poll exits, loop continues

POST /api/conductor/run { action: 'stop' }
  -> conductorRepository.setAbort(runId)
  -> AbortController.abort() (cancels in-flight HTTP)
  -> shouldAbort() returns true at next checkpoint
  -> Run marked as 'interrupted'
```

## Abort Checkpoints

The loop checks `shouldAbort(runId)` at these points:
- Before each phase (PLAN, DISPATCH, REFLECT)
- After each phase completes
- During `waitForResume()` polling

## State Persistence

Every phase transition writes to DB atomically:
```sql
UPDATE conductor_runs
SET metrics = ?, stages_state = ?, process_log = ?, cycle = ?, current_stage = ?
WHERE id = ?
```

This ensures crash recovery -- if the server restarts, the run can be marked as interrupted and the user sees the last known state.

## Multi-Cycle Adaptation

On cycle 2+, the PLAN phase receives:
- `previousReflection.summary` -- What happened last cycle
- `previousReflection.lessonsLearned` -- What to do differently
- `previousReflection.nextTasks` -- Specific follow-up tasks from reflection

This means cycle 2 doesn't repeat the same scan. It gets targeted follow-up work.

## Brain Integration (3 Moments)

```
1. PRE-CYCLE: generateBrainQuestions()
   Brain -> Questions -> User (optional)

2. DURING PLAN: getBrainWarnings()
   Brain -> Warnings -> PLAN prompt
   Sources: high-confidence insights, revert patterns, low success rates

3. POST-REFLECT: feedBrainOutcome()
   Task results -> Brain signals
   Signals inform future warnings (feedback loop)
```
