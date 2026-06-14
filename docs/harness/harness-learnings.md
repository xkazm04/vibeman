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
- **Wave 3 — orphaned lifecycle (4):** orphaned "running" exec-analyses never reaped, PID orphan-reaping never engages, stale session reaping gaps, orphaned direction half-pairs.
- **Wave 4 — DB integrity (6):** nested-transaction migration 067 crash, `buildUpdateStatement` double-binds `updated_at`, migration success recorded outside txn, `batchMoveContexts` CASE-without-ELSE NULLs group_id, JSON-column no safe-parse, WAL/FK pragmas unverified.
- **Wave 5 — computed-data correctness (5):** `getChangedFiles` HEAD~1 mis-attribution, X-Ray edge-id keying mismatch, impact-simulator id-vs-path, dead context-refresh route, proposalAdapter path-into-rationale leak.
- **Wave 6 — UI dead actions / mock data (6):** "Accept with Code" unwired, ProposalPanel hardcoded mocks, dead "Generate Ideas" CTA, X-Ray store never wired, 409-as-error, effort/impact 0 dropped.
- **Wave 7 — polish (7):** system-map node overlap, PreviewModal exit animation, Map "All Changes" copy, Tinder revert index race, health-tooltip scroll, Hot-Paths NaN bar, dead ComponentGrid.
