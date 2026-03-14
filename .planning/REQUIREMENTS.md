# Requirements: Vibeman Conductor Redesign

**Defined:** 2026-03-14
**Core Value:** Conductor reliably and autonomously turns a high-level goal into committed, production-quality code

## v1 Requirements

Requirements for the Conductor rebuild. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: Conductor pipeline state persists in SQLite, not globalThis — surviving process restarts and HMR
- [x] **FOUND-02**: Each pipeline stage is a pure async function receiving context and returning typed output
- [x] **FOUND-03**: Pipeline run records (status, metrics, stage logs, duration) persist in SQLite with queryable history

### Goal Analysis

- [x] **GOAL-01**: User can define a structured goal with goal statement and optional constraint fields
- [x] **GOAL-02**: Conductor analyzes codebase relative to stated goal using ts-morph structural analysis + LLM interpretation
- [x] **GOAL-03**: Goal analysis produces a gap report identifying missing code, debt, and untested areas relevant to the goal

### Backlog

- [x] **BACK-01**: Conductor generates prioritized backlog items from goal gap analysis
- [x] **BACK-02**: Backlog generation integrates Ideas module scan types (zen_architect, bug_hunter, ui_perfectionist) for creative suggestions
- [x] **BACK-03**: Each backlog item includes rationale, estimated effort, and affected domain

### Triage

- [x] **TRIA-01**: Pipeline pauses at triage checkpoint presenting generated backlog for user review
- [x] **TRIA-02**: User can batch-approve, individually approve/reject, or adjust backlog items at triage
- [x] **TRIA-03**: Triage checkpoint is configurable — can be bypassed for trusted goals with explicit toggle
- [x] **TRIA-04**: Triage checkpoint has a maximum timeout to prevent permanent pipeline hangs on abandoned sessions

### Specification

- [x] **SPEC-01**: Conductor generates one markdown requirement spec per approved backlog item
- [x] **SPEC-02**: Each spec includes goal context, acceptance criteria, affected files, implementation approach, and constraints
- [x] **SPEC-03**: Spec generation queries Brain for code conventions and architecture patterns relevant to the spec domain

### Execution

- [x] **EXEC-01**: Conductor assigns non-overlapping file domains to each CLI session based on spec affected files
- [x] **EXEC-02**: Conductor distributes specs across 1-4 CLI sessions with domain-isolated parallel execution
- [x] **EXEC-03**: Per-task execution status is visible (running, completed, failed) with stage indicator
- [x] **EXEC-04**: Configurable checkpoints available at pre-execute and post-review stages

### Validation

- [x] **VALD-01**: Build validation gate runs TypeScript compile check (tsc --noEmit) after execution completes
- [x] **VALD-02**: LLM-powered code review evaluates diff against quality rubric (types, naming, patterns, no regressions)
- [x] **VALD-03**: Code review produces pass/fail with rationale per reviewed file

### Reporting

- [x] **REPT-01**: Execution report generated on goal completion: goal, items executed, files changed, build status, review outcome
- [x] **REPT-02**: Report and all work committed to git on successful completion

### Brain Integration

- [x] **BRAIN-01**: Brain serves as pattern library — Conductor queries stored patterns during Scout and Spec generation
- [x] **BRAIN-02**: Brain serves as active decision engine — Conductor consults Brain before architecture decisions and task routing
- [x] **BRAIN-03**: Brain acts as conflict gate at triage — blocking tasks that contradict learned patterns

### Self-Healing

- [x] **HEAL-01**: Error classifier categorizes execution failures by type (syntax, dependency, logic, timeout)
- [x] **HEAL-02**: Healing analyzer suggests prompt corrections based on classified error type
- [x] **HEAL-03**: Prompt patcher applies corrections and retries with bounded retry count (max 2-3 attempts)
- [x] **HEAL-04**: Healing patches have expiry and effectiveness tracking — stale or ineffective patches are pruned

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Execution

- **EXEC-05**: Complexity-based model routing assigns Sonnet for simple tasks and Opus for complex tasks
- **EXEC-06**: DAG-based task dependency resolution determines execution order via topological sort

### Enhanced Validation

- **VALD-04**: Automated test generation embedded in requirement specs as mandatory execution step
- **VALD-05**: Auto-commit on goal completion (currently manual commit after review)

### Operations

- **OPS-01**: Token/cost estimation before execution for budget awareness
- **OPS-02**: Multi-goal queue for sequential goal execution without user re-initiation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multi-user support | Single-user local tool — no auth, no multi-tenancy |
| Git branch per task | Direct-to-main workflow per project constraints; domain isolation replaces branching |
| Existing test suite as gate | Existing tests may be slow/flaky; build validation + new test gen covers quality |
| Real-time collaborative UI | Single-user tool; collaboration adds unneeded complexity |
| Deployment automation | Tool produces committed code, not deployments |
| Infinite retry on failure | Burns tokens; bounded retry + self-healing is the correct approach |
| Micro-approval per spec | Batch approve at triage; per-spec approval defeats autonomy |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| GOAL-01 | Phase 1 | Complete |
| GOAL-02 | Phase 6 | Complete |
| GOAL-03 | Phase 6 | Complete |
| BACK-01 | Phase 6 | Complete |
| BACK-02 | Phase 6 | Complete |
| BACK-03 | Phase 6 | Complete |
| TRIA-01 | Phase 5 | Complete |
| TRIA-02 | Phase 5 | Complete |
| TRIA-03 | Phase 5 | Complete |
| TRIA-04 | Phase 5 | Complete |
| SPEC-01 | Phase 2 | Complete |
| SPEC-02 | Phase 2 | Complete |
| SPEC-03 | Phase 2 | Complete |
| EXEC-01 | Phase 3 | Complete |
| EXEC-02 | Phase 3 | Complete |
| EXEC-03 | Phase 3 | Complete |
| EXEC-04 | Phase 3 | Complete |
| VALD-01 | Phase 3 | Complete |
| VALD-02 | Phase 4 | Complete |
| VALD-03 | Phase 4 | Complete |
| REPT-01 | Phase 4 | Complete |
| REPT-02 | Phase 4 | Complete |
| BRAIN-01 | Phase 6 | Complete |
| BRAIN-02 | Phase 6 | Complete |
| BRAIN-03 | Phase 5 | Complete |
| HEAL-01 | Phase 7, Phase 8 (gap fix) | Complete |
| HEAL-02 | Phase 7 | Complete |
| HEAL-03 | Phase 7, Phase 8 (gap fix) | Complete |
| HEAL-04 | Phase 7, Phase 8 (gap fix) | Complete |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after roadmap creation — all 32 requirements mapped*
