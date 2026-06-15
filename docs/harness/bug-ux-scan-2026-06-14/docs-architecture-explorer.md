# Docs & Architecture Explorer — bug-hunter + ui-perfectionist scan

> Context: Docs & Architecture Explorer
> Total: 5 findings (Critical: 1, High: 2, Medium: 1, Low: 1)

## 1. X-Ray mode is entirely disconnected from its data store — permanent "success theater"
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: silent-failure / dead-wiring
- **File**: src/app/features/Docs/sub_DocsAnalysis/DocsAnalysisLayout.tsx:181 (and src/stores/xrayStore.ts:256, src/lib/xrayInstrumentation.ts:47)
- **Scenario**: User clicks the X-Ray toggle at system level. `handleToggleXRay` calls `startXRaySimulation('medium')`, which generates synthetic events into the module-level `xrayEventBuffer` in `xrayInstrumentation.ts` and notifies `xraySubscribers`. But the UI (`XRaySystemMap`, `XRayHotPathsPanel`) reads exclusively from `useXRayStore` via `useXRayEdges/useXRayLayers/useXRayHotPaths/useXRayIsConnected`. Nothing in the entire repo ever calls the store's `connect()`, `toggleEnabled()`, or `addEvent()`, and nothing calls `subscribeToXRayEvents()` to bridge the instrumentation buffer into the store. Verified by grep: `subscribeToXRayEvents`/`getRecentXRayEvents` have zero external callers; `connect()` is only referenced inside the store itself.
- **Root cause**: Two parallel, never-joined event pipelines — an in-memory instrumentation buffer (producer) and a Zustand store fed only by an SSE connection (consumer) that is never opened. The toggle starts the producer but never starts the consumer.
- **Impact**: The flagship X-Ray feature is fully non-functional. Connection lines never pulse, no traffic particles, every node badge is absent, the Hot Paths panel permanently shows "No traffic yet" and the header reads "Disconnected", and `eventCount={xrayEvents.length}` stays 0. The feature looks live (scan-line animation runs) but conveys no real data.
- **Fix sketch**: In `handleToggleXRay`, call `useXRayStore.getState().connect()` (to open the SSE stream) when enabling, and `disconnect()` when disabling; OR add a bridge `useEffect` that does `subscribeToXRayEvents(e => useXRayStore.getState().addEvent(mapToTraceEvent(e)))` so the simulation buffer feeds the store. Also set `isConnected` true once the producer is running.

## 2. X-Ray edge IDs never match between event producer and map, so no connection ever lights up
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: state-mismatch / event-keying
- **File**: src/app/features/Docs/sub_XRay/XRaySystemMap.tsx:644 (createEdgeId lookup) vs src/stores/xrayStore.ts:146 (createEdgeId write)
- **Scenario**: Even if finding #1 is fixed, edge stats still won't render. `createEdgeId(source,target)` is **directional** (`` `${source}->${target}` ``, xrayTypes.ts:135). The store builds edges from event `sourceLayer→targetLayer`; all simulated events hardcode `sourceLayer: 'pages'` (xrayInstrumentation.ts:214), producing keys like `pages->client`, `pages->server`. But `XRaySystemMap` looks up `getConnectionXRayData(conn.fromLayer, conn.toLayer)` where `fromLayer/toLayer` derive from a relationship whose endpoints were ordered by `[module.id, connId].sort()` (line 620) — i.e. by group ID, arbitrary relative to layer. A client↔server relationship yields lookup `createEdgeId('client','server')` = `client->server`, which never matches any `pages->*` event edge. Result: `trafficIntensity`/`avgLatency`/`hasErrors` are always 0/false.
- **Root cause**: Directed edge keys consumed with an undirected, ID-sorted orientation; producer and consumer disagree on direction, and the producer's source layer is a constant unrelated to the actual group layers.
- **Impact**: All connection lines render in the cold/idle state regardless of real traffic; latency labels and error coloring never appear. The map's core value proposition silently degrades to a static diagram.
- **Fix sketch**: Look up both directions (`edges[createEdgeId(a,b)] ?? edges[createEdgeId(b,a)]`) or store undirected keys (sorted layer pair). Independently, derive `sourceLayer` from the real caller layer instead of a hardcoded `'pages'`.

## 3. Layer rows overflow and nodes overlap badly when a layer has many groups
- **Severity**: High
- **Lens**: ui-perfectionist
- **Category**: graph-layout / overflow
- **File**: src/app/features/Docs/sub_DocsAnalysis/components/SystemMap/helpers.ts:109 (and mirrored in XRaySystemMap.tsx:158)
- **Scenario**: `nodeSpacing = Math.min(18, maxSpread / (count - 1))` with `maxSpread = 60` (percent units). With ~15+ groups in one layer (e.g. many `client` context groups — and note any group lacking a `type` defaults to `'client'`, helpers.ts:51, concentrating nodes), spacing collapses: 20 nodes → 60/19 ≈ 3.15% horizontal gap. Each node card is `w-24` (96px) wide. On a ~1200px map that's ~38px of spacing for a 96px node — heavy overlap, with connection/count badges (`-top-2 -left-2`/`-right-2`) stacking illegibly. There is no horizontal scroll or wrapping; nodes also crowd toward the `centerX = 55` band and can clip the left labels.
- **Root cause**: Single-row layout with a fixed percentage spread and no minimum spacing / wrapping / virtualization for high node counts; the empty-state guard only handles `length === 0`, not the over-full case.
- **Impact**: For any real project with a dozen-plus groups in a layer, the system map becomes an unreadable pile of overlapping cards — the primary visualization fails exactly when the architecture is large enough to need it.
- **Fix sketch**: Enforce a minimum spacing and wrap into sub-rows (or shrink node size / enable horizontal pan) when `count` exceeds the row capacity; cap nodes-per-row and stagger `rowY` for overflow.

## 4. Impact simulator's import/test analysis self-excludes by comparing a context ID to a file path
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: static-analysis-correctness
- **File**: src/app/features/Docs/sub_DocsAnalysis/lib/impactSimulator/staticAnalyzer.ts:70
- **Scenario**: `analyzeImportPatterns` tries to exclude the moved context's own files via `allContexts.filter(ctx => ctx.id !== contextFiles[0])`. But `contextFiles[0]` is a **file path** (e.g. `src/app/.../index.tsx`), while `ctx.id` is a context **ID** (e.g. a UUID). They never equal, so the filter excludes nothing — the moved context's own files are included in `otherFiles` and the analyzer reports the context "importing itself," inflating import-path-change counts. The same module-equality heuristic (`getModuleFromPath` returning the first path segment) also over-matches every file under the same top-level feature.
- **Root cause**: Type confusion between context identity and file-path identity; an ID-vs-path comparison that is structurally always false, plus a coarse module heuristic.
- **Impact**: Predicted import changes, refactor effort, complexity tier, and risk level (staticAnalyzer.ts:249) are systematically over-estimated, and the `ImpactAnalysisPanel` shows misleading "X Import Path Changes" and inflated estimated hours. Predictions, not crashes, but they drive a "Proceed Anyway / Apply Move" decision.
- **Fix sketch**: Exclude by the actual moved file set (`contextFiles.includes(otherFile)` / compare against `context.id` using the context object, not `contextFiles[0]`); de-duplicate and tighten the module match to full directory prefixes.

## 5. Hot Paths traffic bar can divide by zero / NaN width on the top row
- **Severity**: Low
- **Lens**: ui-perfectionist
- **Category**: edge-case / render-polish
- **File**: src/app/features/Docs/sub_XRay/XRayHotPathsPanel.tsx:186
- **Scenario**: The intensity bar width is `Math.min(100, (path.requestCount / hotPaths[0].requestCount) * 100)`. If `hotPaths[0].requestCount` is 0 (a path recorded with zero count, or a transient store state), this is `0/0 = NaN`, and `width: 'NaN%'` makes the bar disappear / animate oddly. Combined with finding #1, hotPaths is normally empty so this hides, but once data flows a zero-count head row yields a broken bar. Minor visual glitch, not a crash.
- **Root cause**: Assumes the first (sorted) hot path always has a positive request count and uses it as an unchecked denominator.
- **Impact**: Intermittent broken/blank intensity bars on the busiest-looking row, undermining trust in the panel.
- **Fix sketch**: Guard the denominator: `const max = hotPaths[0]?.requestCount || 1; width = Math.min(100, (path.requestCount / max) * 100)`.
