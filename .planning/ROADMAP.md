# Roadmap: Vibeman Conductor Redesign

## Overview

The Conductor is rebuilt stage-by-stage in dependency order: the durable foundation (types, DB schema, state machine) comes first because three of the most critical bugs are architectural and will corrupt every subsequent phase if not resolved. From there, Spec Writer and Execute Stage are hardened using real file-claim data, Review Stage is extended to write Brain signals and produce reports, Triage gains its Brain conflict gate, Goal Analyzer and Backlog Builder replace the current Scout as the pipeline entry point, and Self-Healing is redesigned with lifecycle tracking. Each phase delivers a testable, working capability before the next is begun.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Durable state machine, typed stage contracts, and DB schema that survive process restarts (completed 2026-03-14)
- [ ] **Phase 2: Spec Writer** - One structured markdown spec per backlog item with acceptance criteria and file claims
- [ ] **Phase 3: Execute Stage** - File-level domain isolation, real success detection, and parallel dispatch across 1-4 sessions
- [ ] **Phase 4: Review Stage** - LLM code review, Brain signal writes, execution report, and git commit
- [ ] **Phase 5: Triage** - User checkpoint with Brain conflict gate and configurable bypass
- [ ] **Phase 6: Goal Analyzer and Backlog** - Codebase gap analysis against goal and prioritized backlog generation
- [ ] **Phase 7: Self-Healing** - Error classification, prompt patching, and patch lifecycle management

## Phase Details

### Phase 1: Foundation
**Goal**: The pipeline can be started and observed with state that survives process restarts and HMR
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, GOAL-01
**Success Criteria** (what must be TRUE):
  1. A pipeline run started before a process restart is visible with correct status after restart (not stuck as `running`)
  2. User can define a structured goal with goal statement and optional constraint fields and see it persisted
  3. Each stage function has a typed input/output contract — calling a stage with wrong shape fails at compile time
  4. Pipeline run history is queryable: user can retrieve past runs with stage logs, duration, and status
**Plans**: 3 plans
Plans:
- [x] 01-01-PLAN.md — Types, DB migration, and Wave 0 test stubs
- [x] 01-02-PLAN.md — Conductor repository, goal evolution, orchestrator rewrite
- [x] 01-03-PLAN.md — API route wiring and human verification

### Phase 2: Spec Writer
**Goal**: Approved backlog items become structured markdown specs with machine-readable acceptance criteria and explicit file claims
**Depends on**: Phase 1
**Requirements**: SPEC-01, SPEC-02, SPEC-03
**Success Criteria** (what must be TRUE):
  1. Each approved backlog item produces one `.md` spec file containing Goal, Acceptance Criteria, Affected Files, Approach, and Constraints sections
  2. The `affectedFiles` list on each spec is structured JSON that the Execute Stage can use to compute file-path intersections
  3. Brain code conventions are visibly injected into the spec template — spec content reflects actual patterns from the Brain module
**Plans**: 3 plans
Plans:
- [ ] 02-01-PLAN.md — Spec writer types, DB migration, and specRepository
- [ ] 02-02-PLAN.md — Spec template, file discovery, Brain integration, and stage function
- [ ] 02-03-PLAN.md — Tests and orchestrator wiring

### Phase 3: Execute Stage
**Goal**: Specs are dispatched to CLI sessions with true file-level domain isolation and success is only declared when the implementation is verified
**Depends on**: Phase 2
**Requirements**: EXEC-01, EXEC-02, EXEC-03, EXEC-04, VALD-01
**Success Criteria** (what must be TRUE):
  1. Two specs with overlapping `affectedFiles` are never dispatched to concurrent sessions — they execute serially
  2. A CLI session that exits cleanly without modifying any spec-claimed file is marked failed, not successful
  3. Per-task execution status (running, completed, failed) is visible in the UI with a stage indicator
  4. TypeScript compile check (`tsc --noEmit`) runs after all tasks complete and its result is recorded on the run
  5. Configurable pre-execute and post-review checkpoint toggles are respected — pipeline pauses when enabled
**Plans**: 3 plans
Plans:
- [ ] 03-01-PLAN.md — [to be planned]
- [ ] 03-02-PLAN.md — [to be planned]
- [ ] 03-03-PLAN.md — [to be planned]

### Phase 4: Review Stage
**Goal**: Every completed pipeline run produces an LLM code review, a Brain signal write, and an execution report; successful runs can commit
**Depends on**: Phase 3
**Requirements**: VALD-02, VALD-03, REPT-01, REPT-02
**Success Criteria** (what must be TRUE):
  1. LLM code review evaluates the diff against a quality rubric and produces per-file pass/fail with rationale
  2. Brain receives a signal write after each execution cycle so learned patterns update from this run
  3. Execution report is generated on goal completion listing goal, items executed, files changed, build status, and review outcome
  4. On successful completion, the report and all changed files are committed to git (configurable, default off)
**Plans**: 3 plans
Plans:
- [ ] 04-01-PLAN.md — [to be planned]
- [ ] 04-02-PLAN.md — [to be planned]
- [ ] 04-03-PLAN.md — [to be planned]

### Phase 5: Triage
**Goal**: Users review the generated backlog at a checkpoint that Brain has already filtered for pattern violations, with a configurable bypass and timeout
**Depends on**: Phase 4
**Requirements**: TRIA-01, TRIA-02, TRIA-03, TRIA-04, BRAIN-03
**Success Criteria** (what must be TRUE):
  1. Pipeline pauses at triage and presents the backlog — user can batch-approve, individually approve/reject, or adjust items
  2. Items that contradict high-confidence Brain patterns are flagged before the user sees them (Brain conflict check runs before UI render)
  3. Triage checkpoint can be disabled via a toggle for trusted goals — pipeline proceeds without user interaction
  4. An abandoned triage checkpoint times out after a configurable maximum duration and interrupts the pipeline cleanly rather than hanging
**Plans**: 3 plans
Plans:
- [ ] 05-01-PLAN.md — [to be planned]
- [ ] 05-02-PLAN.md — [to be planned]
- [ ] 05-03-PLAN.md — [to be planned]

### Phase 6: Goal Analyzer and Backlog
**Goal**: A user-defined goal is transformed into a prioritized, domain-tagged backlog through codebase analysis constrained by the goal and enriched by Brain patterns
**Depends on**: Phase 5
**Requirements**: GOAL-02, GOAL-03, BACK-01, BACK-02, BACK-03, BRAIN-01, BRAIN-02
**Success Criteria** (what must be TRUE):
  1. Codebase analysis produces a gap report identifying missing code, debt, and untested areas relevant to the stated goal — not generic improvements
  2. Backlog items derived from the gap report include rationale, estimated effort, and affected domain; off-topic items are filtered before triage
  3. Ideas module scan types (zen_architect, bug_hunter, ui_perfectionist) contribute creative suggestions to the backlog alongside structural analysis
  4. Brain patterns are consulted before architecture decisions during analysis — the goal analyzer uses behavioral context as explicit constraints, not optional decoration
**Plans**: 3 plans
Plans:
- [ ] 06-01-PLAN.md — [to be planned]
- [ ] 06-02-PLAN.md — [to be planned]
- [ ] 06-03-PLAN.md — [to be planned]

### Phase 7: Self-Healing
**Goal**: Execution failures are classified, corrected with bounded prompt patches, and stale or ineffective patches are automatically pruned
**Depends on**: Phase 6
**Requirements**: HEAL-01, HEAL-02, HEAL-03, HEAL-04
**Success Criteria** (what must be TRUE):
  1. Each execution failure is classified by type (syntax, dependency, logic, timeout) and the classifier result is visible on the run record
  2. Healing analyzer suggests a prompt correction for the classified error type and the corrected prompt is retried (max 2-3 attempts)
  3. A patch that shows no improvement after N runs is automatically reverted — prompt content does not accumulate stale corrections across cycles
  4. Each patch has an expiry timestamp and a success-rate metric — both are visible in the healing history UI
**Plans**: 3 plans
Plans:
- [ ] 07-01-PLAN.md — [to be planned]
- [ ] 07-02-PLAN.md — [to be planned]
- [ ] 07-03-PLAN.md — [to be planned]

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-03-14 |
| 2. Spec Writer | 2/3 | In Progress|  |
| 3. Execute Stage | 0/? | Not started | - |
| 4. Review Stage | 0/? | Not started | - |
| 5. Triage | 0/? | Not started | - |
| 6. Goal Analyzer and Backlog | 0/? | Not started | - |
| 7. Self-Healing | 0/? | Not started | - |
