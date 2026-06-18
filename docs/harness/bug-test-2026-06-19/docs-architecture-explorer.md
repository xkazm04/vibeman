# Docs & Architecture Explorer — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495765412_1x8v0jt
> Group: Data & Infrastructure
> Files read: ~12
> Total: 5 (Critical: 1, High: 3, Medium: 1, Low: 0)

## 1. X-Ray GET silently ignores contextId/contextGroupId filters (filtered query is dead code)
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: silent-failure / wrong-data
- **File**: src/app/api/xray/route.ts:23-31
- **Scenario**: Call `GET /api/xray?contextId=ctx_abc`. The handler computes `const dbEvents = xrayRepository.getFiltered({ context_id, context_group_id, since, limit })` (line 23) — correctly filtered — then **never uses `dbEvents`**. It immediately overwrites the response payload with `const events = getRecentEventsFromDb(limit)` (line 31), which runs `getWithContextDetails(limit)` with **no filter at all** (xray.repository.ts:199-219). The API returns the most-recent N events across *all* contexts regardless of the `contextId`/`contextGroupId` query params. Likewise `getStats(since)` / `getLayerTraffic(since)` (lines 34-35) take only `since` — the context filters are dropped, so `stats.byContext`, `errorRate`, `avgLatency` are computed over the whole table, not the requested context.
- **Root cause**: Refactor left the filtered path (`getFiltered`) wired but the response was switched to the context-detail join helper, which has no filter parameter; nobody reconciled the two. Assumption that "the events variable is the filtered result" is false.
- **Impact**: Any per-context X-Ray panel (e.g. a context-scoped traffic/hot-path view) shows global traffic — the central promise of "deep codebase understanding" / per-context observability is wrong. Misleads users about which context is hot or erroring. `dbEvents` is also a lint/dead-code smell that masks the regression.
- **Fix sketch**: Add a context-detail filtered query (`getFilteredWithContextDetails(filters)`) or have `getRecentEventsFromDb` accept filters; return that instead of the unfiltered helper. Thread `contextId`/`contextGroupId` into `getStats`/`getLayerTraffic` (extend their `WHERE` builders like `getFiltered` does).
- **Value**: effort 4 / impact 9 / risk 3

## 2. POST persists wrong target_layer — client/pages traffic recorded as "server"
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: data-corruption / wrong-aggregation
- **File**: src/app/api/xray/route.ts:86-101 (line 95)
- **Scenario**: POST a path that `getLayerFromPath` classifies as `client` or `pages` (e.g. `/api/contexts` → `client`, an `/onboarding` page → `pages`). The computed `targetLayer` is correct, but the DB write does `target_layer: targetLayer === 'external' ? 'external' : 'server'` (line 95), collapsing every non-external layer to `'server'`. The SSE event object keeps the real `targetLayer` (line 113), so the live view and the persisted row **disagree**. `getStats.by_layer` and `getLayerTraffic` (xray.repository.ts:250-256, 349-360) group by the corrupted `target_layer`, so client/pages buckets are permanently undercounted and "server" is inflated.
- **Root cause**: `DbXRayEvent.target_layer` is typed `'server' | 'external'` (repository line 13), so the author hard-narrowed to satisfy the type instead of widening the column/type to the real 4-layer domain. The schema, not the data, is wrong.
- **Impact**: Layer-traffic visualization and the SystemMap layer rows are systematically wrong after any traffic flows through POST/middleware; "X-Ray hot paths by layer" mislabels every client/page route as server.
- **Fix sketch**: Widen `target_layer` to `'pages'|'client'|'server'|'external'` in the model + migration, and persist the real `targetLayer` (`target_layer: targetLayer`). Backfill or accept historical skew.
- **Value**: effort 4 / impact 7 / risk 4

## 3. Zero tests for impact static analyzer — wrong "safe to refactor" verdicts ship unguarded
- **Severity**: High
- **Lens**: test-mastery
- **Category**: missing-coverage / blast-radius
- **File**: src/app/features/Docs/sub_DocsAnalysis/lib/impactSimulator/staticAnalyzer.ts:60-188 (no `*.test.ts` exists — glob `src/app/features/Docs/**/*.{test,spec}` returns nothing)
- **Scenario**: `analyzeContextMoveImpact` drives risk/effort/warnings shown to a user about to move a context between groups. Its core heuristics are untested: `analyzeImportPatterns` predicts a coupling edge for *every pair of files sharing a `features/<x>` segment* (line 87) — false positives inflate `importPathChanges`, which feed `calculateEffortSummary` risk tiers (line 254-262) and the `critical`/`high` warnings (line 375). `getModuleFromPath` regex (line 43-55) returns `null` for files outside `features/|app/|components/`, silently dropping them from impact. None of this has an assertion anchored to a known import graph.
- **Root cause**: Heuristic-as-truth: path-substring matching is treated as a dependency graph, but there are no test fixtures pinning expected impact sets, so a regression in the heuristic (or the comment-documented prior `ctx.id`-vs-path bug at line 70-76) re-surfaces invisibly.
- **Impact**: A wrong impact set tells a user a risky cross-layer move is "trivial/low" (or vice-versa) — exactly the misleading-refactor-guidance this tool exists to prevent. Highest blast radius because output is advisory for destructive moves.
- **Fix sketch**: Add a fixture table (small Context[]/ContextGroup[] with a known import topology) and assert: import-change count, that moved files never "import themselves", `riskLevel` tier boundaries, and layer-change warning emission. LLM-generatable batch anchored to impact-set correctness.
- **Value**: effort 5 / impact 8 / risk 2

## 4. SSE stream: enqueue races the controller close (heartbeat + late callback after cancel)
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: stream / unhandled-throw
- **File**: src/app/api/xray/stream/route.ts:62-68, 123-147
- **Scenario**: `addXRayEvent` (line 62-68) iterates `subscribers` synchronously and calls each `callback` (line 67). The per-connection `callback` (line 123) guards with `if (cleaned) return` and a try/catch, which is good — but `cleanup()` is only invoked on the connection's *own* abort/cancel/heartbeat path. If the `ReadableStream` controller is torn down by the runtime (client gone) **before** `request.signal` fires `abort`, `cleaned` is still `false`, so a concurrent `addXRayEvent` calls `controller.enqueue` on a closed controller. The try/catch catches the throw and calls `cleanup()` — acceptable — but the heartbeat `setInterval` (line 137) and any in-flight `forEach` callbacks for *other* subscribers continue; on a burst, every notify does a throw/catch per dead subscriber. There is no removal of the subscriber until its own enqueue throws, so a wedged callback can be invoked many times.
- **Root cause**: Subscriber liveness is inferred lazily (only discovered when enqueue throws) rather than driven by a single authoritative close signal; `cleaned` is per-closure, not checked by the broadcaster.
- **Impact**: Under reconnect churn (the store auto-reconnects every 5s, xrayStore.ts:283-291) dead subscribers accumulate between abort events; each event broadcast pays a throw/catch per stale subscriber — latency + log noise; in the worst case a stale closure holds a reference preventing GC.
- **Fix sketch**: In the broadcaster, wrap each callback and on throw `subscribers.delete(callback)` immediately; or have `callback` self-remove from `subscribers` inside its catch (it already calls `cleanup`, but `cleanup` only deletes its own callback — ensure the broadcast loop tolerates mutation, e.g. iterate a copy).
- **Value**: effort 3 / impact 6 / risk 4

## 5. xrayStore per-layer hotPaths uses only the newest event's path, not the busiest
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: wrong-aggregation / success-theater
- **File**: src/stores/xrayStore.ts:212-220
- **Scenario**: `updateStats` builds each layer's `hotPaths` by taking the top-3 edges by `requestCount`, then mapping each edge to `e.recentEvents[0]?.path` (line 219) — i.e. the *single most recent* event's path on that edge. An edge aggregates many paths (all traffic between two layers), so the reported "hot path" is whatever arrived last, not the most-requested route. The path may flap on every event while the genuine hottest route is never shown. (The global `hotPaths` block at line 233-251 *does* count per-path correctly, so the per-layer list is inconsistent with the global one.)
- **Root cause**: Edge stats are keyed by layer-pair, not by path; the code reuses an edge as a proxy for a path and grabs an arbitrary representative.
- **Impact**: The per-layer "hot paths" surfaced in `XRayLayerStats.hotPaths` are misleading/unstable; users optimizing the "hottest" route may chase the wrong endpoint. Lower severity because the prominent panel reads the correct global `hotPaths`.
- **Fix sketch**: Compute per-layer hot paths by filtering `recentEvents` to that layer and reusing the same path-count aggregation as the global block (group by `event.path`, sort by count), rather than `recentEvents[0]?.path`.
- **Value**: effort 3 / impact 4 / risk 2
