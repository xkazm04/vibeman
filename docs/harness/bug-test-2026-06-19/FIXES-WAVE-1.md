# Bug-Test Fix Wave 1 — All Criticals (W1–W4 subset)

> 15 atomic fix commits closing **16 of 17 Critical findings + 1 High** across the
> security, CAS/idempotency, success-theater, data-loss, and filtering themes.
> Baseline preserved: tsc source **0 → 0**, vitest **547/550 → 547/550** (the 3
> failures are one pre-existing stale test, unchanged). Zero regressions.
> Branch: `vibeman/bug-test-fixes-2026-06-19`.

## Commits

| # | Commit | Finding(s) closed | Sev | Theme |
|---|---|---|---|---|
| 1 | `b44888e7` | workspace #1, #2 | C, C | Security |
| 2 | `1433c6de` | integrations #1 | C | Security |
| 3 | `457d72a7` | remote #2 | C | CAS/identity |
| 4 | `7e8d325b` | manager #1, remote #4 | C, H | CAS + Security |
| 5 | `0025feea` | docs #1 | C | Filtering |
| 6 | `1c35822c` | database #1 | C | Success-theater |
| 7 | `1d11d74e` | reflector #1 | C | CAS/double-completion |
| 8 | `222c2315` | scan-queue #1 | C | Wrong-result |
| 9 | `a6174232` | ideas #1 | C | CAS/idempotency |
| 10 | `3b7c37f0` | taskrunner #1 | C | Success-theater |
| 11 | `0de5eeef` | context-mgmt #1 | C | Data-loss |
| 12 | `4bfd0000` | dependencies #1 | C | Wrong-target |
| 13 | `4d02ed1e` | database #2 | C | Data-loss |
| 14 | `2434c622` | testing #1 | C | Success-theater |
| 15 | `5b96e11a` | debt #3 | C | Data-loss |

## What was fixed (grouped by theme)

### 🔒 Security / trust-boundary (5C + 1H)
- **disk/file + disk/search confinement** — both `disk/*` APIs accepted arbitrary absolute paths (whole-machine read/write + OS-dir enumeration). Added `validatePathWithinAllowedRoots` and wired the existing helpers in: `disk/file` confines to registered project roots + app root; `disk/search` directories now uses `validateSafeBasePath`'s deny-list.
- **template-discovery/generate allowlist** — wrote attacker-controlled markdown into any `.claude/commands` dir (CLI-injection pivot). Now confined to registered project roots + `validateFilename` on the interpolated `templateId`.
- **remote command-handler path bypass (remote #4)** — `start_batch`/accept-idea/accept-direction/fetch-requirements ran Claude Code / wrote requirement files at a caller-supplied `payload.project_path`. All four now use the locally-registered `project.path`.

### 🔁 CAS / idempotency / double-completion (4C)
- **ideas #1** — `acceptIdea` had no server-side CAS; concurrent/retried accepts double-wrote the requirement file + double-fired signals. Added `claimIdeaForAcceptance` single-statement CAS; loser bails, already-accepted rejected.
- **reflector #1** — architecture `completeAnalysis` re-ran `upsertMany` on a duplicate callback. Added a `status === 'running'` re-check at the write boundary.
- **manager #1** — remote accept-direction did `pending→accepted` (invalid) *after* writing the file → orphaned file + stuck-pending. Now claims via `claimDirectionForProcessing` (atomic CAS) first.
- **remote #2** — `sendHeartbeat` mutated a single mutable `this.deviceId`; now honors an explicit `device_id` (backward-compatible with the local single-device flow).

### 🎭 Success-theater / silent-failure (3C)
- **database #1** — `safeMigration` swallowed DDL throws inside `runOnce`, so failed migrations were recorded `applied` forever (silent schema corruption). Now re-throws when inside a `runOnce` body → rolls back + records `failed` + retries; bare/boot calls unchanged.
- **taskrunner #1** — a missing Claude CLI resolved `success:true` "simulation mode", triggering completion + cleanup (requirement-file delete, idea-status flip) for a no-op run. Now fails honestly.
- **testing #1** — the "visual regression" executor never compared (overwrote the screenshot, returned success on page load). Now establishes a baseline and compares against it (byte-level on Playwright's deterministic PNGs).

### 💥 Data-loss / wrong-data (4C)
- **context-mgmt #1** — context-map cleanup deleted the whole map gated on CLI-reported counts. Now verifies server-side that newly-generated contexts actually exist before deleting (409 otherwise).
- **database #2** — Supabase sync truncated then inserted (a failed batch emptied the mirror). Now upserts-then-prunes (never empties; prune is non-fatal).
- **debt #3** — unused-component detector flagged aliased-default-imported components as unused (→ data loss on auto-remove). Added a module-path import check before declaring unused.
- **docs #1** — `GET /api/xray` computed a context-filtered query then returned the unfiltered set; `?contextId=` was silently ignored. Now maps the filtered, context-detailed events and scopes stats to the same filters.

### 🎯 Wrong-result (1C)
- **scan-queue #1** — linked the queue item via global `getLatestScanId(project, type)` instead of the scan this run produced → auto-merged the wrong scan's ideas under concurrency. The executor now returns its `scanId`; the worker links it precisely.

## Verification

| Gate | Baseline | After Wave 1 |
|---|---|---|
| tsc (source, excl. `.next`) | 0 errors | **0 errors** |
| vitest | 547/550 pass (3 pre-existing) | **547/550 pass** (same 3) |

Each fix was tsc-checked before commit; a mid-wave and final full vitest run confirmed no new failures.

## Deferred (1 Critical) — needs an architectural decision

- **remote #1 — unauthenticated device register/heartbeat/delete.** The protective fix (`requireClient`, the gate the command routes use) would break the **credential-less local registration flow** (`ApiPersistence` sends no api_key), and wrapping with `withAccessControl` adds **no real protection** because `resolveAccessContext` always returns `admin` (the app is localhost-only by design). Closing this honestly requires a decision: (a) give the local client a mesh api_key and require it on the management routes, or (b) formally accept the localhost-binding boundary as the security model. Logged, not silently skipped.

## Patterns established (catalogue)

1. **Wire the helper that already exists.** Three security criticals were "the correct confinement/auth helper exists but the route never calls it" (`validatePathWithinBase`, `validateSafeBasePath`, `requireClient`). Grep for the helper before assuming a feature is missing.
2. **Single-statement CAS beats read-then-write.** `UPDATE … WHERE id=? AND status=?` returning `changes>0` is the go-to guard for accept/complete/claim races (ideas, directions, scan-queue, architecture).
3. **Registered path, never caller path.** Any server action that executes code or writes files for a `project_id` must resolve the path from the DB, never trust a caller-supplied path.
4. **Verify the DB, not the CLI's self-report.** Destructive cleanups must confirm the intended new state landed in the DB before deleting the old (context-map wipe; migration fail-record).
5. **Upsert-then-prune, not truncate-then-insert.** When a backend has no cross-batch transaction, never empty before re-filling.
6. **Honest failure beats fake success.** Missing-tool / unparseable-output / no-baseline paths must report failure (or "not evaluated"), never `success:true`.
7. **Flag-scoped behavior change.** `safeMigration` re-throws only inside `runOnce` (module flag) — a way to fix an error-path bug without changing 130 call sites' happy path.

## What remains (per INDEX)

- 48 High, 28 Medium, 2 Low across the same themes — notably **~16 zero-test-coverage** findings on highest-blast paths and the **context-map drift cleanup** (3 phantom contexts + the stale `signal-types.test.ts` whose removal restores 550/550).
- Suggested next waves: W5 lifecycle/zombies (taskrunner #2–4, reflector #2–3, scan-queue #2–3), W6 cleanup+green-baseline+test seeds.
</content>
