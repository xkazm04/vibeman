# Bug-UX Scan — Fix Wave 7 — Polish

> 7 commits, 7 findings closed. Branch: `vibeman/bug-ux-fixes`. Baseline preserved: tsc 0 → 0; tests 539/542.
> The last all-clean wave: everything remaining is WIP-blocked or the remote auth design.

## Commits

| # | Commit | Finding | Severity | File(s) |
|---|---|---|---|---|
| 1 | `dd349cd6` | docs #3 — system-map node overlap | High | `SystemMap/helpers.ts`, `XRaySystemMap.tsx` |
| 2 | `bf1a4253` | workspace #4 — PreviewModal exit animation | Medium | `HallOfFame/components/PreviewModal.tsx` |
| 3 | `c9b187bd` | manager #5 — misleading Map empty-state copy | Medium | `Manager/ManagerLayout.tsx` |
| 4 | `fc96a514` | ideas #4 — Tinder revert stale-index race | Medium | `tinder/lib/useLocalTinderItems.ts` |
| 5 | `fe41dfdc` | context #5 — health tooltip scroll detach | Low | `Context/components/ContextHealthIndicator.tsx` |
| 6 | `9079adda` | docs #5 — Hot Paths NaN bar width | Low | `sub_XRay/XRayHotPathsPanel.tsx` |
| 7 | `45543036` | workspace #5 — dead ComponentGrid | Low | `HallOfFame/components/ComponentGrid.tsx` (deleted) |

## What was fixed

1. **System map is more legible when crowded.** Node spacing collapsed to ~3-5% for 15+ nodes (w-24 cards → heavy overlap). The spread now widens with node count (clamped ~96%) in both SystemMap helpers and XRaySystemMap. *(Partial: very large layers still crowd; full wrapping/scroll is a follow-up.)*
2. **PreviewModal closes with its animation.** An `if (!component) return null` ran before `AnimatePresence`, unmounting the modal instantly on close so the exit transition never played. Content is now gated on `componentId && component` with the early-return removed (both helpers already self-guard).
3. **Honest empty-state copy.** The Map panel told users to "Select a group to filter" when there was simply nothing to review; now "No changes to review".
4. **Robust optimistic swipe-revert.** Tinder handlers removed by reference but reverted at a stale `currentIndex`, so a failed swipe could reinsert out of order or duplicate. Revert now skips if the item is already present and clamps the position to the current list length — applied to all 7 swipe variants.
5. **Health tooltip follows its anchor.** The fixed tooltip computed position once on show; it now recomputes on scroll (capture phase) and resize while visible, so it no longer detaches when the list scrolls.
6. **Hot Paths bar can't render `NaN%`.** Guarded the `count / topCount` divisor against a zero/missing top-row count.
7. **Removed dead `ComponentGrid`.** Zero references (verified), drifted out of sync with the live `ComponentTable` — deleted to kill the maintenance trap.

## Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | 0 errors (deletion left no dangling references) |
| Tests | 539/542 (same 3 deleted-Brain import failures; no regression) |
| ESLint (changed files) | 0 new (PreviewModal has a pre-existing `Compilation Skipped` error on its untouched `copyCode` useCallback — identical count on HEAD, verified) |
| WIP safety | working tree back to 708; only my 7 files touched (1 deleted) |

## Patterns established (catalogue items 19–20)

19. **An early `return null` before `AnimatePresence` defeats exit animations.** Keep the animator mounted and gate its *children*; never short-circuit the component above it when the unmount is exactly what you want to animate. (workspace #4)
20. **Revert optimistic mutations by identity + clamp, not a captured index.** A position captured before an await is stale by the time the await rejects; re-insert by checking presence and clamping to the current length. (ideas #4)

## What remains (per INDEX) — nothing clean

All non-WIP findings are now closed. Remaining work is gated on the user's in-progress refactor or is a deferred design decision:
- **WIP-blocked bucket (5):** context #3, manager #1, taskrunner #2/#3/#4 — all in `headless-slim` files (`context.repository.ts`, `DirectionCarousel.tsx`, `claudeExecutionQueue.ts`). Clearable in one pass once that work is committed/stashed.
- **Deferred by decision:** remote auth/ownership design (remote #1/#2) — needs an API-key-auth + device-ownership model.
