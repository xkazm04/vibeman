# Pitfalls Research

**Domain:** Autonomous development orchestration — brownfield rebuild of a multi-stage pipeline that drives LLM CLI sessions to produce committed code
**Researched:** 2026-03-14
**Confidence:** HIGH — derived from direct inspection of the existing (failing) Conductor implementation plus corroborating external research on multi-agent LLM systems

---

## Critical Pitfalls

### Pitfall 1: globalThis as a Long-Running Process Host

**What goes wrong:**
The current Conductor stores active pipeline runs in `globalThis.conductorActiveRuns` so they survive Next.js HMR. When the server restarts, the Node process is replaced, `globalThis` is wiped, and any running pipeline loop dies silently. The SQLite row stays `status='running'` indefinitely. The orphan-recovery function exists but only marks runs `interrupted` — it cannot resume them. A pipeline that was 80% done is simply abandoned.

**Why it happens:**
Next.js server-side code is not designed to host long-lived stateful processes. HMR destroys module scope; `globalThis` survives a single re-compile but not a process restart. Developers reach for `globalThis` as the path-of-least-resistance to survive HMR, not realising it is still mortal under a full restart.

**How to avoid:**
Treat the orchestrator as a durable state machine persisted entirely in SQLite, not in memory. Every pipeline action must be a DB write before it executes (write-ahead pattern). On startup, the orchestrator reads DB state and resumes interrupted runs from their last checkpointed stage. In-memory context (AbortController, timers) is reconstructable from DB state — never the source of truth.

**Warning signs:**
- Pipeline status stuck as `running` in the DB after the dev server restarts
- `globalForConductor.conductorActiveRuns.size` is 0 but DB shows active runs
- Users report pipelines "disappearing" without completing

**Phase to address:** Foundation phase — define the durable state machine schema and checkpoint protocol before any stage logic is written. This is the highest-leverage architectural decision.

---

### Pitfall 2: Domain Isolation in Name Only

**What goes wrong:**
The current batch stage uses a "DAG by category" heuristic: tasks in the same category are serialised, different categories run in parallel. In practice, category labels (`ui`, `testing`, `refactor`) are LLM-generated from idea descriptions and frequently wrong or inconsistent. Two tasks categorised differently still modify the same files, causing one to overwrite the other's changes silently. No actual file-level conflict detection exists.

**Why it happens:**
Category-based isolation is easy to implement and sounds correct, but the category is semantic metadata, not a filesystem claim. The category has no binding relationship to which files will actually be touched.

**How to avoid:**
Domain isolation must be based on what files a task will touch, not what label it was given. The requirement spec generation phase (Batch in the new architecture) should extract `affected_files` explicitly and store them as structured data. Before dispatching parallel tasks, the scheduler computes intersection: if two tasks declare overlapping files, they must be serialised regardless of category. This is a static analysis pass, not LLM inference at dispatch time.

**Warning signs:**
- Parallel tasks both modifying the same component and the second run reverting the first's changes
- TypeScript errors appearing in files that weren't in the failing task's scope
- `git diff` shows changes to files not mentioned in a task's requirement spec

**Phase to address:** Execution architecture phase — define the file-claim registry and intersection check before implementing parallel dispatch.

---

### Pitfall 3: Prompt Drift from Healing Patch Accumulation

**What goes wrong:**
The self-healing system appends instruction blocks to prompts each time an error class recurs. After three or four healing cycles, the execution prompt contains six or more injected sections, some of which contradict each other (e.g., "keep changes minimal" injected for a timeout error, and "read at least 10 files before implementing" injected for a missing-context error). The LLM context window fills with meta-instructions that crowd out actual task content. Healing patches never expire or get evaluated for effectiveness.

**Why it happens:**
Additive healing is easy to implement and each individual patch seems reasonable. The interaction effects between patches accumulate invisibly because the patch store has no eviction, no effectiveness tracking, and no conflict detection.

**How to avoid:**
Healing patches must be bounded: maximum 2-3 active patches per error class, with effectiveness tracked by comparing success rate before and after application. Patches that do not improve success rate within N subsequent runs should be automatically reverted. Patches for contradictory goals (reduce scope vs. increase exploration) must be mutually exclusive — activating one deactivates the other. The total healing context injected into any prompt should have a hard token cap.

**Warning signs:**
- Healing sections in prompts exceed 500 tokens
- Success rate does not improve after healing patches are applied
- Multiple patches active that address opposite concerns
- Execution time per task increasing across cycles (context bloat)

**Phase to address:** Self-healing phase — design the patch lifecycle model with expiry and effectiveness feedback before implementing any healing logic.

---

### Pitfall 4: Success Detection Based on CLI Exit Code Alone

**What goes wrong:**
The current execute stage marks a task `success=true` when the CLI execution reaches `status='completed'`. A CLI session that successfully runs to completion without crashing is not the same as a session that correctly implemented the requirement. The LLM may have written "I cannot find the file" to stdout and exited cleanly, or may have partially implemented 30% of the requirement and stopped. The pipeline reports 100% success.

**Why it happens:**
There is no post-execution validation step between "CLI finished" and "task succeeded." The distinction between process completion and requirement satisfaction is collapsed.

**How to avoid:**
After each CLI session completes, run a lightweight validation pass: (1) TypeScript build check (`tsc --noEmit`) scoped to changed files; (2) require the agent to have called `log_implementation` MCP tool as a proof-of-completion signal; (3) check that at least one file in the declared `affected_files` was actually modified. Fail the task if any of these checks fail. This does not require running the full test suite — it just closes the gap between "process finished" and "requirement satisfied."

**Warning signs:**
- 100% task success rates but no visible changes in the project
- Requirement files not cleaned up after reported-successful runs
- Brain module receives implementation logs for tasks that have no matching file changes

**Phase to address:** Execution phase — validation protocol must be specified before the execute stage is built, not retrofitted.

---

### Pitfall 5: Polling-Based Status as the Primary Coordination Mechanism

**What goes wrong:**
The execute stage polls `getExecution(executionId)` every 5 seconds across all parallel tasks simultaneously. With 4 concurrent tasks, each polling at 5s intervals, this generates a constant stream of in-process calls plus DB reads. More critically, the poll-to-detect-completion path means the orchestrator is always behind by up to 5 seconds and cannot react immediately to abort signals during the sleep interval. At scale (long-running tasks, many cycles), the polling loop is the bottleneck.

**Why it happens:**
Polling is the simplest way to check status when the execution subsystem does not emit events. The CLI service (`cli-service.ts`) is a fire-and-forget model; the caller has no subscription mechanism, only a getter.

**How to avoid:**
The new architecture should treat CLI execution as an event source. The CLI service should support a completion callback or an EventEmitter interface. The orchestrator subscribes rather than polls. If the CLI service cannot be changed, use a short-circuit mechanism: after the task completion callback fires, immediately proceed rather than waiting for the next poll tick. Maintain a polling fallback with progressive backoff (5s → 10s → 30s) for stuck detection only, not as the primary notification path.

**Warning signs:**
- CPU usage spikes on the Node process during long pipeline runs due to constant polling
- Abort signals taking up to 5 seconds to take effect
- "Execution not found" errors that are timing-sensitive (execution cleaned up between polls)

**Phase to address:** Execution architecture phase — define the event contract with the CLI service before building the stage.

---

### Pitfall 6: Brain Integration as a Lookup, Not a Gate

**What goes wrong:**
When Brain is integrated as an optional enrichment source ("query Brain for context, proceed regardless"), its value is limited to cosmetic prompt decoration. The pipeline generates the same tasks it would have generated without Brain — Brain just adds a paragraph of retrieved patterns to the prompt. More critically, the pipeline may generate tasks that directly contradict existing Brain insights (e.g., generating a task to add Redux when Brain has recorded "avoid Redux — use Zustand" as a learned pattern).

**Why it happens:**
Optional enrichment is safe and easy to implement. Making Brain a gate (blocking a task if it conflicts with a pattern) requires resolving what happens when Brain says "no" — a harder design question developers defer.

**How to avoid:**
Brain must be a filter before backlog items are committed to execution, not an annotation after the fact. At the triage stage, each backlog item should be checked against Brain patterns using a conflict-detection query: "Does any learned pattern contraindicate this approach?" Items that conflict with high-confidence Brain patterns should be flagged for human review at the triage checkpoint rather than automatically executed. Brain should also contribute positive guidance: if a pattern strongly suggests a specific approach, that approach should be encoded in the requirement spec, not just hinted at in the prompt.

**Warning signs:**
- Pipeline executing tasks that a developer has previously reversed and taught Brain about
- Brain insights growing but never influencing which tasks run
- Triage checkpoint approvals not surfacing Brain conflicts to the user

**Phase to address:** Triage and spec generation phases — the Brain contract must be defined before these phases are implemented.

---

### Pitfall 7: Requirement Specs as Flat Text Without Structured Acceptance Criteria

**What goes wrong:**
The current batch stage builds requirement files as freeform markdown with a description block. The LLM agent receives this and decides for itself what "done" means. Different agents interpret the same description differently, leading to partial implementations that the success-detection mechanism (CLI exit code) marks as complete. There is no machine-readable acceptance criteria that the validation pass can check.

**Why it happens:**
Freeform markdown is fast to generate and easy to read. Structured acceptance criteria require a schema decision upfront. Developers defer this, intending to add structure "later" — but later never comes because the pipeline already works well enough in demos.

**How to avoid:**
Every requirement spec must contain a machine-parseable `## Acceptance Criteria` section with checklist items that the agent is required to tick off using a structured tool call (`report_completion` with criteria IDs). The validation pass checks that all criteria are marked complete before declaring the task successful. This turns subjective "done" into verifiable "done." Criteria should be generated by the spec-writing stage (likely an LLM call), not hand-authored.

**Warning signs:**
- Agents implementing different subsets of the same requirement description across runs
- No consistent `## Acceptance Criteria` section in generated requirement files
- Human review at post-execute checkpoint required for most tasks (symptom of unclear specs)

**Phase to address:** Spec generation phase — acceptance criteria schema must be locked before requirement file generation is implemented.

---

### Pitfall 8: Goal-to-Backlog Without Codebase Grounding

**What goes wrong:**
The Scout stage generates ideas using scan-type prompts but does not anchor ideas to the specific goal the user set. A user sets a goal of "improve test coverage for the auth module" but Scout generates ideas across all scan types — UI improvements, performance optimisations, refactoring suggestions — none directly related to the goal. The triage pass then filters by impact/effort scores rather than goal relevance, so goal-aligned items may be deprioritised in favour of high-scoring but off-topic ideas.

**Why it happens:**
The Scout stage was designed as a general codebase scanner, not a goal-directed scanner. The goal is stored as user intent but not passed into the scanning prompts as a constraint.

**How to avoid:**
The goal must be the first filter, not a downstream filter. Scan prompts must include the active goal as an explicit constraint: "Generate ideas that contribute to: [goal]. Discard ideas that do not relate to this goal." The triage pass should have a goal-relevance score as a mandatory criterion alongside impact/effort/risk — an idea with high impact but zero goal relevance should not be promoted. If the goal is specific enough, some scan types can be skipped entirely (e.g., a UI-focused goal should not trigger `perf_optimizer` scans).

**Warning signs:**
- Triage checkpoint showing a diverse mix of unrelated improvements when the goal was narrow
- Pipeline running for multiple cycles without making progress on the stated goal
- User rejecting most triage suggestions because they are off-topic

**Phase to address:** Scout and triage phases — goal propagation must be a first-class parameter before these stages are built.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using category labels for domain isolation | Simple, no schema changes needed | Silent file conflicts in parallel runs, hard to debug | Never in the new architecture |
| Additive healing patches without expiry | Easy to accumulate "learnings" | Prompt bloat, contradictory instructions, degraded output quality | Never — patches need a lifecycle from day one |
| CLI exit code as success signal | Simple boolean check | False positives on incomplete implementations | Never — minimum validation must include file change verification |
| Polling as primary completion notification | No CLI service changes required | Slow reaction times, wasted CPU, race conditions on cleanup | Only as fallback stuck-detection with long intervals |
| Freeform requirement markdown without schema | Fast to prototype | Untestable acceptance criteria, inconsistent agent behaviour | Acceptable only in initial scaffolding, must be replaced before first real run |
| Self-healing as prompt injection only | Easy to implement, auditable | Config and routing decisions cannot be healed by prompts alone | Prompts only heal prompt-class errors; separate healing strategies needed for config and routing |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Brain module | Querying Brain after task is already scheduled | Query Brain before committing tasks to the execution queue; use results to filter or block |
| Ideas module | Treating all Ideas equally regardless of source | Tag which ideas were generated by Conductor (vs. user-created) to enable targeted cleanup on failure |
| TaskRunner / CLI sessions | Sharing a session between pipeline tasks and manual user tasks | Conductor must claim sessions exclusively for its duration or use a separate session pool |
| SQLite migrations | Adding non-nullable columns to `conductor_runs` in new migrations | All new columns must be nullable or have a DEFAULT — existing rows in production cannot be patched retroactively |
| MCP tools in agent prompts | Listing MCP tools the agent doesn't have access to in the session | Verify MCP tool availability per provider before referencing them in requirement specs |
| `getBaseUrl()` in server-side code | Hardcoding `http://localhost:3000` as fallback | Use `NEXT_PUBLIC_APP_URL` consistently; local loopback calls from server to server work but fail on port-conflict scenarios |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-task DB read-modify-write for stage state | DB contention when multiple tasks report simultaneously | Batch stage updates per cycle, not per task event | At 4 concurrent tasks with 5s poll intervals — already at the limit |
| JSON blob columns for stages_state and process_log | Full serialise/deserialise on every update, unbounded growth | Use a separate `conductor_stage_events` table with append-only rows | process_log exceeds ~500 entries for multi-cycle runs |
| Loading all ideas then filtering by ID | Full table scan on `ideas` for large projects | Query by ID list directly: `WHERE id IN (...)` | Projects with 1000+ ideas in the DB |
| Healing analysis calling LLM per error type | Cascading LLM calls during review stage block pipeline progress | Batch all error types into single healing analysis call | 3+ distinct error types in a single cycle |
| Enriching ideas with context on every batch run | N+1 context lookups per accepted idea | Cache project contexts at the start of a run, reuse throughout | Projects with 20+ contexts |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Passing raw user goal text directly into LLM prompts without sanitisation | Prompt injection: a goal containing instruction text can redirect agent behaviour | Sanitise goal text — strip markdown formatting, limit length, escape special sequences before embedding in prompts |
| Requirement files including unsanitised idea descriptions from the DB | If idea descriptions contain injected instructions from the Ideas module, they propagate into agent prompts | Treat idea content as user data — sanitise before embedding in requirement specs |
| No input validation on the conductor run API (`/api/conductor/run`) | Malformed `config` object can crash the orchestrator or trigger unbounded resource consumption | Validate all config fields with explicit type guards before starting a pipeline run |
| Healing patches applied globally across project runs | A patch intended to fix a specific run's errors silently modifies all future runs for the project | Scope patches to a run by default; require explicit opt-in to promote a patch to project-wide |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Checkpoint presented as a blocking modal | User cannot continue other work while pipeline waits at triage; they minimise the app and forget | Make checkpoints non-blocking: pipeline pauses and sends a notification; user reviews at their own pace via a persistent triage queue |
| Process log showing raw stage events without grouping | Log becomes a wall of text after 2+ cycles; users stop reading it | Group events by cycle and stage with collapsible sections; surface only failures and completions at the top level |
| Goal shown as a label but not as a progress metric | User cannot tell if the pipeline is actually making progress toward their goal | Surface a goal-progress indicator (% of goal-relevant ideas accepted and completed) alongside cycle/task counts |
| Triage checkpoint requiring binary accept/reject per idea | User cannot adjust an idea's scope before accepting it | Allow inline editing of idea title and scope note at triage; agent receives the edited version in its requirement spec |
| Pipeline "completed" status when all tasks failed | User sees green "completed" badge but nothing was implemented | Distinguish `completed-success`, `completed-partial`, and `completed-failed` statuses with different visual treatments |

---

## "Looks Done But Isn't" Checklist

- [ ] **Domain isolation:** Verify that `affected_files` in two parallel requirement specs have zero intersection — not just that their categories differ
- [ ] **Brain integration:** Verify that Brain conflict-check results appear in the triage checkpoint UI, not just in server logs
- [ ] **Healing patches:** Verify that a patch applied in cycle 1 is not still active in cycle 5 if it produced no improvement
- [ ] **Success detection:** Verify that a task where the LLM wrote "I cannot complete this" and exited cleanly is marked as `failed`, not `success`
- [ ] **Goal relevance:** Verify that triage output contains only ideas directly relevant to the active goal when the goal is narrow
- [ ] **Orphan recovery:** Verify that a run marked `running` in the DB after process restart is recovered to `interrupted` on next startup, not left stuck
- [ ] **Session exclusivity:** Verify that Conductor-owned CLI sessions are not visible or usable in the manual TaskRunner UI during a pipeline run
- [ ] **Spec acceptance criteria:** Verify that every generated requirement file contains a `## Acceptance Criteria` section with at least one checkable item

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Orphaned pipeline run | LOW | Mark DB row `interrupted`; user restarts from last completed stage using checkpoint data |
| File conflict from parallel tasks | HIGH | `git diff` to identify conflicting files; manual merge or reset to pre-run commit; re-run with serialised execution |
| Prompt bloat from patch accumulation | MEDIUM | Export active patches, prune ones applied more than N cycles ago or with zero effectiveness, reset healing state |
| False-success tasks with no file changes | MEDIUM | Re-run failed tasks individually with validation enabled; mark affected ideas back to `pending` status |
| Goal-irrelevant backlog filling triage | LOW | Clear generated ideas from current cycle in DB; re-run Scout with stronger goal constraint in prompt |
| Brain conflict ignored (wrong task executed) | HIGH | Revert commits from the offending task; add explicit pattern to Brain before re-running |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| globalThis as process host | Foundation — durable state machine | Process restart during active run → run resumes from correct stage |
| Domain isolation in name only | Execution architecture — file-claim registry | Two parallel tasks with overlapping files → serialised automatically |
| Self-healing prompt drift | Self-healing design — patch lifecycle model | After 5 cycles, no more than 2 active patches per error class |
| False success on CLI exit | Execution — validation protocol | LLM writing "cannot complete" → task marked failed |
| Polling as primary coordination | Execution architecture — CLI event contract | Abort signal triggers in <1s, not after next poll tick |
| Brain as lookup not gate | Triage phase — Brain conflict contract | Task contradicting a Brain pattern → flagged at checkpoint, not silently executed |
| Freeform specs without criteria | Spec generation phase — requirement schema | Every generated spec contains parseable acceptance criteria |
| Goal-blind Scout | Scout phase — goal propagation | Narrow goal → triage shows only goal-relevant ideas |

---

## Sources

- Direct inspection: `src/app/features/Manager/lib/conductor/conductorOrchestrator.ts` — globalThis pattern, orphan recovery, polling loop
- Direct inspection: `src/app/features/Manager/lib/conductor/stages/executeStage.ts` — DAG scheduler, polling mechanism, success detection
- Direct inspection: `src/app/features/Manager/lib/conductor/stages/batchStage.ts` — category-based domain isolation heuristic
- Direct inspection: `src/app/features/Manager/lib/conductor/selfHealing/healingAnalyzer.ts` — patch accumulation, no expiry mechanism
- Direct inspection: `.planning/codebase/CONCERNS.md` — documented known bugs: globalThis race condition, orphaned runs, polling overhead, test coverage gaps
- [Why Multi-Agent LLM Systems Fail — Augment Code](https://www.augmentcode.com/guides/why-multi-agent-llm-systems-fail-and-how-to-fix-them) — resource ownership, coordination bottlenecks
- [Why Do Multi-Agent LLM Systems Fail? — arXiv 2503.13657](https://arxiv.org/abs/2503.13657) — 1600+ annotated failure traces, three failure categories
- [The 80% Problem in Agentic Coding — Addy Osmani](https://addyo.substack.com/p/the-80-problem-in-agentic-coding) — near-correct outputs, debugging cost
- [Self-Improving Coding Agents — Addy Osmani](https://addyosmani.com/blog/self-improving-agents/) — patch drift, fresh-start periodicity
- [AI Agent State Checkpointing — Fast.io](https://fast.io/resources/ai-agent-state-checkpointing/) — checkpoint anatomy, 60% waste reduction from checkpointing
- [Building Reliable Background Tasks in Next.js — DBOS](https://www.dbos.dev/blog/durable-nextjs-background-tasks) — Next.js background job reliability, write-ahead patterns
- [Where Autonomous Coding Agents Fail — Medium/Vivek Babu](https://medium.com/@vivek.babu/where-autonomous-coding-agents-fail-a-forensic-audit-of-real-world-prs-59d66e33efe9) — 67.3% AI PR rejection rate, false completion signals

---

*Pitfalls research for: Vibeman Conductor pipeline rebuild*
*Researched: 2026-03-14*
