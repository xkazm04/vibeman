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
