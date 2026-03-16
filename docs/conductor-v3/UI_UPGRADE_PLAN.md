# Conductor v3 UI/UX Upgrade Plan

## Task 1: Dispatch Transparency (ProcessLog + StageCard)

**Problem:** After PLAN completes and DISPATCH starts, the UI goes silent — no indication of what's happening with parallel sessions.

**Root cause:** `dispatchPhase.ts` has `onLog` and `onTaskUpdate` callbacks, but `conductorV3.ts` only passes an empty `onTaskUpdate` callback. No per-task log events reach the process log during dispatch.

**Fix — Backend (`conductorV3.ts` lines 380-397):**
- Wire `onLog` callback in the `executeDispatchPhase()` call to append to `processLog` and persist via `updateRunField`
- Wire `onTaskUpdate` to persist task states into `stages_state.dispatch.details.tasks` (same pattern as v2's `executionTasks`)

**Fix — Frontend (`StageCard.tsx` lines 139-163):**
- The v2 execute stage already shows per-task status via `state.details?.executionTasks`
- Extend to also handle `stage === 'dispatch'` with same UI but using V3Task shape
- V3Task fields: `{ id, title, status, result? }` — map `status` to dot indicator, show truncated title + provider

**Fix — Frontend (`ProcessLog.tsx`):**
- Already handles v3 phase colors (plan/dispatch/reflect) — no changes needed, just needs backend to emit more log entries

**Files to edit:**
- `src/app/features/Conductor/lib/v3/conductorV3.ts` — wire onLog + onTaskUpdate in dispatch call
- `src/app/features/Conductor/components/StageCard.tsx` — add dispatch task list rendering

---

## Task 2: Settings Modal Cleanup (BalancingModal)

**Problem:** Settings icon opens v2-era modal with scan types, idea counts, triage thresholds, batch strategy — none meaningful for v3.

**Current state:** The modal already has a v3 section (lines 670-768) that shows when `pipelineVersion === 3`. The v2 section (lines 775-1077) is hidden when v3 is active. This is already correct.

**What to fix:**
1. **Remove pipeline version toggle** — v2 is deleted, always v3 now. Remove the toggle and v2 section entirely.
2. **Remove "No goal (free scan)" option** in ConductorView goal dropdown (line 209-215) — v3 requires a goal
3. **Remove v2 settings from BalancingConfig defaults** — don't need scout/triage/batch defaults polluting the config
4. **Simplify modal subtitle** — "Configure pipeline settings" instead of "Configure balancing, routing, and budget controls"

**Keep these v3 settings (they're useful):**
- Plan phase provider/model
- Reflect phase provider/model
- Brain Questions toggle
- Dispatch: max concurrent tasks, task timeout
- Budget: max cycles per run
- Self-healing toggle (if kept per Task 4)
- Execution routing table (complexity → provider/model)

**Files to edit:**
- `src/app/features/Conductor/components/BalancingModal.tsx` — remove v2 toggle + v2 section, flatten v3 as default
- `src/app/features/Conductor/components/ConductorView.tsx` — remove "No goal" option from dropdown

---

## Task 3: MetricsBar v3 Stats

**Problem:** MetricsBar shows v2 stats (ideasGenerated, ideasAccepted, ideasRejected, tasksCreated) — all zeros in v3.

**V3 metrics available** (from `V3Metrics` in `v3/types.ts`):
- `tasksPlanned` — from PLAN phase
- `tasksCompleted` — from DISPATCH results
- `tasksFailed` — from DISPATCH results
- `totalCycles` — current cycle number
- `llmCallCount` — plan + reflect LLM calls
- `healingPatchesApplied` — from self-healing
- `totalDurationMs` — elapsed time
- `estimatedCost` — cost estimate

**Fix:**
- Detect `pipelineVersion` from the current run (passed via props or derived from metrics shape)
- v3 layout: `Planned | Completed | Failed | divider | Cycles | LLM Calls | divider | Healing | Duration | Cost`
- Remove v2-only metrics: `ideasGenerated`, `ideasAccepted`, `ideasRejected`, `tasksCreated`
- The success rate calculation already works (uses tasksCompleted/tasksFailed)

**How to detect v3 metrics:** Check if metrics has `tasksPlanned` property (v3) vs `ideasGenerated` (v2). Or pass `pipelineVersion` as a prop.

**Files to edit:**
- `src/app/features/Conductor/components/MetricsBar.tsx` — replace v2 metrics with v3 stats
- `src/app/features/Conductor/components/ConductorView.tsx` — pass pipelineVersion to MetricsBar

---

## Task 4: Self-Healing Evaluation

**Problem:** Is self-healing still useful in v3, or is it dead code?

**Analysis:**

The self-healing system has 3 layers:
1. **Error Classifier** (`selfHealing/errorClassifier.ts`) — pattern matching on error strings
2. **Healing Analyzer** (`selfHealing/healingAnalyzer.ts`) — generates prompt patches from error patterns
3. **Prompt Patcher** (`selfHealing/promptPatcher.ts`) — saves/loads/prunes patches, builds healing context string

**V3 integration status:**
- `conductorV3.ts` passes `healingContext: ''` (empty string!) to both PLAN and DISPATCH phases (lines 337, 401)
- `dispatchPhase.ts` accepts `healingContext` and injects it into task prompts (line 347-349) — **this works if non-empty**
- `reflectPhase.ts` calls `classifyError()` for failed tasks — **this works**
- But **nobody calls `buildHealingContext()`** to populate the string from stored patches
- And **nobody calls `analyzeErrors()`** to generate new patches from classifications

**Verdict: Partially useful, easy to wire.**

The error classifier + prompt patcher pattern is useful for v3. The "healing analyzer" (LLM-based patch generation) is overkill — v3's reflect phase already handles adaptation via `lessonsLearned` and `nextTasks`.

**Fix — Simple integration:**
1. In `conductorV3.ts`, before each cycle, call `buildHealingContext(projectId)` to get the healing string
2. Pass it to PLAN and DISPATCH instead of `''`
3. In reflect phase, after classifying errors, if `healingEnabled` and error count >= threshold, call the rule-based patch generator (skip LLM-based healing since reflect already adapts)
4. Keep HealingPanel in sidebar — it shows useful error pattern info

**Files to edit:**
- `src/app/features/Conductor/lib/v3/conductorV3.ts` — wire buildHealingContext + basic patch creation
- No UI changes needed — HealingPanel already reads from store

---

## Execution Order

1. **Task 3** (MetricsBar) — smallest, most visible improvement
2. **Task 2** (Settings cleanup) — remove dead v2 UI
3. **Task 1** (Dispatch transparency) — backend + frontend wiring
4. **Task 4** (Self-healing wiring) — backend only
