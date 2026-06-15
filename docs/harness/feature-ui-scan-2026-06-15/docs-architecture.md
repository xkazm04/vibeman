# Docs & Architecture Explorer — Feature + UI Scan
> Context: Docs & Architecture Explorer | Group: Data & Infrastructure
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (3f feature / 2ui ui) | Priority: 0crit/3high/2med/0low
> Files read: ~14

All manifest files for this context exist on disk (no drift). The 2026-06-13 slim-down did not touch the Docs/X-Ray modules; every path in `_contexts.json` for `ctx_1770495765412_1x8v0jt` resolved.

## 1. X-Ray "real-time data flow" renders only synthetic demo traffic — the real SSE/SQLite pipeline is built but dead
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/features/Docs/sub_DocsAnalysis/DocsAnalysisLayout.tsx:191-199; src/lib/xrayInstrumentation.ts:180-218; src/stores/xrayStore.ts:257-298 (connect); src/app/api/xray/stream/route.ts:92-164
- **Current state**: Enabling X-Ray mode calls `startXRaySimulation('medium')` (DocsAnalysisLayout.tsx:199) and bridges `getRecentXRayEvents()` from the in-memory demo buffer into the store. `xrayStore.connect()` — the EventSource consumer of the real `/api/xray/stream` SSE feed backed by the persisted `obs_xray_events` table — is only ever called from `toggleEnabled`/reconnect (xrayStore.ts:95,288), which the Docs UI never invokes. So the entire real pipeline (`withObservability` middleware → `xrayRepository.logEvent` → SSE) exists but is unreachable; users see random fabricated request counts/latencies, not their app's actual traffic.
- **Opportunity**: Wire `handleToggleXRay` to call `useXRayStore.getState().connect()` (consuming the real SSE stream) instead of `startXRaySimulation`. Keep the synthetic generator behind an explicit "Demo data" toggle for empty projects.
- **Value**: Turns a flagship "deep codebase understanding" feature from a decorative animation into a genuine observability tool — real hot paths, real per-context/per-layer latency and error rates, which Vibeman already persists and can act on.
- **Effort**: 3
- **Implementation sketch**: In `handleToggleXRay`, replace the demo bridge with `store.connect()`; on disable call `store.disconnect()`. Gate `startXRaySimulation` + the buffer bridge behind a small "Use demo data" switch in `XRayModeToggle`. Default to real stream when `xrayRepository.count() > 0`.

## 2. Impact Simulator computes a full refactor plan, then "Apply Move" throws it away (only moves the DB row)
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/features/Docs/sub_ImpactSimulator/SimulationSystemMap.tsx:278-289 (handleConfirmMove); src/app/features/Docs/sub_DocsAnalysis/DocsAnalysisLayout.tsx:150-160 (handleMoveContext → moveContext); src/app/features/Docs/sub_DocsAnalysis/lib/impactSimulator/staticAnalyzer.ts:455-494
- **Current state**: The analyzer produces `importPathChanges`, `testBreakages`, and recommendations, all shown in `ImpactAnalysisPanel`. But "Apply Move" → `handleConfirmMove` only calls `onMoveContext(contextId, targetGroupId)`, which is `contextStore.moveContext` — a metadata reassignment of which group a context belongs to. None of the predicted import rewrites or test fixes are executed or even queued. The user is left to do every change by hand after being told exactly what they are.
- **Opportunity**: When the user confirms a move, generate a Claude Code requirement/task from the analysis result (the move + its `importPathChanges` + "run full test suite" recommendation) so Vibeman's existing execution engine performs the refactor autonomously.
- **Value**: Closes the loop from "predict impact" to "execute refactor", which is the core autonomous-dev value proposition. Today the simulator is analysis-only; this makes architectural reorganization a one-click automated operation.
- **Effort**: 4
- **Implementation sketch**: Add an optional "Apply with Claude Code" branch in `handleConfirmMove` that POSTs to `/api/claude-code/requirement` (or batch-requirements) with a generated prompt embedding `proposedMove` + `result.importPathChanges`; keep the plain metadata move as the default. Surface the resulting task id via a toast.

## 3. Level-3 ContextDocumentation "No Description" empty state is a dead end despite context-generation existing
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: functionality
- **File(s)**: src/app/features/Docs/sub_DocsAnalysis/components/ContextDocumentation/index.tsx:195-212
- **Current state**: When a context has no `description`, the view shows a `FileText` icon and the text "Add a description to see it rendered here" — but there is no button or affordance to actually add/generate one. The user has to leave the Explorer, find the context elsewhere, and edit it. Vibeman already has a context-generation pipeline (`/api/context-generation/execute`, `useContextGenerationStream`) that produces exactly these descriptions.
- **Opportunity**: Make the empty state actionable: a "Generate documentation" button that triggers context-generation for this single context and streams the result into the `MarkdownViewer` in place.
- **Value**: Eliminates a manual, multi-screen detour and drives adoption of the docs feature — every context becomes self-documenting from the place users actually read docs.
- **Effort**: 3
- **Implementation sketch**: Add a primary button in the empty-state block (line 205) wired to the existing `useContextGenerationStream` hook scoped to `context.id`; on stream completion, invalidate the docs-analysis query so `context.description` refreshes and renders.

## 4. X-Ray GET endpoint computes filtered events then discards them, returning unfiltered data
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: functionality
- **File(s)**: src/app/api/xray/route.ts:22-31
- **Current state**: `handleGet` reads `contextId`/`contextGroupId`/`since`/`limit`, calls `xrayRepository.getFiltered({...})` into `dbEvents` — and then never uses `dbEvents`. The response is built from `getRecentEventsFromDb(limit)` (xray/route.ts:31), which ignores `contextId`/`contextGroupId` entirely. Any caller filtering X-Ray traffic by a specific context or group silently gets global, unfiltered results.
- **Opportunity**: Return the filtered set: map `dbEvents` through `dbEventToXRayEvent` (or have `getFiltered` join context details like `getWithContextDetails`) so the `contextId`/`contextGroupId` query params actually scope the response.
- **Value**: Makes per-context X-Ray inspection (the natural drill-down from a module node) correct, unblocking finding #1's most useful view — "show me only traffic touching this context."
- **Effort**: 2
- **Implementation sketch**: Replace `const events = getRecentEventsFromDb(limit)` with a mapping over `dbEvents`; add a `getFilteredWithContextDetails` variant to the repo if context names are needed, or drop the redundant `getFiltered` call when no filters are present.

## 5. Layer color/identity is re-hardcoded in every X-Ray/SystemMap component instead of using the canonical LAYER_CONFIG token
- **Lens**: 🎨 ui-perfectionist
- **Priority**: high
- **Category**: maintenance
- **File(s)**: src/app/features/Docs/sub_DocsAnalysis/components/SystemMap/types.ts:48-73 (canonical `LAYER_CONFIG`); src/app/features/Docs/sub_XRay/XRayHotPathsPanel.tsx:208-227 (inline `colors` map); plus duplicate layer-color maps in XRaySystemMap.tsx, SystemMap/helpers.ts, SystemMap/index.tsx, ContextDocumentation/FilePathChip.tsx
- **Current state**: `LAYER_CONFIG` already defines the authoritative palette (pages=#f472b6 pink, client=#06b6d4 cyan, server=#f59e0b amber, external=#8b5cf6 violet) with gradients. Yet `XRayHotPathsPanel` redefines `{ pages:{text-pink-400,bg-pink-500/20}, client:{cyan}, ... }` inline (lines 210-215), and at least 4 other Docs files repeat the same pages→pink / server→amber mapping as ad-hoc Tailwind strings. The two representations (hex vs Tailwind class) can and will drift, so the same logical layer can appear in subtly different shades across the three zoom levels — undermining the layer-as-color visual language the whole Explorer relies on.
- **Opportunity**: Extend `LAYER_CONFIG` with `textClass`/`bgClass` (or a `getLayerStyle(layer)` helper) and have every Docs component consume it, removing the inline maps.
- **Value**: Guarantees a single, consistent layer color identity across SystemMap, ModuleExplorer, ContextDocumentation, and X-Ray — so "amber = server" reads the same everywhere, improving the at-a-glance legibility that is the point of the color-coded architecture map.
- **Effort**: 2
- **Implementation sketch**: Add `textClass`/`bgClass` fields to each entry in `LAYER_CONFIG` (types.ts:48); export a `getLayerStyle(layer: ModuleLayer)` helper; replace the inline `colors` object in XRayHotPathsPanel.tsx:210 and the equivalents in the other 4 files with that helper.
