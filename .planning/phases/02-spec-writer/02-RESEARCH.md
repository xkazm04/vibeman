# Phase 2: Spec Writer - Research

**Researched:** 2026-03-14
**Domain:** Conductor pipeline stage — transforming approved backlog items into structured markdown specs
**Confidence:** HIGH

## Summary

The Spec Writer is a new pipeline stage that sits between Batch (which produces approved backlog items with model assignments) and Execute (which dispatches requirement files to CLI sessions). Currently, the Batch stage generates flat markdown requirement files via `buildRequirementContent()` in `batchStage.ts`. The Spec Writer replaces this with a richer, structured spec format including machine-readable acceptance criteria, categorized affected files via ts-morph analysis, Brain-injected code conventions, and explicit constraints.

The implementation requires: (1) a new `specWriter` stage function and spec template renderer, (2) ts-morph file discovery utility for affected file analysis, (3) Brain integration via existing `getBehavioralContext()`, (4) a `conductor_specs` DB table with repository, (5) filesystem management for `.conductor/runs/{runId}/specs/` directory, and (6) wiring into the orchestrator pipeline loop between Batch and Execute.

**Primary recommendation:** Build the spec writer as a pure async stage function following the established `StageFn<S>` pattern, with a dedicated repository for DB persistence and a template renderer that produces structured markdown consumable by the Execute stage's `readRequirement()`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Acceptance criteria use structured assertions: `GIVEN x WHEN y THEN z` format — machine-parseable by Execute Stage
- Implementation approach is strategy-level outline with key decisions noted (not step-by-step instructions, not minimal constraints)
- Each spec includes a T-shirt size complexity signal (S/M/L) for downstream model routing
- Every spec has a Constraints section listing things the executor must NOT do — always present, not conditional
- Sections per spec (ordered): Goal, Acceptance Criteria, Affected Files, Approach, Code Conventions, Constraints, Complexity
- Affected files structured as `{ create: [...], modify: [...], delete: [...] }` — categorized by operation type
- Exact paths only — no directory-level wildcards or globs
- File discovery uses ts-morph AST analysis to find imports, exports, and references
- Validation at spec time: files in `modify` and `delete` must exist on disk; files in `create` must NOT exist
- Structured format feeds directly into Execute Stage's domain isolation intersection algorithm
- Brain conventions appear as dedicated "Code Conventions" section with short actionable rules
- Brain queried per-spec with the spec's specific domain/affected files — not batched
- All relevant Brain insights included, labeled by confidence: "Strong pattern" vs "Emerging pattern"
- If Brain has no data for spec's domain, Code Conventions section omitted entirely (not an error)
- Uses `getBehavioralContext()` from `src/lib/brain/behavioralContext.ts` and `brainService` from `src/lib/brain/brainService.ts`
- Specs stored in per-run directory: `.conductor/runs/{runId}/specs/`
- File naming: sequential with slug — `001-fix-auth-middleware.md`, `002-add-user-store.md`
- Ordered by backlog priority, slug derived from backlog item title
- Auto-delete spec files on successful run completion (no filesystem artifacts after run)
- Spec metadata persisted in `conductor_specs` DB table: runId, backlogItemId, title, affectedFiles JSON, complexity, status

### Claude's Discretion
- Exact structured assertion syntax (GIVEN/WHEN/THEN vs alternative machine-parseable formats)
- How ts-morph analysis scopes file discovery (import chain depth, test file inclusion)
- DB migration details for conductor_specs table
- Spec template rendering implementation (string interpolation vs template engine)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SPEC-01 | Conductor generates one markdown requirement spec per approved backlog item | Spec writer stage function, template renderer, filesystem management for `.conductor/runs/{runId}/specs/` |
| SPEC-02 | Each spec includes goal context, acceptance criteria, affected files, implementation approach, and constraints | 7-section spec template with structured GIVEN/WHEN/THEN assertions, categorized affected files JSON, approach outline, constraints section |
| SPEC-03 | Spec generation queries Brain for code conventions and architecture patterns relevant to the spec domain | Integration with `getBehavioralContext()` and `brainService`, filtered by spec's affected files domain |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | ^27.0.2 | AST analysis for file discovery | Already installed; provides TypeScript-aware import/export/reference resolution |
| better-sqlite3 | (existing) | conductor_specs DB table | Project standard for all persistence |
| uuid | ^13.0.0 | Spec and run IDs | Already installed; used throughout conductor |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:fs/promises | (built-in) | Spec file I/O | Creating/reading/deleting spec markdown files |
| node:path | (built-in) | Path manipulation | Constructing spec file paths, slug generation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| String interpolation for templates | Handlebars/Mustache | String interpolation is simpler, no new dependency, template is static and predictable |
| ts-morph for file discovery | Simple regex import scanning | ts-morph is more accurate for TypeScript (handles re-exports, type imports, barrel files) but heavier |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/features/Manager/lib/conductor/
├── stages/
│   └── specWriterStage.ts       # Stage function (entry point)
├── spec/
│   ├── specTemplate.ts          # Template renderer (markdown generation)
│   ├── specRepository.ts        # DB CRUD for conductor_specs table
│   ├── specFileManager.ts       # Filesystem ops (create/read/delete spec files)
│   └── fileDiscovery.ts         # ts-morph affected file analysis
├── types.ts                     # Extended with SpecWriterInput/Output, SpecMetadata
└── conductorOrchestrator.ts     # Updated to include spec writer stage

src/app/db/migrations/
└── 201_conductor_specs.ts       # Migration for conductor_specs table

tests/conductor/
└── spec-writer.test.ts          # Tests for spec generation, file discovery, Brain integration
```

### Pattern 1: Stage Function Contract
**What:** The spec writer follows the established `StageFn<S>` pattern where each stage is a pure async function receiving `PipelineContext` and typed input, returning typed output.
**When to use:** For all pipeline stage implementations.
**Example:**
```typescript
// Follows existing pattern from stages/scoutStage.ts, stages/batchStage.ts
interface SpecWriterInput {
  runId: string;
  projectId: string;
  projectPath: string;
  approvedItems: ApprovedBacklogItem[];  // From batch stage output
  config: BalancingConfig;
  goalContext: { title: string; description: string };
}

interface SpecWriterOutput {
  specs: SpecMetadata[];  // Persisted to conductor_specs
  specDir: string;        // Path to .conductor/runs/{runId}/specs/
}

export async function executeSpecWriterStage(
  input: SpecWriterInput
): Promise<SpecWriterOutput> {
  // 1. Create spec directory
  // 2. For each approved item:
  //    a. Run ts-morph file discovery
  //    b. Query Brain for conventions
  //    c. Render spec template
  //    d. Write spec file
  //    e. Persist metadata to DB
  // 3. Return spec metadata array
}
```

### Pattern 2: Repository Pattern (functional object)
**What:** DB access follows the project's functional object pattern (not classes).
**When to use:** For the `specRepository` that persists spec metadata.
**Example:**
```typescript
// Mirrors conductorRepository pattern exactly
export const specRepository = {
  createSpec(params: { ... }): DbSpec { ... },
  getSpecsByRunId(runId: string): DbSpec[] { ... },
  updateSpecStatus(specId: string, status: string): void { ... },
  deleteSpecsByRunId(runId: string): void { ... },
};
```

### Pattern 3: Template Rendering via String Interpolation
**What:** Use template literal strings with helper functions to render spec markdown.
**When to use:** For generating the structured markdown spec from typed data.
**Example:**
```typescript
export function renderSpec(data: SpecRenderData): string {
  const sections: string[] = [];

  sections.push(`# ${data.title}`);
  sections.push('');
  sections.push('## Goal');
  sections.push(data.goalDescription);
  sections.push('');
  sections.push('## Acceptance Criteria');
  for (const ac of data.acceptanceCriteria) {
    sections.push(`- GIVEN ${ac.given} WHEN ${ac.when} THEN ${ac.then}`);
  }
  sections.push('');
  sections.push('## Affected Files');
  sections.push('```json');
  sections.push(JSON.stringify(data.affectedFiles, null, 2));
  sections.push('```');
  // ... remaining sections

  return sections.join('\n');
}
```

### Pattern 4: ts-morph File Discovery
**What:** Use ts-morph's `Project` class to analyze imports, exports, and references from a set of entry files, producing categorized file lists.
**When to use:** For the `fileDiscovery.ts` module that determines affected files per spec.
**Example:**
```typescript
import { Project } from 'ts-morph';

export function discoverAffectedFiles(
  projectPath: string,
  entryFiles: string[],  // Files mentioned in backlog item description
  maxDepth: number = 2   // Import chain depth limit
): AffectedFiles {
  const project = new Project({
    tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true, // Only analyze what we add
  });

  // Add entry files
  for (const file of entryFiles) {
    project.addSourceFileAtPathIfExists(file);
  }

  // Traverse imports up to maxDepth
  const modify: string[] = [];  // Existing files that will be changed
  const create: string[] = [];  // New files to be created
  // ... analysis logic

  return { create, modify, delete: [] };
}
```

### Anti-Patterns to Avoid
- **Batching Brain queries:** Brain must be queried per-spec with the spec's domain context, not once for all specs. Each spec touches different files/domains.
- **Storing spec content in DB:** Only metadata goes in `conductor_specs`; the full markdown lives on disk in `.conductor/runs/{runId}/specs/`. This avoids bloating the DB with large text blobs.
- **Hardcoding file paths in specs:** File discovery must use ts-morph analysis, not guesses from the backlog item title/description.
- **Making Code Conventions section mandatory:** When Brain has no data for a spec's domain, omit the section entirely rather than including an empty placeholder.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript import resolution | Custom regex parser for imports | ts-morph `SourceFile.getImportDeclarations()` | Handles path aliases, barrel exports, type-only imports, re-exports |
| File existence validation | Custom `fs.existsSync` loops | ts-morph `project.getSourceFile()` returns undefined if not found | Already loaded in the project, avoids redundant I/O |
| Slug generation | Complex slug library | Simple `title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)` | Requirements are simple ASCII titles; no i18n needed |
| Brain context | Direct DB queries | `getBehavioralContext(projectId)` + filter by domain | Already aggregates signals, patterns, insights with caching |
| DB migrations | Manual ALTER TABLE | `createTableIfNotExists()` + `addColumnIfNotExists()` from migration.utils | Established pattern, handles idempotency |

**Key insight:** The existing codebase already has robust utilities for Brain integration, DB migration, and repository patterns. The spec writer's novelty is in the template structure and ts-morph file discovery, not in infrastructure.

## Common Pitfalls

### Pitfall 1: ts-morph Project Initialization Performance
**What goes wrong:** Creating a new `Project` instance and loading the full tsconfig adds all source files, which can take several seconds for large codebases.
**Why it happens:** Default ts-morph behavior loads everything from tsconfig `include` patterns.
**How to avoid:** Use `skipAddingFilesFromTsConfig: true` and only add the specific entry files needed for each spec. Reuse a single `Project` instance across specs in the same run.
**Warning signs:** Spec generation taking >10 seconds per spec.

### Pitfall 2: Circular Import Chains in File Discovery
**What goes wrong:** Following imports recursively without depth limits causes infinite loops or huge file lists.
**Why it happens:** TypeScript codebases commonly have circular imports (A imports B imports A).
**How to avoid:** Track visited files in a Set; enforce a max depth (2-3 levels is sufficient for file discovery). The goal is "affected files" not "complete dependency graph."
**Warning signs:** File discovery returning 50+ files for a simple spec.

### Pitfall 3: Acceptance Criteria Generation Quality
**What goes wrong:** GIVEN/WHEN/THEN assertions are too vague or too implementation-specific to be useful for the Execute stage.
**Why it happens:** The backlog item description may be high-level ("improve auth") without specific behavioral assertions.
**How to avoid:** The spec writer should derive acceptance criteria from the backlog item's description + affected files analysis, focusing on observable behaviors. Include at most 3-5 criteria per spec. If the item is vague, generate criteria about file existence and type-checking rather than behavioral assertions.
**Warning signs:** Acceptance criteria that reference internal implementation details rather than observable outcomes.

### Pitfall 4: Race Condition on Spec Directory Cleanup
**What goes wrong:** Auto-deleting spec files while the Execute stage is still reading them.
**Why it happens:** Cleanup triggered before all parallel executions complete.
**How to avoid:** Cleanup should only run after ALL specs in a run have been executed (or failed). The orchestrator controls this timing, not the spec writer. The spec writer creates files; the orchestrator (or a post-run cleanup hook) deletes them.
**Warning signs:** "File not found" errors during execution.

### Pitfall 5: Brain Query Returns Empty for New Projects
**What goes wrong:** `getBehavioralContext()` returns `{ hasData: false }` for projects without behavioral signals, causing the spec writer to fail or produce incomplete specs.
**Why it happens:** Brain needs accumulated signals to provide meaningful data.
**How to avoid:** Code Conventions section is explicitly optional (omitted when Brain has no data). This is a locked decision. The spec writer must handle `hasData: false` gracefully by simply not rendering the Code Conventions section.
**Warning signs:** Error logs about missing Brain data.

## Code Examples

### Spec Template Output (Target Format)
```markdown
# Fix Authentication Middleware

## Goal
Fix the authentication middleware to properly validate JWT tokens and return 401 for expired tokens instead of 500.

## Acceptance Criteria
- GIVEN a request with an expired JWT token WHEN the auth middleware processes it THEN it returns HTTP 401 with error message "Token expired"
- GIVEN a request with no Authorization header WHEN the auth middleware processes it THEN it returns HTTP 401 with error message "No token provided"
- GIVEN a request with a valid JWT token WHEN the auth middleware processes it THEN the request proceeds to the next handler with user context attached

## Affected Files
```json
{
  "create": [],
  "modify": [
    "src/middleware/auth.ts",
    "src/lib/jwt.ts"
  ],
  "delete": []
}
```

## Approach
- Replace manual JWT parsing in auth.ts with jose library's jwtVerify
- Add explicit expiration check before signature validation
- Return structured error responses with appropriate HTTP status codes
- Key decision: Use middleware-level error handling rather than per-route try/catch

## Code Conventions
- **Strong pattern:** Repository pattern — use functional objects for data access, not classes
- **Strong pattern:** Error responses use `NextResponse.json({ error: string }, { status: number })` format
- **Emerging pattern:** Middleware files export a single default function

## Constraints
- Do NOT modify the User type or any database schema
- Do NOT add new npm dependencies for JWT handling (jose is already installed)
- Do NOT change the route handler signatures

## Complexity
M
```

### conductor_specs Table Schema
```sql
CREATE TABLE IF NOT EXISTS conductor_specs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  backlog_item_id TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  affected_files TEXT NOT NULL,  -- JSON: { create: [], modify: [], delete: [] }
  complexity TEXT NOT NULL CHECK (complexity IN ('S', 'M', 'L')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES conductor_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_conductor_specs_run
ON conductor_specs(run_id, sequence_number);
```

### Affected Files JSON Structure (for Execute Stage Consumption)
```typescript
interface AffectedFiles {
  create: string[];   // Files that should be created (must NOT exist on disk)
  modify: string[];   // Files that will be modified (must exist on disk)
  delete: string[];   // Files that will be removed (must exist on disk)
}

// Validation function
function validateAffectedFiles(
  affectedFiles: AffectedFiles,
  projectPath: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const file of affectedFiles.modify) {
    if (!fs.existsSync(path.join(projectPath, file))) {
      errors.push(`modify: ${file} does not exist`);
    }
  }
  for (const file of affectedFiles.delete) {
    if (!fs.existsSync(path.join(projectPath, file))) {
      errors.push(`delete: ${file} does not exist`);
    }
  }
  for (const file of affectedFiles.create) {
    if (fs.existsSync(path.join(projectPath, file))) {
      errors.push(`create: ${file} already exists`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### Brain Integration for Code Conventions
```typescript
import { getBehavioralContext } from '@/lib/brain/behavioralContext';

function extractCodeConventions(
  projectId: string,
  affectedFiles: string[]
): CodeConvention[] | null {
  const ctx = getBehavioralContext(projectId);

  if (!ctx.hasData) return null;

  const conventions: CodeConvention[] = [];

  // Extract relevant insights based on affected file domains
  for (const insight of ctx.topInsights) {
    conventions.push({
      rule: insight.description,
      confidence: insight.confidence >= 80 ? 'Strong pattern' : 'Emerging pattern',
      source: insight.title,
    });
  }

  // Extract patterns from implementation success data
  if (ctx.patterns.preferredContexts.length > 0) {
    // Include preferred context patterns when files overlap
  }

  return conventions.length > 0 ? conventions : null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat requirement files (batchStage.ts `buildRequirementContent`) | Structured specs with AC, affected files, Brain conventions | Phase 2 (now) | Execute stage gets richer context, domain isolation uses structured file claims |
| No file discovery | ts-morph AST analysis for affected files | Phase 2 (now) | Enables file-path intersection for domain isolation (EXEC-01) |
| No Brain in spec generation | Brain conventions injected per-spec | Phase 2 (now) | Specs carry project-specific patterns learned from Brain signals |

**Key change:** The current `buildRequirementContent()` in `batchStage.ts` produces simple markdown with metadata, description, and implementation guidance. The spec writer produces a structured 7-section document designed for machine consumption by the Execute stage.

## Open Questions

1. **How should the spec writer receive approved backlog items?**
   - What we know: Currently the Batch stage produces `BatchDescriptor` with `requirementNames` and `modelAssignments`. The spec writer needs the original backlog item data (title, description, effort, etc.) not just requirement names.
   - What's unclear: Whether the spec writer should run BEFORE Batch (replacing its requirement file creation) or AFTER Batch (enriching its output).
   - Recommendation: The spec writer should replace the `buildRequirementContent()` call within the Batch stage flow. The orchestrator should call spec writer after triage produces approved items but before execute. The Batch stage's model routing logic remains separate.

2. **What is the optimal ts-morph import chain depth?**
   - What we know: Depth 1 catches direct imports. Depth 2 catches imports-of-imports. Depth 3+ is typically diminishing returns.
   - What's unclear: The right balance for this codebase (which uses barrel exports extensively).
   - Recommendation: Default to depth 2 with a configurable parameter. Include test files only if they import the modified file directly (depth 1).

3. **How does complexity (S/M/L) map to model routing?**
   - What we know: `BalancingConfig.modelRouting` uses `complexity_1/2/3` conditions. The spec writer produces S/M/L.
   - What's unclear: The exact mapping between S/M/L and complexity_1/2/3.
   - Recommendation: S=complexity_1, M=complexity_2, L=complexity_3. This preserves the existing routing infrastructure.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via vitest.config.ts) |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run tests/conductor/spec-writer.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPEC-01 | Generates one markdown spec per approved item | unit | `npx vitest run tests/conductor/spec-writer.test.ts -t "generates one spec per item"` | No - Wave 0 |
| SPEC-01 | Spec files written to `.conductor/runs/{runId}/specs/` | unit | `npx vitest run tests/conductor/spec-writer.test.ts -t "writes to correct directory"` | No - Wave 0 |
| SPEC-01 | Spec naming follows sequential slug pattern | unit | `npx vitest run tests/conductor/spec-writer.test.ts -t "sequential naming"` | No - Wave 0 |
| SPEC-02 | Spec contains all 7 required sections | unit | `npx vitest run tests/conductor/spec-writer.test.ts -t "spec sections"` | No - Wave 0 |
| SPEC-02 | Acceptance criteria use GIVEN/WHEN/THEN format | unit | `npx vitest run tests/conductor/spec-writer.test.ts -t "acceptance criteria format"` | No - Wave 0 |
| SPEC-02 | Affected files JSON is valid and validated | unit | `npx vitest run tests/conductor/spec-writer.test.ts -t "affected files validation"` | No - Wave 0 |
| SPEC-03 | Brain conventions included when available | unit | `npx vitest run tests/conductor/spec-writer.test.ts -t "brain conventions"` | No - Wave 0 |
| SPEC-03 | Code Conventions omitted when Brain has no data | unit | `npx vitest run tests/conductor/spec-writer.test.ts -t "no brain data"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/conductor/spec-writer.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/conductor/spec-writer.test.ts` -- covers SPEC-01, SPEC-02, SPEC-03
- [ ] `conductor_specs` table added to `tests/setup/test-database.ts` -- test DB schema
- [ ] No framework install needed (Vitest already configured)

## Sources

### Primary (HIGH confidence)
- Project source code: `src/app/features/Manager/lib/conductor/` -- types.ts, conductor.repository.ts, conductorOrchestrator.ts, stages/batchStage.ts, stages/executeStage.ts
- Project source code: `src/lib/brain/behavioralContext.ts` -- getBehavioralContext() API and BehavioralContext type
- Project source code: `src/lib/brain/brainService.ts` -- Brain service orchestration layer
- Project source code: `src/app/db/migrations/migration.utils.ts` -- Migration utilities (createTableIfNotExists, addColumnIfNotExists, runOnce)
- Project source code: `tests/setup/test-database.ts` -- Test DB setup pattern
- package.json: ts-morph ^27.0.2, uuid ^13.0.0 already installed

### Secondary (MEDIUM confidence)
- ts-morph API knowledge from training data (verified: dependency is installed, version ^27.0.2)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, patterns established in codebase
- Architecture: HIGH -- follows established stage function, repository, and migration patterns
- Pitfalls: MEDIUM -- ts-morph performance characteristics based on training data, not benchmarked in this codebase
- Brain integration: HIGH -- verified getBehavioralContext() API and BehavioralContext type shape from source

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable internal architecture, no external dependencies changing)
