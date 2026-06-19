# Reflector & Executive Analysis — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495715522_vjivl10
> Group: Intelligence Layer
> Files read: ~14
> Total: 5 (Critical: 1, High: 3, Medium: 1, Low: 0)

## 1. Architecture completeAnalysis has no running-state guard — double callback re-runs relationship writes
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: race-condition / double-completion / data-corruption
- **File**: src/lib/architecture/analysisAgent.ts:158-216 (route: src/app/api/architecture/analyze/[analysisId]/complete/route.ts:53-82)
- **Scenario**: Claude Code (or a retried/duplicated curl) POSTs the completion callback twice. Both requests read `status === 'running'` in the route guard (which only rejects `completed`/`failed`), both pass, and both call `architectureAnalysisAgent.completeAnalysis`. That method only checks `if (!analysis)` — it never re-validates `status === 'running'`. Both invocations run `crossProjectRelationshipRepository.upsertMany(...)` and `completeAnalysis(...)` UPDATE. The second run re-`upsert`s relationships and can overwrite/clobber the first result's metadata.
- **Root cause**: The route's status read and the agent's write are not atomic (TOCTOU), and unlike the executive agent — which routes completion through `lifecycle.completeAnalysis` whose `if (record.status !== 'running') return false` guard makes the finalize fire-once — the architecture agent bypasses the lifecycle guard entirely on the complete path (it only uses `lifecycle.failAnalysis`). Assumption: "the callback only ever fires once" for a long async LLM job with a network callback.
- **Impact**: Duplicate/clobbered cross-project relationships, inflated `relationships_discovered`, lost narrative/recommendations on re-completion; wrong architecture reports feeding the executive analysis (architectureSummary). Silent — both calls return 200.
- **Fix sketch**: Route architecture completion through `lifecycle.completeAnalysis(analysisId, (record) => {...})` like the executive agent so the `status==='running'` guard gates the upsert+complete as one finalize; or do a status-CAS UPDATE (`UPDATE ... SET status='completed' WHERE id=? AND status='running'`) and only proceed if `changes===1`.
- **Value**: effort 3 / impact 9 / risk 3

## 2. Architecture analyses have no zombie reaper — a stuck 'running' session blocks workspace re-analysis forever
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: stuck-state / orphaned-analysis
- **File**: src/lib/architecture/analysisAgent.ts:74-82 (repo: src/app/db/repositories/architecture-analysis.repository.ts:65-111)
- **Scenario**: A workspace architecture analysis is started (`startAnalysis` flips it to 'running'), then the CLI crashes / tab closes / callback is lost. The row stays 'running' indefinitely. Every later `analyzeWorkspace` sees `getRunning(...)` return the zombie and returns `{ success:false, error:'Analysis already in progress' }`. The GET status route also permanently reports `isRunning:true`.
- **Root cause**: The executive side added `executiveAnalysisRepository.failStaleRunning()` and calls it from `getStatus`/`startAnalysis` to self-heal zombies. The architecture repository has **no equivalent** `failStaleRunning`, and neither the architecture GET nor `analyzeWorkspace` reaps stale runners. Assumption: completion callback always arrives.
- **Impact**: Architecture analysis becomes permanently un-runnable for that workspace/project until manual DB surgery; downstream executive `architectureSummary` goes stale forever.
- **Fix sketch**: Add `failStaleRunning(thresholdMinutes)` to `architecture-analysis.repository.ts` (mirror the executive one keyed on `COALESCE(started_at, created_at)`) and call it in `getRunning`/`analyzeWorkspace`/`analyzeNewProject` before the dedup check.
- **Value**: effort 3 / impact 7 / risk 2

## 3. analyzeNewProject has no in-flight dedup guard — double onboarding creates duplicate concurrent analyses
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: missing-guard / duplicate-work
- **File**: src/lib/architecture/analysisAgent.ts:122-146
- **Scenario**: A project is added (or the onboarding POST is retried / double-clicked) and `/api/architecture/analyze` with `scope:'project'` is hit twice. `analyzeNewProject` creates a new session and flips it to 'running' **without ever calling `getRunning('project', ...)`**. Two (or N) concurrent project analyses run for the same project, each later writing relationships via `upsertMany`.
- **Root cause**: `analyzeWorkspace` (lines 74-82) guards with `getRunning` + early-return, but `analyzeNewProject` omits the same guard. Asymmetric implementation — the dedup invariant ("one running analysis per scope") is only enforced for the workspace path.
- **Impact**: Duplicate relationship rows / wasted LLM runs / racing completions (compounds finding #1) on the common onboarding path.
- **Fix sketch**: Add `const running = architectureAnalysisRepository.getRunning('project', newProject.id); if (running) return {success:false, analysisId:running.id, error:'Analysis already in progress'};` at the top of `analyzeNewProject`.
- **Value**: effort 2 / impact 7 / risk 2

## 4. Entire Intelligence-Layer analysis pipeline has zero test coverage
- **Severity**: High
- **Lens**: test-mastery
- **Category**: missing-tests / business-critical-untested
- **File**: src/lib/reflector/executiveAnalysisAgent.ts, src/lib/architecture/analysisAgent.ts, src/lib/analysis/BaseAnalysisRepository.ts, both `.repository.ts`
- **Scenario**: Glob for `*.{test,spec}.ts` across reflector/architecture/analysis/executive-analysis returned **no files**. The create→start→complete/fail lifecycle, the `failStaleRunning` zombie reaper, the `canAnalyze` cooldown window, `upsertMany` dedup, and the completion-callback status guards are entirely unverified.
- **Root cause**: Async LLM-callback orchestration was built without anchoring tests; the lifecycle's most failure-prone branches (double-completion #1, zombie #2, dedup #3) are exactly the untested ones.
- **Impact**: Highest blast radius — regressions in the shared `BaseAnalysisRepository`/`BaseAnalysisAgent` silently break both executive and architecture analysis and feed wrong executive reports. Findings #1-#3 would each have been caught by one focused test.
- **Fix sketch**: Add vitest+better-sqlite3 suite asserting invariants: (a) second `completeAnalysis` after completion returns false / writes nothing; (b) `getRunning` returns null after `failStaleRunning` reaps a >threshold 'running' row; (c) `canAnalyze` false within minGap, true after; (d) `upsertMany` updates-not-duplicates on repeated identical rel.
- **Value**: effort 5 / impact 8 / risk 1

## 5. Inconsistent relationship-dedup semantics: manual POST is bidirectional, AI upsertMany is directional
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: edge-case / data-consistency
- **File**: src/app/db/repositories/cross-project-relationship.repository.ts:100-175 vs src/app/api/architecture/relationships/route.ts:108-123
- **Scenario**: The manual POST dedup uses `getBetweenProjects(A,B)` which matches both `(A→B)` and `(B→A)`. But `upsertMany` (the AI path) checks only `source_project_id = ? AND target_project_id = ?` (directional). So an AI analysis that emits `B→rest:A` will NOT match an existing manual `A→rest:B` and inserts a near-duplicate reversed edge.
- **Root cause**: Two different "is this the same relationship?" definitions across the manual and AI write paths. Assumption that integration direction is canonical when one path treats it symmetrically.
- **Impact**: Duplicate reversed relationships accumulate in the cross-project graph, inflating `relationships_discovered` and cluttering the architecture graph UI.
- **Fix sketch**: Make `upsertMany`'s existence check bidirectional (match either orientation for symmetric integration types), or canonicalize edge orientation (sort source/target) before insert in both paths.
- **Value**: effort 3 / impact 5 / risk 3
