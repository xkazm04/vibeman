# Ideas System — Feature + UI Scan
> Context: Ideas System | Group: Core Development Engine
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (3f feature / 2ui ui) | Priority: 0crit/3high/2med/0low
> Files read: ~17

## 1. Scan loop runs blind — no per-task progress, count, or cancel
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/features/Ideas/sub_IdeasSetup/ScanInitiator.tsx:40-41,169-202; src/app/features/Ideas/sub_IdeasSetup/lib/ideaExecutor.ts:131-191
- **Current state**: `executeClaudeCodeScan` iterates `scanTypes × targets` sequentially with an `await fetch` per pair (the button label itself advertises "12 scan types × N contexts = X tasks", easily 20-60+ network round-trips). The UI exposes only a single boolean `isProcessing` spinner plus a start toast and an end toast. During a multi-minute run the user sees a frozen "Creating Tasks..." button, no count of completed/remaining/failed tasks, no per-agent status, and no way to cancel.
- **Opportunity**: Stream progress as the loop advances. Have `executeClaudeCodeScan` accept an `onProgress(done, total, label, status)` callback (it already builds `result.itemCount` and `result.errors` per pair) and render a compact progress bar + "agent × context" ticker in `ScanInitiator`, with an AbortController-backed Cancel button (the fetch wrappers in `scanApi.ts` already accept a `signal`).
- **Value**: Turns the system's headline workflow (12-agent codebase scan) from an opaque freeze into an observable, cancellable operation — directly serving the autonomous-orchestration promise and reducing accidental double-clicks/abandonment on large projects.
- **Effort**: 3
- **Implementation sketch**: Add `onProgress?` to `ExecutionConfig`; call it inside the inner loop (`ideaExecutor.ts:178-189`) on each success/error. In `ScanInitiator`, store `{done,total,currentLabel,errors}` state, render a progress bar below the action row, and thread an `AbortController` into the executor → `scanApi.executeScan(signal)`.

## 2. Default Buffer view has no bulk triage — power triage lives only in Tinder
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/app/features/Ideas/sub_Buffer/BufferView.tsx:151-246; src/app/features/Ideas/sub_Buffer/BufferColumn.tsx:61-127; src/app/features/tinder/components/AutoTriageButton.tsx:26-58
- **Current state**: Buffer is the default landing view (`IdeasLayout.tsx:49` defaults `viewMode='buffer'`). It supports only one-idea-at-a-time convert/queue/delete plus a per-column *delete*-all. There is no "accept/queue all in this column", no multi-select, and no effort/impact bulk filter — yet the Tinder feature already ships `AutoTriageButton` and an accept-all endpoint (`/api/triage/auto-generate`, `/api/tinder/accept-all`). A user staring at a 40-idea column must click `Zap` 40 times.
- **Opportunity**: Add a per-column "Queue all pending" / "Accept all" action mirroring the existing delete-all affordance, reusing the `/api/tinder/accept-all` or batching `/api/tinder/actions` calls the column already invokes per idea (`BufferView.tsx:215`).
- **Value**: Collapses the most repetitive action in the primary triage surface from N clicks to 1, closing the capability gap between Buffer and Tinder and accelerating the scan→requirement→TaskRunner pipeline.
- **Effort**: 2
- **Implementation sketch**: In `BufferColumn` header, add a "Queue all" button next to the trash icon (gated on `ideas.some(i => i.status==='pending')`). Wire a new `onContextQueueAll(contextId)` prop in `BufferView` that loops pending ideas through the existing accept call (or one accept-all request), then `invalidateIdeas()`.

## 3. Lifecycle cycles/events are in-memory only — lost on restart
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: maintenance
- **File(s)**: src/app/features/Ideas/sub_Lifecycle/lib/lifecycleOrchestrator.ts:46-54,275,371-378; src/app/api/lifecycle/route.ts:34-52
- **Current state**: The orchestrator is a module-level singleton that keeps `currentCycle`, `cycleHistory[]`, and `eventHistory[]` purely in JS memory (capped at 1000 events). Only the cross-process *lock* is DB-backed (`lifecycle_locks`). A Next.js dev HMR reload or server restart wipes all cycle history and the running cycle; `LifecycleDashboard` re-initializes a blank orchestrator on every mount (`LifecycleDashboard.tsx:228-230`), so "Last Run / Next Run" and the event timeline reset to empty. This contradicts the dashboard's framing as a persistent automation engine.
- **Opportunity**: Persist cycles and events to SQLite (tables alongside the existing `lifecycle_locks`) so status, history, and the timeline survive restarts and can be queried per project.
- **Value**: Makes the autonomous "Code Quality Lifecycle" trustworthy and auditable across sessions — a prerequisite for the scheduled/unattended triggers the orchestrator already advertises.
- **Effort**: 3
- **Implementation sketch**: Add `lifecycle_cycles` and `lifecycle_events` tables via a migration; in `completeCycle`/`handleCycleError`/`logEvent` upsert rows instead of (or alongside) pushing to arrays; have `getCycleHistory`/`getEventHistory` read from DB scoped by `project_id`.

## 4. Rich scan-type stats are computed server-side but never surfaced in the Ideas UI
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: user_benefit
- **File(s)**: src/app/api/ideas/stats/route.ts:59-127; src/app/features/Ideas/IdeasLayout.tsx:118-204
- **Current state**: `/api/ideas/stats` returns per-scan-type acceptance ratios, pending/accepted/rejected/implemented counts, and project/context distribution. `IdeasLayout` renders only the header filter, scan initiator, view toggle, and Buffer/Kanban — no stats panel anywhere consumes this endpoint. Users have no signal for *which of the 12 agents actually produce ideas they accept*, so they keep running low-yield agents.
- **Opportunity**: Add a collapsible "Agent performance" strip (acceptance ratio + accepted/total per scan type) above the view toggle, and let the scan-type chips in `ScanTypeSelector` show each agent's historical acceptance ratio as a subtle badge.
- **Value**: Closes the feedback loop on the core scanning engine — users invest scan budget in agents with proven yield, raising the signal-to-noise of the whole Ideas pipeline.
- **Effort**: 2
- **Implementation sketch**: Add a React Query hook for `/api/ideas/stats?projectId=`; render a horizontally-scrolling stat row of `{getScanTypeName(scanType)} · {acceptanceRatio}%` chips in `IdeasLayout` (reuse `categoryConfig`/`getScoreColor` from `ideaConfig.ts`); optionally inject the ratio into `ScanTypeSelector` chip subtitles.

## 5. Effort/Impact shown as bare icons with no value — triage scanability suffers
- **Lens**: 🎨 ui-perfectionist
- **Priority**: high
- **Category**: ui
- **File(s)**: src/app/features/Ideas/sub_Buffer/BufferItem.tsx:105-117; src/app/features/Ideas/lib/ideaConfig.ts:235-259
- **Current state**: In the buffer card, Impact and Effort are rendered as a single colored Lucide icon each (`ImpactIcon`/`EffortIcon`) with the numeric score buried in a hover `title` only (`BufferItem.tsx:107-116`). The 1-10 scale and its color bands are fully defined in `ideaConfig.ts` (`impactScale`/`effortScale`), yet on the card a "9" and a "2" look identical except for a color tint that is hard to distinguish at 12px. The dependency badge, by contrast, *does* show its number (`BufferItem.tsx:120-125`), creating an inconsistent visual language across the same badge row.
- **Opportunity**: Render the numeric score beside each icon (e.g. `⚡7`) matching the dependency badge's icon+number pattern, using the existing band color from `effortScale.colorOf(v)`/`impactScale.colorOf(v)`. Keep the descriptive label in the tooltip.
- **Value**: Lets users rank ideas by effort/impact at a glance without hovering each card — the central job of a triage buffer — and unifies the badge row's visual grammar. Pure-affordance gain, no accessibility regression (numbers add information that color alone conveyed).
- **Effort**: 1
- **Implementation sketch**: In `BufferItem.tsx`, render `<span className={"text-2xs " + impactCfg.color}>{idea.impact}</span>` next to `ImpactIcon` (and same for effort), mirroring the dependency badge markup at lines 120-125; leave the `title` text intact.
