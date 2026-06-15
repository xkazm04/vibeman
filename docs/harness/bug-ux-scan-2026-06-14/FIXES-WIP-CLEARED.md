# Bug-UX Scan — WIP-blocked findings cleared

> After the user committed the in-progress `headless-slim` refactor (`3f81b889`), the 5 findings that
> were blocked by uncommitted files became editable. All 5 fixed. 3 commits, branch `vibeman/bug-ux-fixes`.
> Baseline preserved: tsc 0 → 0; tests 539/542 (same 3 deleted-Brain failures).

## Context

These findings lived in files the `headless-slim` refactor was actively editing (`context.repository.ts`,
`DirectionCarousel.tsx`, `claudeExecutionQueue.ts`). Throughout Waves 1-8 I deferred them so a scoped
`git add` couldn't sweep the user's WIP into a fix commit. The refactor is now committed as `3f81b889`
(23 added, 624 deleted, 56 modified, 5 renamed — the Social/Brain/Conductor/Commander/Questions/
Integrations/Annette removal + headless tools + context-mgmt v2), so these are now clean.

## Commits

| # | Commit | Finding | Severity | File |
|---|---|---|---|---|
| 1 | `c04f94cd` | context #3 — `batchMoveContexts` NULLs group_id | High | `db/repositories/context.repository.ts` |
| 2 | `81805abd` | manager #1 — "Accept with Code" ≡ plain Accept | High | `Proposals/components/DirectionCarousel.tsx` |
| 3 | `3a97d57a` | taskrunner #2/#3/#4 | High ×3 | `Claude/lib/claudeExecutionQueue.ts` |

## What was fixed

1. **`batchMoveContexts` keeps groups intact.** `SET group_id = CASE WHEN … END` with no `ELSE` returns NULL for any WHERE-matched row matching no WHEN — silently ejecting it from its group if the id lists ever drift. Added `ELSE group_id`.
2. **"Accept with Code" does something different.** Both buttons called `actions.accept()`; the distinct `acceptWithCode` path (already supported by `useCarousel`) is now wired via a new `onAcceptWithCode` prop (falls back to `onAccept`).
3. **TaskRunner queue — three fixes in one file:**
   - **#2 unique-task guard:** `addTask` no longer `Map.set`s over a task already pending/running under the same requirement-name id (which orphaned the live task's writes and risked two CLI processes on one log file); it returns the in-flight task.
   - **#3 accurate change attribution:** captures the git HEAD before execution and diffs `sinceSha..HEAD`, returning `[]` when no commit was made — instead of `git diff HEAD~1`, which mis-attributed the user's last manual commit (git off) or the wrong commit (0 or >1 commits made).
   - **#4 PID tracking:** the queue now creates a tracking session (and marks it completed/failed) when none was supplied, so the spawned CLI PID is recorded and orphaned processes can be reaped after a server restart.
   - Also hoisted `child_process` + `session.repository` to top-level imports (net −1 `require()` lint error vs HEAD).

## Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| Tests | 539/542 (same 3 deleted-Brain import failures; no regression) |
| ESLint (changed files) | 0 new (claudeExecutionQueue: 2 pre-existing `require()` errors, down from HEAD's 3) |
| Working tree | clean after commit |

## Behavior note (taskrunner #4)

The queue now creates a `claude_code_sessions` row per execution that lacks an explicit session (previously
only sessions started from the session UI had one). This is what enables PID/orphan reaping, and it
interacts correctly with the Wave 3 `getActive` heartbeat-liveness filter (the session is marked
`completed`/`failed` at task end, and would drop from "active" via heartbeat even if that write were missed).
If surfacing every queue execution as a session is undesirable in the sidebar, that's a quick follow-up
(filter by session origin) — flagging it explicitly.

## Status — final

**48 of 50 findings fixed.** The only remaining work is **remote #1/#2** (2 Criticals: mesh/fleet auth +
device-ownership model), deferred by user decision — it needs an auth design, not a quick fix.
See `FIXES-SUMMARY.md` for the full ledger.
