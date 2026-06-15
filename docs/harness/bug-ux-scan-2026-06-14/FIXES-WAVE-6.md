# Bug-UX Scan — Fix Wave 6 — UI dead actions / mock data / X-Ray

> 5 commits, 6 findings closed (incl. docs #2 pulled forward from Wave 5). 1 deferred (manager #1, WIP).
> Branch: `vibeman/bug-ux-fixes`. Baseline preserved: tsc 0 → 0; tests 539/542 (same 3 deleted-Brain failures).
> Mental model: every visible action does what it says, and no surface shows fabricated/dead data.

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `40dbc9dc` | docs #1 — X-Ray store never wired | Critical | `DocsAnalysisLayout.tsx`, `stores/xrayStore.ts` |
| 2 | `57907561` | docs #2 — X-Ray edges never match | High | `sub_XRay/XRaySystemMap.tsx` |
| 3 | `d68b25fa` | manager #2 — hardcoded mock proposals | High | `Proposals/lib/useProposals.ts` |
| 4 | `651be6d5` | ideas #2 + #3 — dead CTA + 409-as-error | High + Medium | `Ideas/sub_Buffer/BufferView.tsx`, `Ideas/sub_Kanban/KanbanBoard.tsx` |
| 5 | `700c2c56` | ideas #5 — effort/impact 0 dropped | Medium | `Ideas/sub_Buffer/BufferItem.tsx` |

## What was fixed

1. **X-Ray actually shows data.** Toggling X-Ray fed a synthetic instrumentation buffer that was never bridged into `useXRayStore` (no caller of `connect`/`addEvent`/`subscribe`), so the flagship view rendered permanently empty + "Disconnected" while looking live. Enabling now seeds the store from the buffer, subscribes new events into `addEvent`, and marks it connected (new `setConnected` action); disable / simulation-toggle / unmount tear the bridge down.
2. **X-Ray connections light up.** Connection endpoints are deduped via `[id, connId].sort()` (arbitrary order) while edge IDs are directional, so a single-direction lookup missed ~half. `getConnectionXRayData` now checks both forward and reverse edge IDs.
3. **No more fabricated proposals.** `useProposals` returned three hardcoded proposals when no real directions were supplied, and `ProposalPanel` calls it with no args — so it always rendered fake proposals whose accept/decline fired `undefined`. The mock fallback is now empty (panel shows nothing until real data).
4. **Dead "Generate Ideas" CTA fixed + idempotent 409 handled.** The empty-state CTA (in **both** BufferView and KanbanBoard) focused a `data-testid` nothing renders, so the primary new-user action did nothing; it now targets the real `generated-ideas-btn`/`detailed-ideas-btn`. BufferView convert/queue handlers no longer throw on HTTP 409 (already-processed) — a red error for an idempotent no-op — matching the shared `tinderAction` client.
5. **0 score distinguished from "no score."** `BufferItem` used `idea.effort ?` (truthiness), conflating a real 0 with null. Now an explicit null check (the 1-10 scale still has no entry for 0, but the boundary is handled correctly).

## Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | 0 errors (unchanged) |
| Tests | 539/542 (same 3 deleted-Brain import failures; no regression) |
| ESLint (changed files) | 0 new (useProposals has 1 pre-existing `Compilation Skipped` error on the untouched `directionProposals` useMemo — identical on HEAD, verified) |
| WIP safety | working tree back to 708; only my 7 files touched |

## Patterns established (catalogue items 16–18)

16. **A producer + a store with no bridge between them is silent dead wiring.** Two valid halves (an event buffer and a store that consumes events) don't connect themselves — grep that *something* subscribes the producer to the consumer, or the feature renders empty while looking live. (docs #1)
17. **Directional keys + order-agnostic endpoints never reliably match.** If one side builds a key as `a->b` and the other orders endpoints arbitrarily, look both ways (or canonicalize the key). (docs #2)
18. **A querySelector by `data-testid` is an untyped string contract that silently breaks.** A CTA that focuses/scrolls to another element by testid is dead the moment that id drifts; prefer a ref/callback, and at minimum keep the selector in sync (and replicate the fix to every surface that copied it). (ideas #2)

## Deferred

- **manager #1 (Accept-with-Code === plain Accept).** Its file `src/app/features/Proposals/components/DirectionCarousel.tsx` is in the headless-slim WIP. Joins context #3, taskrunner #2/#3/#4 in the WIP-blocked bucket.

## What remains (per INDEX)

Wave 7 — polish (7): system-map node overlap (docs #3), PreviewModal exit animation (workspace #4), Map "All Changes" copy (manager #5), Tinder revert index race (ideas #4), health-tooltip scroll (context #5), Hot-Paths NaN bar (docs #5), dead ComponentGrid (workspace #5). Plus the WIP-blocked bucket (context #3, manager #1, taskrunner #2/#3/#4) and the remote auth/ownership design (remote #1/#2).
