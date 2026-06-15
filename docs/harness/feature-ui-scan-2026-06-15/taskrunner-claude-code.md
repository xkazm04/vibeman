# TaskRunner & Claude Code — Feature + UI Scan
> Context: TaskRunner & Claude Code | Group: Code Execution & Automation
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (3f feature / 2ui ui) | Priority: 0crit/3high/2med/0low
> Files read: ~16

## 1. Surface real session/batch cost & token totals (data already arrives, then is thrown away)
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/features/TaskRunner/components/CLISessionModal.tsx:78-85, src/app/features/TaskRunner/lib/manualSession.types.ts:33-50, src/app/Claude/components/CostEstimation.tsx:22-29
- **Current state**: Every Claude `result` event carries `cost_usd`, `duration_ms` (and stream-json also yields token usage). CLISessionModal parses these per-turn (`extractText`, lines 78-85) and renders a throwaway "Turn complete · $0.0042 · 3.1s" string. Nothing is accumulated: `ManualSession` (types line 33-50) has no `totalCostUsd`/`turnCount` field, the SessionSidebar shows only "N msgs", and the AutomatedSessionModal stats row (done/running/pending/failed) has no cost column. A standalone `CostEstimation` component exists but lives in `src/app/Claude/`, is never imported by TaskRunner, and uses stale 2024 model IDs (`claude-3-opus`, `gpt-4`).
- **Opportunity**: Accumulate `cost_usd`/`duration_ms`/token usage from each `result` event into the session record (`totalCostUsd`, `totalDurationMs`, `turnCount`), display a running total in the CLISessionModal header and the SessionSidebar card, and show a per-session and batch-wide cost summary in the AutomatedSessionModal stats row.
- **Value**: Cost is the #1 anxiety for an autonomous multi-session Claude Code orchestrator; users currently fly blind on spend until the bill arrives. A live per-session/batch dollar figure makes large fan-out runs trustworthy and stoppable before they get expensive.
- **Effort**: 3
- **Implementation sketch**: Add `totalCostUsd`/`totalDurationMs`/`turnCount` to `ManualSession`; in `manualSessionStore` where `result` events are appended, increment those fields. Render the total in CLISessionModal's header sub-line and as a `$x.xx` chip on each SessionSidebar `SessionCard`; sum across `cliSessions` for a batch total in TaskRunnerHeader.

## 2. One-click retry / re-run for failed and completed tasks
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/features/TaskRunner/TaskItem.tsx:118-161, src/app/features/TaskRunner/components/KanbanColumn.tsx:100-120, src/app/api/claude-code/execute/route.ts:59-68
- **Current state**: The task context menu (TaskItem.tsx:118-161) offers only "Reset to Open", "Edit", and "Delete". When a task lands in `failed`, the only path back to execution is: reset → re-select → re-run the whole CLI batch. The Kanban "Failed" column (KanbanColumn.tsx) has no retry affordance at all — a dragged card can move but nothing re-queues it. The execute endpoint already accepts a single `{projectPath, requirementName}` async queue call, so a direct retry is one POST away.
- **Opportunity**: Add a "Retry" action (and a "Run again" for completed tasks) to both the context menu and the Kanban failed-column card that re-queues that single requirement via `POST /api/claude-code/execute` and flips its status to queued, skipping the manual reset+reselect+batch dance.
- **Value**: Failed tasks are routine in autonomous code generation (rate limits, flaky builds). A single retry button turns a 3-step recovery into one click and is the most common action a user takes on a failed task — directly accelerating the core execution loop.
- **Effort**: 2
- **Implementation sketch**: Add a `retryTask(reqId)` helper that calls the execute route with the requirement's `projectPath`/`requirementName` then `updateTaskStatus(reqId, createQueuedStatus())`; wire it as a context-menu item (icon `RotateCcw`/`Play`) gated on `status.type === 'failed' || 'completed'`, and add a small inline retry button on failed `KanbanTaskCard`s.

## 3. Live batch progress bar + ETA in the TaskRunner header
- **Lens**: 🎨 ui-perfectionist
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/app/features/TaskRunner/TaskRunnerHeader.tsx:27-42, src/app/features/TaskRunner/TaskRunnerFullView.tsx:181-194
- **Current state**: `isRunning`, `processedCount`, and `selectedCount`/`totalCount` are computed in `useRequirements` and threaded all the way into `TaskRunnerHeader` (props lines 27-42) — but the header never renders them. There is no aggregate progress indicator while a batch executes; the only feedback is per-task spinners scattered across columns and the collapsed "Session Health" badge. The TaskMonitor knows `runningCount`/`pendingCount` but no completion ratio is shown.
- **Opportunity**: Render a slim animated progress bar + "X of Y done · N running · ~Em left" line in the header whenever `isRunning`, driven by the already-passed `processedCount`/`totalCount` (and TaskMonitor counts), with an ETA derived from average completed-task duration.
- **Value**: During a long autonomous batch the user has no single glanceable answer to "how far along is this and when will it finish?" A header progress bar with ETA is the canonical orchestration affordance and removes the need to expand Session Health to gauge progress.
- **Effort**: 2
- **Implementation sketch**: In TaskRunnerHeader, add a conditional block on `isRunning` rendering a `motion.div` width-animated bar (`processedCount/totalCount`) plus a counts line; compute ETA from mean duration of completed tasks (TaskMonitor already has `startTime`/`endTime` per task) and format with the existing `formatDuration` helper.

## 4. Standardize empty states across grid + Kanban columns (icon + guidance, not bare text)
- **Lens**: 🎨 ui-perfectionist
- **Priority**: med
- **Category**: ui
- **File(s)**: src/app/features/TaskRunner/TaskRunnerFullView.tsx:221-226, src/app/features/TaskRunner/components/KanbanColumn.tsx:101-104, src/app/features/TaskRunner/components/SessionSidebar.tsx:287-295
- **Current state**: There are three different empty-state treatments in one feature. The grid no-requirements state (TaskRunnerFullView.tsx:221-226) is a single muted `<p>`. The Kanban column empty state (KanbanColumn.tsx:102) is the bare string "No tasks". Yet SessionSidebar (lines 287-295) and AutomatedSessionModal already use a polished pattern: centered icon + title + helper subtext. The richest, most actionable empty state is reserved for the least-seen surface.
- **Opportunity**: Extract a small `TaskRunnerEmptyState` (icon, title, subtext, optional CTA) and apply it to the grid (with a "Create requirement" hint / link to `.claude/commands`) and to Kanban columns, matching the SessionSidebar visual pattern.
- **Value**: First-run and post-clear screens are exactly when users need orientation; a consistent icon+guidance empty state reduces the "is it broken or just empty?" confusion and points users to the next action, improving onboarding without adding noise.
- **Effort**: 2
- **Implementation sketch**: Create `components/TaskRunnerEmptyState.tsx` (props: `icon`, `title`, `subtitle`, `action?`) mirroring the SessionSidebar markup; replace the bare `<p>` at TaskRunnerFullView.tsx:222 and the "No tasks" div at KanbanColumn.tsx:102 with it (e.g. `ListChecks` icon for grid, column dot color for Kanban).

## 5. Stop/kill control for running sessions in the SessionSidebar
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: functionality
- **File(s)**: src/app/features/TaskRunner/components/SessionSidebar.tsx:120-129, src/app/features/TaskRunner/components/SessionSidebar.tsx:264-283, src/app/api/cli-task-registry/route.ts:159-183
- **Current state**: SessionSidebar's `SessionCard` only exposes a close (X) button for *manual* sessions (lines 120-129), and the automated-session cards (lines 270-282) have no action at all beyond opening the read-only AutomatedSessionModal. There is no way to stop/abort a running session from the panel — once an automated batch is churning, the user can watch it but not halt it. The server-side task registry already supports `complete`/`clear` actions (cli-task-registry route, lines 138-183) and the deferred `TaskStop` tool exists, so the kill plumbing is present.
- **Opportunity**: Add a "Stop" button on running session cards (both manual and automated) that aborts the active execution (clear/cancel via the registry + cliSessionStore) and marks the session idle, with a confirm for in-flight work.
- **Value**: A kill switch is table-stakes for an autonomous executor — runaway, wrong-direction, or expensive runs need to be stoppable in one click from the always-visible sidebar, not only by closing the whole panel or waiting it out. It is the safety counterpart to finding #1's cost visibility.
- **Effort**: 3
- **Implementation sketch**: Add an `AbortSession` action to the stores that calls `clearSessionStrategy`/cancels the cli queue and POSTs `{action:'clear', sessionId}` to `/api/cli-task-registry`; surface a square `StopCircle` button on `SessionCard` when `status==='running'`, mirroring the existing close-button placement and gating it behind a confirm when tasks are mid-flight.
