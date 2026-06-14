# Remote Device Control — bug-hunter + ui-perfectionist scan

> Context: Remote Device Control
> Total: 5 findings (Critical: 3, High: 2, Medium: 0, Low: 0)

All routes in scope obtain their Supabase client via `getRemoteSupabase()`
(`src/lib/remote/supabaseClient.ts:29`) or `SupabaseService.configure()`
(`src/lib/remote/supabaseService.ts:23`). **Both create the client with the
Supabase service-role key**, which bypasses Postgres Row-Level Security
entirely. Consequently any missing app-layer auth/ownership check is not
"defense in depth gone" — it is the *only* gate, so its absence is directly
exploitable with full DB privileges. Several findings below rest on this fact.

## 1. Mesh + Fleet command endpoints accept and dispatch device commands with ZERO authentication
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: missing-auth
- **File**: src/app/api/remote/mesh/commands/route.ts:101 ; src/app/api/remote/fleet/route.ts:228
- **Scenario**: The main `/api/remote/commands` POST requires `api_key`, validates it against `vibeman_clients`, checks `is_active`, and enforces `write_commands`/`admin` permission (`commands/route.ts:65-128`). The mesh and fleet POST handlers require none of this. The mesh file even documents it: *"Unlike the main commands API, this doesn't require API key authentication"* (`mesh/commands/route.ts:5`). An unauthenticated caller can `POST /api/remote/mesh/commands` with `{command_type:"batch_start", target_device_id:"victim"}` or `POST /api/remote/fleet` with `{action:"batch_command", device_ids:[...all devices...], command_type:"stop_batch"}`. Each request inserts `status:'pending'` rows into `vibeman_commands`; every device polling via `commandProcessor` (`commandProcessor.ts:108`) then picks them up and executes the registered handler.
- **Root cause**: Auth was designed only for the "Butler" command path; the device-to-device mesh/fleet paths were assumed to live on a trusted network and never had auth retrofitted, while still writing to the same command queue that drives real execution.
- **Impact**: Security — full remote command injection against the entire fleet by anyone who can reach the HTTP endpoint. Combined with the service-role client, there is no second line of defense (no RLS, no ownership row).
- **Fix sketch**: Require and validate an API key on mesh/fleet POST exactly as `/commands` does (extract the shared validation into a helper), and additionally verify the caller's client is permitted to command the requested `target_device_id`/`device_ids`. Reject if the key is missing, inactive, or lacks `write_commands`.

## 2. No device-ownership check anywhere — any authenticated (or unauthenticated) caller can target any device
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: ownership-bypass
- **File**: src/app/api/remote/commands/route.ts:130 ; src/app/api/remote/fleet/route.ts:257 ; src/app/api/remote/devices/[id]/route.ts:115
- **Scenario**: Even on the authenticated `/commands` path, the validated client's permission is a global `write_commands`/`admin` flag — there is no link between a client and which devices/projects it may command. `commands/route.ts:130-141` inserts the command with the caller's `client_id` and an arbitrary `project_id`/`target` with no check that the client owns that project or device. Worse, `fleet` `batch_command` (`fleet/route.ts:257`) takes a caller-supplied `device_ids` array and fans out one command per id with no ownership filter, and `DELETE /api/remote/devices/[id]` (`devices/[id]/route.ts:129`) deletes *any* device row by id. So a low-trust client (or, per finding #1, no client at all) can enumerate `GET /api/remote/devices`, then command or delete every device belonging to every other user/tenant sharing the Supabase project.
- **Root cause**: The data model has no `owner`/`tenant` column on `vibeman_devices` or `vibeman_commands`, so "can this principal act on this device?" cannot be answered. The design assumed a single-tenant deployment.
- **Impact**: Security / data loss — cross-tenant device takeover and destructive deletion of arbitrary devices.
- **Fix sketch**: Add an owner/tenant column to devices and commands; on every command-submit and device-mutation path, verify the authenticated client owns (or is granted access to) each target device id before inserting/deleting. Reject mixed-ownership `device_ids` arrays.

## 3. PATCH /api/remote/devices/[id] ignores the URL id and silently mutates the *local* server's own device
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: wrong-target / silent-corruption
- **File**: src/app/api/remote/devices/[id]/route.ts:87
- **Scenario**: PATCH fetches `existingDevice` by the URL `id` (line 68), then calls `deviceRegistry.updateStatus(status, active_sessions)` (line 87). But `updateStatus` does **not** accept a device id — it updates the row matched by `this.deviceId`, the registry singleton's *own* locally-registered device (`deviceRegistry.ts:240-258`: `.eq('device_id', this.deviceId)`). So `PATCH /devices/deviceB {status:"busy"}` validates that deviceB exists, then writes `status:"busy"` onto **deviceA** (whatever device this server instance registered), and finally returns `getDevice(id)` = deviceB's *unchanged* row (line 100), so the response shows the old status and looks like a no-op success. If this server never registered a device, `this.deviceId` is null and `updateStatus` returns `false` → 500, even though the target device is perfectly valid.
- **Root cause**: `deviceRegistry` is a self-centric singleton (only ever mutates "this machine's" device); the per-id route was wired to it as if it were a generic by-id updater. The method signature can't even express the target, so the `id` param is dropped on the floor.
- **Impact**: Data corruption (wrong device's status/sessions overwritten) plus success theater (response echoes stale, unchanged row so the caller believes nothing happened or that it succeeded). Both are silent.
- **Fix sketch**: Add an explicit `updateDeviceStatus(deviceId, status, activeSessions)` that filters `.eq('device_id', deviceId)`, and have the route pass the URL `id`. Return the freshly-updated row.

## 4. PostgREST `.or()` filter injection via unvalidated target_device_id / localDeviceId
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: filter-injection
- **File**: src/app/api/remote/mesh/commands/route.ts:75 ; src/lib/remote/commandProcessor.ts:136
- **Scenario**: `mesh/commands` GET reads `target_device_id` straight from the query string (`route.ts:40`) and interpolates it into a PostgREST filter expression string: `` query.or(`target_device_id.is.null,target_device_id.eq.${targetDeviceId}`) `` (line 75). PostgREST parses the `.or()` argument as a *filter grammar*, not a bound value, so a crafted `target_device_id` such as `x,status.eq.pending` or `x),and(...)` injects additional logical conditions, letting a caller widen the result set (e.g. read commands they should not see, including other devices' payloads) or break the filter. The identical pattern exists in `commandProcessor.ts:136` for `localDeviceId`. Device ids elsewhere are caller-supplied (e.g. fleet/mesh POST bodies, device registration), so the values flowing into these filters are attacker-influenceable.
- **Root cause**: String interpolation into PostgREST's `.or()` mini-language with no escaping/whitelisting — the same class of bug as SQL string concatenation. Device ids are treated as opaque strings but never constrained to a safe charset.
- **Impact**: Security — filter/predicate injection allowing unauthorized read (and potentially broadened processing) of the shared command queue.
- **Fix sketch**: Validate device ids against a strict pattern (e.g. `^[A-Za-z0-9_-]+$`) at the route boundary and reject anything else; or avoid `.or()` string building by running two separate `.is('target_device_id', null)` / `.eq('target_device_id', id)` queries and unioning, or use `.filter()` with properly-escaped values.

## 5. Fleet/mesh command queue accepts unvalidated command_type and unbounded fan-out, bypassing the strict allow-list
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: input-validation / unbounded-fanout
- **File**: src/app/api/remote/fleet/route.ts:249 ; src/app/api/remote/fleet/route.ts:257
- **Scenario**: `/commands` POST enforces a strict `validCommandTypes` allow-list (`commands/route.ts:76-98`) and so does mesh POST (`mesh/commands/route.ts:113-134`). But fleet `batch_command` only checks that `command_type` is *truthy* (`fleet/route.ts:249`) — any arbitrary string is accepted and written verbatim into `vibeman_commands.command_type`. Combined with no auth (finding #1), a caller can inject command types the allow-listed paths would reject. Additionally `device_ids` is unbounded: `device_ids.map(...)` (line 257) inserts one pending command per supplied id with no length cap, so a single request with a 100k-element array creates 100k pending commands in one insert — a queue-flooding / retry-storm amplification primitive, since every polling device then scans and contends on that backlog (`commandProcessor.ts:122` limit-10 polling loop never drains under sustained flood).
- **Root cause**: Validation logic was implemented per-route rather than centrally; the fleet batch path was added later and skipped both the command-type allow-list and any cap on the batch size.
- **Impact**: Security / reliability — arbitrary command-type injection plus denial-of-service via unbounded command fan-out against the shared queue.
- **Fix sketch**: Apply the same `validCommandTypes` allow-list in fleet `batch_command`/`health_check_all`; cap `device_ids.length` (and `health_check_all` selection) to a sane maximum (e.g. 100) and reject oversized batches with 400.
