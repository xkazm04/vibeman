# Remote Device Control — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495752320_mpin8ym
> Group: Social & Integrations
> Files read: ~16
> Total: 5 (Critical: 2, High: 2, Medium: 1, Low: 0)

## 1. Device registration / heartbeat / delete endpoints are completely unauthenticated — fleet spoofing & DoS
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: auth / device-identity-verification
- **File**: src/app/api/remote/devices/route.ts:47 (POST), src/app/api/remote/devices/heartbeat/route.ts:10 (POST), src/app/api/remote/devices/[id]/route.ts:118 (DELETE)
- **Scenario**: While `/api/remote/commands` and the mesh/fleet EXECUTION paths now require a valid `api_key` (see `requireClient`), the device-lifecycle routes verify nothing. Anyone who can reach the server can `POST /api/remote/devices` with an arbitrary `device_id`/`device_name` and `capabilities` (upsert on `device_id`, deviceRegistry.ts:38-54 — so they can overwrite an existing device's row), then `POST .../heartbeat` to keep a ghost device "online", or `DELETE /api/remote/devices/[id]` to evict any real device from the fleet. Topology, fleet overview, health scores and command-routing targets are all derived from this table.
- **Root cause**: Design assumption that device endpoints are trusted/local-only; the auth retrofit covered command dispatch but not the registry that command routing depends on. There is no device identity verification (no signed device token, no api_key) on register/heartbeat/delete.
- **Impact**: Fleet desync, spoofed/ghost devices, denial-of-service by deleting or overwriting real devices, poisoned capabilities (`can_execute`, `session_slots`) influencing where execution commands get routed. Undermines the very RCE gate that was added on the command side.
- **Fix sketch**: Wrap these handlers in `requireClient(supabase, api_key, ['write_commands'|'admin'])`; bind heartbeats/deletes to the calling client's owned device_id; reject upsert over a device owned by a different client.
- **Value**: effort 5 / impact 10 / risk 4

## 2. `deviceRegistry` is a process-wide singleton keyed on a single mutable `this.deviceId` — heartbeats/unregister mutate the wrong device under multi-device or concurrent use
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: distributed-systems / shared-mutable-state race
- **File**: src/lib/remote/deviceRegistry.ts:20 (`private deviceId`), :63 (set in registerDevice), :100-113 (sendHeartbeat uses this.deviceId), :76-88 (unregisterDevice)
- **Scenario**: `deviceRegistry` is a module singleton (deviceRegistry.ts:384). `this.deviceId` is set by the *most recent* `registerDevice` call. `POST /api/remote/devices/heartbeat` (heartbeat/route.ts:24) calls `sendHeartbeat()` with no device id, so it always updates `this.deviceId`. If two devices register against the same server instance (or registration order interleaves), every device's heartbeat overwrites the **last-registered** device's row — the heartbeat body's identity is ignored entirely. `unregisterDevice` / `startHeartbeat` share the same flaw.
- **Root cause**: Liveness state modeled as one ambient `this.deviceId` instead of resolving the device from the request. Assumes exactly one device per server process and no concurrency, contradicting the "mesh of many devices" design.
- **Impact**: Wrong device marked online/offline; a real device silently appears dead (gets marked offline by staleness sweep at topology/route.ts:53 & fleet/route.ts:62) while a different device's row is kept warm → commands dispatched to dead/wrong devices, liveness races.
- **Fix sketch**: Make heartbeat carry and trust an authenticated `device_id`; add `sendHeartbeatById(deviceId, ...)` (mirroring the existing `updateStatusById`) and route the heartbeat endpoint through it instead of singleton state.
- **Value**: effort 4 / impact 9 / risk 4

## 3. Zero test coverage across the entire remote/fleet command surface — the RCE auth gate and command routing are unverified
- **Severity**: High
- **Lens**: test-mastery
- **Category**: missing-tests / business-critical-path
- **File**: src/lib/remote/* and src/app/api/remote/** (no `*.test.ts`/`*.spec.ts` exist anywhere under remote)
- **Scenario**: Glob for `src/**/remote/**/*.{test,spec}.ts` and `src/app/api/remote/**/*.{test,spec}.ts` returns nothing. The highest-blast-radius invariants are untested: (a) `requireClient` rejects missing/invalid/inactive key and enforces `admin`-OR-required-perm (apiMiddleware.ts:82-120); (b) mesh POST requires auth for `EXECUTION_COMMANDS` but not read commands (mesh/commands/route.ts:163); (c) the PostgREST `.or()` injection guards (`/^[A-Za-z0-9_-]+$/`) in mesh/commands:93 and commandProcessor:139; (d) command-type allow-lists in commands:90 and fleet:258; (e) `target_device_id` filtering so a device only runs its own commands (commandProcessor:134-145).
- **Root cause**: Security-sensitive logic added defensively (per the in-code comments about prior RCE surface) but no regression tests pin the invariants, so a future edit silently reopening the gate is undetectable.
- **Impact**: Highest leverage: an accidental revert of any auth/allow-list/injection guard ships unnoticed, re-exposing remote code execution / queue flooding.
- **Fix sketch**: Add a vitest suite mocking the Supabase client: assert `requireClient` perm matrix; assert mesh `start_remote_batch`/`triage_direction` return 401 without key but `ping`/`status_request` insert; assert injection chars in `target_device_id` → 400; assert fleet `device_ids.length > 200` → 400.
- **Value**: effort 4 / impact 8 / risk 2

## 4. `start_remote_batch` / `start_batch` execute Claude Code from a `payload.project_path` that bypasses project-path validation
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: command-injection / arbitrary-path execution
- **File**: src/lib/remote/commandHandlers.ts:266 (`payload.project_path || project.path`), :304 (`requirementsDir = join(projectPath, ...)`), :901-914 (start_remote_batch forwards project_path)
- **Scenario**: An authenticated `write_commands` client submits `start_remote_batch` with a real `project_id` but an attacker-chosen `project_path`. The handler trusts `payload.project_path` over the registered `project.path`, joins `.claude/requirements/<name>.md` under it, and feeds matching requirement files into `executeNextTask` (Claude Code execution). Requirement *names* are charset-guarded (SAFE_NAME_RE, :315) but the *base path* is not, so execution is anchored at an arbitrary directory the caller controls. `handleTriageIdea`/`handleTriageDirection` similarly `writeFileSync` under caller-supplied `project_path` (:628-655, :736-751).
- **Root cause**: Assumes `project_path` in the payload is a benign convenience override; trusts client-supplied filesystem location instead of the server-side registered project path.
- **Impact**: Authenticated client can steer code-execution / requirement-file writes to arbitrary host directories (privilege escalation beyond intended project scope, potential write-then-execute).
- **Fix sketch**: Ignore `payload.project_path` for execution/write; always use `project.path` from `projectDb`. If an override is truly needed, assert it resolves within an allowlisted project root (`path.resolve` + prefix check).
- **Value**: effort 3 / impact 8 / risk 5

## 5. Topology/fleet ping latency is unauthenticated and last-write-wins, letting any caller forge link metrics
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: data-integrity / mesh-topology-inconsistency
- **File**: src/app/api/remote/mesh/topology/route.ts:127 (POST), :89-104 (GET reads back), src/app/api/remote/fleet/route.ts:74-85
- **Scenario**: `POST /api/remote/mesh/topology` inserts a `command_type:'ping', status:'completed'` row with an arbitrary `latency_ms`, `source_device_id`, `target_device_id` and **no auth and no field validation** (`latency_ms` isn't even bounds-checked). GET topology and fleet overview then take the most-recent ping per target (latest-wins, topology:91 `!latestPings.has(targetId)`) to compute `connectionMetrics`, `avgLatencyMs`, and `calculateHealthScore`. Any caller can flood fake pings to make a degraded/offline link look healthy or vice versa.
- **Root cause**: Ping results are stored as ordinary commands with no producer authentication and no validation; consumers trust the newest row (last-write-wins) as ground truth.
- **Impact**: Topology/health visualization and routing decisions can be poisoned (fleet desync, masking of dead links). Lower severity than 1–4 because it skews metrics rather than executing code.
- **Fix sketch**: Require `requireClient` on topology POST; validate `latency_ms` is a finite non-negative number under a sane cap; verify `source_device_id` matches the authenticated client's device.
- **Value**: effort 3 / impact 5 / risk 3
