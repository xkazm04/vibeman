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

## Open follow-ups (from Run #3 vibeman-on-vibeman, 2026-04-11)
- ~~Interactive sessions use `--dangerously-skip-permissions`~~ — **DONE** (Run #2)
- ~~No persistence of manual sessions across page refresh~~ — **DONE** (Run #3: zustand persist + recovery)
- Automated sessions in the sidebar are read-only display — clicking them could open their CompactTerminal in a modal too
- The `execute_claude` / `abort_claude` registration gap with ProcessManager should be fixed for proper cleanup
- **2026-04-11** — Claude Code `stop_reason="tool_use"` is the signal that tool approval is needed. Different from `stop_reason="end_turn"` which means normal conversation turn complete.
- ~~Safe tools list could be used to auto-approve in CLI path~~ — **DONE** (Run #4: SAFE_TOOLS set in manualSession.types.ts, auto-approve in store)
