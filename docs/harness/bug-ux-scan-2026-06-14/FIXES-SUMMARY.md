# Bug-Hunter + UI-Perfectionist Scan — Cumulative Fix Summary

> Scan of 2026-06-14 over the 10 live (post-`headless-slim`) contexts of **vibeman**.
> 50 findings (9C / 24H / 13M / 4L). All fixes on branch `vibeman/bug-ux-fixes` (off HEAD), each `git add`
> scoped so the in-progress 708-file refactor stayed uncommitted and separate.

## Outcome (accurate ledger — final, after WIP-cleared)

| Status | Count | Severity |
|---|---:|---|
| **Fixed** | **48** | 7C · 24H · 13M · 4L |
| Remaining — deferred by user decision (remote auth) | 2 | 2C |
| **Total** | **50** | 9C · 24H · 13M · 4L |

**48 of 50 findings fixed.** The user committed the `headless-slim` refactor (`3f81b889`), which unblocked
the 5 previously WIP-blocked findings (context #3, manager #1, taskrunner #2/#3/#4) — all now fixed
(see `FIXES-WIP-CLEARED.md`). The only remaining work is the deferred remote auth/ownership design
(remote #1/#2, 2 Criticals) — needs an auth design, not a quick fix.

**Note on Criticals:** **7 of 9 fixed.** The 2 open Criticals are remote #1 (no auth) and remote #2
(no ownership), *deferred by the "remote cheap-subset" decision* — not closed. (An earlier draft of the
per-wave reports said "all 9 Criticals closed"; that was wrong and is corrected here.)

Baseline held every wave: **tsc 0 → 0 errors**, **tests 539/542** (the 3 failures are a deleted-Brain-module
import in `signal-types.test.ts`, caused by the refactor — unchanged by this work).

Fix commits: 41 (two pairs shared a file: database #2+#4, ideas #2+#3). Doc commits: 8. Total: 49.

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

## ~~Remaining — WIP-blocked~~ → ALL CLOSED (after refactor committed)

context #3, manager #1, taskrunner #2/#3/#4 — all fixed once the `headless-slim` refactor was committed
(`3f81b889`). See `FIXES-WIP-CLEARED.md`.

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
