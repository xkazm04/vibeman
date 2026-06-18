# Manager & Directions — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495667153_9xjdt24
> Group: Core Development Engine
> Files read: ~18
> Total: 5 (Critical: 1, High: 3, Medium: 1, Low: 0)

## 1. Remote "accept direction" throws on state transition, orphans requirement file
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: silent-failure / state-machine-violation
- **File**: src/lib/remote/commandHandlers.ts:722-751 (via src/app/db/repositories/direction.repository.ts:430-437 + src/lib/stateMachine.ts:37-42)
- **Scenario**: A user accepts a direction from the remote/mobile control (`handleTriageDirection`, action='accept'). The handler checks `direction.status === 'pending'` (line 722), writes the requirement file to disk (line 748: `createRequirement`), then calls `directionDb.acceptDirection(...)` (line 751). `acceptDirection` → `updateDirection({status:'accepted'})` → `directionTransition('pending','accepted')`. But `DIRECTION_TRANSITIONS.pending = ['processing','rejected']` — `'accepted'` is NOT allowed, so `makeTransitionFn` THROWS `InvalidTransitionError`.
- **Root cause**: The remote path bypasses `claimDirectionForProcessing` (the pending→processing step). The acceptance saga in `directionAcceptanceWorkflow.ts:164` claims first (pending→processing) so its `acceptDirection` is a valid processing→accepted move; the remote handler never adopted that two-step protocol, so it always feeds an illegal pending→accepted transition.
- **Impact**: Every remote accept fails AFTER the requirement `.md` file is written: the file lands on disk but the DB row stays `pending`, the command returns an error, and the orphaned requirement file is never cleaned up. Remote acceptance is effectively broken + leaves litter.
- **Fix sketch**: In `handleTriageDirection`, call `directionDb.claimDirectionForProcessing(payload.direction_id)` before `createRequirement`, bail if it returns false, and on a thrown DB error delete the just-written file (or reuse the `acceptDirection` saga from `directionAcceptanceWorkflow.ts`).
- **Value**: effort 3 / impact 8 / risk 3

## 2. `acceptPairedDirection` is non-atomic — concurrent accepts orphan or double-accept a pair
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: race-condition / data-integrity
- **File**: src/app/db/repositories/direction.repository.ts:742-773
- **Scenario**: Two requests accept opposite variants of the same pair near-simultaneously (e.g. double-tap on flaky mobile, or A on desktop + B on remote). Each `acceptDirection` claims its OWN id via `claimDirectionForProcessing` (different ids → both succeed), then each runs the reject-the-other UPDATE guarded by `status='pending'`. Request-A rejects B; meanwhile Request-B has already moved B to `processing`/`accepted`, so A's reject UPDATE matches 0 rows — and B's reject of A loses the same race. End state: BOTH directions `accepted`, or one accepted + the partner stuck `processing`.
- **Root cause**: The accept-one + reject-other operation spans two separate statements with no transaction and no exclusive claim over the *pair*; the per-id optimistic lock only protects a single row, not the pair invariant "exactly one accepted, one rejected."
- **Impact**: Both variants of an A/B pair get accepted → two requirement files + two Claude Code sessions spawned for mutually-exclusive alternatives (wasted spend, contradictory code). Or a half-rejected pair lingers as a zombie `processing` row.
- **Fix sketch**: Wrap accept+reject in a `db.transaction()`; make the partner-reject CAS on `status IN ('pending','processing') AND id != acceptedId` and assert it changed exactly 1 row, rolling back otherwise.
- **Value**: effort 4 / impact 7 / risk 4

## 3. Cross-task `selectPlan` / `completePlan` have zero CAS — stale overwrite & no test coverage
- **Severity**: High
- **Lens**: test-mastery
- **Category**: untested-data-write / missing-CAS
- **File**: src/app/db/repositories/cross-task.repository.ts:209-281 ; src/app/api/cross-task/[id]/complete/route.ts:25-108
- **Scenario**: The Claude CLI callback POSTs `/complete` twice (retry after a timeout where the first actually landed). `completePlan` UPDATEs unconditionally (no `WHERE status='running'`), so the second call silently overwrites the first's plan content and resets `completed_at`. The `select/route.ts` status check (`plan.status === 'completed'`) is a read-then-write TOCTOU with no guard on the UPDATE. There is NO repository or route test anywhere for cross-task (only `proposalAdapter.property.test.ts` exists in this whole context).
- **Root cause**: `completePlan`/`selectPlan` were written as fire-and-forget UPDATEs assuming a single, ordered caller; the callback URL is an unauthenticated external retry surface where that assumption fails.
- **Impact**: Duplicate/late callbacks corrupt analysis results; false confidence — the highest-blast-radius data-write path in this context (drives multi-project Claude sessions) has no assertions exercising the retry/stale branches.
- **Fix sketch**: Add `WHERE id=? AND status='running'` to `completePlan` and `WHERE id=? AND status='completed'` (+ check `result.changes`) to `selectPlan`; add a vitest suite covering double-complete, complete-after-failed, and select-on-non-completed.
- **Value**: effort 4 / impact 7 / risk 3

## 4. `direction.repository.ts` accept/claim/pair logic has no unit tests despite spawning Claude sessions
- **Severity**: High
- **Lens**: test-mastery
- **Category**: success-theater-coverage / untested-critical-path
- **File**: src/app/db/repositories/direction.repository.ts:412-425 (claim), 742-773 (acceptPaired), 668-737 (grouping)
- **Scenario**: The only test in this context is a pure-function property test for `proposalAdapter`. The money/data-write core — `claimDirectionForProcessing` (the idempotency lock that prevents double Claude-Code sessions), `acceptPairedDirection`, and `getPendingDirectionsGrouped` (the "incomplete pair → treat as singles" branch at line 730) — has zero assertions. The claim's invariant (second concurrent claim returns false) is the load-bearing guarantee against duplicate expensive AI runs, yet nothing verifies it.
- **Root cause**: Tests stopped at the pure adapter layer; the DB-write/idempotency layer one level up (where real spend and corruption live) was never anchored to a test DB.
- **Impact**: False confidence — a refactor that breaks the `WHERE status='pending'` claim guard (e.g. someone "simplifies" to an unconditional UPDATE) would silently re-enable double-acceptance with no failing test.
- **Fix sketch**: Add a better-sqlite3 test-DB suite: claim-twice-returns-[true,false]; acceptPaired leaves exactly one accepted + one rejected; grouping returns a 1-element pair as a single. High-leverage LLM-generatable batch anchored to the claim invariant.
- **Value**: effort 4 / impact 6 / risk 2

## 5. Untested-logs enrichment swallows per-row errors → silently drops project/context names
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: silent-failure / edge-case
- **File**: src/app/api/implementation-logs/untested/route.ts:61-90
- **Scenario**: For each untested log, `projectDb.getProject` and `contextRepository.getContextById` are wrapped in `try { } catch { /* might not exist */ }`. If the SQLite handle is momentarily locked/busy (a real condition under concurrent writes in better-sqlite3) or a transient read throws, the catch swallows it and returns `project_name: null` / `context_name: null` — indistinguishable from a genuinely deleted project. The UI then renders "Unknown" for logs whose project actually exists.
- **Root cause**: The catch conflates "row doesn't exist" (expected) with "read failed" (a real error worth surfacing), assuming the only failure mode is a missing FK.
- **Impact**: UX degradation + masked DB-contention bugs; a whole page of logs can show "Unknown" project during a write burst with no log line. Low data-loss risk but erodes trust and hides a latent locking problem.
- **Fix sketch**: Narrow the catch — log a warning with the error inside the catch (it's currently fully silent), and ideally batch-fetch projects/contexts by id once instead of N per-row queries inside a swallow.
- **Value**: effort 2 / impact 4 / risk 2
