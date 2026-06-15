# Feature+UI Scan — Fix Wave 3: Surface Built Backends in the UI

> 6 findings closed across 6 commits.
> Baseline preserved: TypeScript 0 → 0 errors; tests 539/542 → 539/542 (same 3 pre-existing failures).

The theme: working backends that were unreachable from the app. Implemented via 6
parallel edit-only subagents (one per module — disjoint file sets), then verified
centrally (tsc + tests) and committed atomically.

## Commits

| # | Commit | Finding | Files |
|---|---|---|---|
| 1 | `fix(manager): wire the dead "Implement with AI"…` | manager #1 | ManagerLayout.tsx, managerService.ts |
| 2 | `fix(goals): render the built-but-dark PredictiveStandup…` | goals #1 (crit) | GoalsLayout.tsx |
| 3 | `feat(context): surface the Context Balance Audit…` | context #1 | ContextLayout.tsx, contextApi.ts, HorizontalContextBarHeader.tsx, ContextAuditPanel.tsx (new) |
| 4 | `feat(reflector): promote actionable AI insights…` | reflector #1 | ExecutiveSummary.tsx |
| 5 | `fix(refactor): add missing /api/refactor routes…` | debt #1 (crit) | api/refactor/{analyze,generate-packages,execute-dsl}/route.ts (new) |
| 6 | `fix(docs): X-Ray consumes the real SSE stream…` | docs #1 | DocsAnalysisLayout.tsx, XRayModeToggle.tsx |

## What was surfaced

1. **Manager "Implement with AI"** — `ManagerLayout` never passed `onTriggerClaudeCode`, so the one-click autonomous-fix button never rendered. Wired a handler that writes the requirement (`createRequirement`, now returning the API-resolved filename + `overwrite`) then starts a session (`executeRequirementAsync`) — the established write-then-execute pattern. User-gated button (rate-limited 5/min), so no autonomous runaway.
2. **PredictiveStandup** (critical) — the fully-built Daily Mission Briefing had zero render sites. Added a third "briefing" toggle (Radar icon) in GoalsLayout. Self-fetching component, so projectId is the only prop.
3. **Context Balance Audit** — `auditContexts()` / `/api/contexts/audit` had no UI consumer. Added an Audit button + `ContextAuditPanel` (findings grouped by severity, totals rollup, group-scoped findings deep-link to the group) + `contextApi.auditProject`.
4. **Reflector promote** — actionable executive insights were a dead-end. Added "Promote to Direction" on each actionable `AIInsightCard` → POST `/api/directions` (pre-filled from title + suggestedAction + evidence, tagged with `analysisId`). Chose Directions over Ideas because `/api/ideas` requires an existing `scan_id` FK.
5. **Refactor routes** (critical) — the store POSTed to `/api/refactor/{generate-packages,execute-dsl}` but `/api/refactor/` didn't exist, so every call 404'd. Added a real `analyze/` bridge (`getScanStrategy → scanProjectFiles → detectOpportunities`) and stub `generate-packages`/`execute-dsl` returning valid empty shapes.
6. **X-Ray real data** — enabling X-Ray only ran `startXRaySimulation`; `xrayStore.connect()` (the real `/api/xray/stream` SSE consumer) was never called. Now defaults to the real stream; the synthetic generator is preserved behind an explicit "demo data" toggle for empty projects.

## Execution method note

This wave used **6 parallel edit-only subagents** (no git/build/stash in subagents — the orchestrator did all verification + commits). Safe because the modules are disjoint. One incidental artifact (`src/lib/refactor/manifest.json`, a generated file whose absolute paths/timestamp got rewritten by the running dev server) was reverted so it didn't pollute the commits.

## Verification table

| Gate | Before | After Wave 3 |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vitest run` | 539/542 (3 pre-existing fail) | 539/542 (same 3) |

## Cumulative status (waves 1–3)

| Wave | Theme | Closed |
|---|---|---|
| 1 | Safety & correctness criticals | 6 |
| 2 | Reconnect inert autonomy engines | 5 |
| 3 | Surface built backends in the UI | 6 |
| **Total** | | **17 / 95** |

## Patterns established (catalogue items 9–10)

9. **Unreachable-from-UI backend** — a working API/component exists but no screen renders or calls it (grep `features/**` for the route/component → zero hits). Distinct from "caller-less capability" (item 6): here the *host UI exists*, it just never wires the prop/button/fetch. Fix is usually small (pass the missing prop, add a toggle/button, add an API-client method) and high-leverage. Smell: an empty state that instructs an action with no control to perform it.
10. **Parallel edit-only fan-out for independent module fixes** — when N fixes touch disjoint modules, dispatch N edit-only subagents (no git/build/stash) and verify+commit centrally. Keeps orchestrator context lean and parallelizes heavy component reading; safe as long as subagents never touch git/the build (the shared-checkout hazard) and file sets don't overlap. Watch for incidental generated-file churn (revert it before committing).

## What remains

- **Wave 4 — Operator visibility & control** (5): TaskRunner cost/token totals, retry/re-run, batch progress + stop control, Ideas scan progress, bulk triage.
- **Wave 5 — UI consistency & design-system** (5).
- **Wave 6 — Headless-slim-down cleanup + context-map integrity** (5).

### Wave-3 follow-ups (deferred)
- **Refactor store wiring**: `/api/refactor/analyze` now exists per the README contract, but no store slice POSTs to it yet (the `startAnalysis` action is declared but unimplemented). Wiring the slice → analyze route is the remaining step to fully revive the refactor wizard.
- **Reflector promote persistence**: the "Promoted" state is per-session (in-memory); persisting promoted-insight IDs across reload needs a small store/schema change.
- Manager #2 (AI-generated proposals), Reflector #2 (cross-project architecture view), Docs #2/#3 (Impact Simulator apply-with-Claude, doc-gen empty state) remain as larger feature follow-ups.
