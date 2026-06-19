# Bug-Test Fix Wave 7 — FE state & wiring (Highs)

> 5 atomic fix commits closing **5 High findings** (blueprint #2, blueprint #1,
> context-mgmt #3, workspace #3, testing #2). One mental model: *client state must
> match the server / survive concurrency, and dead wiring must not masquerade as
> working*. Baseline: tsc source **0**, vitest **564/564** green. Zero regressions.
> Branch `vibeman/bug-test-fixes-2026-06-19`.

## Commits

| # | Commit | Finding | Sev |
|---|---|---|---|
| 1 | `aa326103` | blueprint #2 | H |
| 2 | `fba9cfd3` | blueprint #1 | H |
| 3 | `e0783cb3` | context-mgmt #3 | H |
| 4 | `1bcaec7a` | workspace #3 | H |
| 5 | `d31d559a` | testing #2 | H |

## What was fixed

- **blueprint #2 — inverted close wiring.** `<ControlPanel onClose={closeBlueprint}>` bound the drawer's backdrop/escape close to the blueprint action, leaving `isControlPanelOpen` true; only ControlPanel's own inner Drawer override masked it. Now `onClose={closeControlPanel}`.
- **blueprint #1 — stale onboarding step across projects.** `currentStep` is a single global field while `completedSteps` is per-project, and `setActiveProjectId` never recomputed it — switching to a fresh project showed the previous project's step glow. `setActiveProjectId` now recomputes `currentStep = getNextIncompleteStep(projectId)`.
- **context-mgmt #3 — lost drag-drop.** `flushPendingMoves` cleared the entire queue on success, silently dropping moves the user made during the in-flight batch (looked moved, reverted on reload). Now removes only the flushed moves (by object identity — `queueMove` replaces a re-queued context's move with a new object) and re-flushes any that arrived during flight.
- **workspace #3 — client/server project divergence.** `addProject` stored the caller's un-transformed input, not the server's canonical row (auto-detected type, normalized port, restructured git), so git/server-start could run against stale fields until the next sync; `updateProject` had the same optimistic-merge issue. The POST/PUT routes now return the canonical `project` and the store pushes that.
- **testing #2 — dead store masquerading as working.** `testResultStore` fetched the deleted `/api/test-results`, swallowed the 404, and reported `{}`/all-zeros forever. It has **zero live consumers**, so it was deleted (dead code, like the Wave-5 e2e cleanup).

## Verification

| Gate | Baseline | After Wave 7 |
|---|---|---|
| tsc (source, excl. `.next`) | 0 | **0** |
| vitest | 564/564 | **564/564** green |

(Process note: the testResultStore `git rm` initially bundled into the first commit; the
five commits were re-split via a `--mixed` reset so each finding is atomic. Code is
identical — only commit boundaries changed. The user's pre-existing uncommitted changes
were untouched throughout.)

## Cumulative status (Waves 1–7)

- **Closed: 16 Critical + 24 High + cleanup** (44 fix/cleanup commits + 7 wave docs).
- **Test suite green: 564/564.** **Live map: 19 → 16 contexts.**
- **Deferred (logged, with rationale):** remote #1 (auth decision), scan-queue #3 abort-propagation, taskrunner #3 abort-reconcile (FE), taskrunner #4 global backoff, orphaned DB tables, moderate context refresh, cross-task vitest suite.
- Remaining per INDEX: ~24 High (many are "zero-test-coverage" test-mastery items), ~28 Medium, 2 Low.
</content>
