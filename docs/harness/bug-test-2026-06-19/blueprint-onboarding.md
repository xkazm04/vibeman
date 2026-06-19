# Blueprint & Onboarding — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495684853_842sc8t
> Group: Code Execution & Automation
> Files read: ~10
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

> NOTE — context-map drift: ~13 of the 21 listed files do not exist in the repo (stateMachineStore.ts, blueprintExecutionStore.ts, all `src/app/api/blueprint/**`, scan-scheduler, scan-predictions, structure-scan, onboarding/state-machine route, blueprint.repository.ts, scan-prediction.repository.ts). `BlueprintModal.tsx` is a `return null` stub ("Blueprint feature removed"). The live state machine + scheduling code described in the context no longer exists; the surviving onboarding logic lives in `onboardingStore.ts`, `useOnboardingConditions.ts`, and the idea state machine. Findings target the real surviving code.

## 1. currentStep is global but completedSteps is per-project — stale step on project switch
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: state-machine / cross-project leak
- **File**: src/stores/onboardingStore.ts:18, 99, 117-137
- **Scenario**: Onboard project A to completion; `currentStep` becomes `null`. Switch active project to fresh project B (`setActiveProjectId`). `completedSteps[B]` is empty, but persisted `currentStep` is still `null` from A. In `isStepActive`, `currentStep === null` triggers the "derive from completed" branch and works — but if A left `currentStep='run-task'`, switching to B makes `isStepActive` return `currentStep === step`, i.e. only `run-task` glows for B even though B hasn't created a project. The active-step highlight points at the wrong step for the new project.
- **Root cause**: `currentStep` is a single global field persisted in localStorage, while `completedSteps` is keyed by project. `setActiveProjectId` never resets/recomputes `currentStep` for the new project.
- **Impact**: Wrong "next step" glow / guidance after switching projects; onboarding appears mid-flow on a brand-new project, confusing first-run UX.
- **Fix sketch**: Make `currentStep` per-project (`Record<projectId, OnboardingStep|null>`) OR recompute `currentStep = getNextIncompleteStep(projectId)` inside `setActiveProjectId`.
- **Value**: effort 4 / impact 7 / risk 3

## 2. ControlPanel onClose wired to closeBlueprint instead of closeControlPanel
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: wrong wiring / stuck UI
- **File**: src/app/features/Onboarding/ControlPanelProvider.tsx:68-72 (`onClose={closeBlueprint}`)
- **Scenario**: `<ControlPanel isOpen={isControlPanelOpen} onClose={closeBlueprint} .../>`. The drawer's backdrop/escape calls `onClose` → `closeBlueprint`, which sets `isBlueprintOpen:false` and does NOT touch `isControlPanelOpen`. `isControlPanelOpen` stays `true`. (Today the inner `Drawer.onClose` in ControlPanel.tsx:37-40 also calls `closeControlPanel()`, masking it — but the prop contract is inverted, so any future Drawer change or direct `onClose` call leaves the panel stuck open.)
- **Root cause**: Copy-paste of the blueprint close handler; the prop name `onClose` for the control panel was bound to the wrong store action.
- **Impact**: Latent stuck-drawer bug; the panel's own override is the only thing keeping it dismissible. Fragile, silently wrong.
- **Fix sketch**: Pass `onClose={closeControlPanel}` to `<ControlPanel>`; keep `closeBlueprint` only for `<BlueprintModal>`.
- **Value**: effort 1 / impact 6 / risk 2

## 3. Idea status auto-complete uses raw status strings, not the state machine — onboarding step can complete on transient/foreign status
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: silent failure / success-theater coupling
- **File**: src/app/features/Onboarding/lib/useOnboardingConditions.ts:100-122
- **Scenario**: `checkIdeas` fetches `/api/ideas?projectId=...` and string-matches `idea.status === 'accepted' || 'implemented'`. If the API ever returns ideas across projects, or a status value drifts (typo/new status), the filter silently mis-counts. All four fetch effects (`checkContexts`/`checkIdeas`/`checkGoals`) swallow errors with empty `catch {}` (lines 82-84, 123-125, 143-145): a 500 or network blip means the step silently never auto-completes and the user is stuck with no signal. Steps are also one-way: once `implemented` flips `run-task`+`review-impl` complete, deleting/reverting the idea never un-completes them.
- **Root cause**: Onboarding condition logic re-implements status semantics with string literals instead of `IdeaStateMachine`/shared status constants, and treats all fetch failures as "non-critical → ignore".
- **Impact**: Stuck onboarding on a flaky API with zero diagnostics; false-complete steps that never revert; brittle to status-vocabulary changes.
- **Fix sketch**: Use `IdeaStateMachine.isValidStatus` / shared status consts; surface a retry on fetch failure (or at least log); recompute completion idempotently from current data each pass.
- **Value**: effort 4 / impact 5 / risk 3

## 4. Idea state machine: `implemented` is terminal with no reopen, and rollback transitions never clear implemented_at
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: state-machine dead-end / stale side-effect
- **File**: src/lib/ideas/ideaStateMachine.ts:59-64, 80-84
- **Scenario**: `implemented: new Set([])` — once an idea is marked implemented (which onboarding step 6/7 keys off), there is NO transition back to `pending`/`accepted`. A mis-applied or reverted implementation is permanently stuck terminal; `idea.repository.update` will `throw new Error(transition.reason)` (idea.repository.ts:254-256) on any attempt to move it, surfacing as a 500. Separately, `SIDE_EFFECTS` sets `implemented_at` on `accepted:implemented` but no transition ever clears it, so any future reopen path would carry a stale `implemented_at`.
- **Root cause**: Design assumed implementation is irreversible; no recovery/reopen edge defined, and side-effects only set fields, never clear them on rollback.
- **Impact**: No recovery from a bad implementation; onboarding/idea board can wedge an idea; reopen feature (if added) inherits stale timestamps.
- **Fix sketch**: Add `implemented → accepted` (or `pending`) reopen edge; add a side-effect clearing `implemented_at: null` on any transition out of `implemented`.
- **Value**: effort 3 / impact 5 / risk 4

## 5. Zero test coverage for the entire onboarding state machine, conditions, and idea transition table
- **Severity**: High
- **Lens**: test-mastery
- **Category**: missing tests / highest-leverage batch
- **File**: src/stores/onboardingStore.ts (whole), src/lib/ideas/ideaStateMachine.ts (whole), src/app/features/Onboarding/lib/useOnboardingConditions.ts
- **Scenario**: Globs for `*onboarding*`, `*StateMachine*`, `*Onboarding*` `.test/.spec` return zero files; no test imports `IdeaStateMachine`/`useOnboardingAutoComplete`/`completeStepIfNeeded`. These are pure, deterministic, and business-critical (gate first-run UX + every idea status write in the repo). The `IdeaStateMachine.authorize` truth table is the single highest-leverage LLM-generatable batch in this context.
- **Root cause**: Pure helpers carry the invariants but were never anchored by tests; risk lives exactly at the transition table that every write funnels through.
- **Impact**: Findings 1, 3, 4 (cross-project step leak, terminal dead-end, stale side-effect) would be caught instantly by table-driven tests; regressions in transition rules silently corrupt idea status / onboarding progress.
- **Fix sketch**: Table-driven Vitest over `authorize` (all 4×4 from/to pairs: allowed set, side-effects, no-op same-state, terminal `implemented`), plus store unit tests for `getNextIncompleteStep`/`isStepActive`/per-project isolation and a `setActiveProjectId`-resets-currentStep assertion (would fail today → encodes finding 1).
- **Value**: effort 3 / impact 8 / risk 1
