# Brain & Behavioral Signals — Feature + UI Scan
> Context: Brain & Behavioral Signals | Group: Intelligence Layer
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (4f feature / 1ui ui) | Priority: 1crit/3high/1med/0low
> Files read: ~16

> **Manifest drift note:** This context's manifest is badly stale. Every UI file it lists (`src/app/features/Brain/BrainLayout.tsx`, `InsightsPanel.tsx`, `ReflectionTerminal.tsx`, `sub_MemoryCanvas/*`, `sub_Timeline/*`) and the `src/stores/brainStore.ts` store **no longer exist** — they were removed in the 2026-06-13 headless slim-down. The manifest API list is also stale: `insights/`, `insights/effectiveness/`, and `outcomes/` routes do not exist; the real routes are `signals`, `signals/decay`, `reflection`, `reflection/[reflectionId]/complete`, `context`, and `predictions`. The context is now a **headless backend**: rich logic in `src/lib/brain/` (22 modules) + API routes, consumed by Claude Code via prompts and the Navigation indicator dot. UI-lens findings are therefore scarce by design; the high value is in feature/automation gaps. Findings below are grounded only in files that actually exist.

## 1. Behavioral context & next-context predictions are computed but never reach the executing Claude Code agent (no MCP tool)
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/mcp-server/tools/index.ts:25-56, src/lib/brain/behavioralContext.ts:24-162, src/lib/brain/predictiveIntentEngine.ts:229-308, src/mcp-server/tools/memory.ts:36-48
- **Current state**: `getBehavioralContext()` produces a rich, token-conscious payload (active areas, success rate, reverted count, preferred contexts, proven best-practices/insights) and `predictiveIntentEngine.predict()` produces "next context" Markov predictions. But the MCP tool registry (`registerTools`) only exposes `get_memory` (which hits `/api/collective-memory`, a *different* store) and `get_knowledge`. There is **no MCP tool** that surfaces the Brain's behavioral context or predictions to a running agent. The data is injected only at direction-generation time, not available mid-execution.
- **Opportunity**: Add a `get_brain_context` MCP tool (mirroring `memory.ts`) that calls `GET /api/brain/context?projectId=…` and formats `topInsights` + `patterns` + `currentFocus` for the agent, plus optionally `predictions` from `/api/brain/predictions`.
- **Value**: Lets the autonomous agent self-consult "what has this project learned / what's failing / where am I likely headed next" during a task, not just at planning time — closing the loop between the learning system and the execution engine that is the core of vibeman.
- **Effort**: 3
- **Implementation sketch**: Copy `memory.ts` into `src/mcp-server/tools/brain-context.ts`; `client.get('/api/brain/context', { projectId })`; format `context.patterns`/`topInsights` like `formatBehavioralForPrompt`. Register it in `index.ts:registerTools` and append to the log line at index.ts:56.

## 2. Signal decay/pruning is "designed as a weekly scheduled job" but has zero callers — signals accumulate forever
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/app/api/brain/signals/decay/route.ts:1-8, src/lib/brain/brainService.ts:459-469, src/lib/brain/signalCollector.ts:477-487
- **Current state**: The decay route's own header says "Designed to be called as a weekly scheduled job." `applySignalDecay()` decays old signal weights and hard-deletes beyond retention. But a repo-wide search finds **no caller** — no cron, no scheduler module, no UI button, no GitHub workflow invokes `/api/brain/signals/decay`. Signals therefore never decay or get pruned in practice, so behavioral context drifts toward stale, equally-weighted history and the hot-writes DB grows unbounded.
- **Opportunity**: Wire decay to an automatic trigger. Cheapest: piggyback on the existing reflection cascade — call `applySignalDecay(projectId, …)` inside `completeReflection()` (it already runs auto-prune, predictive refresh, and knowledge graduation post-commit). Better: add a lightweight scheduled invocation (the decay logic is idempotent per ISO week via `getWeekStart()`).
- **Value**: Keeps behavioral context fresh and recency-weighted (the whole premise of decay) and bounds DB growth, without any user action — fits the "autonomous" direction.
- **Effort**: 2
- **Implementation sketch**: In `brainService.completeReflection` post-commit block (alongside `autoPruneInsights`), add `try { applySignalDecay(projectId, DEFAULT_DECAY_FACTOR, DEFAULT_RETENTION_DAYS); } catch {}`. The weekly guard in the repo prevents over-decay if reflections run often.

## 3. The revert-learning loop (`scanForReverts`) is dead code — reverted implementations are never auto-detected
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/lib/brain/outcomeTracker.ts:203-225, src/lib/brain/behavioralContext.ts:151-159 & 258-260
- **Current state**: `outcomeTracker.scanForReverts(projectId, checkRevert)` detects when a previously-successful direction's commit was later reverted and marks it, feeding `patterns.revertedCount` and the "Address reverted implementations" suggested priority in the prompt. But `scanForReverts` is **never called** anywhere (only `markReverted` is reachable, via manual outcome updates). The git-diff `checkRevert` callback is never wired. So `revertedCount` is effectively always 0 and the Brain never learns from rolled-back work — arguably its most valuable negative signal.
- **Opportunity**: Wire `scanForReverts` into an existing periodic path with a real `checkRevert` implementation that inspects `git log --grep="Revert"` / reverse-apply detection against `outcome.commit_sha` (the project path is already known to reflection).
- **Value**: Turns reverts into first-class learning signal, materially improving the success-rate/preferred-context computations and the "what not to repeat" guidance the agent receives.
- **Effort**: 3
- **Implementation sketch**: Add a `gitCheckRevert(projectPath, sha)` helper (reuse existing git utils); call `outcomeTracker.scanForReverts(projectId, sha => gitCheckRevert(projectPath, sha))` inside `gatherReflectionData` or the reflection completion cascade in `brainService`.

## 4. "Next context" predictions have no surface — the Navigation indicator only shows reflection, ignoring the prediction engine
- **Lens**: 🎨 ui-perfectionist
- **Priority**: medium
- **Category**: functionality
- **File(s)**: src/components/Navigation/indicators/useProjectIndicators.ts:35-54 & 64-81, src/app/api/brain/predictions/route.ts:15-40
- **Current state**: The project-indicator hook is explicitly designed to be extended (`EVALUATORS` array, "Future: securityEvaluator, dependencyEvaluator…") and only fetches `/api/brain/reflection` to render a purple "Reflection recommended" dot. The `predictiveIntentEngine` already serves ranked next-context predictions with confidence at `/api/brain/predictions`, but nothing in the UI consumes them — there is no affordance telling the user "you usually move to Context X next."
- **Opportunity**: Add a second evaluator + data fetch so a high-confidence prediction (e.g. `confidence >= 0.6`) surfaces as a distinct indicator dot/tooltip ("Likely next: <contextName>"), reusing the existing parallel-fetch + evaluator pattern already in the hook.
- **Value**: Makes the otherwise-invisible prediction engine actionable at a glance, nudging the user toward their likely next focus — a low-friction productivity surface that reuses an established UI pattern (no new components).
- **Effort**: 2
- **Implementation sketch**: In `fetchProjectData`, add a parallel `fetch('/api/brain/predictions?projectId=…')` storing `data.prediction = topPrediction`; add `predictionEvaluator` to `EVALUATORS` returning a colored dot with `title` = reasoning when `confidence` is high; extend `ProjectIndicatorData` type accordingly.
## 5. Reflection completion runs heavy cross-project synthesis inline, but `runCrossProjectSynthesis` (drift + proactive goals) is orphaned — no automatic drift/goal generation
- **Lens**: 🔍 feature-scout
- **Priority**: crit
- **Category**: feature
- **File(s)**: src/lib/brain/brainService.ts:489-538 & 390-399
- **Current state**: `completeReflection` post-commit only calls `promoteRecurringInsights(2)` (pattern promotion). The richer `runCrossProjectSynthesis()` — which additionally runs `detectArchitectureDrift` per project and auto-creates high-confidence proactive goals via `generateProactiveGoals`/`createGoalFromCandidate` — is fully implemented but has **no caller** in the codebase (only its own definition). So architecture-drift detection and proactive-goal generation, the most strategic outputs of the Brain, never fire automatically.
- **Opportunity**: Invoke `runCrossProjectSynthesis(projectIds)` after a **global** reflection completes (where cross-project signal is densest), passing the workspace's project IDs. Keep it best-effort/non-blocking like the existing cascade steps.
- **Value**: Closes vibeman's flagship autonomy loop — the system would proactively detect drift and file high-confidence goals from learned cross-project patterns without any user prompt, instead of leaving that capability inert.
- **Effort**: 3
- **Implementation sketch**: In `completeReflection`, when `reflection.scope === 'global'`, after the existing best-effort block call `try { await runCrossProjectSynthesis(workspaceProjectIds); } catch (e) { console.warn(...) }`. Source `workspaceProjectIds` from the workspace repository (or thread them through from the global-reflection start payload).
