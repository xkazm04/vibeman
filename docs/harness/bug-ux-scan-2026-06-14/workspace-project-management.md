# Workspace & Project Management — bug-hunter + ui-perfectionist scan

> Context: Workspace & Project Management
> Total: 5 findings (Critical: 0, High: 3, Medium: 1, Low: 1)

## 1. Partial-failure on commit+push leaves repo in committed-but-unpushed state, with no rollback and a misleading retry path

- **Severity**: High
- **Lens**: bug-hunter
- **Category**: partial-failure-state
- **File**: src/app/api/git/commit-and-push/route.ts:271-372
- **Scenario**: The route runs `commands` (e.g. `git add .` → `git commit -m "..."` → `git push origin {branch}`) sequentially. If `git commit` succeeds but `git push` fails (auth expired, no network, rejected non-fast-forward, remote ahead), the loop returns `{ success: false }` with HTTP 500. The local commit has already been created. The caller (TaskRunner / autonomous flows) sees a hard failure and typically retries the *entire* command set. On retry, `git add .` + `git commit` now hit "nothing to commit" — which `isNonFatalError` (line 144-151) treats as **success** — so the second attempt reports success without ever pushing the already-made commit. The work silently never reaches the remote.
- **Root cause**: The sequence is treated as all-or-nothing for reporting but is not transactional; a mid-sequence failure is non-recoverable and the "nothing to commit" success-coercion masks the unpushed state on retry.
- **Impact**: Silent data loss at the team level — commits exist locally but never push; success theater on retry hides it. Worst on shared CI/autonomous runners where the local checkout is later reset or discarded.
- **Fix sketch**: Track which commands already ran; on push failure return a distinct `partial: true` status with the SHA of the local commit so the caller retries *only the push* (or surfaces a manual-resolution prompt) instead of replaying `add`+`commit`. Do not coerce "nothing to commit" to success when a prior `commit` in the same batch already produced a commit.

## 2. `/api/observability/register` accepts and persists unvalidated, unauthenticated external payloads (numbers, sizes, timestamps) with no schema or project ownership check

- **Severity**: High
- **Lens**: bug-hunter
- **Category**: input-validation / silent-corruption
- **File**: src/app/api/observability/register/route.ts:13-65, 92-139
- **Scenario**: This is an *ingest* endpoint for external projects. It pulls `project_id` and arbitrary `callData` from the body with zero validation beyond `endpoint`/`method` truthiness. `status_code`, `response_time_ms`, `request_size_bytes`, etc. are blind-cast (`status_code as number`) and written straight into `obs_api_calls`. A client sending `response_time_ms: "abc"`, a negative size, or a far-future `called_at` corrupts the aggregation: `aggregateHourlyStats` computes `AVG(response_time_ms)` and `strftime('%Y-%m-%dT%H:00:00', called_at)` — a non-ISO `called_at` yields a `null`/garbage `hour_bucket`, and a poisoned average silently skews every dashboard stat. There is also no check that the caller owns `project_id`, and `status === 'onboarded'` will silently auto-create+enable observability config for *any* project id (line 27-48).
- **Root cause**: Trust boundary violation — the endpoint treats unauthenticated remote input as already-clean and relies on downstream SQL/casts to "handle" it.
- **Impact**: Stats corruption (wrong averages/error rates feed the Overview observatory + alerting), arbitrary project-id config creation, and DB bloat from unbounded batch arrays (no size cap on `batch`).
- **Fix sketch**: Validate each field (finite non-negative numbers, ISO-8601 `called_at`, enum `method`, max batch length), reject (don't coerce) malformed items, and verify the project exists/owns the registration before auto-creating config.

## 3. Concurrent `git rev-parse` / `git status` fan-out in branches route uses shell `exec` and can DoS the dev server on a large workspace

- **Severity**: High
- **Lens**: bug-hunter
- **Category**: concurrency / resource-exhaustion
- **File**: src/app/api/git/branches/route.ts:32-45, 70-88
- **Scenario**: `POST` runs `Promise.all(projects.map(...))`, and each project spawns **two** `exec` child processes (`git rev-parse` + `git status --porcelain`) via `child_process.exec` (a real shell). With a workspace of 30-50 projects that is 60-100 simultaneous shell+git processes spawned in one tick, each with a 5s timeout. The Overview dashboard polls this route. On Windows (the documented target OS) shell spawning is heavy; a burst can saturate the machine, and a single hung `git status` on a huge or network-mounted repo blocks one slot for the full 5s while others pile up. There is no concurrency cap and no per-request total budget. (Note: `project.path` flows only into `cwd`, not the command string, so this is resource-exhaustion rather than injection — but unlike commit-and-push, this route does no path validation at all, so a non-existent/garbage path just throws and is swallowed at line 51-54, silently reporting `branch: null`.)
- **Root cause**: Unbounded parallel subprocess fan-out using shell `exec` instead of `execFile`, with no concurrency limit.
- **Impact**: Dev-server stall / event-loop starvation under realistic multi-project workspaces; silent `null` branch when a path is invalid (looks like "not a git repo" indistinguishably from a real error).
- **Fix sketch**: Switch to `execFile('git', [...])` (no shell), cap concurrency (e.g. p-limit of 4-8), and combine branch+dirty into a single `git status -b --porcelain` call to halve process count.

## 4. PreviewModal kills its own exit animation; close is abrupt

- **Severity**: Medium
- **Lens**: ui-perfectionist
- **Category**: missing-polish / animation
- **File**: src/app/features/HallOfFame/components/PreviewModal.tsx:162-166
- **Scenario**: The component does `if (!component) return null;` at line 162, *before* the `AnimatePresence` block. `component` is derived from `componentId` (line 72). When the user closes the modal, `onClose` sets `selectedComponentId` to `null` in the parent, so `componentId` becomes `null`, `getComponentById('')` returns `undefined`, and the component returns `null` on the very next render — unmounting instantly. The `exit={{ opacity: 0, scale: 0.95, y: 20 }}` transition (lines 169-178) and backdrop fade-out never run because `AnimatePresence` is removed from the tree before it can animate the exit. The carefully-authored enter animation has no matching exit, so closing feels like a hard cut versus the smooth open.
- **Root cause**: Early-return on `!component` short-circuits `AnimatePresence`, which must remain mounted to play exit animations for its removed children.
- **Impact**: Inconsistent, jarring close UX — the modal pops out of existence; design intent (symmetric spring in/out + backdrop blur fade) is silently lost.
- **Fix sketch**: Keep `AnimatePresence` mounted and gate the *inner* content on `componentId && component` instead of returning `null` early; let `AnimatePresence` drive the exit on `componentId === null`.

## 5. Orphaned `ComponentGrid` is dead code that has drifted out of sync with the live `ComponentTable`

- **Severity**: Low
- **Lens**: ui-perfectionist
- **Category**: dead-code / design-system-drift
- **File**: src/app/features/HallOfFame/components/ComponentGrid.tsx:13-41
- **Scenario**: `HallOfFameLayout.tsx` renders `ComponentTable` (with `starredIds` + `onToggleStar` star support). `ComponentGrid` is defined but imported nowhere (grep confirms only its own definition site references it). It renders a grid of `ComponentCard`s with a *different, narrower* prop contract (`{ categoryId, onComponentClick }` — no star support) and a different empty-state style (`h-64 text-gray-500` vs the table's bordered `h-32` card). If a future dev wires it up (it looks like a legitimate alternate view), users get a card view missing the star feature entirely and an inconsistent empty state.
- **Root cause**: A superseded view component was left in the tree during the table redesign and never deleted, so it silently diverged from the system of record.
- **Impact**: Maintenance trap and design-system drift; risk of resurrecting a feature-incomplete component. No runtime harm today.
- **Fix sketch**: Delete `ComponentGrid.tsx` (and `ComponentCard` if it is likewise unused outside it), or, if a card view is wanted, bring its props/empty-state in line with `ComponentTable` and add star support.
