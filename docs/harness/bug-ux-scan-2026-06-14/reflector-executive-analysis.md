# Reflector & Executive Analysis — bug-hunter + ui-perfectionist scan

> Context: Reflector & Executive Analysis
> Total: 5 findings (Critical: 1, High: 2, Medium: 1, Low: 1)

## 1. `process.cwd()` called in a client component crashes the running-analysis render
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: client-server-boundary
- **File**: src/app/features/reflector/sub_Reflection/components/ExecutiveSummary.tsx:610
- **Scenario**: `ExecutiveSummary` is a `'use client'` component. The moment an analysis enters `running` with prompt content, the JSX block at line 605 renders `<ExecutiveAnalysisTerminal ... projectPath={process.cwd()} />`. In the browser there is no `process.cwd` (and often no `process` at all), so the render throws `TypeError: process.cwd is not a function`, taking down the entire Executive Summary panel via the React error boundary — exactly when the user has just triggered an analysis and wants to watch it.
- **Root cause**: A Node-only API was used to populate a prop in client-rendered JSX; it happens to type-check because `@types/node` is in scope, but it has no runtime meaning in the browser.
- **Impact**: Crash of the panel during the analysis flow; the terminal that's supposed to drive the CLI never mounts, so the analysis can never actually run from the UI.
- **Fix sketch**: Pass a real project path from server data (e.g. the selected project's `path`, already available via `report.filterContext`) or a constant placeholder; never call `process.cwd()` in client code. If `CompactTerminal` truly needs the repo root, surface it through an API/store value resolved server-side.

## 2. Orphaned "running" analyses never recover — poll loops forever and `canAnalyze` stays blocked
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: orphaned-state-lifecycle
- **File**: src/app/db/repositories/executive-analysis.repository.ts:174 (cleanupStale) + src/lib/reflector/executiveAnalysisAgent.ts:143 (startAnalysis) + src/app/features/reflector/sub_Reflection/components/ExecutiveSummary.tsx:482
- **Scenario**: `startAnalysis` flips the row to `running`, then relies on the Claude Code CLI to POST the `[analysisId]/complete` callback. If the CLI crashes, the user closes the tab, or the callback request is lost, the row is stuck at `running` forever. Consequences cascade: (a) `getStatus` returns `isRunning:true` and `canAnalyze:false` (executiveAnalysisAgent.ts:77), so the user can **never start another analysis for that scope** — the trigger button is permanently "Analysis Running...". (b) The 5-second poll `setInterval` in ExecutiveSummary (line 486) never stops because `analysisStatus` never leaves `running`. (c) `cleanupStale` (repository.ts:178) only deletes `status IN ('failed','pending')` — it deliberately excludes `running`, so nothing ever reaps these zombies.
- **Root cause**: The async start/complete handshake has no server-side timeout, heartbeat, or watchdog; liveness depends entirely on an external process that is assumed to always call back.
- **Impact**: Permanent lockout of executive analysis per project/scope; an infinite client poll loop hammering the API every 5s for the life of the tab.
- **Fix sketch**: Add a `started_at`-based staleness sweep that fails `running` rows older than N minutes (extend `cleanupStale` and call it from `getStatus`/`getRunning`), and give the UI a manual "Cancel / reset" affordance that PATCHes `failAnalysis`. Stop the poll after a max number of intervals.

## 3. Architecture analysis is created `pending` but never marked `running` — duplicate-run guard is dead
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: race-condition / broken-guard
- **File**: src/app/api/architecture/analyze/route.ts:55 + src/lib/architecture/analysisAgent.ts:84 + src/app/db/repositories/architecture-analysis.repository.ts:30,91
- **Scenario**: `analyzeWorkspace`/`analyzeNewProject` insert a row with status `'pending'` (repository.ts:30) and return the prompt, but **never call `architectureAnalysisRepository.startAnalysis(...)`** to flip it to `'running'` (that method exists at analysisAgent.ts:144 but is only invoked from the unrelated `cross-task` route). The in-progress guard at the top of `analyzeWorkspace` uses `getRunning(...)` which filters `status = 'running'` (repository.ts:91) — so it **always returns null**. Two users (or a double-click) can both POST `/api/architecture/analyze` for the same workspace; both pass the guard, both build prompts, both eventually `upsertMany` relationships. Likewise, `GET /api/architecture/analyze`'s `isRunning` is always `false` while an analysis is genuinely mid-flight, so the UI shows no running state.
- **Root cause**: The architecture flow skipped the `pending → running` transition that the executive flow performs (executiveAnalysisAgent.ts:143). The guard, the GET status, and the completion-callback's pending/running acceptance were all designed around a `running` state that is never set.
- **Impact**: Concurrent/duplicate architecture analyses with no dedup; misleading "not running" status; cooldown/in-progress protection is effectively absent.
- **Fix sketch**: Call `architectureAnalysisRepository.startAnalysis(analysisId)` immediately after `create(...)` in both `analyzeWorkspace` and `analyzeNewProject` (matching the executive agent), so `getRunning` and the guard work as intended.

## 4. "Ran recently" cooldown rejection is mis-surfaced as a generic thrown error in the store
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: error-mapping
- **File**: src/lib/reflector/executiveAnalysisAgent.ts:110 + src/app/api/reflector/executive-analysis/route.ts:65 + src/stores/reflectorStore.ts:102
- **Scenario**: `startAnalysis` has two rejection paths: an already-running one (returns `{ success:false, analysisId }`) and a cooldown one (`canAnalyze` false → returns `{ success:false }` with **no** `analysisId`, agent line 110). The POST route maps "no analysisId" to `VALIDATION_ERROR` (HTTP 400) with message "Analysis was run recently…". The store's `triggerAnalysis` only special-cases `response.status === 409 && data.analysisId`; for the 400 it falls through to `throw new Error(data.error || 'Failed to trigger analysis')`. So a benign "please wait an hour" cooldown is rendered as a red generic error string, and a legitimately-completed-but-recent analysis looks like a hard failure.
- **Root cause**: A normal business-rule rejection (cooldown) is encoded with the same shape used for true validation failures, and the client only has a branch for the conflict case.
- **Impact**: Confusing/alarming error messaging for an expected throttle condition; no clear "you can retry at HH:MM" UX.
- **Fix sketch**: Give the cooldown its own error code (e.g. `RESOURCE_CONFLICT`/429-style) distinct from validation, and have the store render cooldown rejections as an informational notice rather than an error throw.

## 5. Trigger button's `isLoading`/"Starting…" state is dead code — no feedback during the start request
- **Severity**: Low
- **Lens**: ui-perfectionist
- **Category**: missing-loading-state
- **File**: src/app/features/reflector/sub_Reflection/components/ExecutiveAnalysisTrigger.tsx:31,68 + src/stores/reflectorStore.ts:21,85
- **Scenario**: The button computes `isLoading = analysisStatus === 'pending'` (line 31) and renders a "Starting…" label for it (line 68). But the store never sets `analysisStatus` to `'pending'` — during the POST it sets the separate boolean `isLoading: true` (store line 85) and only moves `analysisStatus` straight to `'running'` on success. So `isLoading` here is permanently `false`: the "Starting…" branch never shows, and while the `triggerAnalysis` fetch is in flight (data gathering + prompt build can take a second or two) the button stays enabled and unchanged, inviting a double-click that fires a second POST.
- **Root cause**: Two parallel "loading" representations (the store's `isLoading` boolean vs. an `analysisStatus === 'pending'` the store never emits) drifted apart; the component reads the wrong one.
- **Impact**: No spinner/disabled state during the start request; possible double-submit; dead UI branch.
- **Fix sketch**: Have the component consume the store's actual `isLoading` boolean (and disable the button on it), or set `analysisStatus: 'pending'` in the store before the fetch so the existing branch lights up.
