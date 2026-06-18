# Ideas System — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495644094_79506a5
> Group: Core Development Engine
> Files read: ~22
> Total: 5 (Critical: 1, High: 3, Medium: 1, Low: 0)

## 1. `acceptIdea` has no server-side idempotency/CAS — concurrent or retried accepts double-process
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: race-condition / data-loss
- **File**: src/lib/ideas/ideaAcceptanceWorkflow.ts:107-194
- **Scenario**: The only dedup is client-side (`inflightActions` map in `tinderItemsApi.ts:26`, scoped to one browser tab). Two requests for the same idea — a remote-mode device + local tab, a CLI calling `/api/tinder/actions`, or a client retry after a slow first response — both run `getIdeaById` → state-machine `authorize` → `updateIdea(status:'accepted')` → `createRequirement`. The state machine treats `accepted → accepted` as an **allowed no-op** (`ideaStateMachine.ts:101`), so the 2nd accept is NOT rejected. Both calls write the requirement file (`createRequirement(..., overwrite=true)`), and both fire `signalCollector.recordIdeaDecision(accepted:true)` — double-counting acceptances and potentially clobbering an edited variant file with the original.
- **Root cause**: Assumes the client in-flight guard is sufficient; the workflow is a read-then-write with no compare-and-swap on `status` and no `WHERE status='pending'` guard at the SQL layer.
- **Impact**: Duplicate requirement files / overwrite of edited content, inflated acceptance metrics feeding brain signals, double dependency-unlock surfacing. Silent — every call returns `success:true`.
- **Fix sketch**: Make the DB write conditional: `UPDATE ideas SET status='accepted',requirement_id=? WHERE id=? AND status IN ('pending','rejected')` and treat `changes===0` as ALREADY_PROCESSED (409). Have the workflow bail before `createRequirement` if the CAS didn't claim the row.
- **Value**: effort 4 / impact 9 / risk 4

## 2. `/api/ideas/approve` bulk update is non-transactional and crashes mid-batch on an illegal transition
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: silent-failure / partial-write
- **File**: src/app/api/ideas/approve/route.ts:42-53
- **Scenario**: The loop calls `ideaRepository.updateIdea(id, {status})` per id. `updateIdea` invokes `IdeaStateMachine.authorize` and **throws** on an illegal transition (repository line 256). `implemented → rejected` and `implemented → accepted` are illegal (`ideaStateMachine.ts:63`). If a caller passes a batch (up to 200 ids) where any idea is already `implemented`, the throw propagates to the outer `catch` and returns 500 — but every idea processed *before* the bad one was already committed (no transaction). The client gets a generic 500 with no `updatedIds`, so it can't tell which half succeeded → re-submitting double-processes the first half.
- **Root cause**: Assumes all supplied ideas are in a transitionable state and that the loop is all-or-nothing; neither holds — no `db.transaction()` wrapper and no per-id try/catch.
- **Impact**: Partial state changes with no report of what changed; cache invalidation skipped for the un-reached projects; user-visible "approval failed" while some ideas silently flipped.
- **Fix sketch**: Wrap the loop in `db.transaction(...)`, or per-id `try/catch` collecting failures into a `failed[]` array and return 207-style partial result instead of throwing.
- **Value**: effort 3 / impact 7 / risk 3

## 3. `handleAcceptIdeaVariant` ignores the PATCH response — accepts the un-edited idea on a failed save (success theater)
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: silent-failure / success-theater
- **File**: src/app/features/tinder/lib/useLocalTinderItems.ts:334-347
- **Scenario**: When a user picks a variant (MVP/Standard/Ambitious), the code `await fetch('/api/ideas', { method:'PATCH', ... })` to persist the new title/description/effort/impact/risk, then immediately `await acceptTinderItem(...)`. The PATCH result is never checked for `response.ok`. If the PATCH 4xx/5xx (validation, DB error, idea already accepted elsewhere), the variant edits are silently dropped and the **original** idea is accepted and written to a requirement file — the user believes they accepted the Ambitious scope but got the default.
- **Root cause**: Optimistic two-step write with no verification gate between the edit and the accept; assumes PATCH always succeeds.
- **Impact**: Wrong requirement content shipped to the implementation pipeline; user's scope choice lost with a success toast. Hard to notice until the wrong work is built.
- **Fix sketch**: `const res = await fetch('/api/ideas',{...}); if(!res.ok) throw new Error('Failed to save variant');` before calling `acceptTinderItem` (the existing catch already reverts the optimistic removal).
- **Value**: effort 1 / impact 7 / risk 2

## 4. Zero tests on the entire accept/reject/state-machine/aggregation critical path
- **Severity**: High
- **Lens**: test-mastery
- **Category**: test-gap / coverage
- **File**: src/lib/ideas/ideaStateMachine.ts (+ ideaAcceptanceWorkflow.ts, api/tinder/actions/route.ts, api/ideas/approve/route.ts)
- **Scenario**: The only tests near this context are `ContextRowSelection.test.ts` (alphabetical sort) and `IdeaCard.test.ts` (context-name fallback) — both pure display helpers. The business-critical invariants have **no** assertions: (a) `IdeaStateMachine.authorize` legal/illegal transition table + side-effects (`implemented_at`, `requirement_id:null`), (b) `acceptIdea` rollback path when `createRequirement` fails (DB must be restored to `previousStatus`), (c) the `approve` route's partial-batch behavior. These are the highest-leverage, easiest-to-anchor tests in the module — pure functions and well-defined invariants.
- **Root cause**: Tests were written for the leaf display helpers but stop one layer below the orchestration/DB-write/state-transition logic where the real risk lives (matches the project's dominant "risk lives one layer above where tests stop" pattern).
- **Impact**: Regressions in transition rules, rollback, or batch handling (incl. findings #1/#2) ship undetected. Blast radius = every accept/reject in the product.
- **Fix sketch**: LLM-generatable batch anchored to `TRANSITIONS`: assert every `from×to` pair matches the allowed/denied table and side-effects; add a `vitest` test for `acceptIdea` with a mocked `createRequirement` that throws, asserting status rolls back to `pending`.
- **Value**: effort 3 / impact 8 / risk 1

## 5. `rejectIdea` (and reject paths) 500 on ideas in a non-rejectable state instead of degrading gracefully
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: error-handling / edge-case
- **File**: src/app/api/tinder/actions/route.ts:104-108
- **Scenario**: `rejectIdea` calls `ideaRepository.updateIdea(ideaId,{status:'rejected', ...})` with no try/catch around the transition. `implemented → rejected` is illegal (`ideaStateMachine.ts:63`), so `updateIdea` throws and the route returns a 500 via `handleIdeasApiError`. The tinder UI's `rejectTinderItem` only maps 409→success (`tinderItemsApi.ts:112`); a 500 triggers `alert('Failed to reject')` and re-inserts the card, leaving the user stuck on an idea they can never dismiss (an already-implemented idea that re-surfaced in a stale list).
- **Root cause**: Reject handler assumes the idea is always pending/accepted; no handling for terminal `implemented` state, and the error surfaces as a generic 500 rather than a meaningful "already finalized" response.
- **Impact**: Stuck-card UX on edge ideas; noisy 500s in observability that mask real failures.
- **Fix sketch**: In `rejectIdea`, check `IdeaStateMachine.authorize(idea.status,'rejected')` first; if denied because terminal, return 409 (treated as success client-side) or a clear 422; wrap `updateIdea` in try/catch.
- **Value**: effort 2 / impact 5 / risk 2
