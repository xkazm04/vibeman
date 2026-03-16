# Conductor v3 - UI Components

## Component Tree

```
ConductorLayout
  └── ConductorView                    # Main container
        ├── PipelineFlowViz            # Phase visualization
        │     └── StageCard (x3)       # Plan, Dispatch, Reflect
        ├── PipelineControls           # Action buttons
        ├── MetricsBar                 # Live stats
        ├── ProcessLog                 # Event log
        ├── HealingPanel               # Self-healing management
        ├── RunHistoryTimeline         # Recent runs
        ├── BalancingModal             # Configuration
        │     └── BalancingPanel       # Config sections
        ├── IntentRefinementModal      # Pre-run Q&A
        └── ConductorNerdView         # Debug view
```

## ConductorView

Main orchestrating component. Manages:
- Goal selection from project goals list
- Status polling via `useConductorStatus` (3s interval)
- Nerd mode toggle
- Dispatching start/pause/resume/stop actions

**State:**
- `selectedGoalId` -- Which goal to run
- `settingsOpen` -- BalancingModal visibility
- `intentModalOpen` -- IntentRefinementModal visibility
- `nerdMode` -- Debug view toggle

## PipelineFlowViz

Renders the 3-phase pipeline as horizontal cards with connecting lines.

- Detects `pipelineVersion` from run data
- v3: renders PLAN, DISPATCH, REFLECT cards
- Animated particles on active connector (framer-motion)
- Each card shows: phase name, status badge, itemsIn/itemsOut

## StageCard

Individual phase card with status-dependent styling.

| Status | Color | Behavior |
|--------|-------|----------|
| pending | gray | Dimmed |
| running | phase accent (cyan/purple/pink) | Pulsing border |
| completed | emerald | Check icon |
| failed | red | Error icon |

## PipelineControls

Action buttons with state-dependent visibility:

| Button | Visible when | Action |
|--------|-------------|--------|
| Start | Not running | POST run { action: 'start' } |
| Pause | Running | POST run { action: 'pause' } |
| Resume | Paused | POST run { action: 'resume' } |
| Stop | Running or paused | POST run { action: 'stop' } |
| Settings | Always | Opens BalancingModal |

## MetricsBar

Displays live metrics from the current run:

- Tasks planned / completed / failed
- Current cycle / max cycles
- LLM call count
- Estimated cost

## ProcessLog

Scrollable event log showing all phase events:
- Phase indicator (color-coded)
- Timestamp
- Event type (started, completed, failed, info)
- Message text

## BalancingModal

Full pipeline configuration. Detects v3 and shows appropriate controls:

**v3-specific sections:**
- Pipeline version toggle (v2/v3 selector)
- Plan provider/model
- Reflect provider/model
- Brain questions toggle
- Max cycles per run

**Shared sections:**
- Execution provider/model
- Model routing rules (complexity -> provider/model)
- Max concurrent tasks
- Execution timeout
- Budget (quota limits)
- Self-healing toggle + threshold
- Auto-commit toggle

## IntentRefinementModal

Pre-run dialog for goal clarification:

1. Calls POST `/api/conductor/refine-intent` with goal info
2. Displays 3-5 LLM-generated questions
3. User types answers
4. Answers concatenated into `refinedIntent` string
5. Passed to start action

## RunHistoryTimeline

List of recent completed/failed/interrupted runs:
- Status badge
- Start/end time
- Cycle count
- Task stats
- Click to view details

## HealingPanel

Self-healing management view:
- Active patches with effectiveness score
- Error classifications grouped by type
- Revert button per patch
- Patch details (content, apply count, success rate)

## Frontend State (Zustand)

```typescript
// conductorStore.ts
interface ConductorStoreState {
  // Volatile (not persisted)
  currentRun: PipelineRun | null;
  isRunning: boolean;
  isPaused: boolean;
  processLog: ProcessLogEntry[];

  // Persisted (localStorage)
  config: BalancingConfig;
  runHistory: PipelineRunSummary[];   // max 20
  healingPatches: HealingPatch[];
  errorClassifications: ErrorClassification[];
  nerdMode: boolean;
}
```

**Key actions:**
- `startRun(projectId, overrides?)` -- Generate runId, set isRunning
- `setRunFromServer(run)` -- Parse server payload, update state
- `advanceStage(stage, state)` -- Update currentStage + stage state
- `completePipeline(status)` -- Add to history, clear current run
- `recordError(classification)` -- Upsert error by type+stage
- `applyHealingPatch(patch)` -- Add/replace patch by targetId

## Status Polling Hook

```typescript
// useConductorStatus.ts
useConductorStatus(projectId: string, intervalMs?: number)
```

- Polls GET `/api/conductor/status` every 3s (configurable)
- Updates store via `setRunFromServer()`
- Auto-stops polling when no active run
- Resumes polling on start
