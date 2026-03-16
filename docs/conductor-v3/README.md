# Conductor v3 - Adaptive Autonomous Pipeline

Conductor v3 is a 3-phase adaptive development pipeline that autonomously plans, executes, and reflects on code changes guided by a project goal.

## Key Design Decisions

| Decision | v2 (removed) | v3 |
|----------|--------------|-----|
| Pipeline shape | 5 stages: Scout > Triage > Batch > Execute > Review | 3 phases: PLAN > DISPATCH > REFLECT |
| LLM calls per cycle | 4+ (scan, triage, plan, review) | 2 (plan + reflect) |
| Spec files | Written to disk, managed by lifecycle | None -- direct prompt composition |
| Adaptation | Single-pass, no retry loop | Multi-cycle with reflection feedback |
| Brain integration | One-way (read signals) | Bidirectional (questions, warnings, outcome feedback) |

## Architecture at a Glance

```
                    +------------------+
                    |   Goal (from DB) |
                    +--------+---------+
                             |
              +--------------v--------------+
              |         PLAN (LLM)          |
              |  Analyze goal + codebase    |
              |  Output: V3Task[]           |
              +--------------+--------------+
                             |
              +--------------v--------------+
              |       DISPATCH (no LLM)     |
              |  Route tasks to CLI sessions|
              |  Dependency-aware parallel   |
              |  File verification + commit |
              +--------------+--------------+
                             |
              +--------------v--------------+
              |        REFLECT (LLM)        |
              |  Review diffs + build result|
              |  Decide: done / continue /  |
              |          needs_input         |
              +--------------+--------------+
                             |
              +---------+----+----+---------+
              |         |         |         |
            done    continue   needs_input
              |         |         |
           complete   cycle++   pause &
             run     (feedback   wait for
                      fed back   user input
                      to PLAN)
```

## Directory Layout

```
src/app/features/Conductor/
  ConductorLayout.tsx              # Top-level page wrapper
  components/
    ConductorView.tsx              # Main orchestrating component
    BalancingModal.tsx             # Full pipeline configuration UI
    BalancingPanel.tsx             # Config section within modal
    PipelineFlowViz.tsx           # Stage/phase visualization
    PipelineControls.tsx          # Start/pause/resume/stop buttons
    MetricsBar.tsx                # Live stats display
    ProcessLog.tsx                # Event log viewer
    HealingPanel.tsx              # Self-healing management
    RunHistoryTimeline.tsx        # Recent run history
    StageCard.tsx                 # Individual stage/phase card
    IntentRefinementModal.tsx     # Pre-run Q&A modal
    ConductorNerdView.tsx         # Debug/nerd mode view
  lib/
    conductor.repository.ts       # DB operations (conductor_runs)
    conductorStore.ts             # Zustand frontend state
    balancingEngine.ts            # Model routing, quota, cost estimation
    types.ts                      # Shared types (PipelineStatus, etc.)
    useConductorStatus.ts         # Status polling hook
    useConductorRecovery.ts       # HMR recovery hook
    execution/
      buildValidator.ts           # tsc --noEmit validation
      domainScheduler.ts          # File overlap detection
      fileVerifier.ts             # Pre/post snapshot verification
    review/
      diffReviewer.ts             # LLM code review
      gitCommitter.ts             # Conventional commit creation
      reportGenerator.ts          # Execution report builder
      reviewTypes.ts              # Review type definitions
    selfHealing/
      errorClassifier.ts          # 8-type error pattern matching
      healingAnalyzer.ts          # Error -> patch generation
      promptPatcher.ts            # Patch lifecycle management
    v3/
      types.ts                    # V3-specific types & defaults
      conductorV3.ts              # Main orchestrator loop
      planPhase.ts                # PLAN phase (LLM)
      dispatchPhase.ts            # DISPATCH phase (CLI scheduling)
      reflectPhase.ts             # REFLECT phase (LLM)
      brainAdvisor.ts             # Brain integration (3 moments)

src/app/api/conductor/
  run/route.ts                    # Start/pause/resume/stop
  status/route.ts                 # Poll run state
  config/route.ts                 # Get/set pipeline config
  refine-intent/route.ts          # Pre-run intent clarification
  triage/route.ts                 # Triage checkpoint decisions
  healing/route.ts                # Self-healing status
  history/route.ts                # Run history
  usage/route.ts                  # Usage/quota stats
  recovery/route.ts               # Startup recovery
```

## Further Reading

- [Pipeline Flow](./flow.md) -- Detailed phase-by-phase execution flow
- [API Reference](./api.md) -- All conductor API routes
- [Database Schema](./database.md) -- Tables, columns, migrations
- [UI Components](./components.md) -- Frontend architecture
- [Self-Healing](./self-healing.md) -- Error classification and patch system
