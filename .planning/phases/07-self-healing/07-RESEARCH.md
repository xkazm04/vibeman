# Phase 7: Self-Healing - Research

**Researched:** 2026-03-14
**Domain:** Error classification, prompt patching, effectiveness tracking, auto-pruning
**Confidence:** HIGH

## Summary

Phase 7 builds upon a substantial existing codebase. The three self-healing modules (`errorClassifier.ts`, `healingAnalyzer.ts`, `promptPatcher.ts`) already exist with functional implementations, the DB schema (`conductor_errors`, `conductor_healing_patches`) is in place, and the orchestrator already calls `analyzeErrors()` and `buildHealingContext()` during the pipeline loop. The healing API route (`/api/conductor/healing`) supports GET (list errors/patches) and POST (apply/revert).

**What is missing** to satisfy HEAL-01 through HEAL-04: (1) The error classifier result is not persisted on the run record in a queryable way -- errors go to `conductor_errors` table but the classification is not visible on the run record itself. (2) The healing analyzer suggests patches but the retry mechanism is implicit via the cycle loop -- there is no bounded retry counter per-task. (3) Patch pruning/expiry does not exist -- `shouldAutoRevert()` in promptPatcher.ts checks effectiveness < 0.3 but is never called anywhere. (4) The `conductor_healing_patches` table has an `effectiveness` column but no `expires_at` column, no success-rate tracking, and no UI visibility.

**Primary recommendation:** Wire the existing modules into a complete lifecycle: classify-on-failure with run-record visibility, bounded per-error-class retry, automatic pruning via expiry timestamp and effectiveness threshold, and a healing history API that exposes both metrics.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HEAL-01 | Error classifier categorizes execution failures by type (syntax, dependency, logic, timeout) | errorClassifier.ts already implements 8 error types with regex pattern matching. Needs: classifier result stored on run record in a visible field, and review stage `classifyError()` wired to use the canonical `classifyError()` from errorClassifier.ts instead of its own inline `detectErrorType()`. |
| HEAL-02 | Healing analyzer suggests prompt corrections based on classified error type | healingAnalyzer.ts already implements rule-based + LLM-based suggestion generation. Needs: corrected prompt actually applied to retry (currently healing context is built but only used in next cycle -- not immediate retry of the failed task). |
| HEAL-03 | Prompt patcher applies corrections and retries with bounded retry count (max 2-3 attempts) | promptPatcher.ts has `buildHealingContext()` and `measureEffectiveness()` but no retry counter. Needs: retry count per error class tracked in DB, bounded at 2-3, with the orchestrator performing immediate retry rather than waiting for next cycle. |
| HEAL-04 | Healing patches have expiry and effectiveness tracking -- stale patches pruned | `conductor_healing_patches` has `effectiveness` column but no `expires_at`. `shouldAutoRevert()` exists but is never called. Needs: new DB column `expires_at`, pruning logic called at pipeline start, success-rate metric computed and stored, healing history UI endpoint. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | existing | Patch storage, error tracking | Project standard DB driver |
| uuid | existing | Patch/error IDs | Already used for all ID generation |
| vitest | existing | Testing | Project test framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| /api/ai/chat | existing | LLM-based healing analysis | Complex error patterns needing AI suggestions |

No new dependencies required. All work extends existing modules.

## Architecture Patterns

### Existing Module Structure (extend, don't restructure)
```
src/app/features/Manager/lib/conductor/
  selfHealing/
    errorClassifier.ts     # EXISTS - classify errors by regex patterns
    healingAnalyzer.ts     # EXISTS - generate healing suggestions (rule + LLM)
    promptPatcher.ts       # EXISTS - apply/revert/measure patches
  conductorOrchestrator.ts # EXISTS - pipeline loop with healing hooks
  conductor.repository.ts  # EXISTS - DB CRUD for runs
  types.ts                 # EXISTS - ErrorClassification, HealingPatch types
```

### Pattern 1: Error Classification on Run Record (HEAL-01)
**What:** Store classified error summary as JSON on `conductor_runs` row so it's queryable alongside run status.
**When to use:** After each execution failure, before healing analysis.
**Approach:** Add `error_classifications` TEXT column to `conductor_runs` (via migration). The review stage already calls `classifyError()` -- wire it to also persist a summary array on the run record. Consolidate the duplicate `detectErrorType()` in reviewStage.ts to use the canonical one from `errorClassifier.ts`.

### Pattern 2: Bounded Retry with Healing (HEAL-02, HEAL-03)
**What:** After classifying errors, immediately generate a healing patch and retry the failed task (not wait for next cycle). Track retry count per error class, stop at max 2-3.
**When to use:** When a task fails during execute stage.
**Approach:** Add `retry_count` field to `ErrorClassification` type and track in `conductor_errors`. In the orchestrator's execute stage error handling, if `healingEnabled` and retry count < max, generate patch via `analyzeErrors()`, apply via `buildHealingContext()`, and re-execute the failed task. The current cycle-based approach stays as a fallback for broader failures.

### Pattern 3: Patch Lifecycle with Expiry and Pruning (HEAL-04)
**What:** Each patch gets an `expires_at` timestamp (e.g., 7 days from creation) and a rolling `success_rate` (successes / total applications). Patches below threshold or past expiry are auto-reverted.
**When to use:** At pipeline start (prune stale patches) and after each run completion (update effectiveness).
**Approach:**
- New migration: add `expires_at TEXT`, `application_count INTEGER DEFAULT 0`, `success_count INTEGER DEFAULT 0` columns to `conductor_healing_patches`
- `loadActivePatches()` filters out expired patches and auto-reverts them
- After each run, compare error recurrence to update `success_count` / `application_count`
- `shouldAutoRevert()` already checks effectiveness < 0.3 -- call it during `loadActivePatches()`

### Anti-Patterns to Avoid
- **Unbounded retry loops:** Requirements explicitly say max 2-3 attempts. Track retry count in DB, not in memory.
- **Healing context accumulation:** Don't let prompt grow indefinitely with stale patches. Pruning via expiry + effectiveness prevents this.
- **Duplicate error classifiers:** reviewStage.ts has its own inline `detectErrorType()` -- use the canonical one from `errorClassifier.ts` only.
- **HTTP round-trips for DB operations:** The orchestrator uses direct DB access (not fetch to API routes) for hot-path operations. Follow this pattern for retry tracking.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error classification | New classifier | Extend existing `errorClassifier.ts` | Already has 8 types with tested regex patterns |
| Healing suggestions | New analyzer | Extend existing `healingAnalyzer.ts` | Rule-based + LLM fallback already implemented |
| Patch storage | New table | Extend existing `conductor_healing_patches` | Schema exists, just needs `expires_at` and counting columns |
| Healing context injection | Custom prompt builder | Use existing `buildHealingContext()` | Already produces formatted markdown sections |

**Key insight:** This phase is primarily about wiring existing modules into a complete lifecycle, not building new capabilities from scratch. The gap is in the orchestration (retry loops, pruning triggers, visibility) not in the core algorithms.

## Common Pitfalls

### Pitfall 1: Infinite Healing Loops
**What goes wrong:** Healing patch makes error worse, triggering more healing, creating more patches.
**Why it happens:** No cap on active patches per error class.
**How to avoid:** Limit to 2-3 active patches per error class (already a project decision from STATE.md). Track retry count in DB. Stop retrying when max reached.
**Warning signs:** `healingPatchesApplied` metric growing unboundedly across cycles.

### Pitfall 2: Stale Patches Polluting Prompts
**What goes wrong:** Old patches from weeks ago still injected into prompts, adding irrelevant context.
**Why it happens:** No expiry mechanism -- patches persist forever once created.
**How to avoid:** Add `expires_at` column, default 7 days. Prune at pipeline start. `buildHealingContext()` already filters `!p.reverted` -- add expiry check there too.
**Warning signs:** Healing context string growing to thousands of characters.

### Pitfall 3: Duplicate Error Classification Logic
**What goes wrong:** reviewStage.ts `detectErrorType()` and errorClassifier.ts `detectErrorType()` diverge, producing inconsistent classifications.
**Why it happens:** Both were written independently. reviewStage.ts has a simpler inline version.
**How to avoid:** Delete the inline version in reviewStage.ts. Import and use `classifyError()` from errorClassifier.ts.
**Warning signs:** Error types in `conductor_errors` table not matching what the review stage reports.

### Pitfall 4: Healing API Missing Save Action
**What goes wrong:** POST handler in `/api/conductor/healing` only handles `revert` and `apply` actions, but `promptPatcher.ts:savePatch()` sends `action: 'save'`.
**Why it happens:** The API route was implemented with a subset of actions.
**How to avoid:** Add `save` and `update_effectiveness` actions to the POST handler, or bypass the API and use direct DB access (matching the orchestrator's `savePatchToDb()` pattern).
**Warning signs:** Patches not persisting when saved via the `promptPatcher.ts` API calls.

## Code Examples

### Existing: How errors are classified (errorClassifier.ts)
```typescript
// Already functional -- classify error from message text
import { classifyError } from './selfHealing/errorClassifier';

const classification = classifyError(
  errorMessage,    // raw error text
  'execute',       // pipeline stage
  runId,           // pipeline run ID
  taskId,          // optional task ID
  scanType         // optional scan type
);
// Returns: { id, pipelineRunId, stage, errorType, errorMessage, occurrenceCount, ... }
```

### Existing: How healing patches are applied (conductorOrchestrator.ts)
```typescript
// Already functional -- patches loaded at pipeline start, context built before scout
const activePatches = await loadActivePatches(projectId);
const healingContext = buildHealingContext(activePatches);
// healingContext is a formatted string injected into prompts
```

### Needed: Bounded retry per task (new logic for orchestrator)
```typescript
// Pseudocode for per-task retry within execute stage
const MAX_RETRIES = 3;
for (const result of executionResults) {
  if (!result.success && result.error) {
    const classification = classifyError(result.error, 'execute', runId, result.taskId);
    const retryCount = getRetryCount(runId, classification.errorType, result.taskId);

    if (retryCount < MAX_RETRIES && config.healingEnabled) {
      const patches = await analyzeErrors([classification], runId);
      activePatches.push(...patches);
      // Re-execute this specific task with healing context
      const retried = await retryTask(result.taskId, buildHealingContext(activePatches));
      incrementRetryCount(runId, classification.errorType, result.taskId);
    }
  }
}
```

### Needed: Patch pruning at pipeline start (new logic)
```typescript
// Pseudocode for pruning stale/ineffective patches
function prunePatches(patches: HealingPatch[]): HealingPatch[] {
  const now = new Date();
  return patches.filter(patch => {
    // Prune expired
    if (patch.expiresAt && new Date(patch.expiresAt) < now) {
      revertPatchInDb(patch.id);
      return false;
    }
    // Prune ineffective (success rate < 30% after 3+ applications)
    if (patch.applicationCount >= 3 && patch.successRate < 0.3) {
      revertPatchInDb(patch.id);
      return false;
    }
    return true;
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cycle-based retry only | Per-task immediate retry needed | Phase 7 | Failed tasks get retried within same cycle |
| No patch expiry | TTL-based expiry needed | Phase 7 | Prevents prompt bloat |
| Effectiveness unused | Effectiveness-based pruning needed | Phase 7 | Auto-reverts ineffective patches |
| Duplicate classifiers | Single canonical classifier | Phase 7 | Consistent error type taxonomy |

**Currently functional but incomplete:**
- `errorClassifier.ts`: Works, just not wired to run record visibility
- `healingAnalyzer.ts`: Works, but suggestions not retried immediately
- `promptPatcher.ts`: Works, but `shouldAutoRevert()` never called, no expiry

## Open Questions

1. **Per-task retry vs. per-cycle retry**
   - What we know: Current implementation retries at cycle level (entire pipeline loop). Requirements say "corrected prompt is retried."
   - What's unclear: Should retry re-run a single failed task within the execute stage, or is cycling the whole pipeline acceptable?
   - Recommendation: Implement per-task retry within the execute stage for immediate failures. Keep cycle-based retry as the broader recovery mechanism. This matches "max 2-3 attempts" language in requirements.

2. **Expiry duration for patches**
   - What we know: Patches should expire, but no specific duration is specified.
   - What's unclear: How long should patches live?
   - Recommendation: Default 7 days. Configurable via `healingConfig` in BalancingConfig if needed later.

3. **Success rate computation window**
   - What we know: "Success-rate metric" is required.
   - What's unclear: Global success rate or per-recent-N-runs?
   - Recommendation: Simple ratio: `success_count / application_count` where application = each time the patch was active during a run, success = no recurrence of the target error pattern.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run tests/conductor/self-healing.test.ts` |
| Full suite command | `npx vitest run tests/conductor/` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HEAL-01 | Error classifier categorizes failures and result visible on run record | unit | `npx vitest run tests/conductor/self-healing.test.ts -t "classif"` | No - Wave 0 |
| HEAL-02 | Healing analyzer suggests prompt corrections for classified error types | unit | `npx vitest run tests/conductor/self-healing.test.ts -t "healing suggestion"` | No - Wave 0 |
| HEAL-03 | Prompt patcher retries with bounded count (max 2-3) | unit | `npx vitest run tests/conductor/self-healing.test.ts -t "retry"` | No - Wave 0 |
| HEAL-04 | Patches have expiry, effectiveness tracking, stale patches pruned | unit | `npx vitest run tests/conductor/self-healing.test.ts -t "expiry\|prune"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/conductor/self-healing.test.ts`
- **Per wave merge:** `npx vitest run tests/conductor/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/conductor/self-healing.test.ts` -- covers HEAL-01 through HEAL-04
- [ ] Migration `206_healing_lifecycle.ts` -- adds `expires_at`, `application_count`, `success_count` to `conductor_healing_patches`, adds `error_classifications` to `conductor_runs`

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of:
  - `src/app/features/Manager/lib/conductor/selfHealing/errorClassifier.ts` (203 lines)
  - `src/app/features/Manager/lib/conductor/selfHealing/healingAnalyzer.ts` (269 lines)
  - `src/app/features/Manager/lib/conductor/selfHealing/promptPatcher.ts` (147 lines)
  - `src/app/features/Manager/lib/conductor/conductorOrchestrator.ts` (1107 lines)
  - `src/app/features/Manager/lib/conductor/types.ts` (553 lines)
  - `src/app/features/Manager/lib/conductor/stages/reviewStage.ts` (242 lines)
  - `src/app/api/conductor/healing/route.ts` (131 lines)
  - `src/app/db/migrations/134_conductor_pipeline.ts` (DB schema)

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` -- HEAL-01 through HEAL-04 definitions
- `.planning/STATE.md` -- project decisions including "max 2-3 active patches per error class"

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, pure extension of existing modules
- Architecture: HIGH -- existing module structure is clear, gaps are well-defined
- Pitfalls: HIGH -- identified from direct code analysis of orchestrator flow

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable internal architecture)
