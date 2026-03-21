# Feature Research

**Domain:** Autonomous development orchestration (goal-to-code pipeline)
**Researched:** 2026-03-14
**Confidence:** MEDIUM-HIGH (pipeline patterns well-established; specific Conductor redesign decisions are project-specific)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the user assumes exist. Missing these means the Conductor feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Goal input with structured goal definition | Orchestration starts with a clear, scoped goal — without this the pipeline produces noise | LOW | Already exists in PROJECT.md requirements; needs goal field + optional constraint fields |
| Codebase analysis (Scout) | Orchestrator cannot generate relevant tasks without understanding what exists | MEDIUM | Must read file tree, existing types, test coverage gaps, open debt — LLM-driven scan |
| Backlog generation from analysis | Without a prioritized list of work items, execution is just guessing | MEDIUM | Items should include rationale, estimated effort, affected domain |
| Triage checkpoint with user approval | User must be able to inspect and adjust generated backlog before execution | LOW | Blocking gate — pipeline waits for explicit approve/reject per item or batch-approve |
| Markdown requirement spec per backlog item | LLMs need structured, human-readable specs to execute reliably — raw ideas are insufficient | MEDIUM | Each spec: goal, acceptance criteria, affected files, approach, constraints |
| Parallel CLI session execution | Single-session execution bottlenecks throughput and defeats the purpose of multi-provider setup | HIGH | 1-4 concurrent sessions; domain isolation required to prevent file conflicts |
| Domain isolation for parallel tasks | Without isolation, parallel sessions corrupt each other's work via overlapping file edits | HIGH | Assign non-overlapping file domains per task; single session owns each domain for the run |
| Build validation gate | Execution that produces non-compiling code is worse than no execution | LOW | TypeScript compile check (`tsc --noEmit`) as binary pass/fail gate after execution |
| LLM code review against rubric | Automated quality check closes the loop; without it the user must manually review every output | MEDIUM | Review against: types, test coverage of new code, naming conventions, no regressions |
| Execution status visibility | User needs to see what's running, what completed, what failed — without this the pipeline is a black box | MEDIUM | Per-task status, current stage indicator, live log tail |
| Pipeline history and run records | User needs to understand past runs to trust the system and diagnose failures | LOW | SQLite-backed; run summary with metrics, outcome, goal, duration |
| Configurable approval checkpoints | Different goals warrant different autonomy levels — no one setting fits all cases | LOW | Toggle gates: post-triage, pre-execute, post-review; store as per-run config |

### Differentiators (Competitive Advantage)

Features that make this Conductor distinctly more capable than a naive LLM-driven pipeline.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Brain integration as active decision engine | Pattern library actively informs architecture decisions, code conventions, and task routing — not just passive reference | HIGH | Conductor queries Brain before spec generation ("what do we know about this domain?"); Brain answers shape the spec |
| Ideas module feeding backlog generation | Creative scan types (zen_architect, bug_hunter, ui_perfectionist) generate higher-quality backlog items than a generic "find work" prompt | MEDIUM | Already implemented in existing Ideas module; new Conductor must reuse scan type vocabulary |
| Complexity-based model routing | Assigning the right model tier to each task reduces cost without sacrificing quality for hard tasks | MEDIUM | complexity_1 → Sonnet, complexity_2/3 → Opus; complexity assessed during spec generation |
| Automated test generation during execution | Each implementation task includes test generation as part of the spec — new code ships with tests | HIGH | Spec template includes "write tests for: [acceptance criteria]"; execution prompt enforces it |
| Self-healing with prompt patching | When tasks fail repeatedly with the same error type, the orchestrator adapts prompts rather than re-running the same failing approach | HIGH | Error classifier → healing analyzer → prompt patcher cycle; already proven in existing implementation |
| Execution report + auto-commit on goal completion | Produces a structured summary and commits as atomic goal artifact — user sees exactly what changed and why | MEDIUM | Report: items completed, files changed, test files added, build status; commit message generated from goal |
| DAG-based task dependency resolution | Tasks that depend on each other execute in correct order; independent tasks parallelize — smarter than simple sequential batching | HIGH | DAG constructed during batch stage; topological sort determines execution order and session assignment |
| Goal-scoped codebase gap analysis | Scout generates targeted analysis relative to the stated goal, not generic "what could be improved" — produces higher signal backlog | HIGH | Scout prompt receives goal + Brain context; generates items specifically addressing goal gaps |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem useful but create more problems than they solve in this context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full autonomy with zero checkpoints | Reduce friction, run pipeline overnight unattended | Without triage gate, bad backlog items get fully executed before user can intervene; one bad spec corrupts the run | Make checkpoints configurable — default to triage gate, allow disabling per run with explicit acknowledgment |
| Git branch per task | Isolation via branching prevents file conflicts like production systems do | This is a local single-user tool committed to direct-to-main workflow per PROJECT.md; branching adds PR management overhead without collaboration benefit | Domain isolation at the filesystem/session level achieves safe parallel execution without branching |
| Existing test suite as execution gate | Running full test suite before commit catches regressions | Project explicitly excluded this (PROJECT.md Out of Scope); existing tests may be slow, flaky, or require external dependencies — gates would stall every run | Build validation (tsc) + new test generation covers the quality signal for new code; user can run full suite manually |
| Real-time collaborative UI | Multiple users watching and adjusting the same run | Single-user local tool; collaboration adds auth, multi-tenancy, conflict resolution — all explicitly out of scope | Single-user local-first design is the constraint; lean into it with fast local SQLite and minimal network overhead |
| Deployment automation after commit | Close the loop all the way to production | Deployment requires env-specific config, secrets management, rollback strategies — far outside Conductor's scope | Stop at committed code; deployment is a separate concern the user controls |
| Infinite retry on failure | Keep trying until it works | Unbounded retry burns token budget and time; identical prompt retried against the same failure will fail the same way | Bounded retry (2-3 attempts) + self-healing prompt patch on classification; escalate to user if healing fails |
| Natural language goal only (no structure) | Lower friction entry point | Unstructured goals produce inconsistent Scout outputs; the LLM interprets the goal differently each run | Structured goal input with a required goal statement + optional constraint fields; structure reduces interpretation variance |
| Micro-approval for every generated spec | Maximum control | Approving 10-20 specs individually defeats the autonomy benefit; workflow becomes exhausting | Batch approve at triage with per-item override; review specs at the checkpoint, not one by one |

---

## Feature Dependencies

```
Goal Input
    └──requires──> Codebase Analysis (Scout)
                       └──requires──> Backlog Generation
                                          └──requires──> Triage Checkpoint
                                                             └──requires──> Requirement Spec Generation
                                                                                └──requires──> Domain Isolation
                                                                                                   └──requires──> Parallel CLI Execution
                                                                                                                      └──requires──> Build Validation
                                                                                                                                         └──requires──> LLM Code Review
                                                                                                                                                            └──requires──> Execution Report + Commit

Brain Integration ──enhances──> Codebase Analysis (Scout)
Brain Integration ──enhances──> Requirement Spec Generation
Ideas Module ──enhances──> Backlog Generation
Complexity Routing ──enhances──> Parallel CLI Execution
DAG Resolution ──enhances──> Parallel CLI Execution
Self-Healing ──enhances──> Parallel CLI Execution (recovers failed tasks)
Self-Healing ──requires──> Execution Status Visibility (needs error signals)
Automated Test Generation ──is part of──> Requirement Spec Generation
```

### Dependency Notes

- **Triage Checkpoint requires Backlog Generation:** The checkpoint is meaningless without a backlog to triage — both must exist in the same phase.
- **Domain Isolation requires Requirement Specs:** Domains are extracted from specs (affected files list). Specs must exist before domains can be assigned.
- **Build Validation requires Parallel CLI Execution to complete:** Validation runs after all execution tasks in a batch finish, not per-task.
- **Self-Healing requires Execution Status Visibility:** The healing classifier needs structured error signals from the execution stage — ad-hoc error strings are insufficient.
- **Brain Integration enhances two stages independently:** It informs Scout (what does the codebase pattern look like?) and Spec Generation (how should this be implemented given our conventions?) — these are separate query calls.
- **DAG Resolution conflicts with sequential batching:** Once DAG is implemented, the sequential batch strategy becomes a degenerate case (all tasks in one chain). Don't maintain both; DAG subsumes sequential.

---

## MVP Definition

### Launch With (v1)

Minimum viable Conductor rebuild — validates the new architecture works end-to-end with Brain and Ideas integration.

- [ ] Goal input with structured goal statement — required entry point for every run
- [ ] Codebase analysis (Scout) using existing Ideas scan types + Brain context query — produces backlog items
- [ ] Triage checkpoint with batch-approve and per-item override — blocks execution until approved
- [ ] Markdown requirement spec generation (one .md per approved item) — with acceptance criteria, affected files, approach
- [ ] Domain isolation assignment — extract file domains from specs, assign one domain per session
- [ ] Parallel CLI execution across 1-4 sessions — runs specs concurrently within domain boundaries
- [ ] Build validation gate — TypeScript compile check after all tasks complete
- [ ] LLM code review against quality rubric — pass/fail with rationale
- [ ] Execution report — goal, items executed, files changed, build status, review outcome
- [ ] Pipeline run persistence — SQLite record with status, metrics, stage logs
- [ ] Configurable triage checkpoint toggle — allow bypass for trusted goals

### Add After Validation (v1.x)

Features to add once the core pipeline is reliable.

- [ ] Complexity-based model routing — add after v1 confirms execution works; routing adds value once baseline throughput is established
- [ ] DAG-based task dependency resolution — add when concurrent session conflicts are observed in practice; start with simpler domain-only isolation
- [ ] Self-healing with prompt patching — add once error patterns are observed across multiple real runs; can't tune what hasn't been measured
- [ ] Automated test generation within specs — add once basic spec execution is reliable; test generation increases spec complexity

### Future Consideration (v2+)

Defer until the Conductor has proven value in daily use.

- [ ] Auto-commit on goal completion — useful but risky without proven review quality; user should commit manually until trust is established
- [ ] Token/cost estimation before execution — valuable for budget awareness but requires provider API instrumentation
- [ ] Multi-goal queue — run goals sequentially without user re-initiation; adds orchestration complexity, solve single-goal reliability first

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Goal input + Scout | HIGH | LOW | P1 |
| Triage checkpoint | HIGH | LOW | P1 |
| Requirement spec generation | HIGH | MEDIUM | P1 |
| Domain isolation | HIGH | MEDIUM | P1 |
| Parallel CLI execution | HIGH | HIGH | P1 |
| Build validation | HIGH | LOW | P1 |
| LLM code review | HIGH | MEDIUM | P1 |
| Execution report + run persistence | MEDIUM | LOW | P1 |
| Brain integration (Scout + Spec) | HIGH | MEDIUM | P1 |
| Configurable checkpoint toggles | MEDIUM | LOW | P1 |
| Complexity-based model routing | MEDIUM | MEDIUM | P2 |
| Self-healing prompt patching | HIGH | HIGH | P2 |
| DAG dependency resolution | MEDIUM | HIGH | P2 |
| Automated test generation in specs | HIGH | MEDIUM | P2 |
| Auto-commit on completion | LOW | LOW | P3 |
| Token cost estimation | LOW | MEDIUM | P3 |
| Multi-goal queue | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when core is validated
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

This is an internal tool, not a competitive product. "Competitors" here are the public agentic coding systems that define user mental models and expectations.

| Feature | Claude Code (Anthropic) | Cursor Agent Mode | Vibeman Conductor Approach |
|---------|------------------------|-------------------|---------------------------|
| Goal-to-code pipeline | Goal via chat, single agent | Goal via chat, single agent | Structured goal → multi-stage pipeline with checkpoints |
| Parallel execution | Sub-agents (experimental) | Single session | 1-4 concurrent CLI sessions with domain isolation |
| Backlog / planning | Ad-hoc in chat | Ad-hoc in chat | Formal backlog generation with Ideas scan types |
| Human approval gates | Implicit (user reviews each step) | Implicit | Configurable explicit gates (triage, pre-execute, post-review) |
| Memory / pattern reuse | Project memory (CLAUDE.md) | Codebase indexing | Brain module as active decision engine across runs |
| Spec generation | None (prompt-driven) | None | Markdown .md spec per backlog item with acceptance criteria |
| Self-healing | Retry in same context | No | Error classification + prompt patching |
| Build validation | Manual | Manual | Automated TypeScript compile gate |
| Test generation | On request | On request | Embedded in spec as mandatory execution step |
| Commit automation | On request | On request | Planned as v1.x; manual for v1 |

---

## Sources

- [2026 Agentic Coding Trends Report — Anthropic](https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf?hsLang=en) — MEDIUM confidence (PDF, not directly fetched)
- [Conductors to Orchestrators: The Future of Agentic Coding — Addy Osmani / O'Reilly](https://addyosmani.com/blog/future-agentic-coding/) — MEDIUM confidence (WebSearch summary)
- [Spec-driven development with AI — GitHub Blog](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) — MEDIUM confidence (WebSearch summary)
- [Multi-Agent Orchestration: Running 10+ Claude Instances in Parallel — DEV Community](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da) — MEDIUM confidence (domain isolation patterns)
- [Container Use: Isolated Parallel Coding Agents — InfoQ](https://www.infoq.com/news/2025/08/container-use/) — MEDIUM confidence (isolation strategies)
- [Human-in-the-Loop for AI Agents — permit.io](https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo) — MEDIUM confidence (checkpoint patterns)
- [VIGIL: A Reflective Runtime for Self-Healing LLM Agents — arXiv](https://arxiv.org/html/2512.07094v2) — HIGH confidence (peer-reviewed, prompt patching approach)
- [Agentic workflows for software development — McKinsey / QuantumBlack](https://medium.com/quantumblack/agentic-workflows-for-software-development-dc8e64f4a79d) — LOW confidence (WebSearch summary only)
- Existing Conductor implementation at `src/app/features/Manager/lib/conductor/` — HIGH confidence (ground truth for what is already built)
- PROJECT.md at `.planning/PROJECT.md` — HIGH confidence (authoritative scope definition)

---

*Feature research for: Vibeman Conductor — autonomous development orchestration*
*Researched: 2026-03-14*
