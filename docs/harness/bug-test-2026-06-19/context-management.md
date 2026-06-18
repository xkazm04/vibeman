# Context Management — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495658584_9799x3j
> Group: Core Development Engine
> Files read: ~13
> Total: 5 (Critical: 1, High: 3, Medium: 1, Low: 0)

## 1. Deferred-cleanup wipes the entire context map when generation produces only relationships
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: data-loss / silent-failure
- **File**: src/app/features/Context/hooks/useContextGenerationStream.ts:113-130
- **Scenario**: A context-generation run emits a valid `json:context-generation-summary` block with `contextsCreated: 0, groupsCreated: 0, relationshipsCreated: 5, filesAnalyzed: N` (e.g. the CLI re-uses existing groups/contexts and only adds cross-group relationships, or a partial run that re-emits an unchanged map). `producedNewData = contextsCreated>0 || groupsCreated>0` is `false`, so cleanup is *skipped* — that case is safe. The inverse is the bug: the gate trusts the **CLI-reported** counts, not the DB. If the CLI prints `contextsCreated: 7` in the summary but the actual INSERTs partially failed / wrote to a different project / were rolled back, `producedNewData` is `true` and the code fires `/api/context-generation/cleanup` against `previousDataIds` — deleting every pre-existing context, group, and relationship for the project with no undo, even though no real replacement landed.
- **Root cause**: Cleanup is gated on a self-reported number parsed from LLM stdout (`summaryDataRef`), treated as ground truth for a destructive bulk delete, instead of verifying the new rows exist in the DB for that project.
- **Impact**: Total loss of a project's curated context map (the "core organizational primitive of Vibeman") triggered by a hallucinated/mismatched summary count. No backup, no confirmation.
- **Fix sketch**: Before issuing cleanup, re-fetch `getContextsByProject(projectId)` and require that the live count of IDs *not in* `previousDataIds` is > 0 (i.e. real new rows landed). Gate on DB truth, not parsed stdout.
- **Value**: effort 3 / impact 9 / risk 8

## 2. TOCTOU on group-health-scan start allows duplicate concurrent scans
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: race-condition / duplicate-work
- **File**: src/app/api/group-health-scan/route.ts:73-137
- **Scenario**: Two POSTs for the same `groupId` arrive nearly simultaneously (double-click, or the UI + a retry). Both call `getRunningByGroup(groupId)` and both see `null` (no scan is *running* yet — the just-created scan is inserted with status `'pending'`, never `'running'`, in this route). Both pass the guard, both call `groupHealthRepository.create(...)`, and two `pending` scan rows are created. The 409 "already running" guard never fires because nothing in this route flips a scan to `running`; the `getLatestByGroup` stale-pending cleanup only fails scans older than 2 min, not concurrent ones.
- **Root cause**: The uniqueness check (`getRunningByGroup`) and the insert are not atomic, and the insert uses a status (`pending`) the check never looks for — so the guard is structurally unable to see an in-flight sibling.
- **Impact**: Duplicate scans run against the same files, doubling CLI/token cost, producing conflicting `health_score` writes to `context_groups`, and leaving orphan pending rows.
- **Fix sketch**: Make create idempotent — either a partial unique index on `(group_id)` WHERE status IN ('pending','running') and catch the constraint, or wrap check+insert in a single transaction and have the check also match `pending`.
- **Value**: effort 4 / impact 6 / risk 4

## 3. flushPendingMoves drops moves queued during an in-flight flush (lost drag-drop on reload)
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: race-condition / silent-data-loss
- **File**: src/stores/contextStore.ts:574-608
- **Scenario**: User drags context A → flush starts (`_isFlushInProgress = true`, snapshot taken at line 575). While the batch PUT is in flight, the user drags context B; `queueMove` appends B to `pendingMoves` and optimistically updates B's `groupId` in UI. A second `flushPendingMoves` fires but hits the re-entry guard (line 579) and returns. When A's flush resolves, line 595 unconditionally sets `pendingMoves: []`, discarding B's queued move. B *looks* moved (optimistic UI survived) but was never sent to the server, so on the next `loadProjectData` it snaps back to its old group.
- **Root cause**: The success handler clears the *entire* pending queue rather than only the slice it actually flushed; moves arriving during flight are collateral.
- **Impact**: Silent loss of user reorganization work — the worst kind because the UI shows success until a refresh reverts it. No toast, no error.
- **Fix sketch**: Capture the flushed IDs at start; on success, remove only those (`pendingMoves: state.pendingMoves.filter(m => !flushedIds.has(m.contextId))`), then re-trigger flush if any remain. Or queue a "dirty again" flag and re-flush in `finally`.
- **Value**: effort 4 / impact 6 / risk 3

## 4. queueMove crashes on a stale/removed context id (non-null assertion)
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: edge-case / crash
- **File**: src/stores/contextStore.ts:559-563
- **Scenario**: `updateArrayItem(state.contexts, contextId, { ...state.contexts.find(c => c.id === contextId)!, groupId })`. If a context was just removed (optimistic `removeContext`, a concurrent `loadProjectData` refresh that dropped it, or a temp-id replaced mid-drag) but a drag-end event still references the old id, `.find(...)` returns `undefined` and the `!` spreads `undefined` → throws `Cannot read properties of undefined` inside the zustand `set` updater, aborting the move and potentially leaving the store mid-update.
- **Root cause**: The code assumes any `contextId` reaching `queueMove` is still present in `contexts`; the non-null assertion encodes that assumption and removes the safety net.
- **Impact**: Runtime crash / unhandled exception during drag-drop in an edge timing window; degrades a core interaction.
- **Fix sketch**: Guard early — `const ctx = state.contexts.find(c => c.id === contextId); if (!ctx) return state;` then build the update from `ctx`.
- **Value**: effort 2 / impact 4 / risk 2

## 5. Zero tests on the destructive context-management write/cleanup paths
- **Severity**: High
- **Lens**: test-mastery
- **Category**: missing-coverage / blast-radius
- **File**: src/app/features/Context/hooks/useContextGenerationStream.ts (+ context.repository.ts, group-health/route.ts, contextStore.ts)
- **Scenario**: Glob of the entire Context feature, the three repositories, both stores, and all six API routes finds **exactly one** test file — `exportContextsXlsx.test.ts` (an unrelated XLSX exporter). The highest-blast-radius logic in this context has zero assertions: the cleanup gate (#1), `batchMoveContexts` CASE/WHEN ELSE-group_id self-preservation (context.repository.ts:255-290), `flushPendingMoves` re-entry/queue semantics (#3), and the stale-scan-cleanup branches in group-health POST (#2). Each is a pure-ish function with a clear invariant, so this is a high-leverage LLM-generatable batch.
- **Root cause**: Coverage stops at pure display helpers (`contextUtils`, exporter); the orchestration/DB-write layer above — where data loss actually lives — is untested.
- **Impact**: False confidence; a regression in any cleanup/batch-move path silently corrupts or deletes user context maps with nothing red to catch it.
- **Fix sketch**: Add a vitest suite with the better-sqlite3 test DB asserting invariants: (a) cleanup is a no-op when no new rows land for the project; (b) `batchMoveContexts` never NULLs a group for an id absent from `moves`; (c) flush of A while B is queued preserves B; (d) concurrent group-health POST yields one runnable scan.
- **Value**: effort 4 / impact 7 / risk 1
