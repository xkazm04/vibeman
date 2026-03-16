# Conductor v3 - Database Schema

## Tables

### conductor_runs

Primary table for pipeline run state.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | TEXT PK | | UUID |
| `project_id` | TEXT NOT NULL | | FK to projects |
| `goal_id` | TEXT | NULL | FK to goals table |
| `status` | TEXT | 'running' | running, paused, completed, failed, interrupted |
| `current_stage` | TEXT | | v3: plan, dispatch, reflect |
| `cycle` | INTEGER | 1 | Current cycle number |
| `pipeline_version` | INTEGER | 2 | 2 or 3 |
| `config_snapshot` | TEXT (JSON) | | Full V3Config or BalancingConfig |
| `stages_state` | TEXT (JSON) | | `{ plan: StageState, dispatch: StageState, reflect: StageState }` |
| `metrics` | TEXT (JSON) | | V3Metrics object |
| `process_log` | TEXT (JSON) | '[]' | Array of ProcessLogEntry |
| `reflection_history` | TEXT (JSON) | NULL | v3 only: Array of ReflectOutput |
| `brain_qa` | TEXT (JSON) | NULL | v3 only: Brain-generated questions |
| `should_abort` | INTEGER | 0 | Abort flag (0/1) |
| `error_message` | TEXT | NULL | Error details on failure |
| `started_at` | TEXT | datetime('now') | |
| `completed_at` | TEXT | NULL | |
| `created_at` | TEXT | datetime('now') | |

### conductor_errors

Error tracking for self-healing.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `run_id` | TEXT | FK to conductor_runs |
| `stage` | TEXT | Phase where error occurred |
| `error_type` | TEXT | Classification (see self-healing.md) |
| `error_message` | TEXT | Raw error message |
| `retry_count` | INTEGER | Times retried |
| `created_at` | TEXT | |

### conductor_healing_patches

Self-healing patches applied to prompts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `project_id` | TEXT | |
| `target_id` | TEXT | Task/stage identifier |
| `patch_type` | TEXT | Type of patch |
| `patch_content` | TEXT | Prompt injection content |
| `applied_count` | INTEGER | Times applied |
| `success_count` | INTEGER | Times effective |
| `active` | INTEGER | 0/1 |
| `created_at` | TEXT | |
| `expires_at` | TEXT | Auto-expiry (7 days) |

### goals (extended columns)

Added by migration 200 for conductor integration:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `target_paths` | TEXT (JSON) | NULL | Array of paths to constrain changes |
| `excluded_paths` | TEXT (JSON) | NULL | Paths to avoid |
| `max_sessions` | INTEGER | 2 | Max concurrent CLI sessions |
| `priority` | TEXT | 'normal' | Goal priority level |
| `checkpoint_config` | TEXT (JSON) | NULL | Checkpoint preferences |
| `use_brain` | INTEGER | 1 | Enable brain integration |

## Migrations

| Migration | Purpose |
|-----------|---------|
| 134 | Create `conductor_runs`, `conductor_errors`, `conductor_healing_patches` |
| 200 | Add `goal_id`, `should_abort`, `error_message`, `process_log` to runs; add constraint columns to goals |
| 201 | Spec metadata columns (v2, unused by v3) |
| 202 | Execute stage columns |
| 203 | Review stage columns |
| 204 | Triage data column |
| 205 | Goal analyzer columns |
| 206 | Healing lifecycle columns |
| 207 | Planner columns |
| 208 | Lifecycle lock columns |
| 210 | Spec lifecycle (v2, unused by v3) |
| **211** | **v3 columns: `pipeline_version`, `reflection_history`, `brain_qa`** |

## JSON Field Shapes

### stages_state (v3)

```json
{
  "plan": {
    "status": "completed",
    "startedAt": "2026-03-16T10:00:00Z",
    "completedAt": "2026-03-16T10:00:05Z",
    "itemsIn": 0,
    "itemsOut": 3
  },
  "dispatch": {
    "status": "running",
    "startedAt": "2026-03-16T10:00:05Z",
    "itemsIn": 3,
    "itemsOut": 0
  },
  "reflect": {
    "status": "pending",
    "itemsIn": 0,
    "itemsOut": 0
  }
}
```

### metrics (v3)

```json
{
  "tasksPlanned": 3,
  "tasksCompleted": 2,
  "tasksFailed": 1,
  "totalCycles": 1,
  "totalDurationMs": 45000,
  "llmCallCount": 2,
  "estimatedCost": 0.15,
  "healingPatchesApplied": 0
}
```

### reflection_history

```json
[
  {
    "status": "continue",
    "summary": "2 of 3 tasks completed. Auth middleware refactored but tests need updating.",
    "brainFeedback": "Success rate improving for this domain",
    "lessonsLearned": ["Include test files in targetFiles", "Check imports after rename"],
    "nextTasks": [
      {
        "id": "...",
        "title": "Update auth tests",
        "description": "...",
        "targetFiles": ["tests/auth.test.ts"],
        "complexity": 1,
        "dependsOn": [],
        "status": "pending"
      }
    ]
  }
]
```
