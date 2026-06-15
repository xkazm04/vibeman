# Bug-UX Scan — Fix Wave 8 — The missed clean findings

> 7 commits, 7 findings closed — the findings that fell through the gaps of the Waves 1-7 plan.
> Branch: `vibeman/bug-ux-fixes`. Baseline preserved: tsc 0 → 0; tests 539/542 (same 3 deleted-Brain failures).
> With this wave, **every clean (non-WIP-blocked) finding is now closed.**

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `32d0856f` | workspace #2 — observability ingest unvalidated | High | `api/observability/register/route.ts` |
| 2 | `58c27621` | workspace #3 — git branches exec DoS | High | `api/git/branches/route.ts` |
| 3 | `2d21d517` | ideas #1 — lifecycle singleton cross-project bleed | High | `lifecycleOrchestrator.ts`, `api/lifecycle/route.ts`, `LifecycleDashboard.tsx` |
| 4 | `ecac1b10` | context #4 — drag-end `setTimeout(0)` race | Medium | `Context/ContextLayout.tsx` |
| 5 | `032692c7` | scan-queue #5 — file-watch notification FK violation | Medium | `lib/fileWatcher.ts` |
| 6 | `3ad2b971` | reflector #4 — cooldown mis-surfaced as error | Medium | `BaseAnalysisAgent.ts`, `executiveAnalysisAgent.ts`, `executive-analysis/route.ts`, `reflectorStore.ts` |
| 7 | `dfdc5af4` | reflector #5 — dead trigger loading state | Low | `ExecutiveAnalysisTrigger.tsx` |

## What was fixed

1. **Observability ingest is validated.** The unauthenticated `/register` endpoint blind-cast numbers and timestamps from external callers straight into `obs_api_calls`, corrupting `AVG()`/hour-bucket aggregation (a non-numeric `response_time_ms`, negative size, or far-future `called_at`) and bloating the DB (unbounded batch). Numeric fields are now coerced to finite non-negative values, `status_code` to 100-599, `called_at` to a valid non-future ISO timestamp; batches capped at 500. *(Auth/ownership remains a separate gap, like remote.)*
2. **git branches route can't DoS the dev server.** It fanned out 2 shelled-out `exec` per project via `Promise.all` (60-100+ processes for a large workspace). Now `execFile` (no shell), a concurrency pool of 8, and a 500-project request cap.
3. **Lifecycle orchestrator is project-scoped.** The process-global singleton clobbered one project's running config when another's dashboard opened, and the unfiltered GET showed the wrong project's cycle. `initialize` now refuses to re-init for a different project while one is running (409); GET takes a `projectId` and returns an idle view when it doesn't match the active project; the dashboard passes its `projectId`. *(Full concurrent multi-project support needs a per-project instance map — larger.)*
4. **Drag moves flush synchronously.** Removed the `setTimeout(0)` whose only effect was a race window where a second drag or `removeGroup` could mutate the queue before the deferred flush, dropping moves.
5. **File-watch notification reaches the user.** `scan_notifications.queue_item_id` is a NOT NULL FK; the literal `'file-watch-trigger'` violated it and the swallowed throw meant no "N scan(s) queued" toast. Now tied to a real queue item id.
6. **Cooldown is a throttle, not an error.** A "ran recently" cooldown now flags the result, returns HTTP 429, and the store surfaces clear guidance instead of rethrowing a generic red error.
7. **Trigger button shows its loading state.** Wired to the store's real `isLoading` flag (the old `analysisStatus === 'pending'` was never set), so the button disables + shows "Starting…" during the request — closing the double-submit window.

## Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | 0 errors (unchanged) |
| Tests | 539/542 (same 3 deleted-Brain import failures; no regression) |
| ESLint (changed files) | 0 new (ContextLayout has 6 pre-existing React-Compiler `Compilation Skipped` errors on untouched useCallbacks — identical count on HEAD, verified) |
| WIP safety | working tree back to 708; only my 12 files touched |

## Patterns established (catalogue items 21–23)

21. **Unauthenticated ingest must coerce, not cast.** External numbers/timestamps feeding aggregates (`AVG`, time buckets) need range/finite/parse validation, or one poisoned row skews every derived stat — and bound the batch. (workspace #2)
22. **Fan-out over a user-sized list needs a concurrency bound + a count cap, and `execFile` over `exec`.** `Promise.all(list.map(spawn))` is a self-inflicted DoS at scale. (workspace #3)
23. **A process-global singleton serving multiple tenants leaks state.** Scope reads by tenant id and refuse to clobber an active tenant; true concurrency needs a per-tenant instance. (ideas #1)

## Status

**All clean findings are now closed (43 fixed total).** Remaining (both genuinely blocked):
- **WIP-blocked (5):** context #3, manager #1, taskrunner #2/#3/#4 — in `headless-slim` files. Clearable in one pass once that work is committed/stashed.
- **Deferred by decision (2 Criticals):** remote #1/#2 — auth + device-ownership design.
