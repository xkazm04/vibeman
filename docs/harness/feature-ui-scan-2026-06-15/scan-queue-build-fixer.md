# Scan Queue & Build Fixer — Feature + UI Scan
> Context: Scan Queue & Build Fixer | Group: Code Execution & Automation
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (3 feature / 2 ui) | Priority: 1crit/3high/1med/0low
> Files read: ~14

## 1. Build Fixer is fully built but wired to nothing — no UI, no caller, no execution loop
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/api/build-fixer/route.ts:63-107, src/app/api/build-fixer/lib/requirementCreator.ts:33-63, src/app/api/build-fixer/lib/buildScanner.ts:428
- **Current state**: `/api/build-fixer` scans the project, groups errors intelligently, and writes Claude Code requirement files via `createRequirementFiles` → `createRequirement`. But a repo-wide grep for `build-fixer` / `scanBuildErrors` / `createRequirementFiles` finds **zero callers** outside the route's own files (only an xray type map and a code comment reference it). There is no button, no store, no other route, and the scan-queue worker never invokes it. The headline "build error detection with automated fix suggestions" capability is dead code from the user's perspective.
- **Opportunity**: Add a "Fix build errors" action (in the Onboarding/ControlPanel or a Scan Queue panel) that POSTs `/api/build-fixer`, shows the grouped error count, then on confirmation creates the requirement files AND enqueues them into TaskRunner so Claude Code actually fixes them — then re-runs the scan to verify (a real fix-verify loop, not just file generation).
- **Value**: Converts a complete-but-invisible feature into the autonomous "detect → fix → verify build" loop that is the context's stated purpose; today the work is generated and abandoned on disk.
- **Effort**: 4
- **Implementation sketch**: Build a `BuildFixerButton` calling `/api/build-fixer?scanOnly=true` first (preview), then full mode; pass the returned `requirementFiles` to the existing Claude Code batch-requirements endpoint; on completion re-POST `scanOnly=true` and surface a "0 errors remaining" success state.

## 2. No Scan Queue dashboard — worker, queue progress, and notifications are headless
- **Lens**: 🎨 ui-perfectionist
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/lib/scanQueueWorker.ts:543-569 (getStatus), src/app/api/scan-queue/route.ts:20-37 (GET), src/app/api/scan-queue/notifications/route.ts:12-34, src/app/db/repositories/scanQueue.core.repository.ts:209-237 (updateProgress)
- **Current state**: The worker exposes rich live state (`isRunning`, `currentlyProcessing`, adaptive poll interval, waiting resolvers) and every queue item tracks `progress`, `progress_message`, `current_step`, `total_steps`. Notifications (`scan_started/completed/failed/auto_merge_completed`) are persisted with read-state. Yet a glob for any `*Queue*/*Worker*/*Notification*.tsx` and a grep for `/api/scan-queue` across `features/` and `stores/` return **nothing** — none of this is rendered anywhere. Users cannot see what is queued, running, or why a scan failed.
- **Opportunity**: A Scan Queue panel: a worker on/off toggle (POST/DELETE `/api/scan-queue/worker`), a live list of queue items with per-item progress bars (`progress` + `progress_message`), status badges, and a notification bell consuming `GET /api/scan-queue/notifications?unreadOnly=true` with mark-read.
- **Value**: Makes all async scanning observable and controllable; right now the background engine that "drives all async scanning operations" is invisible, so failures and stuck jobs go unnoticed.
- **Effort**: 4
- **Implementation sketch**: New `ScanQueuePanel.tsx` polling `GET /api/scan-queue?projectId=` + `/api/scan-queue/worker` every few seconds; reuse the existing progress-bar and badge primitives; bell component polls notifications and PATCHes `markAll`.

## 3. Failed and cancelled scans are terminal — no retry / re-enqueue
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/app/api/scan-queue/[id]/route.ts:73-143 (PATCH), src/app/db/repositories/scanQueue.core.repository.ts:169-204 (updateStatus), src/lib/scanQueueWorker.ts:443-460 (failure path)
- **Current state**: When a scan times out or the provider errors, `processQueueItem` sets status `failed` with an `error_message` and stops. PATCH explicitly forbids moving a `running` job back to `queued` (correct), but there is **no path at all** to re-run a `failed`/`cancelled` item — a grep for `retry`/`requeue` in `api/scan-queue` returns nothing. The user's only recourse is to construct a brand-new queue item from scratch, losing the original `scan_type`/`context_id`/`auto_merge_enabled` settings.
- **Opportunity**: Add a `retry` action that clones a terminal queue item's parameters into a fresh `queued` row (or resets the existing row when `status IN ('failed','cancelled')`) and calls `notifyNewItem()`. Surface it as a "Retry" button on failed items in the panel from finding #2.
- **Value**: Transient LLM/timeout failures (common with the 5-minute scan timeout) become one-click recoverable instead of forcing full manual re-setup, which matters for an unattended auto-scan workflow.
- **Effort**: 2
- **Implementation sketch**: Add `requeueItem(id)` to the core repo that re-INSERTs with the same params under a new id (preserving `trigger_metadata`); expose via a `POST /api/scan-queue/[id]/retry` or a PATCH `action:'retry'` guarded to terminal statuses; wake the worker after.

## 4. Auto-merge eligibility is hardcoded (impact===3 && effort===1) with no configurability or preview
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: feature
- **File(s)**: src/lib/scanQueueWorker.ts:468-516 (handleAutoMerge, filter at :480), src/app/api/scan-queue/route.ts:48 (autoMergeEnabled flag only)
- **Current state**: When `auto_merge_enabled` is set, the worker auto-accepts only ideas matching the exact magic numbers `idea.impact === 3 && idea.effort === 1` (scanQueueWorker.ts:480). The enqueue API exposes a single boolean `autoMergeEnabled`; there is no way to tune the threshold, and the user gets no preview of *which* ideas will be auto-accepted before they are — they only learn after the fact via the `auto_merge_completed` notification count.
- **Opportunity**: Make the auto-merge rule a stored, per-project policy (min impact / max effort, optional category allow-list) carried in `trigger_metadata` or a small config table, and surface it in the file-watch/queue config UI with a "this would have auto-accepted N of your last scan's ideas" dry-run preview.
- **Value**: Auto-merge is a trust-sensitive action (it accepts AI suggestions unattended); a fixed invisible rule is both too rigid and too opaque. Configurable + previewable thresholds let users safely widen automation.
- **Effort**: 3
- **Implementation sketch**: Add an `autoMergePolicy` object to the queue item / file-watch config; replace the literal filter with `eligible(idea, policy)`; add a GET that runs the policy against the latest scan's ideas for a dry-run count.

## 5. Build Fixer requirement files use repeated hand-built Markdown that should be a shared template
- **Lens**: 🎨 ui-perfectionist
- **Priority**: crit
- **Category**: maintenance
- **File(s)**: src/app/api/build-fixer/lib/buildScanner.ts:330-411 (formatErrorGroup), and the divergent "single file" vs "directory group" intro/instruction blocks at :336-396
- **Current state**: `formatErrorGroup` assembles the requirement document by string-concatenating two near-identical branches (single-file vs directory-group) of header/intro/instructions, each with its own pluralization and a separate `## Error Details` code block that re-lists every error already printed once above. The "Instructions" prose is duplicated almost verbatim between the two branches, and the document this produces is the actual artifact Claude Code consumes — its quality directly affects fix accuracy. Any change (e.g. adding the build command or a "verify with X" step) must be edited in two places, and the doubled error list inflates token cost on every fix run.
- **Opportunity**: Extract a single `buildRequirementMarkdown({ scope, files, errors, buildCommand })` template helper that emits one consistent structure (header → grouped errors → one instructions block parameterized by scope → optional raw-error appendix), removing the duplicated prose and the redundant second error dump.
- **Value**: The requirement doc is the prompt the auto-fixer runs on; a single source of truth makes it cheaper (fewer duplicated tokens) and lets the team improve fix instructions once and have every requirement benefit — directly raising auto-fix success rate.
- **Effort**: 2
- **Implementation sketch**: Replace the two branches in `formatErrorGroup` with one templated builder taking a `scope: 'file' | 'directory'` flag; drop the duplicate `## Error Details` block (or gate it behind a verbosity flag); add the detected `buildCommand` so the agent can self-verify.
