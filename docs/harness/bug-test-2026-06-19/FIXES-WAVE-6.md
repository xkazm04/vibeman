# Bug-Test Fix Wave 6 — CAS / atomicity (Highs)

> 5 atomic fix commits closing **5 High findings** (ideas #2, manager #3,
> integrations #2, context-mgmt #2, manager #2). One mental model: *a write that
> spans a read-then-write, a loop, or a pair must be atomic / compare-and-set so
> concurrent or retried callers can't corrupt it*. Baseline: tsc source **0**,
> vitest **564/564** green. Zero regressions. Branch `vibeman/bug-test-fixes-2026-06-19`.

## Commits

| # | Commit | Finding | Sev |
|---|---|---|---|
| 1 | `4e3842a6` | ideas #2 | H |
| 2 | `441b67ed` | manager #3 | H |
| 3 | `03c0ef9e` | integrations #2 | H |
| 4 | `b52a30b7` | context-mgmt #2 | H |
| 5 | `a5fb03d3` | manager #2 | H |

## What was fixed

- **ideas #2 — bulk approve was all-or-nothing-but-not-transactional.** `/api/ideas/approve` looped `updateIdea` with no per-id guard; an illegal transition (an already-`implemented` idea) threw to the outer catch → 500, while ideas processed before it had already committed, so a blind re-submit double-processed the first half. Each id is now in its own try/catch; failures collect into `failed[]` and the loop continues, with `success = (failed.length === 0)`.
- **manager #3 — cross-task callbacks could overwrite.** `completePlan` UPDATEd unconditionally, so a duplicate/late `/complete` callback overwrote the first result; `selectPlan` wrote with no status guard. `completePlan` now CAS on `status='running'`, `selectPlan` on `status='completed'`.
- **integrations #2 — concurrent template scans 500'd.** `upsert` did SELECT-then-INSERT; two concurrent scans of the same `(source_project_path, template_id)` both INSERTed → UNIQUE violation → generic 500. The create-branch INSERT now uses `ON CONFLICT … DO NOTHING` and falls back to the row the other scan created.
- **context-mgmt #2 — duplicate group-health scans.** The route checked `getRunningByGroup` (status='running') but `create` inserts `pending`, so two concurrent POSTs both created pending scans. Added `createIfNoActiveScan` — a `BEGIN IMMEDIATE` transaction that re-checks for an active (pending|running) scan and inserts only if none; route returns 409 on null.
- **manager #2 — A/B pair could both be accepted.** `acceptPairedDirection` accepted one variant then rejected the partner `WHERE status='pending'`, but the partner had been claimed to `processing`, so two concurrent accepts of opposite variants both stuck (two requirement files + two Claude sessions on mutually-exclusive code). Now one `BEGIN IMMEDIATE` transaction with the partner-reject matching `status IN ('pending','processing')`; the serialized second accept hits a terminal `rejected→accepted` and throws (its saga compensates). Invariant "exactly one accepted, one rejected" holds.

## Pattern note

Three of these use **`db.transaction(fn).immediate()`** (BEGIN IMMEDIATE) to take the SQLite write lock up front and serialize concurrent callers — the right tool when a read-then-write or a pair invariant must be atomic across separate HTTP requests / connections. The other two use single-statement CAS (`WHERE … AND status=?`) and conflict-tolerant `ON CONFLICT`.

## Verification

| Gate | Baseline | After Wave 6 |
|---|---|---|
| tsc (source, excl. `.next`) | 0 | **0** |
| vitest | 564/564 | **564/564** green |

## Cumulative status (Waves 1–6)

- **Closed: 16 Critical + 19 High + cleanup** (38 fix/cleanup commits + 6 wave docs).
- **Test suite green: 564/564** (+17 security assertions). **Live map: 19 → 16 contexts.**
- **Deferred (logged, with rationale):** remote #1 (auth decision), scan-queue #3 abort-propagation, taskrunner #3 abort-reconcile (FE), taskrunner #4 global backoff, orphaned DB tables, moderate context refresh, manager #3 / cross-task vitest suite (the CAS bug is fixed; a dedicated test suite was suggested).
- Remaining per INDEX: ~29 High, ~28 Medium, 2 Low.
</content>
