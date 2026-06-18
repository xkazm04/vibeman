# Brain & Behavioral Signals — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495710438_4u5q9sm
> Group: Intelligence Layer
> Files read: ~14
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

> NOTE — STALE MANIFEST: ~14 of the 23 manifest files do not exist at the listed paths. The **entire `src/app/features/Brain/` directory is gone** (BrainLayout, InsightsPanel, InsightsTable, ReflectionTerminal, ReflectionHistoryPanel, SignalDetailDrawer, BehavioralFocusPanel, DecaySettings, the whole `sub_MemoryCanvas/` tree — EventCanvasD3, canvasLayout, signalMapper, types, EventCanvasTimeline). `src/stores/brainStore.ts` is gone. The API routes `insights/route.ts`, `insights/effectiveness/route.ts`, and `outcomes/route.ts` do not exist. The Brain backend now lives in `src/lib/brain/*` and `src/app/db/repositories/brain-*`; the UI was folded into `src/app/features/reflector/`. Effectiveness scoring math lives in `src/lib/brain/insightAutoPruner.ts` and `src/lib/brain/behavioralContext.ts` (there is no effectiveness route). Findings below target the real, current implementation.

## 1. signal-types.test.ts FAILS importing a deleted canvas-constants module (`LANE_TYPES`/`COLORS`/`LABELS`)
- **Severity**: High
- **Lens**: test-mastery
- **Category**: Stale test / dead-module reference
- **File**: tests/unit/signal-types.test.ts:146-167 (imports `@/app/features/Brain/sub_MemoryCanvas/lib/constants`)
- **Scenario**: The "Consistency across layers" block does `await import('@/app/features/Brain/sub_MemoryCanvas/lib/constants')` for `LANE_TYPES`, `COLORS`, `LABELS`. That module was deleted with the rest of `sub_MemoryCanvas/`. A repo-wide grep for `export const LANE_TYPES` returns ZERO hits. The 3 dynamic-import tests throw "Cannot find module" → suite fails.
- **Root cause**: Canvas/visualization layer was removed but its cross-layer consistency tests were never deleted or repointed. The test asserts an invariant (canvas color/label maps must equal `SIGNAL_METADATA`) against code that no longer exists.
- **Impact**: Red CI on a brain test; the 6 *valid* enum/metadata tests in the same file are masked by the failure; a reader can't tell if the brain is broken or the test is stale. This is the failure flagged in the task — it is a **stale test, not a product bug**. The "real constants module" did not move; it was deleted along with the canvas.
- **Fix sketch**: Delete the `describe('Consistency across layers')` block (lines 144-168). If a canvas is ever reintroduced, recreate the assertion against the new module. Keep the 6 enum/metadata tests.
- **Value**: effort 1 / impact 6 / risk 1

## 2. Effectiveness score is wildly inflated when pre-period acceptance is near-zero (0.01 floor)
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: Scoring math / divide-by-small-number
- **File**: src/lib/brain/insightAutoPruner.ts:56-58 (`computeInsightScore`); duplicated in src/lib/brain/behavioralContext.ts:346
- **Scenario**: `score = ((postRate - preRate) / Math.max(preRate, 0.01)) * 100`. If before-period acceptance rate is 0 (e.g. a rough patch — 5 rejections, 0 accepts) and after is even 1/5 = 0.2, the score is `(0.2 - 0) / 0.01 * 100 = 2000%`. Any insight that happens to be learned during a slump is scored as massively "helpful". Symmetrically, a drop from 0.02→0.0 yields `-100%` (capped), but an improvement off a ~0 base is unbounded.
- **Root cause**: Relative-change formula with a hard 0.01 denominator floor was chosen to "avoid div-by-zero", but 0.01 is far below realistic acceptance rates, so it acts as a 100× amplifier rather than a guard. The metric assumes preRate is a stable baseline; near zero it isn't.
- **Impact**: `getTopEffectiveInsights` (behavioralContext) surfaces these as the project's "top insights" injected into the reflection/LLM prompt → wrong recommendations. Auto-pruner's conflict winner can be picked by noise. Drives the headline "effectiveness %" users see.
- **Fix sketch**: Use an absolute delta (`postRate - preRate`, range -1..1) scaled to ±100, or require `preRate >= some floor (e.g. 0.1)` for a *reliable* verdict; flag near-zero-baseline cases as `neutral`/unreliable instead of emitting a giant percentage.
- **Value**: effort 3 / impact 8 / risk 4

## 3. Conflict auto-resolve + action-shape assertions are gated behind `if (result.X > 0)` (success-theater)
- **Severity**: High
- **Lens**: test-mastery
- **Category**: Success-theater test / unasserted critical branch
- **File**: tests/unit/brain/insight-auto-pruner.test.ts:402-409 and 479-485
- **Scenario**: The "should auto-resolve conflict when gap >20%" test wraps ALL its assertions in `if (result.conflictsAutoResolved > 0) { ... }`. If the conflict-resolution math regresses to 0 (e.g. score formula change from finding #2, a scoreMap key mismatch, or the `Math.abs(scoreDiff) > 20` gate), the test passes green having asserted nothing. Same pattern at line 479 (`if (result.actions.length > 0)`). The one negative-path test (gap <=20% → 0) is real, but the positive path — the entire Step-B conflict-resolution engine — has no enforced assertion.
- **Root cause**: Test authored defensively against the formula's brittleness instead of pinning a deterministic fixture that MUST resolve. The most business-critical branch (auto-deprioritizing the losing insight, demoting its confidence by 20) is effectively untested.
- **Impact**: Conflict auto-resolution can silently break; `conflict_resolution='keep_other'`, the -20 confidence demote, and the symmetric other-side update could all regress undetected. Blast radius: every reflection completion runs this.
- **Fix sketch**: Build a fixture with a guaranteed >20% gap (high preRate→postRate jump for A, drop for B), then assert unconditionally: `conflictsAutoResolved === 1`, winner `conflict_resolution==='keep_this'`, loser confidence === original-20, both `conflict_resolved===1`.
- **Value**: effort 3 / impact 7 / risk 2

## 4. `applyDecay` weekly idempotency guard breaks across DST / for projects whose Monday is recent
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: Clock/timezone boundary
- **File**: src/app/db/repositories/behavioral-signal.repository.ts:58-64 (`getWeekStart`) + 277-289 (`applyDecay` loop)
- **Scenario**: The decay cycle is keyed by `decay_applied_at < weekStart` where weekStart is Monday-00:00-**UTC**. `completeReflection` calls `applySignalDecay` on *every* reflection (brainService.ts:421). Within one UTC-week the guard correctly no-ops the 2nd call. But the guard is purely string-compared ISO timestamps: a signal decayed Sunday 23:30 local (= Monday 04:30 UTC) and one decayed Monday 00:30 UTC fall in different "weeks" only by UTC reckoning — fine for correctness, but a reflection burst that straddles the Monday-00:00-UTC boundary will decay the SAME old signals a 2nd time that "week" because the new weekStart has advanced. Old signals then get `weight * 0.9 * 0.9` in rapid succession, over-decaying recency weighting.
- **Root cause**: Idempotency is anchored to wall-clock week boundary, not to "decayed since last cycle for THIS signal". Two reflections minutes apart but on opposite sides of Monday 00:00 UTC each see a fresh weekStart and re-decay.
- **Impact**: Bounded (one extra 10% decay), but it silently distorts the recency-weighted behavioral context and `total_weight` aggregates feeding the heatmap and context activity. No crash; wrong aggregates.
- **Fix sketch**: Guard on elapsed time since each signal's own `decay_applied_at` (e.g. `decay_applied_at IS NULL OR decay_applied_at < now - 6.5 days`) rather than a shared calendar weekStart; or make decay strictly cron-driven (not per-reflection).
- **Value**: effort 4 / impact 5 / risk 4

## 5. Signal decay/effectiveness/`getWeekStart` math has zero unit tests (untested business-critical path)
- **Severity**: Medium
- **Lens**: test-mastery
- **Category**: Coverage gap — untested core math
- **File**: src/app/db/repositories/behavioral-signal.repository.ts:259-292 (`applyDecay`) + src/lib/brain/brainService.ts:518-528 (`applySignalDecay`); no test file exists (grep for `applyDecay`/`getWeekStart` across tests/ → 0 hits in any decay test)
- **Scenario**: Decay is the mechanism that keeps behavioral context recency-weighted and the signals table bounded — it runs on every reflection. There is NO test asserting: (a) signals below `SIGNAL_MIN_WEIGHT` (0.01) are skipped, (b) weight multiplies by `decayFactor` exactly once per cycle, (c) the `decay_applied_at < weekStart` re-run guard actually suppresses a 2nd same-cycle call, (d) `decayStartDays = max(1, floor(retention*0.2))` boundary, (e) the 1000-row batch loop terminates. Finding #4's double-decay would have been caught by (c).
- **Root cause**: All brain tests target insight dedup/pruning/conflict; the signal-side decay+retention math (equally load-bearing, simpler to assert) was never anchored to an invariant.
- **Impact**: Decay-factor or batch-loop regressions ship silently; over- or under-decay corrupts every downstream aggregate (context, heatmap, top-insights). High leverage, low effort — ideal LLM-generatable batch.
- **Fix sketch**: Add `tests/unit/brain/signal-decay.test.ts` (mirror insight-auto-pruner's better-sqlite3 harness): seed signals with varied weights/timestamps, call `applyDecay` twice, assert single-decay per cycle, min-weight skip, batch termination, and `applySignalDecay`'s decayStart derivation.
- **Value**: effort 3 / impact 6 / risk 1
