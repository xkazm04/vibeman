# Phase 4: Review Stage - Research

**Researched:** 2026-03-14
**Domain:** LLM code review, Brain signal integration, execution reporting, git auto-commit
**Confidence:** HIGH

## Summary

Phase 4 transforms the existing metric-only `reviewStage.ts` into a full review pipeline that performs LLM-based per-file code review against a quality rubric, writes rich Brain signals per spec, generates a structured execution report, and optionally auto-commits on success. All four capabilities build on established patterns: the stage function pattern from Phase 1, the `brainService.recordSignal()` direct-call API, the `execSync` git pattern from `buildValidator.ts`, and the JSON-column migration pattern from Phases 2-3.

The existing `reviewStage.ts` already has the scaffolding: metric aggregation, error classification, a Brain signal recording path (currently via HTTP fetch), and a cycle-continuation decision. The refactoring replaces the HTTP Brain signal path with direct `brainService.recordSignal()`, adds a new LLM diff-review step before the decision, generates a JSON execution report stored on the run record, and gates auto-commit on both build validation and review pass.

**Primary recommendation:** Refactor `reviewStage.ts` in place, adding three new internal functions (diffReview, reportGeneration, gitCommit) while preserving the existing metric aggregation and decision logic. Add migration 203 for `execution_report` and `review_results` columns on `conductor_runs`, and extend `GoalInput` with `autoCommit` and `reviewModel` fields.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Per-file review: each changed file gets its own pass/fail with rationale (maps to VALD-03)
- Quality rubric evaluates three dimensions: logic correctness (spec acceptance criteria satisfied), naming & conventions (matches project patterns), type safety (proper TypeScript, no `any`)
- Review failure does NOT block the pipeline -- failure is recorded with rationale in the run record, pipeline continues
- Review model is configurable per-goal -- add `reviewModel` field to GoalInput (default to Sonnet if unset)
- Per-spec outcome signals: one signal per spec with pass/fail, rubric scores, and reviewer rationale
- Signals include the review rationale (why it passed/failed) so Brain can learn patterns
- Use `brainService.recordSignal()` directly -- no HTTP round-trip (replaces current HTTP POST approach in reviewStage.ts)
- Failed Brain signal writes silently continue -- log error, don't block the pipeline
- Stored as JSON TEXT in a new `execution_report` column on `conductor_runs` table
- Structured summary: goal, items executed (count + titles), files changed (list), build status, per-file review outcomes, overall pass/fail
- No cost/token estimate in report -- deferred to v2 (OPS-01)
- Surfaced via existing `/api/conductor/history/{runId}` endpoint -- report is just another field on the run. No new UI this phase
- Commits all changed files plus the execution report in a single commit
- Commit message format: conventional commit -- `feat(conductor): [goal title] - [N] specs executed, [M] files changed`
- Commit gate: BOTH build validation (tsc) AND LLM review must pass before auto-commit proceeds
- Toggle lives on GoalInput as `autoCommit` field (default: false) -- matches Phase 3's checkpoint config pattern on the goal record
- Uses `child_process.execSync` for git operations (same pattern as buildValidator from Phase 3)

### Claude's Discretion
- Exact review prompt template design
- How git diff is extracted per file for review input
- DB migration details for `execution_report` and `review_results` columns
- Internal structure of the review result JSON

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VALD-02 | LLM-powered code review evaluates diff against quality rubric (types, naming, patterns, no regressions) | Review prompt template with three-dimension rubric; per-file diff extraction via `git diff`; configurable reviewModel on GoalInput |
| VALD-03 | Code review produces pass/fail with rationale per reviewed file | ReviewFileResult type with pass/fail + rationale per file; stored as JSON in `review_results` column |
| REPT-01 | Execution report generated on goal completion: goal, items executed, files changed, build status, review outcome | ExecutionReport type stored as JSON TEXT in `execution_report` column on conductor_runs |
| REPT-02 | Report and all work committed to git on successful completion | Git auto-commit via execSync gated on build pass AND review pass; `autoCommit` field on GoalInput |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| child_process (node:child_process) | Node built-in | Git operations (diff, add, commit) | Already used in buildValidator.ts; execSync pattern established |
| better-sqlite3 | Existing | DB persistence for report/review columns | Project standard; synchronous API matches repository pattern |
| brainService | Internal | Direct signal recording | Already exists; replaces HTTP fetch approach in current reviewStage |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid (v4) | Existing | Generate unique IDs for review results | Already in project deps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| execSync for git | simple-git npm package | Adds dependency; execSync is already the project pattern in buildValidator |
| JSON column for report | Separate report table | Over-engineering; report is 1:1 with run, JSON column matches build_validation pattern |

## Architecture Patterns

### Recommended Project Structure
```
src/app/features/Manager/lib/conductor/
  stages/
    reviewStage.ts          # Refactored: add diff review, report gen, commit
  review/
    diffReviewer.ts         # LLM diff review logic (new)
    reportGenerator.ts      # Execution report builder (new)
    gitCommitter.ts         # Auto-commit logic (new)
    reviewTypes.ts          # Review-specific types (new)
```

### Pattern 1: Review Stage Refactoring
**What:** The existing `executeReviewStage()` becomes the orchestrator for four sub-operations: (1) LLM diff review, (2) Brain signal writes, (3) report generation, (4) optional auto-commit.
**When to use:** This is the main pattern for the entire phase.
**Example:**
```typescript
// reviewStage.ts - refactored signature
export async function executeReviewStage(input: ReviewStageInput): Promise<ReviewStageOutput> {
  // 1. Extract diffs for changed files
  const fileDiffs = extractFileDiffs(input.projectPath, input.executionResults);

  // 2. LLM code review per file
  const reviewResults = await reviewFileDiffs(fileDiffs, input.specs, input.reviewModel);

  // 3. Brain signal writes per spec
  await writeBrainSignals(input.projectId, input.specs, reviewResults);

  // 4. Generate execution report
  const report = generateExecutionReport(input, reviewResults);

  // 5. Aggregate metrics (existing logic, preserved)
  const { updatedMetrics, errors } = aggregateMetrics(input);

  // 6. Make continuation decision (existing logic, preserved)
  const decision = makeDecision(input, updatedMetrics, errors);

  // 7. Auto-commit if enabled and gates pass
  if (input.autoCommit && canCommit(input.buildResult, reviewResults)) {
    await commitChanges(input.projectPath, input.goalTitle, report);
  }

  return { decision, updatedMetrics, errors, reviewResults, report };
}
```

### Pattern 2: Git Diff Extraction
**What:** Use `execSync('git diff HEAD~1 -- <file>')` to get per-file diffs for review input.
**When to use:** Before sending files to LLM for review.
**Example:**
```typescript
function extractFileDiffs(projectPath: string, results: ExecutionResult[]): FileDiff[] {
  const allFiles = results.flatMap(r => r.filesChanged || []);
  const uniqueFiles = [...new Set(allFiles)];

  return uniqueFiles.map(filePath => {
    try {
      const diff = execSync(`git diff HEAD -- "${filePath}"`, {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 10000,
      });
      return { filePath, diff, error: null };
    } catch (error) {
      return { filePath, diff: '', error: String(error) };
    }
  });
}
```

**Key consideration:** `git diff HEAD` shows unstaged changes (files changed by execution but not yet committed). This is the correct baseline since execution writes to the working tree without committing. If the working tree is clean (e.g., after a previous auto-commit), use `git diff HEAD~1 HEAD` to get the last committed diff instead.

### Pattern 3: Brain Signal with Review Rationale
**What:** Use `brainService.recordSignal()` with signal type `implementation` and enriched data including review rationale.
**When to use:** After LLM review completes for each spec.
**Example:**
```typescript
import { recordSignal } from '@/lib/brain/brainService';
import { SignalType } from '@/types/signals';

function writeBrainSignal(projectId: string, spec: SpecMetadata, reviewResult: FileReviewResult[]) {
  try {
    recordSignal({
      projectId,
      signalType: SignalType.IMPLEMENTATION,
      data: {
        requirementId: spec.id,
        requirementName: spec.title,
        contextId: null,
        filesCreated: spec.affectedFiles.create,
        filesModified: spec.affectedFiles.modify,
        filesDeleted: spec.affectedFiles.delete,
        success: reviewResult.every(r => r.passed),
        executionTimeMs: 0,
        // Extended fields for review richness:
        reviewRationale: reviewResult.map(r => ({
          file: r.filePath,
          passed: r.passed,
          rationale: r.rationale,
          rubricScores: r.rubricScores,
        })),
      },
    });
  } catch (error) {
    console.error('[review] Brain signal write failed:', error);
    // Silent continue -- Brain is enrichment, not critical path
  }
}
```

**Important:** The `ImplementationSignalData` type expects specific fields (`requirementId`, `requirementName`, `filesCreated`, `filesModified`, `filesDeleted`, `success`, `executionTimeMs`). The review rationale goes in additional data fields. Since `data` is typed as `any` in `RecordSignalInput`, extra fields are safe, but the `calculateImplementationWeight` function only reads the standard fields.

### Anti-Patterns to Avoid
- **HTTP round-trip for Brain signals:** The current `reviewStage.ts` uses `fetch()` to POST signals. Replace with direct `brainService.recordSignal()` call. HTTP adds latency and failure modes.
- **Blocking on Brain signal failure:** Brain is enrichment. Never `throw` or return early on signal write failure.
- **Single-prompt review for all files:** Each file needs individual pass/fail. Batch all files into one prompt but structure output as per-file results.
- **Auto-commit without gate checks:** Always verify BOTH `buildResult.passed` AND all review files passed before committing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git diff extraction | Custom file comparison | `git diff HEAD` via execSync | Git handles renames, binary detection, encoding |
| Git commit | File staging logic | `git add -A && git commit` via execSync | Git handles index management |
| Signal recording | Direct DB insert | `brainService.recordSignal()` | Handles dedup, weight calc, cache invalidation, clustering |
| Migration tracking | Manual SQL checks | `runOnce()` from `migration.utils.ts` | Idempotent, tracked in `_migrations_applied` |

## Common Pitfalls

### Pitfall 1: Git Diff Baseline Confusion
**What goes wrong:** Using `git diff HEAD~1` when files haven't been committed yet yields wrong/empty diffs.
**Why it happens:** Execution writes to working tree but doesn't commit. `HEAD~1` compares two commits, not working tree changes.
**How to avoid:** Use `git diff HEAD` for unstaged working tree changes. If working tree is clean (after auto-commit in previous cycle), fall back gracefully.
**Warning signs:** Empty diffs despite files being listed in `executionResults.filesChanged`.

### Pitfall 2: LLM Review Prompt Token Overflow
**What goes wrong:** Large diffs exceed context window, causing truncated or failed reviews.
**Why it happens:** Some generated files can be 500+ lines of diff.
**How to avoid:** Truncate individual file diffs to a reasonable limit (e.g., 500 lines). Log when truncation occurs. Prioritize the most important sections (function signatures, type definitions).
**Warning signs:** LLM returning malformed JSON or "I can't see the full diff" responses.

### Pitfall 3: Review JSON Parse Failure
**What goes wrong:** LLM returns malformed JSON for review results, crashing the pipeline.
**Why it happens:** LLM output is inherently unreliable for structured data.
**How to avoid:** Wrap JSON.parse in try/catch. If parse fails, create a "review_error" result with the raw LLM output as rationale and mark as failed review. Never let parse failure crash the pipeline.
**Warning signs:** Intermittent failures in review stage with "Unexpected token" errors.

### Pitfall 4: Auto-Commit in Dirty Working Tree
**What goes wrong:** `git add -A` picks up unrelated files (node_modules changes, .env modifications, build artifacts).
**Why it happens:** `-A` stages everything. Execution may have side effects beyond the intended file changes.
**How to avoid:** Only `git add` specific files from `executionResults.filesChanged`. Use explicit file paths, not `git add -A`.
**Warning signs:** Commits containing `.next/`, `node_modules/`, or other unexpected files.

### Pitfall 5: Windows Path Issues in Git Commands
**What goes wrong:** Backslashes in file paths cause git commands to fail.
**Why it happens:** `executionResults.filesChanged` may contain Windows-style paths.
**How to avoid:** Normalize paths with `path.normalize()` and replace backslashes, matching the Phase 3 pattern.
**Warning signs:** "fatal: pathspec" errors from git on Windows.

### Pitfall 6: Brain Signal Data Shape Mismatch
**What goes wrong:** Extra fields in signal data get silently dropped or cause type errors.
**Why it happens:** `ImplementationSignalData` has a fixed shape but review rationale is additional data.
**How to avoid:** The `data` parameter in `RecordSignalInput` is typed as `any`, so extra fields pass through to JSON storage. But keep the required fields (`requirementId`, `filesCreated`, etc.) populated correctly. The `calculateImplementationWeight` function only reads standard fields.
**Warning signs:** Brain signals recorded but with `weight: 1.0` because success field wasn't set correctly.

## Code Examples

### Migration 203: Review Stage Columns
```typescript
// Source: Following pattern from 202_execute_stage_columns.ts
import type { DbConnection } from '../drivers/types';
import { addColumnIfNotExists, runOnce, type MigrationLogger } from './migration.utils';

export function migrate203ReviewStageColumns(db: DbConnection, logger?: MigrationLogger): void {
  runOnce(db, 'm203', () => {
    addColumnIfNotExists(db, 'conductor_runs', 'execution_report', 'TEXT', logger);
    addColumnIfNotExists(db, 'conductor_runs', 'review_results', 'TEXT', logger);
    logger?.success('Migration 203: added execution_report and review_results columns to conductor_runs');
  }, logger);
}
```

### GoalInput Extension
```typescript
// Add to existing GoalInput interface in types.ts
export interface GoalInput {
  // ... existing fields ...
  autoCommit: boolean;      // default: false
  reviewModel: string | null; // default: null (falls back to Sonnet)
}
```

### Review Result Types
```typescript
interface RubricScores {
  logicCorrectness: 'pass' | 'fail';
  namingConventions: 'pass' | 'fail';
  typeSafety: 'pass' | 'fail';
}

interface FileReviewResult {
  filePath: string;
  passed: boolean;
  rationale: string;
  rubricScores: RubricScores;
}

interface ReviewStageResult {
  overallPassed: boolean;
  fileResults: FileReviewResult[];
  reviewModel: string;
  reviewedAt: string;
}
```

### Execution Report Structure
```typescript
interface ExecutionReport {
  goal: { title: string; description: string };
  summary: {
    specsExecuted: number;
    specTitles: string[];
    filesChanged: string[];
    buildStatus: 'passed' | 'failed' | 'skipped';
    reviewOutcome: 'passed' | 'failed' | 'error';
    overallResult: 'success' | 'partial' | 'failure';
  };
  fileReviews: FileReviewResult[];
  autoCommitted: boolean;
  commitSha?: string;
  generatedAt: string;
}
```

### Git Auto-Commit
```typescript
import { execSync } from 'child_process';

function commitChanges(
  projectPath: string,
  goalTitle: string,
  specsExecuted: number,
  filesChanged: string[]
): { sha: string } | null {
  try {
    // Stage only the specific changed files
    for (const file of filesChanged) {
      const normalized = file.replace(/\\/g, '/');
      execSync(`git add "${normalized}"`, { cwd: projectPath, encoding: 'utf-8', timeout: 10000 });
    }

    // Create conventional commit message
    const message = `feat(conductor): ${goalTitle} - ${specsExecuted} specs executed, ${filesChanged.length} files changed`;

    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 30000,
    });

    // Get the commit SHA
    const sha = execSync('git rev-parse HEAD', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();

    return { sha };
  } catch (error) {
    console.error('[review] Auto-commit failed:', error);
    return null;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP fetch for Brain signals | Direct `brainService.recordSignal()` | Phase 4 (this phase) | Eliminates HTTP round-trip, removes fetch failure mode |
| Metric-only review | LLM diff-based code review | Phase 4 (this phase) | Per-file quality assessment with rubric |
| No execution report | JSON report on conductor_runs | Phase 4 (this phase) | Self-contained run history |
| Manual git commit | Auto-commit on success | Phase 4 (this phase) | Configurable automation |

## Open Questions

1. **Git diff for newly created files**
   - What we know: `git diff HEAD` only shows diffs for tracked files. Newly created files (in spec's `affectedFiles.create`) won't appear in `git diff HEAD`.
   - What's unclear: Whether `git diff HEAD` with `--no-index` or `git diff --cached` after staging would be better.
   - Recommendation: Use `git diff HEAD` for modified files. For new files, read the full file content directly with `fs.readFileSync()` and present it as a "new file" to the reviewer. This is actually more useful for review anyway.

2. **Review model routing**
   - What we know: `reviewModel` is a string field on GoalInput. The orchestrator reads it to pass to the review stage.
   - What's unclear: The exact mechanism to call an LLM for review (direct API call vs. CLI session).
   - Recommendation: Use direct API call pattern (fetch to LLM provider endpoint) rather than spawning a CLI session. Review is a single prompt/response, not an interactive session. Check if the project has an existing LLM call utility; if not, use fetch to the Next.js API that proxies LLM calls.

3. **Orchestrator integration point**
   - What we know: The orchestrator already calls `executeReviewStage()` in the pipeline loop (line ~623). The refactored function needs additional input (projectPath, specs, buildResult, goalTitle, autoCommit, reviewModel).
   - What's unclear: Whether to expand the existing input parameter or create a new type.
   - Recommendation: Create a new `ReviewStageInput` type that includes all needed fields. The orchestrator already has access to `projectPath`, `specWriterOutput.specs`, `buildResult`, and goal metadata. Wire these through.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/api/conductor/review.test.ts` |
| Full suite command | `npx vitest run tests/api/conductor/` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VALD-02 | LLM review evaluates diff against rubric | unit | `npx vitest run tests/api/conductor/review.test.ts -t "review evaluates"` | Wave 0 |
| VALD-03 | Review produces per-file pass/fail with rationale | unit | `npx vitest run tests/api/conductor/review.test.ts -t "per-file"` | Wave 0 |
| REPT-01 | Execution report generated with all required fields | unit | `npx vitest run tests/api/conductor/review.test.ts -t "report"` | Wave 0 |
| REPT-02 | Auto-commit on success with correct gate checks | unit | `npx vitest run tests/api/conductor/review.test.ts -t "auto-commit"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/api/conductor/review.test.ts`
- **Per wave merge:** `npx vitest run tests/api/conductor/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/api/conductor/review.test.ts` -- covers VALD-02, VALD-03, REPT-01, REPT-02
- [ ] Test DB schema needs `build_validation`, `checkpoint_type`, `execution_report`, `review_results` columns added to `createConductorTables()` helper
- [ ] Mock for LLM review call (the diff review uses an LLM; must mock its response in tests)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `reviewStage.ts`, `conductorOrchestrator.ts`, `brainService.ts`, `buildValidator.ts` -- direct code inspection
- Existing codebase: `conductor.repository.ts`, `specRepository.ts`, `migration.utils.ts` -- established patterns
- Existing codebase: `signalCollector.ts`, `brain.types.ts` -- signal recording interface and data types

### Secondary (MEDIUM confidence)
- `ImplementationSignalData` type analysis -- signal shape confirmed via code inspection of `brain.types.ts`
- Migration pattern confirmed via `200_conductor_foundation.ts`, `201_conductor_specs.ts`, `202_execute_stage_columns.ts`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries and patterns already exist in the codebase
- Architecture: HIGH -- building directly on established stage pattern, repository pattern, migration pattern
- Pitfalls: HIGH -- identified from actual code paths (git diff baseline, token overflow, parse failure, dirty tree)

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- internal codebase patterns, no external dependency drift)
