# Feature+UI Scan — Fix Wave 2: Reconnect Inert Autonomy Engines

> 5 findings closed across 4 commits.
> Baseline preserved: TypeScript 0 → 0 errors; tests 539/542 → 539/542 (same 3 pre-existing failures).

The theme: vibeman's flagship value is autonomous orchestration, but several of its
core learning/automation loops were fully implemented yet **had no caller** — dead
capability. This wave reconnects them.

## Commits

| # | Commit | Findings closed | Files |
|---|---|---|---|
| 1 | `feat(mcp): expose brain context + build-fixer…` | brain #1, scan-queue #1 | brain-context.ts, build-fixer.ts, tools/index.ts |
| 2 | `fix(brain): make proactive goal creation idempotent` | brain #5 (prereq) | proactiveGoals.ts |
| 3 | `fix(brain): reconnect signal-decay, revert-learning, cross-project synthesis` | brain #2, #3, #5 | brainService.ts |

## What was reconnected

### New agent-facing surfaces (MCP tools)
1. **`get_brain_context`** — the Brain computes rich behavioral context (active areas, success/failure/revert rate, preferred contexts, top insights) but only injected it at direction-generation time. The new read-only MCP tool calls `/api/brain/context`, letting the running agent self-consult what the project has learned mid-task.
2. **`fix_build`** — the entire build-error → requirement-file engine (`/api/build-fixer`) had zero callers. The new tool runs it (preview or full), so the autonomous agent can detect build breakage and stage Claude Code fix requirements. (The report's UI fix-verify loop is a larger Wave-3/4 follow-up; this is the headless reconnection.)

### Closing the Brain learning loop (reflection cascade)
3. **Signal decay** — `applySignalDecay` (decays old signal weights, prunes beyond retention) had no caller, so signals accumulated forever and behavioral context drifted toward stale, equally-weighted history. Now called best-effort in `completeReflection`. Verified safe: `applyDecay` guards on `decay_applied_at < weekStart`, so it's idempotent per ISO week even if reflections run many times a day.
4. **Revert-learning** — `outcomeTracker.scanForReverts` was never called and its `checkRevert` callback was never implemented, so `revertedCount` was always 0 and the Brain never learned from rolled-back work. Added a read-only `gitCheckRevert()` helper (`git log --fixed-strings --grep=<sha>`, sha sanitized to hex) and wired the scan into the cascade.
5. **Cross-project synthesis** — `runCrossProjectSynthesis` (architecture-drift detection + proactive-goal generation) had no caller, so the flagship autonomy output never fired. Now runs on **global** reflections only.

## ⚠️ Behavior change introduced (deliberate)

Wiring `runCrossProjectSynthesis` means **a completed *global* reflection can now autonomously file goals** (status `open`) for high-confidence cross-project patterns and architecture drift. Safeguards applied:

- **Only global-scope reflections** trigger it (project-scope reflections do not).
- **Only `confidence ≥ 0.8` and non-low-priority** candidates become goals (pre-existing bound in the synthesis loop).
- **Idempotent**: `createGoalFromCandidate` now skips any candidate whose title already has an `open`/`in_progress` goal for that project — so re-running synthesis will not duplicate goals (this was the key safety gap; without it the loop would spam goals every reflection).
- **Best-effort**: wrapped in try/catch; a synthesis failure never blocks reflection completion.

If auto-goal-filing is undesired, commit 3's `if (scope === 'global')` block is the single revert point.

## Verification table

| Gate | Before | After Wave 2 |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vitest run` | 539/542 (3 pre-existing fail) | 539/542 (same 3) |

No Rust changes this wave (so no `cargo check` needed).

## Cumulative status (waves 1–2)

| Wave | Theme | Closed |
|---|---|---|
| 1 | Safety & correctness criticals | 6 |
| 2 | Reconnect inert autonomy engines | 5 |
| **Total** | | **11 / 95** |

## Patterns established (catalogue items 6–8)

6. **Caller-less capability ("dead backend")** — a fully-implemented service/function with zero callers (grep its export name → only its own definition). Bites worst in an "autonomous" product: the marketed capability silently never fires. Fix: wire it into an existing trigger (a cascade, a scheduler, an MCP tool); prefer best-effort/non-blocking so reconnection can't destabilize the host path.
7. **Verify-before-activate** — before switching dormant code on, confirm its safety invariants actually hold (idempotency guard present? output bounded? dedup against existing state?). Here, decay's per-week guard existed (safe) but proactive-goal creation had no DB dedup (would spam) — the same "activate it" task needed a guard added first. Never assume the dormant code was finished.
8. **Headless reconnection over speculative UI** — when a backend is dead in a headless app, exposing it as an MCP tool (agent-callable) is a smaller, lower-risk reconnection than building the UI the original design assumed. Reach for the UI only when a human-in-the-loop surface is the actual goal.

## What remains

- **Wave 3 — Surface built backends in the UI** (6): Manager "Implement with AI", PredictiveStandup, Context Audit panel, Reflector promote-to-direction, refactor bridge, X-Ray real data.
- **Wave 4 — Operator visibility & control** (5).
- **Wave 5 — UI consistency & design-system** (5).
- **Wave 6 — Headless-slim-down cleanup + context-map integrity** (5).

### Wave-2 follow-ups (deferred)
- **Build Fixer fix-verify loop**: `fix_build` stages requirement files; the full "enqueue into TaskRunner → re-scan → 0-errors-remaining" loop (scan-queue finding #1's larger vision) is still open.
- **"Next context" prediction indicator** (brain #4) and a **Scan Queue dashboard / retry** (scan-queue #2, #3) are UI items for Waves 3–4.
