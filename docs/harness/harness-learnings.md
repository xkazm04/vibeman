# Vibeman Harness — Accumulated Learnings

## React / Next.js
- React 19's `useRef<T>()` without an argument is a TypeScript error; always pass `useRef<T>(undefined)` or `useRef<T>(null)`
- `.next/types/validator.ts` caches route type declarations; must delete `.next/types/` after removing route files
- Custom SVG icon components don't satisfy Lucide's `ForwardRefExoticComponent` type; use `React.ComponentType<{ className?: string }>` as the union type

## Testing / Vitest
- Vitest 4 removed `poolOptions`; use top-level `maxWorkers: 1` for sequential execution
- Never use `@testing-library/react`'s `waitFor()` with `vi.useFakeTimers()` — it polls with real timers, creating deadlocks
- Use `act()` + `vi.advanceTimersByTimeAsync()` for async timer-based tests
- SQLite test databases need `PRAGMA busy_timeout = 5000` to survive concurrent connection attempts
- When hooks are refactored (e.g., from usePolling to useQuery), tests must be updated to mock the new dependencies

## Database / SQLite
- All migrations should use `DbConnection` from `drivers/types`, not `Database` from `better-sqlite3` directly
- `result || null` vs `result ?? null` — use `??` for DB results to correctly handle falsy-but-valid values
- Every table used by a repository should be listed in `VALID_TABLE_NAMES` in `repository.utils.ts`
- New model type files should be re-exported from `db/index.ts` barrel

## API Routes
- Deleted routes leave references in observability seed data and frontend fetch calls
- All error responses should include `success: false` field, not just an `error` field
- Catch blocks should always `console.error` before returning error responses

## Hooks / State
- `useCallback` that depends on frequently-changing state (like retryCount) causes the callback identity to change, which triggers useEffect cleanup, which can cancel pending timers
- For values consumed inside timers or async callbacks, use `useRef` to break the closure dependency
- When `executePoll` is a useCallback, avoid putting `retryCount` in its dependency array; read from a ref instead

## Architecture
- The Conductor V3 pipeline checks `shouldAbort()` at every stage boundary — this is the correct pattern for interruptible pipelines
- `waitForResume()` has a 24-hour max timeout to prevent infinite hangs — good safety mechanism
- Shell injection was hardened in gitCommitter by switching from string-interpolated `execSync` to `execFileSync` with argv arrays

## Structural facts
- **2026-04-11** — `execute_claude` in `claude_cmds.rs` does NOT register with `ProcessManager` — abort_claude may not work for those executions. The commands operate independently.
- **2026-04-11** — Interactive CLI sessions store stdin handles in `AppState.interactive_stdins` (separate from ProcessManager) — this is because execute_claude never used ProcessManager for registration.
- **2026-04-11** — Tauri build artifacts in `src-tauri/target/debug/build/.../tauri-codegen-assets/*.ts` are binary files that tsc picks up as errors. These are not real errors — filter with `grep -v "src-tauri/target"` when counting.
- **2026-04-11** — The `needs_input` concept already exists at Conductor V3 pipeline level (`reflectPhase.ts:544-555`), distinct from CLI-level `input_needed` which tracks when Claude's stdout goes quiet after an assistant turn.
- **2026-06-14** — Vibeman's own context map lives in `database/goals.db` (`contexts`, `context_groups`, `context_group_relationships` tables — NOT in `database/contexts.db`, which is empty). Projects are in `database/projects.db`. The `vibeman` project id is `c32769af-72ed-4764-bd27-550d46f14bc5`. Read these directly with better-sqlite3 (set `NODE_PATH` to the repo `node_modules`) when the HTTP API is unreachable.
- **2026-06-14** — Do NOT assume `localhost:3000` is Vibeman: `/api/health` may answer while every data route (`/api/projects`, `/api/contexts`, …) 404s because a *different* app occupies the port. Confirm by checking a data route returns JSON, not the app shell.
- **2026-06-14** — Remote Device Control (`src/app/api/remote/**`, `src/lib/remote/**`) is backed by **Supabase with a service-role key** (bypasses RLS), not the local SQLite. Its mesh/fleet command endpoints are *intentionally* unauthenticated (documented in `mesh/commands/route.ts`) — a real security gap, deferred pending an auth/ownership design decision.
- **2026-06-14** — ESLint enforces `no-console` in `src/app/api/**` route handlers but allows `console.*` in `src/lib/**`. Put diagnostic logging in lib helpers, not route bodies, to stay lint-clean.

## Open follow-ups (from Run #3 vibeman-on-vibeman, 2026-04-11)
- ~~Interactive sessions use `--dangerously-skip-permissions`~~ — **DONE** (Run #2)
- ~~No persistence of manual sessions across page refresh~~ — **DONE** (Run #3: zustand persist + recovery)
- Automated sessions in the sidebar are read-only display — clicking them could open their CompactTerminal in a modal too
- The `execute_claude` / `abort_claude` registration gap with ProcessManager should be fixed for proper cleanup
- **2026-04-11** — Claude Code `stop_reason="tool_use"` is the signal that tool approval is needed. Different from `stop_reason="end_turn"` which means normal conversation turn complete.
- ~~Safe tools list could be used to auto-approve in CLI path~~ — **DONE** (Run #4: SAFE_TOOLS set in manualSession.types.ts, auto-approve in store)

## Open follow-ups (from bug-hunter+ui-perfectionist scan, 2026-06-14)
Full triage: `docs/harness/bug-ux-scan-2026-06-14/INDEX.md` (50 findings across 10 live contexts). Wave 1 + remote cheap-subset = 8 fixes; Wave 2 = 4 fixes. All shipped on branch `vibeman/bug-ux-fixes` (see `FIXES-WAVE-1.md`, `FIXES-WAVE-2.md`). Remaining:
- **Remote auth/ownership (remote #1, #2)** — mesh/fleet have zero auth and there is no device-ownership model. Deferred: needs an API-key-auth + ownership design, not a quick fix.
- ~~**Wave 2 — concurrency/double-exec:**~~ **DONE** (4 of 5): scan-queue PATCH status guard, orphan-recovery age threshold, file-watch wakes worker, architecture analysis marked running. **taskrunner #2 (taskId=requirementName collisions) DEFERRED** — its file `src/app/Claude/lib/claudeExecutionQueue.ts` is in the active headless-slim WIP; editing it would entangle the refactor into the fix commit. Pick up once that file is committed/stashed.
- ~~**Wave 3 — orphaned lifecycle:**~~ **DONE** (3 of 4): exec-analysis zombie reaper (`failStaleRunning`), session `getActive` heartbeat-liveness filter, direction half-pair `complete` flag. **taskrunner #4 (PID orphan-reaping / sessionId threading) DEFERRED** — same WIP file `claudeExecutionQueue.ts` as taskrunner #2. NOTE discovered this wave: the session `getStale*` reaper helpers (`getStaleRunning`/`getStalePending`/`getStalePaused`) have **zero callers** — nothing reaps sessions; `getActive` now self-guards via heartbeat instead.
- ~~**Wave 4 — DB integrity:**~~ **DONE** (5 of 6): migration 067 savepoints (was raw nested BEGIN), `recordMigration` upsert-to-applied, `buildUpdateStatement` excludes `updated_at`, `safeParseJsonObject` exposed at the repo boundary, sqlite driver verifies WAL/FK pragmas. **context #3 (`batchMoveContexts` CASE-without-ELSE NULLs group_id) DEFERRED** — its file `src/app/db/repositories/context.repository.ts` is in the headless-slim WIP. NEW structural facts: migration runner `runOnce` wraps each migration in one txn (so migrations must NOT open raw `BEGIN` — use SAVEPOINT); `json-utils` has `safeParseJson`/`safeParseJsonObject`/`parseJsonArray`; `no-console` is NOT enforced in `src/app/db/**` or `src/lib/**` (only `src/app/api/**`).
- ~~**Wave 5 — computed-data correctness:**~~ **DONE** (3 of 5): context refresh now hits `/api/contexts/detail?contextId=` (the `[id]` route does not exist; detail returns `{success,data}`), proposalAdapter no longer fed `projectPath` as `contextDescription`, impact-simulator excludes moved files by path-set (was id-vs-path). **docs #2 (X-Ray edge keying) MOVED to Wave 6** (coupled to docs #1 X-Ray wiring — no data flows until wired). **taskrunner #3 (`getChangedFiles` HEAD~1) WIP-blocked** in `claudeExecutionQueue.ts`. NEW: `ImplementationProposalBridge.tsx` has a pre-existing `Compilation Skipped: Existing memoization could not be preserved` lint error on its `handleError` useCallback (React Compiler) — not introduced by edits.
- ~~**Wave 6 — UI dead actions / mock data / X-Ray:**~~ **DONE** (6 inc. docs #2): X-Ray store now wired via instrumentation-buffer bridge (new `setConnected` action) + bidirectional edge lookup, ProposalPanel mock proposals removed, dead "Generate Ideas" CTA fixed in BufferView AND KanbanBoard (real testids `generated-ideas-btn`/`detailed-ideas-btn`), 409 treated as success, BufferItem 0-score null-check. **manager #1 (Accept-with-Code) WIP-blocked** in `DirectionCarousel.tsx`. NEW: X-Ray has TWO disconnected data sources — server SSE `/api/xray/stream` (via store.connect()) and the client `startXRaySimulation` buffer; the toggle uses the client simulation, so it must bridge buffer→store manually. `useProposals.ts` has a pre-existing React-Compiler `preserve-manual-memoization` error on its `directionProposals` useMemo.
- ~~**Wave 7 — polish:**~~ **DONE** (all 7): system-map node spread widened (helpers + XRaySystemMap), PreviewModal exit animation restored, Manager Map empty-state copy, Tinder swipe-revert robust (identity-check + clamp, 7 variants), health-tooltip scroll reposition, Hot-Paths NaN guard, dead ComponentGrid deleted. NEW: `PreviewModal.tsx` has a pre-existing React-Compiler error on its `copyCode` useCallback (unrelated to edits).
- ~~**Wave 8 — the missed clean findings:**~~ **DONE** (all 7): observability ingest validation + batch cap, git-branches concurrency bound + execFile, lifecycle orchestrator project-scoping, context drag-flush sync, file-watch notification real FK id, reflector cooldown → HTTP 429, reflector trigger loading-state wired. **Accurate final ledger: 48 fixed (7 of 9 Criticals), 2 remote-deferred (remote #1/#2 auth design).**
- ~~**WIP-blocked bucket:**~~ **DONE** — user committed the headless-slim refactor (`3f81b889`: 23 added / 624 deleted / 56 modified / 5 renamed), unblocking context #3 (batchMoveContexts ELSE group_id), manager #1 (acceptWithCode wired), taskrunner #2 (addTask clobber guard), #3 (getChangedFiles diffs captured-HEAD..HEAD not HEAD~1), #4 (queue creates a tracking session per execution → PID reaping; marks it completed/failed at end). NEW: `claudeExecutionQueue.ts` uses a deliberate `require()` convention (circular-import avoidance) — but `child_process` and `session.repository` are cycle-safe as top-level imports. taskrunner #4 now creates a `claude_code_sessions` row per queue execution (interacts with the Wave-3 getActive heartbeat filter). Full run summary in `bug-ux-scan-2026-06-14/` (INDEX + FIXES-SUMMARY + FIXES-WAVE-1..8 + FIXES-WIP-CLEARED).
- **Wave 4 — DB integrity (6):** nested-transaction migration 067 crash, `buildUpdateStatement` double-binds `updated_at`, migration success recorded outside txn, `batchMoveContexts` CASE-without-ELSE NULLs group_id, JSON-column no safe-parse, WAL/FK pragmas unverified.
- **Wave 5 — computed-data correctness (5):** `getChangedFiles` HEAD~1 mis-attribution, X-Ray edge-id keying mismatch, impact-simulator id-vs-path, dead context-refresh route, proposalAdapter path-into-rationale leak.
- **Wave 6 — UI dead actions / mock data (6):** "Accept with Code" unwired, ProposalPanel hardcoded mocks, dead "Generate Ideas" CTA, X-Ray store never wired, 409-as-error, effort/impact 0 dropped.
- **Wave 7 — polish (7):** system-map node overlap, PreviewModal exit animation, Map "All Changes" copy, Tinder revert index race, health-tooltip scroll, Hot-Paths NaN bar, dead ComponentGrid.
