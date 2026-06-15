# Context Management — bug-hunter + ui-perfectionist scan

> Context: Context Management
> Total: 5 findings (Critical: 1, High: 2, Medium: 1, Low: 1)

## 1. Deferred cleanup deletes all old context data even when generation produced nothing
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: state-corruption / data-loss
- **File**: src/app/features/Context/hooks/useContextGenerationStream.ts:102
- **Scenario**: A user with an existing, hand-curated context map runs "Scan Codebase". The Claude CLI connects, does some analysis, and emits a `result` event (which the SSE layer fires on *normal process completion*, see `useSSEStream.ts:85`), but — because of a token cutoff, a tool error mid-run, or the agent simply not creating anything — it never POSTs new contexts/groups and never emits the ` ```json:context-generation-summary ` block. `onResult` fires regardless: it sets status `completed` and then unconditionally POSTs to `/api/context-generation/cleanup` with `scan.previousDataIds`, which deletes every old context, group, and relationship by ID (`cleanup/route.ts:60-88`). The user is left with an empty context map and no undo.
- **Root cause**: `result` is treated as success-with-new-data, but the design has no guard that *new* data was actually created before deleting the *old* data. `summaryDataRef.current` defaults to all-zeros and is never checked; cleanup runs even when `contextsCreated === 0`.
- **Impact**: Silent, irreversible loss of the entire context map — the single most valuable artifact this feature produces.
- **Fix sketch**: In `onResult`, only trigger cleanup when a structured summary was actually parsed AND `contextsCreated > 0` (and ideally re-fetch and confirm new rows exist for the project before deleting the snapshot). Otherwise set status `completed` but skip cleanup and surface a "no contexts were generated; your existing data was kept" message.

## 2. Context detail refresh hits a non-existent route and silently no-ops
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: silent-failure / dead-endpoint
- **File**: src/app/features/Context/sub_ContextOverview/ContextOverviewInline.tsx:43
- **Scenario**: After a user edits a context's preview/target in `ContextPreviewManager`, `onPreviewUpdated` calls `refreshContextFromDB()`, which does `fetch(\`/api/contexts/${context.id}\`)`. No `src/app/api/contexts/[contextId]/route.ts` exists (confirmed — the only dynamic context lookup route is `/api/contexts/detail?contextId=...`, which returns `{ data }`, not `{ context }`). The fetch resolves to a 404 HTML/JSON response, `response.ok` is false, the `if` body is skipped, and nothing is logged because there's no thrown error. The just-saved values never get re-synced from the DB; the UI keeps only the optimistic local state.
- **Root cause**: Endpoint was renamed/removed (`/contexts/[id]` → `/contexts/detail`) and the response envelope changed from `{ context }` to `{ data }`, but this caller was never updated. Both the URL and the field name are wrong.
- **Impact**: "Refresh from DB" is a dead no-op; any server-side normalization/derived fields applied on save are never reflected until a full reload. Looks like success but does nothing.
- **Fix sketch**: Call `/api/contexts/detail?contextId=${context.id}` and read `data.data` instead of `data.context`. Add an `else` branch that logs non-ok responses so the failure isn't invisible.

## 3. `batchMoveContexts` corrupts group_id for any context not in the move set
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: sql-edge-case / state-corruption
- **File**: src/app/db/repositories/context.repository.ts:273
- **Scenario**: The batch UPDATE builds `SET group_id = CASE WHEN id = ? THEN ? ... END WHERE id IN (...)`. A SQL `CASE` with no `ELSE` returns `NULL` for any row that matches no `WHEN`. The `WHERE id IN (ids)` clause is built from the same `moves`, so today every targeted row has a matching `WHEN` — but this is fragile: if the `ids`/`caseParts` lists ever drift (e.g. a duplicate `contextId` in `pendingMoves`, or a future caller passing extra IDs in the `WHERE` set), every unmatched row silently has its `group_id` set to `NULL`, ejecting contexts from their groups. `queueMove` (`contextStore.ts:547`) dedupes by contextId, but nothing in the repository enforces that invariant.
- **Root cause**: Missing `ELSE group_id` in the CASE expression — the query assumes `WHERE`-set and `WHEN`-set are always identical, an assumption not guaranteed at the repository boundary.
- **Impact**: Mass un-grouping of contexts (data corruption) the moment the two ID lists diverge; hard to diagnose because it's a silent NULL write.
- **Fix sketch**: Add `ELSE group_id` to the CASE: `SET group_id = CASE ${caseParts} ELSE group_id END`. This makes unmatched rows a no-op and removes the landmine entirely.

## 4. Drag-end flush relies on `setTimeout(0)` racing the optimistic queue
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: race-condition / timing
- **File**: src/app/features/Context/ContextLayout.tsx:103
- **Scenario**: `handleDragEndWithFlush` calls `handleDragEnd(event)` (which invokes the `onDrop` → `queueMove`) and then `setTimeout(() => flushPendingMoves(), 0)`. The comment says the timeout exists "to allow the queue to populate," but `queueMove`'s `set()` is synchronous, so the delay is unnecessary and, worse, opens a window: if the user immediately starts a second drag, or `removeGroup` runs (which filters `pendingMoves`), the flush can fire against a mutated queue. `flushPendingMoves` also clears `pendingMoves: []` on *any* error including ones from a partially-applied batch, so a second rapid drag's queued moves can be silently dropped between the timeout scheduling and execution.
- **Root cause**: Using `setTimeout(0)` as a sequencing primitive for synchronous Zustand updates; the "populate the queue" rationale is incorrect, and the deferral introduces an interleaving window instead of closing one.
- **Impact**: Under fast successive drags, some moves can be lost (never persisted) while the UI shows them as applied — divergence between UI and DB until reload.
- **Fix sketch**: Drop the `setTimeout` and `await flushPendingMoves()` directly after `handleDragEnd` returns (the queue is already populated synchronously), or have `onDrop` itself trigger the flush. Keep the module-level `_isFlushInProgress` guard but re-queue rather than discard on failure.

## 5. Health tooltip never repositions on scroll, detaching from its anchor
- **Severity**: Low
- **Lens**: ui-perfectionist
- **Category**: missing-polish / positioning
- **File**: src/app/features/Context/components/ContextHealthIndicator.tsx:65
- **Scenario**: `HealthTooltip` computes `pos` from `getBoundingClientRect()` only when `visible` flips true. The tooltip is `position: fixed` and rendered via a portal to `document.body`. The context list lives in a scroll container (`max-h-[60vh] overflow-y-scroll`, see `TreeView.tsx:33`, and the overview content area scrolls too). If the user hovers a health dot and then scrolls (e.g. via trackpad momentum or keyboard) without moving the mouse off the dot, the fixed tooltip stays at its original viewport coordinates while the anchor icon moves, leaving the tooltip floating over unrelated content.
- **Root cause**: Position is captured once on show with no `scroll`/`resize` listener and no reposition-on-scroll, despite using viewport-fixed coordinates inside scrollable regions.
- **Impact**: Tooltip visually detaches from its trigger during scroll — minor but looks broken, and can obscure other UI.
- **Fix sketch**: While `visible`, attach passive `scroll` (capture) and `resize` listeners that recompute `pos` from the anchor rect, or hide the tooltip on scroll. Clean up listeners on hide/unmount.
