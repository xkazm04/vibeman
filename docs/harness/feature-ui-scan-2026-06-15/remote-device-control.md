# Remote Device Control — Feature + UI Scan
> Context: Remote Device Control | Group: Social & Integrations
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (4f feature / 1ui ui) | Priority: 1crit/2high/2med/0low
> Files read: ~14

_Manifest drift: `src/app/api/remote/healthcheck/route.ts` (listed) does not exist — the healthcheck surface lives in `src/lib/remote/healthcheckPublisher.ts` and is dispatched as a command. Also present but not in the manifest: `remote/clients/[id]/route.ts`, `remote/setup/status/route.ts`. This context is **100% backend** — no `.tsx` references any `api/remote/*` route._

## 1. Unauthenticated mesh/fleet command dispatch executes local Claude Code & writes files
- **Lens**: 🔍 feature-scout
- **Priority**: crit
- **Category**: functionality
- **File(s)**: src/app/api/remote/mesh/commands/route.ts:4-5,110-178; src/app/api/remote/fleet/route.ts:228-308; src/lib/remote/commandProcessor.ts:108-172; src/lib/remote/commandHandlers.ts:231-363,605-701
- **Current state**: The main `/api/remote/commands` POST validates an API key + `write_commands` permission (commands/route.ts:101-128). But the mesh route deliberately skips auth — its own header comment says "this doesn't require API key authentication" (mesh/commands/route.ts:4-5) — and `fleet` POST `batch_command`/`health_check_all` insert command rows with no key check either. The processor (`processPendingCommands`) then executes **every** pending row regardless of origin: `start_remote_batch` calls `executeNextTask` to run Claude Code locally (commandHandlers.ts:363), and `triage_idea`/`triage_direction` write requirement `.md` files to `<projectPath>/.claude/requirements/` (commandHandlers.ts:655, 748). Anyone who can reach these routes (or insert a Supabase row) gets unauthenticated local code execution.
- **Opportunity**: Require the same API-key + permission check on the mesh and fleet POST handlers that `/commands` already enforces, OR have the processor re-verify each command was inserted by an active client (`client_id` present + permission) before dispatch. Gate execution-class commands (`start_remote_batch`, `start_batch`, `triage_*`) behind a stricter `execute` permission than read-only fetches.
- **Value**: Closes a remote-code-execution / filesystem-write hole on every device that joins the mesh; without it the "fleet" is an open command bus into each developer's machine.
- **Effort**: 3
- **Implementation sketch**: Extract the API-key validation block from `commands/route.ts:101-128` into `apiMiddleware.ts` as `requireClient(supabase, apiKey, perm)`. Call it in mesh/commands POST and fleet POST. In `processCommand`, refuse rows whose `command_type` is execution-class unless `command.client_id` resolves to an active client with `execute`/`admin`.

## 2. No fleet/mesh dashboard — rich topology + health scoring is computed but never shown
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/api/remote/fleet/route.ts:40-223; src/app/api/remote/mesh/topology/route.ts:25-122; src/lib/remote/topologyBuilder.ts (buildTopologyFromDevices, suggestImprovements); src/lib/remote/batchDispatcher.ts (calculateHealthScore)
- **Current state**: The backend already computes a full `FleetOverview` (online/busy/offline counts, avg health score, avg latency, available session slots — fleet/route.ts:205-215), per-device `healthMetrics`, health history, a network `topology`, and topology `improvements`. Yet a Grep for any `.tsx` calling `api/remote/(fleet|mesh|devices|commands|clients)` returns **zero matches** — there is no UI. Operators can only see fleet state via raw curl.
- **Opportunity**: Build a "Fleet" dashboard feature (e.g. `src/app/features/Fleet/`) that renders the overview cards, a device list with health gauges (reuse `DebtPrediction/HealthScoreGauge`), and a mesh topology graph (reuse the D3 pattern from `Brain/sub_MemoryCanvas/EventCanvasD3`) fed by `/api/remote/mesh/topology?include_improvements=true`.
- **Value**: Turns an invisible backend into a usable distributed-dev control surface; lets a user actually monitor and steer the fleet that the autonomous orchestration loop depends on.
- **Effort**: 4
- **Implementation sketch**: Add a `Fleet` feature module + sidebar entry. Poll `GET /api/remote/fleet?include_history=true&local_device_id=<id>` every ~5s into a small store; render overview stat cards, per-device rows with `HealthScoreGauge`, and a topology canvas; surface `improvements[]` as actionable banners.

## 3. Batch-control and scan commands are accepted then silently no-op'd ("integration pending")
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/lib/remote/commandHandlers.ts:384-456
- **Current state**: `handlePauseBatch`, `handleResumeBatch`, `handleStopBatch`, and `handleTriggerScan` all return `success: true` while doing nothing — their result message is literally "TaskRunner integration pending" / "Scan queue integration pending" (lines 396, 413, 430, 453). The command is marked `completed` in the queue, so a remote operator believes a batch was paused/stopped or a scan was triggered when nothing happened. These four are advertised in the public command allow-list (commands/route.ts:76-88) and the Fleet allow-list (fleet/route.ts:252-257).
- **Opportunity**: Wire these handlers to the real engines: pause/resume/stop should call the CLI session store controls already used by `handleStartBatch` (`useCLISessionStore` — setRunning/setAutoStart/stop), and `trigger_scan` should enqueue into the scan queue (`/api/scan-queue`). Until wired, return `success: false` with a clear "not yet supported" error so the queue reflects reality.
- **Value**: Completes the remote control loop — stop/pause/resume are the safety controls a remote operator most needs; a fake-success stop is actively dangerous when a runaway batch is burning tokens.
- **Effort**: 3
- **Implementation sketch**: In pause/stop, look up the session running the `batchId`, call `sessionStore.setRunning(sessionId,false)` / clear `autoStart`; in resume re-call `executeNextTask`. For `trigger_scan`, POST the scanTypes/contextIds to the scan-queue repository. Change the placeholder branches to honest failures meanwhile.

## 4. No command provenance/audit trail or result feedback surfaced to operators
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: user_benefit
- **File(s)**: src/lib/remote/commandProcessor.ts:177-240; src/app/api/remote/commands/route.ts:130-149; src/app/api/remote/mesh/commands/route.ts:145-160
- **Current state**: Mesh/fleet commands are inserted with no `client_id` (mesh sets only `source_device_id` inside payload; fleet sets none), so `vibeman_commands` cannot answer "who issued this command?" The processor records a `result`/`error_message` on completion (commandProcessor.ts:196-213), but nothing exposes a per-device command history or links a command back to the operator/device that issued it. The events publisher writes a parallel `vibeman_events` stream that no command consumer correlates.
- **Opportunity**: Persist `issued_by` (client id or source device) on every inserted command and add a lightweight audit/history endpoint (or extend `/commands` GET with `target_device_id` + `source_device_id` filters) so the future Fleet UI can show "device X ran start_remote_batch, result Y, 12s ago."
- **Value**: Accountability and debuggability for an autonomous multi-device system — essential once commands actually mutate state and run code across machines.
- **Effort**: 2
- **Implementation sketch**: Add `source_device_id`/`issued_by` columns (or reuse payload consistently), set them in all three insert paths, and add `source_device_id` as a GET filter on `/commands` mirroring the existing `target_device_id` mesh filter.

## 5. Command/event status relies on 5s polling — no realtime push despite an events stream existing
- **Lens**: 🎨 ui-perfectionist
- **Priority**: med
- **Category**: functionality
- **File(s)**: src/lib/remote/commandProcessor.ts:63-82; src/app/api/remote/commands/route.ts:166-196 (PATCH manual poke); src/lib/remote/eventPublisher.ts:24-87; src/app/api/remote/events/route.ts:10-67
- **Current state**: The processor polls Supabase every 5000ms (commandProcessor.ts:76-82) and the only "faster" path is a manual `PATCH /commands` poke. The event side is already write-only fire-and-forget into `vibeman_events` (eventPublisher.ts) and read-only paginated GET (events/route.ts) — there is no Server-Sent Events / Supabase Realtime channel. A future Fleet UI (finding #2) would inherit a laggy, poll-driven, no-empty-state experience: up to 5s stale status, visible "nothing happening" gaps, and no live latency/health updates.
- **Opportunity**: Add a realtime push surface — either subscribe the processor + a UI hook to Supabase Realtime on `vibeman_commands`/`vibeman_events`, or add an SSE route (`/api/remote/events/stream`) mirroring the existing `xray/stream` / `claude-terminal/stream` SSE pattern in the codebase. This gives the dashboard live command-status transitions and device health without polling.
- **Value**: Makes remote control feel responsive (sub-second status, live health gauges) and removes redundant polling load; the UX benefit is immediate, accurate feedback on long-running remote operations rather than a stale 5s snapshot.
- **Effort**: 3
- **Implementation sketch**: Add `app/api/remote/events/stream/route.ts` as an SSE endpoint that tails `vibeman_events` (or proxies Supabase Realtime), following the established stream-route pattern; have the Fleet store consume it and fall back to the existing GET poll when remote is unconfigured.
