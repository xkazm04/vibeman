# Bug-UX Scan — Fix Wave 1 — "Don't report success that didn't happen" + Remote cheap-subset

> 8 commits, 8 findings closed (5 Wave-1 criticals/highs + 3 remote-security cheap-subset).
> Branch: `vibeman/bug-ux-fixes` (off HEAD; the in-progress 708-file headless-slim refactor left uncommitted).
> Baseline preserved: tsc 0 → 0 errors. Tests 539/542 before and after (the 3 failures are a deleted-Brain-module
> import in `signal-types.test.ts`, caused by the refactor, not by these fixes).

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `7bb48804` | scan-queue #1 — build green when build never ran | Critical | `build-fixer/lib/buildScanner.ts` |
| 2 | `d072ee42` | taskrunner #1 — rate-limit only on stderr → retry storm | Critical | `Claude/sub_ClaudeCodeManager/executionManager.ts` |
| 3 | `4e51b2e9` | context #1 — cleanup wipes whole context map | Critical | `Context/hooks/useContextGenerationStream.ts` |
| 4 | `187f431b` | reflector #1 — `process.cwd()` crashes client panel | Critical | `reflector/.../ExecutiveSummary.tsx` |
| 5 | `30fb557d` | workspace #1 — commit-but-not-pushed false success | High | `api/git/commit-and-push/route.ts` |
| 6 | `f4ca7bb7` | remote #3 — PATCH mutates wrong device | Critical | `lib/remote/deviceRegistry.ts`, `api/remote/devices/[id]/route.ts` |
| 7 | `284186a5` | remote #4 — PostgREST `.or()` filter injection | High | `api/remote/mesh/commands/route.ts`, `lib/remote/commandProcessor.ts` |
| 8 | `9c6f1d7e` | remote #5 — fleet command_type + unbounded fan-out | High | `api/remote/fleet/route.ts` |

## What was fixed

1. **Build-fixer no longer reports green on a broken build.** `scanBuildErrors` ignored the build exit code and returned `success/0-errors` whenever its TS/ESLint regexes matched nothing. A non-zero exit with zero parsed diagnostics now returns `success:false` with an output tail, so command-not-found / crash / unrecognized-format builds surface instead of being silently swallowed.
2. **Rate limits are detected on stdout.** The CLI runs `--output-format stream-json`, which writes limit events to stdout; detection scanned only stderr, misclassifying a rate-limited run as a generic failure and triggering an immediate re-queue (retry storm). Detection now scans stdout+stderr.
3. **Context map is only deleted when generation produced replacements.** `onResult` fired cleanup on any stream completion, wiping the entire context map after a cutoff that created nothing. Cleanup is now gated on the generation summary reporting ≥1 new context/group.
4. **Reflector panel no longer crashes on analysis start.** `process.cwd()` in a `'use client'` component threw in the browser; the path now resolves from the server project store (filtered project, else first known project).
5. **commit-and-push detects committed-but-not-pushed.** A push-intending run that leaves the branch ahead of upstream (e.g. a retry where `git commit` reported nothing-to-commit as non-fatal) now returns `committed_but_not_pushed` instead of a blanket success; best-effort, skipped when no upstream.
6. **PATCH /devices/[id] targets the right device.** `updateStatus()` updates `this.deviceId` (the server's own device); added `updateStatusById()` and routed the PATCH through it so the URL device is the one mutated.
7. **PostgREST `.or()` filter injection blocked.** `target_device_id` / `localDeviceId` were interpolated into the filter grammar; both sites now require a safe id charset (mesh rejects with 400; the processor falls back to broadcast-only).
8. **Fleet batch hardened.** Added the same `command_type` allow-list the main/mesh routes enforce, plus a 200-device cap to stop unbounded fan-out into the shared queue.

## Verification

| Gate | Before | After |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| Tests | 539/542 (3 fail: deleted Brain module) | 539/542 (same 3, unrelated) |
| ESLint (changed files) | 13 pre-existing (require()/no-console) | 13 same pre-existing; 0 new |

## Patterns established (catalogue items 1–4)

1. **Exit-code-blind success.** Any "scan/run a subprocess and parse its output" path must consult the process exit code, not just whether the parser matched. A clean parse of failed output is a *failure*, not a pass. (buildScanner)
2. **Stream-format-aware error detection.** When a CLI is run with `--output-format stream-json`, error/limit signals move from stderr to stdout. Detectors keyed on the wrong stream silently miss them. (executionManager)
3. **Destructive cleanup must be gated on the constructive step succeeding.** "Delete old data after creating new" is only safe if you verify new data was actually created in the same run. (context cleanup)
4. **PostgREST `.or()`/`.filter()` string args are a grammar, not bound values.** Any user/config value interpolated into them needs a charset allow-list, exactly like SQL. (mesh/commandProcessor)

## What remains (per INDEX)

- **Remote auth/ownership (remote #1, #2)** — deferred by decision; needs an API-key-auth + device-ownership design, not a quick fix.
- **Waves 2–7** (37 findings): concurrency/double-exec (7), orphaned lifecycle (4), DB integrity (6), computed-data correctness (3), privileged-surface validation (2), data leak (1), UI polish (8). See `INDEX.md` → "Suggested fix-wave split".
