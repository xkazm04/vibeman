# Goals & Daily Standup — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495650007_amonesb
> Group: Core Development Engine
> Files read: ~14
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. Standup period key stored as full-ISO but looked up date-only — cache dead + GET always 404s
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: data-mismatch / silent-failure / wasted-cost
- **File**: src/lib/standup/standupService.ts:228,231; src/lib/standup/standupGenerator.ts:265,377; src/app/api/standup/route.ts:46
- **Scenario**: Generate a daily standup. The summary is upserted with `period_start = periodStart.toISOString()` (e.g. `"2026-06-19T00:00:00.000Z"`). The very next generate call computes `periodStartStr = periodStart.toISOString().split('T')[0]` = `"2026-06-19"` and calls `getExistingSummary(...,"2026-06-19")`, which queries `WHERE period_start = ?`. Full-ISO `≠` date-only, so it never matches.
- **Root cause**: Two representations of the same natural key: writers persist a full timestamp; the existence check and the public `GET /api/standup` (which receives a `YYYY-MM-DD` query param) compare against a date-only string. The `UNIQUE(project_id, period_type, period_start)` index keys on the full-ISO value, masking the divergence (upsert still dedups), so the mismatch is silent.
- **Impact**: (a) The "cached" fast-path at standupService.ts:232 is effectively dead — every generate triggers a fresh (expensive, rate-limited) LLM call even when nothing changed; cost + latency leak. (b) `GET /api/standup?periodStart=2026-06-19` returns 404 for a summary that exists in the DB — direct read API is broken for any consumer using date-only params.
- **Fix sketch**: Canonicalize the key once: store and query `period_start` as date-only (`.split('T')[0]`) for both daily and weekly, OR normalize the lookup to full-ISO. Add an assertion test that a save→getSummaryByPeriod round-trips.
- **Value**: effort 3 / impact 8 / risk 4

## 2. Local-midnight period boundaries vs UTC key → wrong-day buckets + double summaries near TZ edges
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: timezone / clock edge-case
- **File**: src/lib/standup/standupGenerator.ts:43-63 (getPeriodDateRange) vs standupService.ts:228
- **Scenario**: Server in UTC+offset. `getPeriodDateRange('daily')` builds `start` via `setHours(0,0,0,0)` in **local** time, then `standupService` derives the key with `toISOString().split('T')[0]` (**UTC** date). For a user east of UTC, local-midnight 2026-06-19 is `2026-06-18T22:00:00Z`, so the key becomes `"2026-06-18"` — the wrong day. The data-collection range (`startISO`/`endISO`) is also local-midnight-derived, so the window can straddle two UTC days.
- **Root cause**: Mixed local/UTC date arithmetic — `setHours` operates in the server's local zone while the persisted/queried key uses UTC calendar date. No single canonical timezone.
- **Impact**: Summaries filed under the previous/next calendar day; activity counted in the wrong period near midnight; a "daily" summary and its regeneration can land under different keys on TZ-shifted servers, producing duplicate rows for one logical day. Aggregates and the timeline read wrong.
- **Fix sketch**: Pick one canonical zone (UTC or project tz) and use it consistently for both the range computation and the key derivation; build the key from the same `start` Date used for the window, not a re-`toISOString`.
- **Value**: effort 4 / impact 7 / risk 5

## 3. Zero test coverage on the entire goal/standup business core (candidate lifecycle, generation, upsert)
- **Severity**: High
- **Lens**: test-mastery
- **Category**: missing-coverage / blast-radius
- **File**: src/lib/goals/goalService.ts (acceptCandidate txn), src/app/db/repositories/standup.repository.ts (upsertSummary), src/lib/standup/standupService.ts (generateUnifiedStandup), src/lib/standup/standupGenerator.ts (getPeriodDateRange/parseLLMResponse)
- **Scenario**: Globbing `Goals/**`, `Manager/Standup/**`, `DailyStandup/**`, and the three repos yields **no `*.test.ts`/`*.spec.ts`** anywhere in this context (only an unrelated `Manager/lib/__tests__/proposalAdapter.property.test.ts`). The candidate accept→goal txn, the standup upsert natural-key, the period math, and the LLM-response parser/fallback all ship untested.
- **Root cause**: Logic was extracted into pure, testable service/repo functions (good) but no tests followed. The most invariant-rich, money-touching paths (LLM cost gating, idempotent accept) have zero assertions.
- **Impact**: Findings #1, #2, #5 would all have been caught by one round-trip/idempotency test each. Regressions in goal acceptance (duplicate goals) or standup keys (cost blowup) ship silently.
- **Fix sketch**: LLM-generatable batch anchored to real invariants: (a) `upsertSummary` then `getSummaryByPeriod` returns same row (catches #1); (b) `getPeriodDateRange` key === range start day (catches #2); (c) double `acceptCandidate` creates one goal (catches #5); (d) `parseLLMResponse` returns null on garbage and defaults on partial JSON.
- **Value**: effort 4 / impact 8 / risk 2

## 4. `getCandidateStats` returns `avgPriorityScore: null` for empty project despite typed `number`
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: empty-set / null-leak
- **File**: src/app/db/repositories/goal-candidate.repository.ts:259-268
- **Scenario**: A project with zero candidates. `SELECT AVG(priority_score) ... ` over no rows returns SQL `NULL`. The mapping `avgPriorityScore: result.avgPriorityScore || 0` saves the average, but the `SUM(CASE ...)` columns also return `NULL` for empty sets — those are guarded by `|| 0`, so they're fine. The real gap: `result` itself is `as any`, so if the row is unexpectedly `undefined` (it isn't here, aggregate always yields one row) it would throw. More concretely, `total: result.total || 0` masks a legit `total: 0` as falsy-coalesced 0 (harmless) but the `|| 0` pattern silently hides any future non-zero-but-falsy value.
- **Root cause**: `as any` cast + `||` coalescing instead of `?? 0`; aggregate-over-empty-set returns NULL, relied upon implicitly.
- **Impact**: Low-grade — currently correct due to `|| 0`, but the `as any` defeats the type system on the one function consumers trust for dashboard math (`GET /generate-candidates` returns `stats` to UI). A schema rename would compile clean and return all-zero stats silently.
- **Fix sketch**: Type the row explicitly (`{ total: number|null, ... }`), use `?? 0`, and assert in a test that an empty project yields all-zero stats including `avgPriorityScore: 0`.
- **Value**: effort 2 / impact 4 / risk 2

## 5. `acceptCandidate` is not idempotent — re-accepting an already-accepted candidate creates a duplicate goal
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: idempotency / missing-guard
- **File**: src/lib/goals/goalService.ts:158-190; src/app/api/goals/generate-candidates/route.ts:115-122
- **Scenario**: `PUT /api/goals/generate-candidates {action:'accept'}` fires twice for the same `candidateId` (double-click, retry, two tabs). Each call re-reads the candidate (still found), and inside the txn unconditionally `createGoal(randomUUID())` + sets `user_action='accepted'`. No check that `candidate.user_action` is already `'accepted'` / `goal_id` already set. Two goals are created from one candidate.
- **Root cause**: The accept txn validates existence but not current state; the design assumes accept is called exactly once. No CAS on `user_action`.
- **Impact**: Duplicate goals pollute the board and skew goal counts / progress rings; the second `goal_id` overwrites the first on the candidate, orphaning the first goal.
- **Fix sketch**: Inside the txn, re-read with `WHERE id=? AND user_action != 'accepted'` (or early-return `candidate.goal_id ? existing : create`); make the read-and-check happen under the same `db.transaction`.
- **Value**: effort 3 / impact 5 / risk 3
