# Project Research Summary

**Project:** Vibeman — Conductor Pipeline Redesign
**Domain:** Autonomous development orchestration (goal-to-code pipeline in a brownfield Next.js app)
**Researched:** 2026-03-14
**Confidence:** HIGH

## Executive Summary

The Vibeman Conductor is a multi-stage autonomous development pipeline embedded in a local-first Next.js app. Its job is to translate a user-defined goal into implemented, committed code by orchestrating LLM CLI sessions through a structured sequence: codebase analysis, backlog generation, triage, spec writing, parallel execution, and code review. The research confirms this is a brownfield rebuild, not a greenfield project — the core stack (Next.js, TypeScript, SQLite, Zustand, `@anthropic-ai/claude-agent-sdk`, `ts-morph`, `chokidar`) is already locked and proven. No new infrastructure dependencies are needed. The only potential addition is `simple-git` for the optional commit-on-completion feature.

The recommended approach is a strict stage-function pipeline where each stage is a typed async function, the orchestrator is a durable state machine persisted in SQLite, and domain isolation is enforced at the file-path level (not the category-label level). Brain integration must be a filter at triage — not passive prompt decoration — and requirement specs must contain machine-parseable acceptance criteria. The existing self-healing subsystem should be kept but redesigned with patch expiry and effectiveness tracking to prevent prompt bloat over multiple cycles.

The highest-risk areas are: (1) the `globalThis` run-context model failing on process restart, (2) category-based domain isolation silently allowing concurrent file conflicts, and (3) success detection based on CLI exit code alone producing false positives. All three are bugs in the current implementation that must be fixed in the foundation phase before any new stage logic is written. The build order imposed by architecture dependencies is: types and DB schema first, then Spec Writer and Execute Stage (which are working and need only targeted changes), then Goal Analyzer and Backlog Builder (net-new), then the Orchestrator rebuild last.

## Key Findings

### Recommended Stack

The full stack for the Conductor redesign is already installed. Research confirmed no new dependencies are required beyond the existing `package.json`. The Claude Agent SDK (`@anthropic-ai/claude-agent-sdk` ^0.2.59) is the correct execution primitive — it provides sessions, tool dispatch, hooks, and abort signal support out of the box. `ts-morph` handles deterministic codebase structural analysis for the Scout/Goal Analyzer stage. `better-sqlite3` covers all pipeline state persistence with synchronous writes that fit the server-thread model. Build validation runs via `tsc --noEmit` as a subprocess (not the programmatic Compiler API) for simplicity and reliability.

**Core technologies:**
- `@anthropic-ai/claude-agent-sdk` ^0.2.59: Execution primitive for all CLI sessions — provides tool loop, session continuity, hooks, abort signal support
- `ts-morph` ^27.0.2: Deterministic TypeScript AST analysis for Goal Analyzer stage — faster and more reliable than asking an LLM to "look at the codebase"
- `better-sqlite3` ^12.6.2: All pipeline state persistence — synchronous API fits the Next.js server thread correctly
- `typescript` (subprocess `tsc --noEmit`): Build validation gate — parse exit code and stderr, feed failures into Review stage
- `simple-git` ^3.x (optional, not yet installed): Git automation for the commit-on-completion feature — only if that feature is implemented in v1.x

**What not to use:** LangChain, BullMQ, Temporal, external vector databases, streaming SSE for agent output, `nodegit` with native bindings. The existing `usePolling` hook covers status delivery to the UI.

### Expected Features

The feature research produced a clear P1/P2/P3 prioritisation. The critical insight is that the feature dependency chain is strictly linear: goal input must precede Scout, Scout must precede backlog generation, backlog must precede triage, triage must precede spec writing, spec writing must precede execution, execution must precede validation and review. This ordering drives the phase structure directly.

**Must have (P1 — v1 launch):**
- Structured goal input — required entry point; freeform-only goals produce inconsistent Scout outputs
- Codebase analysis (Goal Analyzer) using existing Ideas scan types with goal as an explicit constraint
- Backlog generation — gap candidates scored by domain, effort, impact, goal relevance
- Triage checkpoint — batch-approve with per-item override; Brain conflict-check results surfaced to user
- Markdown requirement spec per accepted item — with `## Acceptance Criteria`, `## Affected Files`, `## Approach` sections
- Domain isolation — file-path intersection check, not category-label heuristic
- Parallel CLI execution — 1-4 concurrent sessions via `Promise.allSettled`, domain-isolated by file claim
- Build validation gate — `tsc --noEmit` after all tasks complete
- LLM code review against quality rubric
- Execution report and run persistence
- Configurable checkpoint toggles (at minimum the triage gate; optionally pre-execute and post-review)
- Brain integration as active filter at triage and as context enrichment for specs

**Should have (P2 — after v1 validation):**
- Complexity-based model routing (Sonnet for complexity_1, Opus for complexity_2/3)
- DAG-based task dependency resolution (file-level, replacing category heuristic)
- Self-healing with prompt patching — redesigned with patch expiry and effectiveness tracking
- Automated test generation embedded in requirement specs

**Defer (v2+):**
- Auto-commit on goal completion — risky without proven review quality; user commits manually in v1
- Token/cost estimation before execution
- Multi-goal queue

### Architecture Approach

The architecture is a singleton orchestrator pattern: a server-side background async process stored in `globalThis` for HMR survival, with all authoritative state persisted in SQLite using a write-ahead pattern. Each stage is a pure async function with typed input and output; the orchestrator is the only file that imports all stage functions. The UI communicates exclusively via HTTP polling (`usePolling` → `GET /api/conductor/status`) and command routes (`POST /api/conductor/run`). Brain is read via direct import of `getBehavioralContext()`; Brain writes happen via API in Review Stage. Ideas and Goals are communicated via their HTTP APIs to preserve validation logic.

**Major components:**
1. **Conductor Orchestrator** — pipeline loop and state machine; owns all DB writes for run state; singleton via `globalThis`
2. **Goal Analyzer** (new) — translates goal + Brain behavioral context into codebase gap candidates stored as Ideas
3. **Backlog Builder** (new) — scores and tags gap candidates; produces domain-isolated `BacklogItem[]` with `affectedFiles`
4. **Triage Stage** (keep, extend) — CLI scoring + Brain conflict check + configurable user checkpoint
5. **Spec Writer** (rename from batchStage) — generates one `.md` spec file per accepted idea with structured acceptance criteria; builds file-overlap DAG
6. **Execute Stage** (keep, extend) — DAG-aware parallel dispatch; `Promise.allSettled` across up to 4 sessions; post-execution validation (file change check + `log_implementation` signal)
7. **Review Stage** (keep, extend) — aggregates results; writes Brain signals; triggers self-healing; updates goal progress
8. **Self-Healing** (keep, redesign lifecycle) — error classifier → healing analyzer → prompt patcher with patch expiry and effectiveness tracking
9. **Brain Module** (existing) — active decision engine; read by Goal Analyzer, Triage, Spec Writer; written by Review Stage

**Build order (imposed by dependencies):** Types + DB schema → Spec Writer → Execute Stage → Review Stage → Triage Stage → Goal Analyzer → Backlog Builder → Orchestrator

### Critical Pitfalls

1. **`globalThis` as durable process host** — When the Node process restarts, `globalThis` is wiped, pipeline loops die silently, and SQLite rows stay `status='running'` forever. Fix: implement write-ahead state machine where every action is a DB write before it executes; reconstruct in-memory context from DB on startup rather than treating `globalThis` as the source of truth. Address in the foundation phase.

2. **Domain isolation based on category labels** — LLM-generated categories (`ui`, `testing`, `refactor`) have no binding relationship to which files will be touched. Two differently-categorised tasks can overwrite each other's changes silently. Fix: require `affectedFiles` in every spec; compute intersection before dispatch; serialize tasks with overlapping file claims regardless of category. Address in Spec Writer and Execute Stage.

3. **Success detection from CLI exit code alone** — A CLI session that exits cleanly may have written "I cannot complete this" to stdout without modifying any files. The pipeline currently marks this `success=true`. Fix: after each session completes, verify (a) at least one file in `affectedFiles` was modified, (b) `log_implementation` MCP tool was called, (c) `tsc --noEmit` passes for changed files. Address in Execute Stage validation protocol.

4. **Self-healing prompt drift** — Additive healing patches accumulate across cycles without expiry or effectiveness tracking. After 3-4 cycles, contradictory patches crowd out task content. Fix: maximum 2-3 active patches per error class; track success rate before and after each patch; revert patches that show no improvement within N runs; enforce a hard token cap on injected healing context. Address before implementing any healing logic.

5. **Brain integration as optional enrichment** — When Brain is queried after tasks are already scheduled, its output only decorates prompts without filtering. The pipeline can execute tasks that contradict established patterns. Fix: Brain conflict check must run at triage before task commitment; items conflicting with high-confidence Brain patterns are flagged for user review, not auto-approved. Address in Triage Stage design.

6. **Goal-blind Scout** — If the active goal is not injected as a hard constraint into scan prompts, the Scout/Goal Analyzer generates generic codebase improvements unrelated to the goal. Triage then promotes high-scoring off-topic items. Fix: goal text is the first filter in every scan prompt; triage includes a goal-relevance score as a mandatory criterion; narrow goals skip irrelevant scan types entirely.

7. **Freeform specs without acceptance criteria** — Agents receiving description-only specs decide for themselves what "done" means, producing inconsistent implementations that exit cleanly and get marked successful. Fix: every spec must contain a `## Acceptance Criteria` section with checklist items the agent ticks off via a structured tool call; validation pass checks all criteria are marked before declaring success.

## Implications for Roadmap

Based on combined research, the pipeline's strict feature dependency chain and the architecture's build order both point to the same phase structure. The critical constraint is that the foundation (durable state machine, correct types, DB schema) must exist before any stage logic is written, because the bugs in the current implementation are architectural — not implementational.

### Phase 1: Foundation — Durable State Machine and Types

**Rationale:** Three of the seven critical pitfalls (globalThis, DB schema for new columns, type contracts between stages) are architectural and will corrupt every subsequent phase if not resolved first. You cannot build correct stage logic on a broken foundation. No stage can be reliably tested until the types are locked and the DB migration is in place.

**Delivers:** Redesigned `types.ts` with `GoalAnalyzerInput/Result`, `BacklogItem`, `SpecWriterInput/Output` with `affectedFiles`, `BatchDescriptor` with DAG; DB migration adding `goal_id` to `conductor_runs`, `affected_files` to `ideas`; write-ahead state machine protocol in Orchestrator skeleton; orphan recovery extended to handle checkpoint expiry.

**Addresses:** Structured goal input (entry point definition), pipeline run persistence schema
**Avoids:** globalThis-as-truth pitfall; non-nullable column migration pitfall; type drift between stages

**Research flag:** Standard patterns — no additional research needed. Migration system is mature and well-understood.

---

### Phase 2: Spec Writer Redesign

**Rationale:** Spec Writer is the dependency bottleneck — Execute Stage cannot receive accurate file claims until Spec Writer produces them. Starting here unblocks Execute Stage and lets domain isolation be tested with real data before parallel execution is implemented. It is also the simplest net-change stage: it renames from `batchStage`, adds `affectedFiles` extraction, and adds the `## Acceptance Criteria` schema.

**Delivers:** `specWriter.ts` producing `.md` files with structured sections (`## Goal`, `## Acceptance Criteria`, `## Affected Files`, `## Approach`); `affectedFiles` stored as structured JSON on each idea row; `BatchDescriptor` with file-claim map for DAG construction; Brain code conventions injected into spec template.

**Addresses:** Markdown requirement spec per backlog item (P1), Brain integration into spec generation, structured acceptance criteria (anti-pitfall #7)
**Avoids:** Freeform specs pitfall; Brain-as-optional-enrichment pitfall (Brain conventions are required input, not optional)

**Research flag:** Standard patterns — spec template design is well-understood from FEATURES.md analysis.

---

### Phase 3: Execute Stage Hardening

**Rationale:** Execute Stage mostly works today but has three correctness bugs: category-based domain isolation, CLI-exit-code-only success detection, and polling as the primary completion notification. These must be fixed before the stage is trusted as the execution backbone. The file-claim DAG cannot be built until Spec Writer (Phase 2) provides `affectedFiles`.

**Delivers:** File-overlap intersection check replacing category-based DAG; post-execution validation protocol (file change verification + `log_implementation` check + scoped `tsc --noEmit`); `Promise.allSettled` for batch dispatch (no single-task failure propagation); completion callback interface on CLI Service replacing poll-as-primary (polling becomes stuck-detection fallback with backoff).

**Addresses:** Parallel CLI execution (P1), domain isolation (P1), build validation gate (P1)
**Avoids:** Category-isolation pitfall, false-success pitfall, polling-as-coordination pitfall

**Research flag:** CLI Service completion callback contract may need investigation — confirm whether `cli-service.ts` can emit events or only supports polling. If not, design the short-circuit mechanism here.

---

### Phase 4: Review Stage Extension

**Rationale:** Review Stage exists and works for self-healing dispatch. It needs to be extended to write Brain signals, update goal progress, distinguish `completed-success` / `completed-partial` / `completed-failed` statuses, and optionally trigger git commit. This is low-risk extension of existing code; doing it before the new stages (Goal Analyzer, Backlog Builder) avoids having to retrofit Brain signal writes later.

**Delivers:** Brain signal writes after each execution cycle (`POST /api/brain/signals`); goal progress update in goals table; three-way completion status; optional `simple-git` commit trigger (configurable, default off); LLM code review against rubric.

**Addresses:** LLM code review (P1), execution report and run persistence (P1), goal progress visibility
**Avoids:** Brain-as-lookup pitfall (signals written here inform future runs correctly)

**Research flag:** Standard patterns — Brain signal schema is already defined; simple-git API is well-documented.

---

### Phase 5: Triage Stage Extension with Brain Gate

**Rationale:** Triage Stage works for scoring but lacks Brain conflict detection and the explicit checkpoint pause mechanism with timeout. Both are required for v1. Doing this before Goal Analyzer means Triage has a stable interface when Goal Analyzer starts producing input for it.

**Delivers:** Brain conflict-check query at triage (items flagging Brain pattern violations are marked for user review); goal-relevance score as mandatory triage criterion; checkpoint pause with 24-hour timeout and auto-interrupt; inline idea editing at checkpoint UI; non-blocking checkpoint notification instead of blocking modal.

**Addresses:** Triage checkpoint (P1), configurable checkpoint toggles (P1), Brain integration as filter (not enrichment)
**Avoids:** Brain-as-lookup pitfall, checkpoint-as-blocking-modal UX pitfall, goal-blind Scout pitfall (goal-relevance score enforced here)

**Research flag:** Brain conflict-check query design may need iteration. The query ("does any learned pattern contraindicate this approach?") requires Brain to have structured pattern data — validate that `getBehavioralContext()` returns data in a format that supports conflict detection, or define the schema extension needed.

---

### Phase 6: Goal Analyzer and Backlog Builder (New Stages)

**Rationale:** These two stages are net-new and depend on everything upstream (Spec Writer for the output format they feed into, Triage for the interface they feed, Brain for context). They are last among the stages for this reason. Together they replace the current Scout Stage as the entry point to the pipeline.

**Delivers:** `goalAnalyzer.ts` — dispatches CLI with goal + Brain behavioral context as explicit constraints; stores gap candidates as Ideas with Conductor-source tag; filters by goal relevance before writing. `backlogBuilder.ts` — scores and groups gap candidates; assigns domain tags; produces prioritised `BacklogItem[]` with `affectedFiles` stubs for Spec Writer. Goal input UI with structured goal field.

**Addresses:** Codebase analysis / Scout (P1), backlog generation (P1), Brain integration into Scout (P1), goal-blind Scout pitfall
**Avoids:** Goal-irrelevant backlog pitfall; generic-scan-without-goal-constraint pitfall

**Research flag:** Goal Analyzer prompt design needs careful iteration — this is the highest-variance stage because the quality of the entire pipeline depends on the quality of ideas generated here. Plan for prompt tuning time. Consider whether `ts-morph` structural analysis should be a pre-pass before the LLM call.

---

### Phase 7: Self-Healing Lifecycle Redesign

**Rationale:** Self-healing already exists and should not be removed, but the current implementation has no patch expiry, no effectiveness tracking, and no conflict detection between patches. Doing this after the execution pipeline is working means real error patterns exist to tune against.

**Delivers:** Patch lifecycle model with: maximum 2-3 active patches per error class; effectiveness tracking (success rate before/after); auto-revert of ineffective patches after N cycles; mutual exclusion for contradictory patch goals; hard token cap on injected healing context; batch healing analysis call (one LLM call for all error types, not N calls).

**Addresses:** Self-healing with prompt patching (P2), automated test generation hooks (P2)
**Avoids:** Prompt drift from healing accumulation pitfall; healing calling LLM per error type performance trap

**Research flag:** Standard patterns — the patch lifecycle model is well-specified in PITFALLS.md. No additional research needed; implementation is mechanical.

---

### Phase 8: Orchestrator Rebuild

**Rationale:** The Orchestrator is the last thing to rebuild because it is the integration point for all stages. Once all stages are individually tested and typed correctly, the Orchestrator wires them together in the pipeline loop. Rebuilding the Orchestrator first (as tempting as it is for end-to-end visibility) means constantly breaking the integration as stages are refactored.

**Delivers:** Rebuilt `conductorOrchestrator.ts` wiring all 6 stages in sequence; write-ahead DB writes before each stage transition; checkpoint pause mechanism with timeout; cycle loop (continue/stop decision from Review); abort signal propagation to all CLI sessions; complexity-based model routing via `balancingEngine.routeModel()` (P2).

**Addresses:** Full pipeline end-to-end, configurable approval checkpoints (P1), pipeline history (P1)
**Avoids:** All previously documented pitfalls — this phase is the integration test of all prior mitigations

**Research flag:** Standard patterns — orchestrator design is fully specified in ARCHITECTURE.md. No additional research needed.

---

### Phase Ordering Rationale

- **Types first:** Stage function signatures are the contracts everything else depends on. Wrong types discovered late cause cascading refactors.
- **Spec Writer before Execute:** Execute Stage cannot do file-level DAG without `affectedFiles` from specs. The dependency is direct.
- **Execute and Review before new stages:** The existing working infrastructure must be hardened before adding new stages that depend on it. Building Goal Analyzer on a broken Execute Stage means integration bugs obscure stage logic bugs.
- **Triage before Goal Analyzer:** Goal Analyzer output feeds Triage. Triage interface must be stable first.
- **Goal Analyzer and Backlog Builder last among stages:** Net-new stages with the highest prompt design uncertainty; doing them last minimises interface churn in upstream stages.
- **Orchestrator last:** Integration point for all stages; must not be rebuilt until stages are individually stable.
- **Self-Healing after execution pipeline:** Cannot tune what has not been measured; real error patterns needed.

### Research Flags

Phases likely needing deeper research or design iteration during planning:
- **Phase 3 (Execute Stage):** CLI Service completion callback contract — confirm whether `cli-service.ts` supports event emission or only polling; design short-circuit mechanism if not
- **Phase 5 (Triage):** Brain conflict-check query format — validate that `getBehavioralContext()` returns data structured for conflict detection; may require Brain schema extension
- **Phase 6 (Goal Analyzer):** Prompt design for goal-constrained codebase analysis — highest variance stage; plan for iteration cycles; determine whether `ts-morph` pre-pass before LLM call improves quality

Phases with standard patterns (skip additional research):
- **Phase 1 (Foundation):** Migration system and type design are well-understood in this codebase
- **Phase 2 (Spec Writer):** Spec template design is fully specified in FEATURES.md and PITFALLS.md
- **Phase 4 (Review):** Brain signal schema exists; `simple-git` API is straightforward
- **Phase 7 (Self-Healing):** Patch lifecycle model is fully specified in PITFALLS.md
- **Phase 8 (Orchestrator):** Architecture is fully specified in ARCHITECTURE.md

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core dependencies already installed and proven in the codebase; research confirmed no gaps |
| Features | HIGH | Features derived from both authoritative sources (PROJECT.md, existing implementation) and corroborated by external multi-agent pipeline research |
| Architecture | HIGH | Based on direct codebase inspection of `src/app/features/Manager/lib/conductor/` and adjacent modules; not inferred |
| Pitfalls | HIGH | Every critical pitfall is grounded in a specific observable bug in the current implementation, not theoretical risk |

**Overall confidence:** HIGH

### Gaps to Address

- **Brain conflict-check query interface:** `getBehavioralContext()` returns behavioral context for prompt enrichment. It is unclear whether it returns data structured enough to support a "does this task contradict a learned pattern?" query without modification. This needs verification against `src/lib/brain/behavioralContext.ts` at the start of Phase 5.

- **CLI Service event interface:** The existing `cli-service.ts` uses a fire-and-forget + poll model. Whether it can be extended to support completion callbacks without breaking TaskRunner's existing use is unverified. Needs codebase inspection at Phase 3 planning.

- **MCP tool availability per provider:** PITFALLS.md flags that `log_implementation` MCP tool availability varies by provider. The validation protocol in Phase 3 assumes this tool is available. Provider-specific fallback behavior needs to be defined.

- **Session exclusivity between Conductor and TaskRunner:** Both Conductor and TaskRunner use `cli-service.ts` session slots. The mechanism for Conductor to claim sessions exclusively during a pipeline run without breaking TaskRunner UX is not fully designed. Needs explicit protocol at Phase 3 planning.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/app/features/Manager/lib/conductor/` — existing orchestrator, all stages, self-healing
- Direct codebase inspection: `src/lib/brain/behavioralContext.ts` — Brain module interface
- Direct codebase inspection: `src/app/features/TaskRunner/lib/executionStrategy.ts` — CLI execution model
- Direct codebase inspection: `src/app/db/migrations/` — migration system patterns
- `.planning/PROJECT.md` — authoritative scope and constraints
- `.planning/codebase/CONCERNS.md` — documented known bugs (globalThis race, orphaned runs, polling overhead)
- [Anthropic Agent SDK Official Docs](https://platform.claude.com/docs/en/agent-sdk/overview) — session API, hooks, tool list
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) — programmatic vs. subprocess validation

### Secondary (MEDIUM confidence)
- [Anthropic Engineering: Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) — long-running agent design patterns
- [VIGIL: A Reflective Runtime for Self-Healing LLM Agents — arXiv](https://arxiv.org/html/2512.07094v2) — prompt patching approach
- [Why Multi-Agent LLM Systems Fail — arXiv 2503.13657](https://arxiv.org/abs/2503.13657) — failure taxonomy
- [Building Reliable Background Tasks in Next.js — DBOS](https://www.dbos.dev/blog/durable-nextjs-background-tasks) — write-ahead patterns for Next.js
- [Multi-Agent Orchestration: Running 10+ Claude Instances in Parallel — DEV Community](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da) — domain isolation patterns
- [Human-in-the-Loop for AI Agents — permit.io](https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo) — checkpoint design

### Tertiary (LOW confidence — summaries only, not directly verified)
- [Conductors to Orchestrators: The Future of Agentic Coding — Addy Osmani](https://addyosmani.com/blog/future-agentic-coding/) — pipeline phase terminology
- [Where Autonomous Coding Agents Fail — Medium/Vivek Babu](https://medium.com/@vivek.babu/where-autonomous-coding-agents-fail-a-forensic-audit-of-real-world-prs-59d66e33efe9) — 67.3% AI PR rejection rate, false completion signals
- [Agentic workflows for software development — McKinsey / QuantumBlack](https://medium.com/quantumblack/agentic-workflows-for-software-development-dc8e64f4a79d) — general workflow patterns

---
*Research completed: 2026-03-14*
*Ready for roadmap: yes*
