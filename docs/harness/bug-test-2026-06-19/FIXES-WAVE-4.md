# Bug-Test Fix Wave 4 — Data correctness & silent data-loss (Highs)

> 6 atomic fix commits closing **6 High findings** (brain #2, docs #2, goals #1,
> goals #2, workspace #4, ideas #3). One mental model: *the data the app stores,
> aggregates, and shows must be correct — and a transient failure must not destroy
> good state*. Baseline preserved: tsc source **0**, vitest **547/550** (same 3
> pre-existing). Zero regressions. Branch `vibeman/bug-test-fixes-2026-06-19`.

## Commits

| # | Commit | Finding | Sev |
|---|---|---|---|
| 1 | `ca7b6f28` | ideas #3 | H |
| 2 | `1cbf58e0` | workspace #4 | H |
| 3 | `125eaa80` | brain #2 | H |
| 4 | `4f50801b` | goals #1, goals #2 | H, H |
| 5 | `d8990d05` | docs #2 | H |

## What was fixed

- **ideas #3 — silent scope-loss.** `handleAcceptIdeaVariant` PATCHed the chosen variant's fields and accepted the idea without checking `response.ok`; on a failed save the original (un-edited) idea shipped to a requirement file with a success toast. Now throws on a non-ok PATCH before accepting.
- **workspace #4 — transient blip wiped the project list.** `syncWithServer` set `projects: []` on any fetch throw / non-ok (empty catch). Because the store persists, a momentary backend hiccup blanked the multi-workspace view *and* cascaded into deleting the saved active project. Now a failure leaves `projects` unchanged; `[]` is only set on an explicit 200-with-empty.
- **brain #2 — effectiveness score amplified noise.** `((postRate−preRate)/max(preRate,0.01))*100` turned a near-zero baseline (a slump) into a 100× amplifier — insights learned during slumps scored thousands of % and dominated the reflection/LLM prompt + auto-pruner. Both call sites now use a bounded absolute delta `(postRate−preRate)*100` (percentage points, −100..100); the ±10 thresholds stay meaningful.
- **goals #1 + #2 — standup key chaos.** Writers stored `period_start` as full-ISO while the existence check + public GET compared date-only, so the cache fast-path was dead (every generate re-ran the rate-limited LLM) and GET 404'd on existing rows; and the date-only form was derived via UTC `toISOString()` from a local-midnight Date, filing summaries under the wrong day on TZ-shifted servers. Added `formatPeriodKey(d)` = **local** `YYYY-MM-DD` and use it at every key site (both saves, existence check, generation lock, log); the GET param already matches.
- **docs #2 — layer aggregates corrupted.** The xray POST collapsed every non-external `target_layer` to `'server'` (the type was narrowed to `'server'|'external'`), so `by_layer`/`getLayerTraffic` undercounted client/pages and inflated server. Widened the type to the full 4-layer domain and persist the real `getLayerFromPath()` value (plain TEXT column → no migration).

## Verification

| Gate | Baseline | After Wave 4 |
|---|---|---|
| tsc (source, excl. `.next`) | 0 | **0** |
| vitest | 547/550 | **547/550** (same 3 pre-existing) |

## One-time transition notes (not data loss)

- **goals #1/#2:** existing summaries keyed on full-ISO won't match the new date-only key; they go stale and are re-generated once.
- **docs #2:** xray rows written before this fix keep their `'server'` skew; new traffic is recorded correctly. A backfill is optional.

## Cumulative status (Waves 1–4)

- **Closed: 16 Critical + 12 High** across 29 fix commits + 4 wave docs, 0 regressions throughout (tsc source 0, vitest 547/550 the entire way).
- **Deferred (logged, with rationale):** remote #1 (auth architecture decision), scan-queue #3 abort-propagation, taskrunner #3 abort-reconcile (FE), taskrunner #4 global backoff.
- Remaining per INDEX: 36 High, 28 Medium, 2 Low — plus the **context-map drift cleanup** (3 phantom contexts; deleting the stale `signal-types.test.ts` restores vitest to 550/550).
</content>
