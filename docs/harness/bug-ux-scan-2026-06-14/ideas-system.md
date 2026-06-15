# Ideas System — bug-hunter + ui-perfectionist scan

> Context: Ideas System
> Total: 5 findings (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. Lifecycle orchestrator is a process-global singleton with no project scoping

- **Severity**: High
- **Lens**: bug-hunter
- **Category**: state-corruption
- **File**: src/app/features/Ideas/sub_Lifecycle/lib/lifecycleOrchestrator.ts:510 (singleton) + src/app/api/lifecycle/route.ts:19-21 + src/app/features/Ideas/sub_Lifecycle/LifecycleDashboard.tsx:59
- **Scenario**: User has two projects, A and B. They open the Lifecycle dashboard for project A and start a cycle. They then switch the dashboard to project B (or open it in a second tab). `LifecycleDashboard` mounts and calls `initializeOrchestrator()` (line 85-105), which POSTs `action:'initialize', projectId: B`. `initialize()` (orchestrator line 74) overwrites `this.config` wholesale with project B's id. Meanwhile GET `/api/lifecycle` returns `lifecycleOrchestrator.getStatus()` / `getCurrentCycle()` — the single shared cycle — with **no `projectId` filter**. Project B's dashboard now displays project A's running cycle, its progress bar, its stats, and its Stop button controls project A's cycle.
- **Root cause**: The orchestrator is a module-level singleton (`export const lifecycleOrchestrator = new LifecycleOrchestrator()`) that holds exactly one `config`, one `currentCycle`, and one `eventHistory`. The DB lock is keyed by `project_id`, but all in-memory state and every API read/write path is global. `initialize()` clobbers config rather than maintaining a per-project map.
- **Impact**: Cross-project state bleed — wrong cycle shown, wrong project stopped/triggered, config of one project silently replaced by another. With concurrent projects this is data-corruption-grade confusion of which project is being acted on.
- **Fix sketch**: Key orchestrator state by `projectId` (a `Map<projectId, {config, currentCycle, events}>`), require `projectId` on GET `/api/lifecycle`, and have the dashboard pass its `projectId` to every fetch so it only ever reads/writes its own project's slot.

## 2. Empty-state "Generate Ideas" button targets a `data-testid` that is never rendered

- **Severity**: High
- **Lens**: ui-perfectionist
- **Category**: dead-action
- **File**: src/app/features/Ideas/sub_Buffer/BufferView.tsx:255 (also KanbanBoard.tsx:78)
- **Scenario**: A user with an empty buffer sees the `EmptyState` with a primary "Generate Ideas" call-to-action. Clicking it runs `document.querySelector('[data-testid="ideas-scan-btn"]')`, then `if (scanBtn instanceof HTMLElement) { scanBtn.focus(); scanBtn.scrollIntoView(...) }`. No element in the codebase renders `data-testid="ideas-scan-btn"` — the actual scan buttons are `generated-ideas-btn` and `detailed-ideas-btn` (ClaudeIdeasButton.tsx:41,87). `querySelector` returns `null`, the `instanceof` guard is false, and the handler silently does nothing.
- **Root cause**: The scan button testid was renamed/split into `generated-ideas-btn` / `detailed-ideas-btn` but the two empty-state CTAs that point at it were never updated. The `if (scanBtn instanceof HTMLElement)` guard converts the dangling selector into a silent no-op rather than an error.
- **Impact**: The single most prominent CTA for a brand-new user (empty buffer) does nothing on click — a dead primary action at the exact moment of activation. Same dead button exists in the Kanban empty state.
- **Fix sketch**: Point the selector at `[data-testid="generated-ideas-btn"]` (or whichever button is the canonical scan trigger), or better, lift a callback/ref from `ScanInitiator` so the empty-state action scrolls/focuses the real control instead of relying on a brittle global `querySelector`.

## 3. BufferView convert/queue handlers treat HTTP 409 "already processed" as a hard error

- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: silent-failure / inconsistent-error-handling
- **File**: src/app/features/Ideas/sub_Buffer/BufferView.tsx:167-191 and 211-235
- **Scenario**: `handleIdeaConvert` and `handleIdeaQueueForExecution` POST directly to `/api/tinder/actions` with a raw `fetch`, then `if (!response.ok) { ... throw new Error(errorData.error || 'Failed to convert idea') }`. The shared client `tinderAction()` (tinderItemsApi.ts:111-113) explicitly treats `response.status === 409` (already accepted/processed) as success. BufferView does not. If a user double-clicks the Zap/Play button, or the idea was already accepted in another tab/Tinder view, the server returns 409 and BufferView surfaces a red error banner ("Failed to convert idea to requirement.") for what is actually a success/no-op.
- **Root cause**: Two parallel code paths to the same endpoint with divergent 409 semantics. BufferView reimplements the fetch instead of calling `acceptIdeaById`/`acceptTinderItem`, so it misses the 409-is-success rule.
- **Impact**: Spurious error banners on idempotent/duplicate actions; users think a conversion failed when it succeeded, may retry or distrust the feature.
- **Fix sketch**: Route both handlers through the shared `acceptIdeaById(ideaId, project.path)` helper from `tinderItemsApi.ts` (which already dedups in-flight calls and treats 409 as success), eliminating the duplicated fetch logic entirely.

## 4. Tinder optimistic accept/reject reverts to a stale index after concurrent removals

- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: race-condition
- **File**: src/app/features/tinder/lib/useLocalTinderItems.ts:196 + 226-230 (accept), 242 + 255-259 (reject), and the variant handlers
- **Scenario**: On accept, the item is removed by reference: `setItems(prev => prev.filter(item => item !== currentItem))`, then on failure it is reverted by **position**: `newItems.splice(currentIndex, 0, currentItem)`. The list shrinks on each successful swipe while `currentIndex` stays fixed (this is how it advances). If a swipe's API call fails *after* the user has managed another state change, or after `loadItems` appended/replaced the array (the load-more fetch on line 223 mutates `items`), the `currentIndex` captured in the failed closure no longer corresponds to the original slot, so the reverted card reappears in the wrong position — or, if the array was replaced by a fresh first page, gets injected into an unrelated batch. The `processing` guard reduces but does not eliminate this because `loadMoreIfNeeded`→`loadItems` runs concurrently with the still-pending action and can resolve and `setItems(result.items)` while the action is mid-flight.
- **Root cause**: Removal keys on object identity (`item !== currentItem`) but restoration keys on a numeric index captured at call time; the two are only consistent if nothing else mutates the array between optimistic remove and revert. The interleaved `loadItems` (first-page replace) breaks that invariant.
- **Impact**: On a failed swipe under load (slow network + near-end-of-batch triggering a page load), the rejected/accepted card can re-appear out of order or in the wrong filtered batch, and stats/counts already decremented optimistically are not rolled back — the counters drift permanently.
- **Fix sketch**: Revert by identity, not index (re-insert `currentItem` and re-sort, or restore the pre-action snapshot of `items`), and roll back the optimistic `updateStats`/`updateCountsOptimistic`/`updateCategoryCountOptimistic` calls inside the `catch` so counters stay consistent with the visible list.

## 5. Effort/Impact "0" scores are silently dropped from BufferItem badges

- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: edge-case / boundary
- **File**: src/app/features/Ideas/sub_Buffer/BufferItem.tsx:63-64
- **Scenario**: `const effortCfg = idea.effort ? effortScale.entries[idea.effort] || null : null;`. The scale (ideaConfig.ts:106) is keyed 1–10, so this guard "works" for valid values — but it uses a truthiness check (`idea.effort ?`) rather than a null check. The `validateScore` path and DB schema permit `effort`/`impact`/`risk` to be `0` or `null`; any idea persisted with a `0` score (e.g. an LLM that returned 0, or a clamped value) is treated identically to "no score", so its effort/impact badge silently disappears. There is no `entries[0]`, so even an explicit attempt to render 0 would yield `undefined`. Inconsistently, IdeaCard.tsx renders all three (effort/impact/risk) while BufferItem only renders effort+impact, so the same idea shows different metadata depending on view.
- **Root cause**: Boundary value `0` collapses into falsy, and the scale was defined as 1–10 with no slot for 0, so a legitimate-but-zero score is indistinguishable from missing data.
- **Impact**: Ideas with a 0 score lose their effort/impact indicator in the buffer with no signal to the user; the buffer and the swipe card disagree on what metadata an idea has, undermining trust in the triage signals.
- **Fix sketch**: Guard with `idea.effort != null` (and clamp/round into the 1–10 range before lookup), decide on a canonical 0-or-1 floor for scores, and render the same effort/impact/risk triad in BufferItem and IdeaCard so views are consistent.
