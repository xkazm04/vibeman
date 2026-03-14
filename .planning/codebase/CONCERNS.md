# Codebase Concerns

**Analysis Date:** 2026-03-14

## Tech Debt

**Migration System Fragility:**
- Issue: Multiple destructive migrations (m143, m145) required to fix ideas table CHECK constraints. m143 was pre-seeded as "already applied" during bootstrap, preventing it from running on existing databases.
- Files: `src/app/db/migrations/index.ts`, `src/app/db/migrations/143_fix_ideas_effort_constraint.ts`, `src/app/db/migrations/145_fix_ideas_effort_constraint_retry.ts`
- Impact: Data schema inconsistencies across devices. Some databases still have old 1-3 effort/impact constraints while others have 1-10. Migration m145 had to retry the fix.
- Fix approach: Implement a post-bootstrap validation check to verify constraints match expected ranges, running constraint fixes automatically if mismatch detected. Add automated schema validation tests to catch similar issues early.

**Type Safety Gaps:**
- Issue: 372 instances of unsafe type assertions (`as any`, `as unknown`, `as string`) and `@ts-ignore` comments throughout codebase, particularly in API handlers and conductor routes
- Files: `src/app/api/conductor/config/route.ts`, `src/app/api/conductor/healing/route.ts`, `src/app/api/conductor/history/route.ts`, `src/app/api/build-fixer/route.ts`, and 50+ more
- Impact: Difficult to catch type-related bugs at compile time. API payload handling vulnerable to unexpected structures.
- Fix approach: Create stricter type guards for API responses. Use Zod or similar validation library to enforce runtime schemas. Gradually replace `as any` casts with proper types.

**Development Code in Production:**
- Issue: Debug statements left in production code
- Files: `src/app/features/Context/sub_ContextGroups/lib/productionScanPrompt.ts:165-166`
- Impact: Verbose logging, potential performance impact, information leakage in logs
- Fix approach: Add pre-commit hook to detect `console.log`, `// TODO: remove before production`, and debug patterns. Implement structured logging with environment-based levels instead.

**Incomplete Slack Integration:**
- Issue: Slack connector has unimplemented TODO methods for bot token testing and sending
- Files: `src/lib/integrations/connectors/slack.ts:233`, `src/lib/integrations/connectors/slack.ts:286`
- Impact: Slack messaging feature partially broken or untested in production
- Fix approach: Complete slack bot token implementation or remove unused code path. Add tests to verify integration before deploying.

## Known Bugs

**Global State Race Condition in Conductor:**
- Symptoms: Pipeline runs stored in `globalThis.conductorActiveRuns` may become orphaned if async loop dies or HMR causes re-initialization
- Files: `src/app/features/Manager/lib/conductor/conductorOrchestrator.ts:35-91`
- Trigger: Process crash, server restart during active pipeline, multiple rapid pipeline starts/stops
- Workaround: Currently relies on database status to clean up orphaned runs via periodic polling in `getPipelineStatus()`. No guaranteed cleanup mechanism.

**External Requirement Claim Race Condition:**
- Symptoms: Multiple devices can claim the same requirement if optimistic lock `UPDATE WHERE status='open'` doesn't atomically transition to 'claimed' status
- Files: `src/lib/supabase/external-requirements.ts` (claim pattern)
- Trigger: Device A and B both fetch open requirements, both claim same requirement before Supabase rows are updated
- Workaround: Memory state check after claim, but Supabase state may differ from actual device state

**Timeouts Without Cleanup:**
- Symptoms: Some setTimeout/setInterval handlers may leak if cleanup handlers fail
- Files: `src/components/cli/CompactTerminal.tsx:500`, `src/app/zen/sub_ZenControl/hooks/useRemoteMonitor.ts:228`, multiple useEffect cleanup sites
- Trigger: Component unmount during network latency, error in cleanup handler
- Workaround: Check ref existence before cleanup, but doesn't guarantee all timers are cancelled

## Security Considerations

**Environment Variable Exposure in Logs:**
- Risk: If error messages include request/response bodies, sensitive env var values could leak into logs
- Files: Global error handling in `src/app/api/conductor/` routes, `src/lib/remote/commandHandlers.ts`
- Current mitigation: Error messages use generic strings ("Failed to X: status"), but deep error objects logged
- Recommendations: Implement error sanitization middleware. Mask sensitive headers/env values in debug logs. Use structured logging with separate sensitive field handling.

**Database Write Permissions Unvalidated:**
- Risk: Migration code uses `PRAGMA foreign_keys = OFF` for table recreation but relies on transaction rollback for safety
- Files: `src/app/db/migrations/143_fix_ideas_effort_constraint.ts:68-143`, `src/app/db/migrations/145_fix_ideas_effort_constraint_retry.ts:63-139`
- Current mitigation: Try/catch with rollback, but if rollback fails silently, schema corrupts
- Recommendations: Verify transaction state after ROLLBACK. Log successful commit explicitly. Add post-migration validation to ensure constraints are actually applied.

**No Input Validation on Task Prompts:**
- Risk: User-provided task descriptions fed directly into LLM prompts without sanitization
- Files: `src/app/features/TaskRunner/lib/externalPromptTemplate.ts`, prompt builders
- Current mitigation: None observed
- Recommendations: Add input sanitization for user text fields. Limit prompt size. Test injection vectors in existing prompts.

**Hardcoded URLs in Configuration:**
- Risk: Some API base URLs are hardcoded defaults in production scan prompts
- Files: `src/app/features/Context/sub_ContextGroups/lib/productionScanPrompt.ts:48`
- Current mitigation: Environment variable fallback available
- Recommendations: Always require explicit env var configuration. Remove default hardcoded URLs.

## Performance Bottlenecks

**Large Unbounded Migrations File:**
- Problem: `src/app/db/migrations/index.ts` is 4408 lines with all migrations imported at top level
- Files: `src/app/db/migrations/index.ts`
- Cause: Migration functions not lazy-loaded; entire migration history imported on every app startup
- Improvement path: Use dynamic imports or registration pattern. Load only applied migrations. Consider splitting into separate modules by version range.

**Statement Cache Without TTL:**
- Problem: Prepared statement cache (`statementCache`) grows unbounded for dynamically generated queries
- Files: `src/app/db/connection.ts:103`, `src/lib/db/PreparedStatementCache.ts`
- Cause: No eviction policy on cache, only explicit invalidation
- Improvement path: Add LRU eviction when cache exceeds size threshold. Monitor cache hit/miss ratio.

**Store Subscription Overhead:**
- Problem: 40+ Zustand stores, many without proper selector optimization
- Files: `src/stores/` directory (contextStore.ts, brainStore.ts, reflectorStore.ts, etc.)
- Cause: Components may subscribe to entire store state, causing re-renders on any state update
- Improvement path: Add useShallow pattern consistently. Audit top-level subscriptions. Use computed selectors.

**Missing Indexes on High-Query Tables:**
- Problem: Frequent queries on conductor_runs, conductor_errors tables may be slow without proper indexes
- Files: `src/app/features/Manager/lib/conductor/types.ts` (table definitions)
- Cause: Indexes added post-hoc in migrations, may not cover all query patterns
- Improvement path: Analyze slow query logs. Add composite indexes for (project_id, status, created_at) patterns.

**CLI Session Heartbeat Polling:**
- Problem: Multiple polling intervals (refresh timer, heartbeat, stuck check) in CompactTerminal
- Files: `src/components/cli/CompactTerminal.tsx:422`, `src/components/cli/CompactTerminal.tsx:500`, `src/components/cli/CompactTerminal.tsx:604`
- Cause: Each interval independently fetches status, no request batching
- Improvement path: Consolidate into single polling loop. Use exponential backoff on stale sessions.

## Fragile Areas

**Conductor Pipeline Error Recovery:**
- Files: `src/app/features/Manager/lib/conductor/conductorOrchestrator.ts`, `src/app/features/Manager/lib/conductor/selfHealing/`
- Why fragile: Self-healing relies on error classification patterns with priority ordering. Missing context pattern or new error type bypasses healing entirely.
- Safe modification: Add new patterns to error classifier with tests. Test healing patch application against real failure cases before deploying.
- Test coverage: Only 14 tests in `tests/api/conductor/pipeline.test.ts` for complex 5-stage pipeline with self-healing.

**External Requirement Pipeline:**
- Files: `src/app/features/TaskRunner/lib/externalRequirementPipeline.ts`, `src/lib/supabase/external-requirements.ts`
- Why fragile: Claim-analyze-execute-cleanup sequence depends on optimistic locking. Failure in any stage leaves requirement in intermediate state.
- Safe modification: Add explicit state machine validation. Never allow moving from intermediate states without confirmation. Add recovery endpoints.
- Test coverage: No dedicated tests observed for external pipeline; integration tests only.

**Database Migration Bootstrap Logic:**
- Files: `src/app/db/migrations/index.ts:98-130`
- Why fragile: Pre-seeding destructive migrations as "applied" based on table existence heuristic. If table exists but schema is incomplete, migration skips.
- Safe modification: Add schema version tracking. Probe schema state before skipping migrations. Never assume old schema structure.
- Test coverage: No tests for bootstrap logic on partially-migrated databases.

**Conductor Global State with HMR:**
- Files: `src/app/features/Manager/lib/conductor/conductorOrchestrator.ts:35-49`
- Why fragile: Uses `globalThis` to survive HMR, but if initialization code re-runs partially, state may be corrupted.
- Safe modification: Add initialization guard with version number. Validate state on every access. Log initialization events.
- Test coverage: No tests for HMR re-initialization scenarios.

**Remote Command Handlers with Variable Permissions:**
- Files: `src/lib/remote/commandHandlers.ts:964`
- Why fragile: Permissions array passed by client without server-side validation. Command execution depends on unverified client-provided permissions.
- Safe modification: Fetch permissions from server DB only. Never trust client-provided permission list. Add audit logging.
- Test coverage: No observed tests for permission validation in command handlers.

## Scaling Limits

**Conductor Run History Unbounded:**
- Current capacity: No cleanup observed for `conductor_runs` table
- Limit: As runs accumulate (thousands per day), query times degrade
- Scaling path: Implement archive strategy. Move runs > 90 days old to history table or delete. Add pagination to history endpoint.

**Zustand Store Persistence:**
- Current capacity: Stores with persist middleware (contextStore, etc.) grow unbounded in localStorage
- Limit: localStorage ~5-10MB. Complex stores serialize to 100KB+ JSON
- Scaling path: Implement selective persistence. Archive old state snapshots. Use IndexedDB for larger stores.

**CLI Session Memory Growth:**
- Current capacity: 4 concurrent sessions, each holding command history in memory
- Limit: Long-running sessions accumulate 100MB+ in memory
- Scaling path: Implement circular buffer for command history. Move to disk or DB for archival sessions.

**Brain Insights Evidence Junction:**
- Current capacity: `brain_insight_evidence_junction` table join queries
- Limit: Cascading deletes will be slow as insights/evidence counts scale
- Scaling path: Add batch deletion API. Implement soft deletes with periodic hard cleanup.

## Dependencies at Risk

**Better-sqlite3 with No Fallback:**
- Risk: Single SQLite driver with no other DB option. Corruption scenarios have no mitigation.
- Impact: Any SQLite corruption = data loss
- Migration plan: Add backup/restore mechanism. Consider multi-writer setup with WAL mode validation.

**Supabase External Requirements Schema:**
- Risk: Schema defined in SQL comment (`src/lib/supabase/schema-external.sql`) but not version-controlled with migrations
- Impact: Local DB and Supabase get out of sync. Deployments fail silently.
- Migration plan: Move schema to versioned migrations. Add pre-flight schema validation on app start.

**Zustand without Undo/Redo:**
- Risk: Complex state mutations without transaction semantics. Accidental state corruption has no recovery path.
- Impact: Lost context groups, deleted requirements not recoverable
- Migration plan: Implement state snapshot system. Add undo queue with size limits.

## Missing Critical Features

**No Request Deduplication:**
- Problem: Multiple rapid API calls from different components can't be deduplicated
- Blocks: Can't optimize concurrent requirement claims, parallel context generation
- Related files: `src/app/api/external-requirements/` routes

**No Query Plan Visualization:**
- Problem: Slow queries hard to diagnose without EXPLAIN analysis
- Blocks: Performance optimization requires manual analysis
- Related files: `src/lib/db/queryPatternCollector.ts` (collects data but no analysis)

**No Audit Trail for Data Changes:**
- Problem: Requirement status changes, idea acceptance, direction pivots not logged
- Blocks: Can't track decision history, can't audit data integrity
- Related files: All repository write operations

**No Schema Migration Rollback:**
- Problem: Failed migrations can't be reverted without manual DB surgery
- Blocks: Safe deployments of schema changes
- Related files: `src/app/db/migrations/`

## Test Coverage Gaps

**Migration Testing Insufficient:**
- What's not tested: Bootstrap logic, constraint fixes, cascading deletes on partial databases
- Files: `src/app/db/migrations/` (no test migrations)
- Risk: Silent schema corruption on production databases
- Priority: High

**Conductor Pipeline Integration Tests:**
- What's not tested: Full 5-stage pipeline with error scenarios, self-healing effectiveness, multi-run concurrency
- Files: `tests/api/conductor/pipeline.test.ts` (14 tests for complex system)
- Risk: Pipeline failures in production undetected until user impact
- Priority: High

**External Requirements End-to-End:**
- What's not tested: Device claiming flow under concurrency, requirement state transitions, cleanup on failure
- Files: No dedicated test file observed
- Risk: Data loss, orphaned requirements on multi-device setups
- Priority: High

**Conductor Global State Lifecycle:**
- What's not tested: HMR re-initialization, orphaned run detection, cleanup mechanisms
- Files: `src/app/features/Manager/lib/conductor/conductorOrchestrator.ts`
- Risk: Stuck pipelines, memory leaks, stale state
- Priority: Medium

**Type Guard Coverage:**
- What's not tested: API route input validation, response shape validation against types
- Files: `src/app/api/conductor/`, `src/app/api/external-requirements/`
- Risk: Runtime errors on schema changes, invalid state propagation
- Priority: Medium

**Store Subscription Patterns:**
- What's not tested: Selector performance, re-render counts, memory leaks from subscriptions
- Files: `src/stores/` directory (40+ stores)
- Risk: Performance degradation, unexpected re-renders
- Priority: Low

---

*Concerns audit: 2026-03-14*
