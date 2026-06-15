# Bug-Hunter + UI-Perfectionist Scan — Cumulative Fix Summary

> Scan of 2026-06-14 over the 10 live (post-`headless-slim`) contexts of **vibeman**.
> 50 findings (9C / 24H / 13M / 4L). All fixes on branch `vibeman/bug-ux-fixes` (off HEAD), each `git add`
> scoped so the in-progress 708-file refactor stayed uncommitted and separate.

## Outcome (accurate ledger — after Wave 8)

| Status | Count | Severity |
|---|---:|---|
| **Fixed** | **43** | 7C · 19H · 13M · 4L |
| Remaining — WIP-blocked (in `headless-slim` files) | 5 | 5H |
| Remaining — deferred by user decision (remote auth) | 2 | 2C |
| **Total** | **50** | 9C · 24H · 13M · 4L |

**Every clean (non-WIP-blocked) finding is now closed.** The only remaining work is gated on the user's
in-progress `headless-slim` refactor (5 findings) or is the deferred remote auth/ownership design (2 Criticals).

**Note on Criticals:** **7 of 9 fixed.** The 2 open Criticals are remote #1 (no auth) and remote #2
(no ownership), *deferred by the "remote cheap-subset" decision* — not closed. (An earlier draft of the
per-wave reports said "all 9 Criticals closed"; that was wrong and is corrected here.)

Baseline held every wave: **tsc 0 → 0 errors**, **tests 539/542** (the 3 failures are a deleted-Brain-module
import in `signal-types.test.ts`, caused by the refactor — unchanged by this work).

Fix commits: 41 (two pairs shared a file: database #2+#4, ideas #2+#3). Doc commits: 10.

## Waves (what shipped)

| Wave | Theme | Fixed |
|---|---|---:|
| 1 | "Don't report success that didn't happen" | 5 |
| 1b | Remote security (cheap subset: #3/#4/#5) | 3 |
| 2 | Concurrency & double-execution | 4 |
| 3 | Orphaned/zombie lifecycle | 3 |
| 4 | DB integrity | 5 |
| 5 | Computed-data correctness | 3 |
| 6 | UI dead actions / mock data / X-Ray | 6 |
| 7 | Polish | 7 |

Per-wave detail + verification in `FIXES-WAVE-1.md` … `FIXES-WAVE-7.md`.

## ~~Remaining — clean & fixable now~~ → ALL CLOSED in Wave 8

ideas #1, workspace #2/#3, context #4, reflector #4/#5, scan-queue #5 — all fixed. See `FIXES-WAVE-8.md`.

## Remaining — WIP-blocked

In `headless-slim` files (uncommitted); clearable in one pass once that work is committed/stashed:
- context #3 (H) — `batchMoveContexts` CASE-without-ELSE NULLs `group_id` (`context.repository.ts`)
- manager #1 (H) — "Accept with Code" === plain Accept (`DirectionCarousel.tsx`)
- taskrunner #2/#3/#4 (H) — taskId collisions, `git diff HEAD~1` mis-attribution, PID orphan-reaping (`claudeExecutionQueue.ts` + `executionManager.ts`)

## Remaining — deferred by decision

- remote #1/#2 (C) — mesh/fleet have zero auth and no device-ownership model. Needs an API-key-auth +
  ownership design (a project, not a quick fix). The cheap hardening (remote #3/#4/#5) is done.

## Pattern catalogue (20 durable patterns)

1. Exit-code-blind success · 2. Stream-format-aware error detection · 3. Destructive cleanup gated on the
constructive step · 4. PostgREST `.or()` args are a grammar · 5. Client must not write worker-owned state ·
6. Crash recovery needs an age/lease threshold · 7. Two-phase async must mark itself running at phase 1 ·
8. Poll endpoints self-heal zombies · 9. "Active" must mean "alive" · 10. Zero-caller reaper helpers are
dead recovery · 11. SAVEPOINT, never raw BEGIN, for nestable units · 12. Migration status must upsert inside
the txn · 13. Verify observable pragmas · 14. A 404 fetch is a silent no-op · 15. id-vs-path comparisons
never match · 16. Producer + store with no bridge is dead wiring · 17. Directional keys need bidirectional
lookup · 18. `data-testid` selectors silently break · 19. Early `return null` before AnimatePresence defeats
exit animations · 20. Revert optimistic mutations by identity + clamp, not a captured index.
