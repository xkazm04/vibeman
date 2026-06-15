# Feature+UI Scan — Fix Wave 4: Operator Visibility & Control

> 5 findings closed across 5 commits (TaskRunner ×3 findings, Ideas ×3 findings — committed as 5 atomic commits).
> Baseline: TypeScript 0 → 0 errors. Tests: see verification table.

Theme: an autonomous executor must be observable and stoppable. These fixes give
the user live cost, progress, retry, cancel, and kill controls over running work.

Executed via 2 module-scoped subagents (TaskRunner, Ideas — one owns each module to
avoid intra-module file collisions), verified centrally, committed atomically.

## Commits

| # | Commit | Findings | Files |
|---|---|---|---|
| 1 | `feat(taskrunner): one-click retry/run-again…` | TR #2 | TaskItem.tsx, KanbanTaskCard.tsx, lib/retryTask.ts (new) |
| 2 | `feat(taskrunner): live cost totals, batch progress, stop control` | TR #1, #3, #5 | manualSession.types.ts, manualSessionStore.ts, CLISessionModal.tsx, SessionSidebar.tsx, TaskRunnerHeader.tsx, BatchProgressBar.tsx (new) |
| 3 | `feat(ideas): live scan progress + cancel…` | ideas #1 | ideaExecutor.ts, ScanInitiator.tsx |
| 4 | `feat(ideas): per-column bulk "Queue all" triage…` | ideas #2 | BufferView.tsx, BufferColumn.tsx |
| 5 | `fix(ideas): show numeric effort/impact scores…` | ideas #5 | BufferItem.tsx |

## What was added

- **TaskRunner cost totals** — `cost_usd`/`duration_ms`/tokens/`turnCount` were parsed per turn then discarded. Now accumulated into the `ManualSession` record and shown as a running `$` total in the CLISessionModal header, a `$` chip on SessionSidebar cards, and a batch total in TaskRunnerHeader. (Cost is the #1 anxiety for an autonomous orchestrator.)
- **TaskRunner retry/run-again** — single-click re-queue of a failed/completed requirement via `POST /api/claude-code/execute` (async), replacing the reset→reselect→batch dance. Context-menu item + inline Kanban-card button.
- **TaskRunner batch progress** — a header progress bar + ETA (from mean completed-task duration) while a batch runs.
- **TaskRunner stop control** — a Stop button on running session cards that aborts the Claude process (Tauri/HTTP) and clears the session, with a mid-flight confirm. The safety counterpart to cost visibility.
- **Ideas scan progress + cancel** — the 20–60-fetch multi-agent scan loop ran behind one boolean spinner. Added an `onProgress(done,total,label,status)` callback + AbortController signal; ScanInitiator now shows a progress bar, an "agent × context" ticker, an error count, and a Cancel button.
- **Ideas bulk triage** — per-column "Queue all" in the Buffer view (the default triage surface), accepting pending ideas via `/api/tinder/actions` then invalidating — closing the N-clicks-to-1 gap vs Tinder.
- **Ideas effort/impact badges** — numeric 1–10 scores now render beside the icons in band color (were hidden in a hover title), making cards rankable at a glance.

## Notable adaptations (flagged by subagents, reviewed & accepted)

- **Batch progress source**: `useRequirements`' `isRunning`/`processedCount` are never actually set by the batch system, so `BatchProgressBar` is driven primarily off the live CLI-session queues (header counters as fallback). More accurate than the literal sketch.
- **Cost chip scope**: automated sessions use a separate store without cost tracking, so the `$` chip is manual-session-only (that's where the data exists).
- **Bulk triage endpoint**: used `/api/tinder/actions` per-idea (scoped to the column), NOT `/api/tinder/accept-all` (which accepts ALL pending project ideas — wrong scope for a per-column action).
- An incidental `src/lib/refactor/manifest.json` regeneration (dev-server artifact) was reverted, as in Wave 3.

## Verification table

| Gate | Before | After Wave 4 |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vitest run` | 539/542 (3 pre-existing fail) | 539/542 (same 3) |

## Cumulative status (waves 1–4)

| Wave | Theme | Closed |
|---|---|---|
| 1 | Safety & correctness criticals | 6 |
| 2 | Reconnect inert autonomy engines | 5 |
| 3 | Surface built backends in the UI | 6 |
| 4 | Operator visibility & control | 7 |
| **Total** | | **24 / 95** |

(Wave 4 closed 7 findings — the user-named 5 items expanded to TaskRunner #1/#2/#3/#5 + Ideas #1/#2/#5.)

## What remains

- **Wave 5 — UI consistency & design-system** (5): layer-color token unification, destructive-delete confirmation parity, empty/loading states, shared Build Fixer markdown template, salvage reusable atoms.
- **Wave 6 — Headless-slim-down cleanup + context-map integrity** (5).
