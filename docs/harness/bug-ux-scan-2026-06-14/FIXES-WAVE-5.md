# Bug-UX Scan — Fix Wave 5 — Computed-data correctness

> 3 commits, 3 findings closed. 1 deferred to Wave 6 (docs #2, coupled to docs #1); 1 WIP-blocked (taskrunner #3).
> Branch: `vibeman/bug-ux-fixes`. Baseline preserved: tsc 0 → 0; tests 539/542 (same 3 deleted-Brain failures).
> Mental model: the numbers and attributions the app computes/derives must be right.

## Commits

| # | Commit | Finding | Severity | File |
|---|---|---|---|---|
| 1 | `35bbc2fc` | context #2 — context refresh hits a dead route | High | `Context/sub_ContextOverview/ContextOverviewInline.tsx` |
| 2 | `82d302af` | manager #3 — projectPath leaked into rationale | High | `Manager/components/ImplementationProposalBridge.tsx` |
| 3 | `12ca9990` | docs #4 — impact simulator id-vs-path self-exclude | Medium | `Docs/.../impactSimulator/staticAnalyzer.ts` |

## What was fixed

1. **Context "refresh from DB" actually refreshes.** `refreshContextFromDB` fetched `/api/contexts/[id]` — a route that doesn't exist (the only single-context lookup is `/api/contexts/detail?contextId=`, returning `{ success, data }` not `{ context }`). The 404 made `response.ok` false, so the handler silently no-op'd and just-saved preview/target values were never re-synced until a full reload. Now hits the detail route and reads `data.data`.
2. **No more local filesystem path in proposal text.** `generateProposalsFromLog`'s second arg is `contextDescription`, but the bridge passed `projectPath`, so a raw `C:\Users\…` path was appended to every proposal's rationale ("Additional context: …") and written into generated requirement files. The path is no longer passed; proposals derive from the log alone.
3. **Impact simulator stops counting a context as importing itself.** `analyzeImportPatterns` excluded the moved context via `ctx.id !== contextFiles[0]` — comparing a context **id** to a file **path**, which never matched, so the moved context's own files stayed in `otherFiles` and inflated import-path-change counts, estimated hours, complexity tier and risk. Now excludes by file-path membership against the moved file set.

## Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | 0 errors (unchanged) |
| Tests | 539/542 (same 3 deleted-Brain import failures; no regression) |
| ESLint (changed files) | 0 new (ImplementationProposalBridge has 1 pre-existing `Compilation Skipped` error on an untouched `handleError` useCallback — identical on HEAD) |
| WIP safety | working tree back to 708; only my 3 files touched |

## Patterns established (catalogue items 14–15)

14. **A fetch whose URL 404s is a silent no-op, not an error.** `if (response.ok)` with no `else` swallows a wrong/stale endpoint — the call "succeeds" and does nothing. Verify new client fetches against an actually-existing route + its real response shape, and log/handle the non-ok branch. (context #2)
15. **id-vs-path (and id-vs-name) comparisons silently never match.** A `.filter(x => x.id !== somePath)` looks like an exclusion but excludes nothing when the two sides are different kinds of key. When filtering "self," filter by the actual membership set, not a cross-type equality. (docs #4)

## Deferred

- **docs #2 (X-Ray edge IDs never match)** — moved to Wave 6. It is coupled to docs #1 (the X-Ray store has zero callers, so no data flows at all); fixing the edge keying in isolation changes nothing observable. Both will be fixed together so X-Ray works end-to-end.
- **taskrunner #3 (`getChangedFiles` HEAD~1 mis-attribution)** — WIP-blocked in `src/app/Claude/lib/claudeExecutionQueue.ts` (headless-slim refactor). Joins context #3, taskrunner #2/#4.

## What remains (per INDEX)

Wave 6 — UI dead actions / mock data / X-Ray (docs #1 + docs #2, manager #1/#2, ideas #2/#3/#5). Wave 7 — polish (7). Plus the WIP-blocked bucket and the remote auth/ownership design.
