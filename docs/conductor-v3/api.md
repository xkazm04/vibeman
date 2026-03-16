# Conductor v3 - API Reference

All routes are under `/api/conductor/`.

## POST /api/conductor/run

Pipeline control endpoint. All actions routed through a single POST.

### Start a Run

```json
{
  "action": "start",
  "projectId": "vibeman-main",
  "goalId": "bc41da5d-...",
  "config": { ... },           // V3Config (optional, uses defaults)
  "projectPath": "/path/to/project",
  "projectName": "My Project",
  "refinedIntent": "..."       // Optional, from intent refinement modal
}
```

**Response:**
```json
{ "success": true, "runId": "68bd27c0-...", "status": "running" }
```

**Notes:**
- `goalId` is required for v3 (looks up goal in `goals` table)
- Pipeline runs async in background -- returns immediately
- `config` merged with `DEFAULT_V3_CONFIG` defaults

### Pause / Resume / Stop

```json
{ "action": "pause",  "runId": "68bd27c0-..." }
{ "action": "resume", "runId": "68bd27c0-..." }
{ "action": "stop",   "runId": "68bd27c0-..." }
```

If `runId` is omitted, looks up the latest running/paused run for the `projectId`.

---

## GET /api/conductor/status

Poll current run state. Used by frontend every 3 seconds.

**Query params:**
- `?runId=X` -- specific run
- `?projectId=Y` -- latest run for project

**Response:**
```json
{
  "run": {
    "id": "68bd27c0-...",
    "projectId": "vibeman-main",
    "goalId": "bc41da5d-...",
    "status": "running",
    "currentStage": "dispatch",
    "cycle": 1,
    "pipelineVersion": 3,
    "config": { ... },
    "stages": {
      "plan":     { "status": "completed", "itemsIn": 0, "itemsOut": 3 },
      "dispatch": { "status": "running",   "itemsIn": 3, "itemsOut": 0 },
      "reflect":  { "status": "pending",   "itemsIn": 0, "itemsOut": 0 }
    },
    "metrics": {
      "tasksPlanned": 3,
      "tasksCompleted": 1,
      "tasksFailed": 0,
      "totalCycles": 1,
      "llmCallCount": 1,
      "estimatedCost": 0,
      "healingPatchesApplied": 0
    },
    "processLog": [ ... ],
    "reflectionHistory": [ ... ],
    "startedAt": "2026-03-16T10:00:00Z"
  }
}
```

---

## POST /api/conductor/refine-intent

Pre-run intent clarification. Generates questions to help the pipeline understand the goal.

**Request:**
```json
{
  "goalTitle": "Refactor auth middleware",
  "goalDescription": "Replace session token storage..."
}
```

**Response:**
```json
{
  "questions": [
    {
      "id": "q1",
      "question": "Should backward compatibility be maintained?",
      "context": "The current middleware is used by 12 routes"
    }
  ]
}
```

The user's answers are concatenated into `refinedIntent` and passed to the start action.

---

## GET /api/conductor/config

**Response:** Current `BalancingConfig` (includes v3 fields when `pipelineVersion: 3`).

---

## GET /api/conductor/history

**Query params:** `?projectId=X&limit=20`

**Response:**
```json
{
  "runs": [
    {
      "id": "...",
      "status": "completed",
      "pipelineVersion": 3,
      "cycle": 2,
      "metrics": { ... },
      "startedAt": "...",
      "completedAt": "..."
    }
  ]
}
```

---

## GET /api/conductor/healing

**Response:**
```json
{
  "patches": [ ... ],
  "errorClassifications": [ ... ]
}
```

---

## POST /api/conductor/triage

Submit triage decisions for a paused run at a triage checkpoint (v2 feature, still supported).

**Request:**
```json
{
  "runId": "...",
  "decisions": [
    { "ideaId": "...", "action": "accept" },
    { "ideaId": "...", "action": "reject", "reason": "..." }
  ]
}
```

---

## POST /api/conductor/recovery

Startup recovery. Marks any running/paused runs as interrupted. Called once on server boot.

**Response:**
```json
{ "recovered": 2 }
```

---

## GET /api/conductor/usage

**Query params:** `?projectId=X`

Returns usage/quota statistics for the project.
