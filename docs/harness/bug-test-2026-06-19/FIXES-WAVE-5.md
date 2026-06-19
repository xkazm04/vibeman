# Bug-Test Fix Wave 5 — Cleanup, green baseline & test seed

> 4 commits restoring a green test suite, removing dead-feature debris, seeding the
> first coverage for the security-critical confinement helpers, and clearing the 3
> phantom contexts from the live map. Branch `vibeman/bug-test-fixes-2026-06-19`.

## Commits

| # | Commit | Finding(s) | What |
|---|---|---|---|
| 1 | `086be28b` | brain #1 | Remove stale `signal-types` cross-layer block → suite green |
| 2 | `4204bddb` | annette #1, #2 | Delete orphaned `e2e/annette` + fix stale nav dropdown list |
| 3 | `d4480d62` | workspace #1/#2/#5 (test) | Seed pathSecurity confinement tests (17 assertions) |
| 4 | `81cf1bcc` | annette #3, social #3 | Delete 3 phantom contexts from the live map (backup kept) |

## Test baseline — now green and growing

| Stage | vitest |
|---|---|
| Start of run (scan baseline) | 547 / 550 (3 stale failures) |
| After brain #1 (remove dead block) | **547 / 547** (all green) |
| After pathSecurity seed (+17) | **564 / 564** (all green) |

The suite went from *permanently red with a masked failure* to **fully green**, and the
single most security-sensitive helper added during this run (`validatePathWithinAllowedRoots`,
which gates whole-machine disk access) now has real coverage of its exploit branches.

## What was done

- **brain #1 — green baseline.** Deleted the `signal-types.test.ts` "Consistency across layers" block that dynamically imported the deleted `sub_MemoryCanvas/lib/constants` (LANE_TYPES/COLORS/LABELS) — 3 guaranteed `Cannot find module` failures that masked the 6 valid enum tests. A breadcrumb comment explains how to recreate it if a canvas returns.
- **annette #1/#2 — dead-feature e2e debris.** Removed `e2e/annette/{annette-chat,annette-tools}.spec.ts` (~15 tests driving a deleted nav item + "Ask Annette…" input) and the cached `test-results/annette-*` artifacts; rewrote `navigation.spec.ts` `OTHER_NAV` to mirror the real `otherNavigationItems` in TopBar (manager/halloffame/reflector/explorer) instead of 7 removed modules, so the navigation/visual-smoke audit can pass again. (Playwright e2e — not in `npm test`, so the vitest baseline is unaffected.)
- **pathSecurity test seed.** 17 assertions covering `validatePathWithinAllowedRoots`, `validateSafeBasePath`, `validateFilePath`, `validatePathTraversal` — the helpers that gate the disk read/write/list APIs. Asserts the real invariants (outside-all-roots rejected, name-prefix sibling can't escape, no-roots rejects, system dirs + traversal + null bytes blocked); paths built with `path.resolve`/`join` for Windows+POSIX stability.
- **annette #3 / social #3 — phantom contexts.** Deleted the 3 context-map entries whose entire file manifests were removed in the slim-down (Annette, Dependencies, Social) via `DELETE /api/contexts` (live DB: 19 → 16, 0 phantoms). Full records backed up to `_deleted-phantom-contexts-backup.json` so they can be re-created. This was an irreversible live-DB mutation, so it was backed up first and is recorded here, separate from the branch code.

## Deferred (logged)

- **Orphaned DB tables** (debt #1: `debt_predictions`/`opportunity_cards`; dependencies #4-area: `security_scans`/`patches`/`prs`) — still created by migrations but have no reader/writer after their features were deleted. Dropping them is a schema migration that must first prove they're truly unused everywhere; lower priority than the map drift, left for a dedicated DB-cleanup pass.
- **Moderate context-map drift** (Brain → `src/lib/brain/*`, Goals → `src/lib/standup/*`, Workspace disk routes) — the surviving contexts have stale file paths. `refresh_context` on those would re-sync them; not destructive, but out of this wave's scope.

## Cumulative status (Waves 1–5)

- **Closed: 16 Critical + 14 High + cleanup** (33 fix/cleanup commits + 5 wave docs).
- **Test suite: 547/550 (red) → 564/564 (green)**, +17 new security assertions. tsc source 0 throughout.
- **Live map: 19 → 16 contexts** (phantoms removed).
- **Deferred (logged, with rationale):** remote #1 (auth decision), scan-queue #3 abort-propagation, taskrunner #3 abort-reconcile (FE), taskrunner #4 global backoff, orphaned DB tables, moderate context refresh.
- Remaining per INDEX: ~34 High, ~28 Medium, 2 Low.
</content>
