# Phase 5: Triage - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Users review the generated backlog at a checkpoint that Brain has already filtered for pattern violations, with a configurable bypass and timeout. The existing automated `triageStage.ts` (CLI scoring + threshold accept/reject) is refactored to add a human checkpoint between scoring and final decision. Brain conflict detection runs before the checkpoint presents items to the user.

This phase does NOT cover: backlog generation (Phase 6), spec writing (Phase 2), or self-healing (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Backlog Presentation & Approval UX
- Batch-first with individual override: present all items with "Approve All" / "Reject All", user can toggle specific items before confirming
- Approve/reject only — no editing of item content at triage (editing belongs in backlog generation)
- Each item shows: title, effort/impact/risk scores, and Brain conflict warning icon (if flagged)
- Triage checkpoint renders in existing conductor status panel when run status is 'paused' + checkpoint_type is 'triage' — no new UI routes or modals

### Brain Conflict Gate
- Only high-confidence pattern contradictions trigger a flag — low-confidence patterns don't flag
- Brain conflict flag is advisory, not blocking — user sees the conflict reason and can still approve
- Conflict check runs BEFORE items are presented to the user (items arrive pre-flagged)
- Uses `getBehavioralContext()` to get patterns, then matches each backlog item against high-confidence patterns

### Bypass Toggle & Timeout
- Bypass toggle: `skipTriage` added to existing `checkpointConfig` on GoalInput — per-goal control, matches Phase 3 preExecute/postReview pattern
- When `skipTriage` is true: all items auto-approved, no checkpoint pause, pipeline continues
- Timeout: 1 hour (3,600,000ms) — on timeout, run status set to 'interrupted', reason logged, cleanup runs
- Timeout is hardcoded default (not configurable per-goal for now)

### Triage API Contract
- New endpoint: `POST /api/conductor/triage` receives `{ runId, decisions: [{ itemId, action: 'approve'|'reject' }] }` — pipeline resumes on receipt
- Triage status response (via existing `/api/conductor/status`) includes full triage data: items with title, scores, Brain conflict flags, conflict reasons — UI has everything in one call
- Triage data stored as JSON TEXT on `conductor_runs` (new column `triage_data`) while checkpoint is active

### Claude's Discretion
- Brain conflict detection algorithm (how to match backlog items against patterns)
- Exact triage data JSON structure in status response
- How CLI scoring integrates with the new checkpoint flow (scoring runs first, then checkpoint)
- DB migration details for `triage_data` column

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `triageStage.ts` (`src/app/features/Manager/lib/conductor/stages/triageStage.ts`): Has CLI-based scoring, threshold logic, and tinder API integration — refactor to add checkpoint between scoring and decision
- `getBehavioralContext()` (`src/lib/brain/behavioralContext.ts`): Returns patterns, trending, signals — use for conflict detection
- `checkpointConfig` on GoalInput: Already has `preExecute`/`postReview` toggles — extend with `skipTriage`
- Phase 3 checkpoint pattern: pipeline writes 'paused' + checkpoint_type to `conductor_runs`, UI polls, user resumes via API

### Established Patterns
- Checkpoint flow: write paused status → UI polls → user acts → POST to resume → pipeline continues (Phase 3)
- JSON column storage for checkpoint data on `conductor_runs` (Phase 3: `checkpoint_type`, Phase 4: `execution_report`)
- Migration pattern: `addColumnIfNotExists()`, nullable TEXT, `runOnce()` wrapper

### Integration Points
- Orchestrator calls `executeTriageStage()` after scout/batch stage — already wired
- Triage receives ideas from Ideas module (`ideaDb.getIdeaById`)
- Accept/reject via tinder API (`/api/tinder/actions`)
- Status endpoint (`/api/conductor/status`) already serves run state — extend with triage data

</code_context>

<specifics>
## Specific Ideas

- The triage checkpoint should feel like a "review gate" — pipeline has done the analysis (scoring + Brain check), user just makes the call
- Brain conflict warnings should be visually distinct (warning icon + reason text) so user immediately sees which items have concerns
- When bypass is enabled, the pipeline should log that triage was skipped so the execution report reflects it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-triage*
*Context gathered: 2026-03-14*
