# Conductor v3 - Self-Healing System

## Overview

The self-healing system automatically detects recurring errors, classifies them, generates prompt patches, and tracks patch effectiveness. It operates across cycles within a run and across runs within a project.

## Error Classification

`errorClassifier.ts` matches error messages against 8 pattern types:

| Type | Pattern Examples | Priority |
|------|-----------------|----------|
| `syntax_error` | SyntaxError, Unexpected token, Parse error | 1 |
| `type_error` | TypeError, Type '...' is not assignable | 2 |
| `missing_context` | Cannot find module, not found, undefined | 3 |
| `dependency_missing` | Module not found, cannot resolve | 4 |
| `timeout` | timeout, ETIMEDOUT, exceeded time | 5 |
| `rate_limit` | rate limit, 429, too many requests | 6 |
| `tool_failure` | tool failed, execution error, spawn | 7 |
| `unknown` | Catch-all | 8 |

**Priority ordering matters:** `missing_context` fires before `dependency_missing` for "Cannot find module" so the more specific pattern wins.

## Healing Pipeline

```
Task fails
  |
  v
classifyError() -> ErrorClassification
  |
  v
mergeError() -> upsert by type+stage (increment count)
  |
  v
if occurrence_count >= healingThreshold (default 3):
  |
  v
analyzeErrors() -> HealingPatch
  |                |
  |                |- Rule-based for common patterns
  |                |  (timeout -> increase timeout hint)
  |                |  (missing_context -> add file discovery hint)
  |                |  (rate_limit -> add backoff instruction)
  |                |
  |                |- LLM-based for complex/unknown patterns
  |                   (sends error history to LLM for analysis)
  |
  v
savePatch() -> INSERT conductor_healing_patches
  |
  v
buildHealingContext() -> prompt injection string
  |
  v
Injected into next task prompt as additional context
```

## Prompt Patching

`promptPatcher.ts` manages the patch lifecycle:

### Building Context

```typescript
buildHealingContext(projectId: string): string
```

Queries active patches for the project. Composes a prompt section:
```
IMPORTANT - Previous Issues Found:
- [patch_type]: patch_content
- [patch_type]: patch_content
```

This string is injected into the DISPATCH task prompt.

### Patch Effectiveness Tracking

After each task execution:
```typescript
updatePatchStats(patchId: string, success: boolean): void
```

Tracks:
- `applied_count` -- How many times the patch was used
- `success_count` -- How many times the task succeeded with the patch

### Auto-Pruning

```typescript
prunePatches(projectId: string): void
```

Removes patches that are:
- Expired (older than 7 days)
- Ineffective (applied 3+ times with success rate < 30%)

## Error Flow Through Phases

### DISPATCH Phase
- Each task failure is classified immediately
- Classification stored on the run record
- If healing enabled: patches queried and injected into retry prompt

### REFLECT Phase
- All task errors passed to `classifyTaskErrors()`
- Brain signals recorded for each failure
- Error summary included in reflect prompt for LLM analysis

## Configuration

In `V3Config`:

```typescript
{
  healingEnabled: boolean;     // default: true
  healingThreshold: number;    // default: 3 (occurrences before patching)
}
```

## Database

### conductor_errors

Stores individual error occurrences per run.

### conductor_healing_patches

Stores patches with effectiveness metrics:
- `applied_count` / `success_count` -> effectiveness ratio
- `active` flag for enable/disable
- `expires_at` for auto-cleanup
- `patch_content` is the actual prompt text injected

## UI (HealingPanel)

- Lists active patches with effectiveness percentage
- Shows error classifications grouped by type
- Revert button to deactivate a patch
- Expandable details showing patch content
