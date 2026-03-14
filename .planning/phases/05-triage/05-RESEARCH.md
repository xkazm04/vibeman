# Phase 5: Triage - Research

**Researched:** 2026-03-14
**Domain:** Pipeline checkpoint UX, Brain conflict detection, timeout management
**Confidence:** HIGH

## Summary

Phase 5 adds a human checkpoint to the existing automated triage stage. The current `triageStage.ts` runs CLI-based scoring and threshold accept/reject fully autonomously. This phase inserts a pause between scoring and final decision, allowing users to review, batch-approve, or individually toggle items. Brain conflict detection (BRAIN-03) runs before presentation, flagging items that contradict high-confidence learned patterns.

The implementation follows the established checkpoint pattern from Phase 3 (preExecute/postReview): write `paused` status + `checkpoint_type` to `conductor_runs`, UI polls via `/api/conductor/status`, user submits decisions via new POST endpoint, pipeline resumes. A `triage_data` JSON TEXT column stores checkpoint state. Bypass (`skipTriage` toggle) and timeout (1hr hardcoded) handle trusted goals and abandoned sessions respectively.

**Primary recommendation:** Refactor `executeTriageStage()` to split into score-then-checkpoint flow, reusing the exact `waitForResume` polling pattern from Phase 3 checkpoints, with Brain conflict detection as a synchronous pre-check before pausing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Batch-first with individual override: present all items with "Approve All" / "Reject All", user can toggle specific items before confirming
- Approve/reject only -- no editing of item content at triage (editing belongs in backlog generation)
- Each item shows: title, effort/impact/risk scores, and Brain conflict warning icon (if flagged)
- Triage checkpoint renders in existing conductor status panel when run status is 'paused' + checkpoint_type is 'triage' -- no new UI routes or modals
- Only high-confidence pattern contradictions trigger a flag -- low-confidence patterns don't flag
- Brain conflict flag is advisory, not blocking -- user sees the conflict reason and can still approve
- Conflict check runs BEFORE items are presented to the user (items arrive pre-flagged)
- Uses `getBehavioralContext()` to get patterns, then matches each backlog item against high-confidence patterns
- Bypass toggle: `skipTriage` added to existing `checkpointConfig` on GoalInput -- per-goal control, matches Phase 3 preExecute/postReview pattern
- When `skipTriage` is true: all items auto-approved, no checkpoint pause, pipeline continues
- Timeout: 1 hour (3,600,000ms) -- on timeout, run status set to 'interrupted', reason logged, cleanup runs
- Timeout is hardcoded default (not configurable per-goal for now)
- New endpoint: `POST /api/conductor/triage` receives `{ runId, decisions: [{ itemId, action: 'approve'|'reject' }] }` -- pipeline resumes on receipt
- Triage status response (via existing `/api/conductor/status`) includes full triage data: items with title, scores, Brain conflict flags, conflict reasons -- UI has everything in one call
- Triage data stored as JSON TEXT on `conductor_runs` (new column `triage_data`) while checkpoint is active

### Claude's Discretion
- Brain conflict detection algorithm (how to match backlog items against patterns)
- Exact triage data JSON structure in status response
- How CLI scoring integrates with the new checkpoint flow (scoring runs first, then checkpoint)
- DB migration details for `triage_data` column

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRIA-01 | Pipeline pauses at triage checkpoint presenting generated backlog for user review | Existing `waitForResume()` pattern + `checkpoint_type` column; refactor orchestrator triage section to pause after scoring |
| TRIA-02 | User can batch-approve, individually approve/reject, or adjust backlog items at triage | New `POST /api/conductor/triage` endpoint; triage_data JSON stores items with decisions; status endpoint serves items to UI |
| TRIA-03 | Triage checkpoint is configurable -- can be bypassed for trusted goals with explicit toggle | Add `skipTriage` to `checkpointConfig` on GoalInput (alongside existing `preExecute`/`postReview`); skip pause when true |
| TRIA-04 | Triage checkpoint has a maximum timeout to prevent permanent pipeline hangs | Add timeout to `waitForResume` variant (1hr); on expiry set status='interrupted' with reason |
| BRAIN-03 | Brain acts as conflict gate at triage -- blocking tasks that contradict learned patterns | Use `getBehavioralContext().topInsights` for high-confidence patterns; match against item titles/descriptions; flag is advisory |
</phase_requirements>

## Architecture Patterns

### Existing Checkpoint Pattern (Phase 3 -- REUSE)

The orchestrator already implements checkpoints at pre-execute and post-review:

```typescript
// Pattern from conductorOrchestrator.ts lines 510-523
if (checkpointConfig.preExecute) {
  log('execute', 'info', 'Pre-execute checkpoint -- waiting for approval');
  updateRunInDb(runId, { checkpoint_type: 'pre_execute' });
  conductorRepository.updateRunStatus(runId, 'paused');
  await waitForResume(runId);
  if (shouldAbort(runId)) {
    conductorRepository.updateRunStatus(runId, 'interrupted', metrics);
    return;
  }
  updateRunInDb(runId, { checkpoint_type: null });
  conductorRepository.updateRunStatus(runId, 'running');
}
```

The triage checkpoint follows this exact pattern but adds:
1. `triage_data` column populated before pausing (items + scores + conflict flags)
2. Timeout on the wait loop (1hr max)
3. Resume triggers from a new `/api/conductor/triage` POST (not just status change)

### waitForResume with Timeout

```typescript
// Current waitForResume (no timeout):
async function waitForResume(runId: string): Promise<void> {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const run = conductorRepository.getRunById(runId);
    if (!run || run.status !== 'paused') break;
    if (conductorRepository.checkAbort(runId)) break;
  }
}

// New variant needs: timeout parameter, return 'resumed'|'timeout'|'aborted'
```

### Triage Flow (refactored)

```
Current:  Scout -> [CLI scoring -> threshold accept/reject] -> Batch
New:      Scout -> [CLI scoring -> Brain conflict check -> PAUSE -> user decisions -> apply] -> Batch
                                                              ^--- skipTriage bypasses this
```

### Recommended Triage Data JSON Structure

```typescript
interface TriageCheckpointData {
  items: Array<{
    id: string;
    title: string;
    description?: string;
    category: string;
    effort: number | null;
    impact: number | null;
    risk: number | null;
    brainConflict: {
      hasConflict: boolean;
      reason: string | null;
      patternTitle: string | null;
    };
  }>;
  timeoutAt: string; // ISO timestamp when checkpoint expires
  createdAt: string;
}
```

### Brain Conflict Detection Algorithm

The `getBehavioralContext()` returns `topInsights` -- an array of high-confidence, proven-helpful insights. Each has: `title`, `type` (preference_learned | pattern_detected | warning | recommendation), `description`, `confidence` (0-100).

**Recommended conflict matching approach:**

1. Get `topInsights` from `getBehavioralContext(projectId)` -- these are already filtered to high-confidence (>=80) and proven helpful
2. For each backlog item, compare item title + description against each insight's description
3. Look for semantic contradictions: item proposes something the insight warns against, or item targets an area where a strong pattern says "don't do X"
4. Simple keyword/phrase matching is sufficient for v1 -- insights of type `warning` are the primary conflict source
5. Flag items where a match is found; store the insight title as `patternTitle` and a brief reason

**Key insight from code:** `topInsights` already has a minimum confidence of 80% (hardcoded in `getTopEffectiveInsights`), so all returned insights qualify as "high-confidence" per the user's requirement. No additional confidence filtering needed.

### Recommended Project Structure

```
src/app/features/Manager/lib/conductor/
  stages/triageStage.ts          # MODIFY: split into score + checkpoint flow
  conductorOrchestrator.ts       # MODIFY: triage section uses new checkpoint flow
  types.ts                       # MODIFY: add skipTriage to GoalInput.checkpointConfig
src/app/api/conductor/
  triage/route.ts                # NEW: POST endpoint for triage decisions
  status/route.ts                # MODIFY: include triage_data in response
src/app/db/migrations/
  2XX_triage_data_column.ts      # NEW: add triage_data column
src/lib/brain/
  conflictDetector.ts            # NEW: Brain conflict detection logic
tests/api/conductor/
  triage-checkpoint.test.ts      # NEW: triage checkpoint tests
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checkpoint pause/resume | Custom event system | Existing `waitForResume` polling pattern with DB status | Already battle-tested in Phase 3; consistent pattern |
| Triage data storage | Separate triage table | JSON TEXT column on `conductor_runs` | Matches Phase 3/4 pattern (checkpoint_type, execution_report); triage data is ephemeral |
| Brain pattern access | Direct DB queries for patterns | `getBehavioralContext().topInsights` | Already aggregated, filtered to high-confidence, proven-helpful insights |
| Timeout management | Custom timer with cleanup | `setTimeout` race in the wait loop | Simple elapsed-time check in polling loop; no external timer needed |

## Common Pitfalls

### Pitfall 1: Timeout Not Cleaning Up Properly
**What goes wrong:** Timeout fires but pipeline state left in 'paused' -- never transitions to 'interrupted'
**Why it happens:** The timeout path doesn't update all state (status, triage_data cleanup, stage state)
**How to avoid:** Timeout path must: (1) set status='interrupted', (2) clear triage_data, (3) log reason, (4) update stage state to 'failed'
**Warning signs:** Runs stuck in 'paused' state in DB after timeout period

### Pitfall 2: Race Between Triage Submit and Timeout
**What goes wrong:** User submits triage decisions at the same moment timeout fires
**Why it happens:** The POST endpoint changes status to 'running' while timeout changes to 'interrupted'
**How to avoid:** POST endpoint should check current status before applying decisions -- if not 'paused', return 409 Conflict. The `waitForResume` loop detects either state change.
**Warning signs:** Run ends up in inconsistent state

### Pitfall 3: TypeScript Narrowing After waitForResume
**What goes wrong:** After `waitForResume()` returns inside a `status === 'paused'` block, TS still thinks status is 'paused'
**Why it happens:** Known project issue documented in CLAUDE.md memory
**How to avoid:** Use `(context.status as string)` assertion after waitForResume calls

### Pitfall 4: Migration Column Default
**What goes wrong:** Adding `triage_data` column with NOT NULL constraint breaks existing rows
**Why it happens:** Existing `conductor_runs` rows don't have triage data
**How to avoid:** Column MUST be nullable TEXT with no default -- use `addColumnIfNotExists(db, 'conductor_runs', 'triage_data', 'TEXT')`

### Pitfall 5: skipTriage Default Value
**What goes wrong:** Existing goals without `skipTriage` in checkpoint_config JSON cause undefined access
**Why it happens:** Old goal records have `{ preExecute: false, postReview: false }` without `skipTriage`
**How to avoid:** Default `skipTriage` to `false` when parsing checkpoint_config (matches existing `triage: false` default on line 215 of orchestrator)

## Code Examples

### Orchestrator Triage Checkpoint Integration

```typescript
// In orchestrator, after CLI scoring completes:
if (checkpointConfig.triage || checkpointConfig.skipTriage === false) {
  // 1. Run Brain conflict detection
  const conflicts = detectBrainConflicts(scoredIdeas, projectId);

  // 2. Build triage data
  const triageData = buildTriageData(scoredIdeas, conflicts);

  // 3. Store and pause
  updateRunInDb(runId, {
    checkpoint_type: 'triage',
    triage_data: JSON.stringify(triageData),
  });
  conductorRepository.updateRunStatus(runId, 'paused');

  // 4. Wait with timeout
  const resumeResult = await waitForResumeWithTimeout(runId, 3_600_000);

  if (resumeResult === 'timeout') {
    conductorRepository.updateRunStatus(runId, 'interrupted', metrics);
    log('triage', 'failed', 'Triage checkpoint timed out after 1 hour');
    return;
  }

  // 5. Read decisions from triage_data (POST endpoint updates it)
  const decisions = readTriageDecisions(runId);
  // Apply decisions via tinder API
}
```

### POST /api/conductor/triage Endpoint

```typescript
// POST body: { runId, decisions: [{ itemId, action: 'approve'|'reject' }] }
export async function POST(req: NextRequest) {
  const { runId, decisions } = await req.json();

  const run = conductorRepository.getRunById(runId);
  if (!run || run.status !== 'paused') {
    return NextResponse.json({ error: 'Run not in paused state' }, { status: 409 });
  }

  // Store decisions, then resume
  updateRunInDb(runId, { triage_data: JSON.stringify({ decisions }) });
  conductorRepository.updateRunStatus(runId, 'running');

  return NextResponse.json({ success: true });
}
```

### Brain Conflict Detection

```typescript
// src/lib/brain/conflictDetector.ts
import { getBehavioralContext } from './behavioralContext';

interface ConflictResult {
  hasConflict: boolean;
  reason: string | null;
  patternTitle: string | null;
}

export function detectBrainConflicts(
  items: Array<{ id: string; title: string; description?: string; category: string }>,
  projectId: string
): Map<string, ConflictResult> {
  const results = new Map<string, ConflictResult>();
  const ctx = getBehavioralContext(projectId);

  if (!ctx.hasData || ctx.topInsights.length === 0) {
    // No insights -- no conflicts possible
    for (const item of items) {
      results.set(item.id, { hasConflict: false, reason: null, patternTitle: null });
    }
    return results;
  }

  // Filter to warning/pattern_detected insights (most likely to conflict)
  const warningInsights = ctx.topInsights.filter(
    i => i.type === 'warning' || i.type === 'pattern_detected'
  );

  for (const item of items) {
    const itemText = `${item.title} ${item.description || ''}`.toLowerCase();
    let conflict: ConflictResult = { hasConflict: false, reason: null, patternTitle: null };

    for (const insight of warningInsights) {
      // Simple keyword matching for v1
      const insightKeywords = insight.description.toLowerCase().split(/\s+/);
      const significantKeywords = insightKeywords.filter(w => w.length > 4);
      const matchCount = significantKeywords.filter(kw => itemText.includes(kw)).length;

      if (matchCount >= 2) {
        conflict = {
          hasConflict: true,
          reason: insight.description,
          patternTitle: insight.title,
        };
        break;
      }
    }

    results.set(item.id, conflict);
  }

  return results;
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/api/conductor/triage-checkpoint.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRIA-01 | Pipeline pauses at triage and presents backlog | unit | `npx vitest run tests/api/conductor/triage-checkpoint.test.ts -t "pauses at triage"` | No - Wave 0 |
| TRIA-02 | User can batch/individual approve/reject | unit | `npx vitest run tests/api/conductor/triage-checkpoint.test.ts -t "approve reject"` | No - Wave 0 |
| TRIA-03 | Bypass toggle skips triage | unit | `npx vitest run tests/api/conductor/triage-checkpoint.test.ts -t "skipTriage"` | No - Wave 0 |
| TRIA-04 | Timeout interrupts abandoned triage | unit | `npx vitest run tests/api/conductor/triage-checkpoint.test.ts -t "timeout"` | No - Wave 0 |
| BRAIN-03 | Brain conflict detection flags contradictions | unit | `npx vitest run tests/api/conductor/triage-checkpoint.test.ts -t "brain conflict"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/api/conductor/triage-checkpoint.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/api/conductor/triage-checkpoint.test.ts` -- covers TRIA-01 through TRIA-04 and BRAIN-03
- [ ] Test fixtures for mock ideas with scores and Brain context

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fully automated triage (threshold only) | Human checkpoint with Brain pre-filtering | Phase 5 | User oversight on what gets executed |
| No Brain integration in triage | topInsights conflict detection | Phase 5 | Learned patterns prevent contradicting tasks |

## Open Questions

1. **Brain conflict detection granularity**
   - What we know: `topInsights` returns proven-helpful insights with 80%+ confidence
   - What's unclear: Simple keyword matching may produce false positives; semantic matching would be more accurate but much more complex
   - Recommendation: Start with keyword matching (v1), iterate based on real usage. Advisory-only flag means false positives are low-cost.

2. **Triage decisions storage flow**
   - What we know: POST endpoint receives decisions and resumes pipeline
   - What's unclear: Whether decisions should overwrite triage_data or be stored alongside original items
   - Recommendation: POST stores decisions array in triage_data JSON; orchestrator reads decisions after resume, applies accept/reject via tinder API

## Sources

### Primary (HIGH confidence)
- `conductorOrchestrator.ts` -- existing checkpoint pattern (lines 510-523, 685-695, 747-754)
- `triageStage.ts` -- current automated triage implementation
- `behavioralContext.ts` -- `getBehavioralContext()` return shape and `topInsights` aggregation
- `brain.types.ts` -- `BehavioralContext`, `LearningInsight` interfaces
- `types.ts` -- `GoalInput.checkpointConfig`, `TriageResult`, `PipelineStatus`

### Secondary (MEDIUM confidence)
- Migration pattern from `202_execute_stage_columns.ts` -- `addColumnIfNotExists` usage

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all code is internal; no new external dependencies
- Architecture: HIGH -- follows established Phase 3 checkpoint pattern exactly
- Pitfalls: HIGH -- drawn from documented project gotchas and code review
- Brain conflict detection: MEDIUM -- algorithm is Claude's discretion; keyword matching is pragmatic v1

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (internal codebase, stable patterns)
