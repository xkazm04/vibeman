# Phase 6: Goal Analyzer and Backlog - Research

**Researched:** 2026-03-14
**Domain:** LLM-driven codebase analysis, gap reporting, backlog generation with Brain pattern integration
**Confidence:** HIGH

## Summary

Phase 6 transforms a user-defined goal into a prioritized, domain-tagged backlog by analyzing the codebase through an LLM, injecting Brain behavioral context as constraints, and generating backlog items that include creative suggestions from three Ideas module scan type perspectives (zen_architect, bug_hunter, ui_perfectionist). The core implementation is a single goal analyzer function that takes a goal + file contents + Brain context and produces a gap report + backlog items in one LLM pass.

The architecture is straightforward: the goal analyzer is a new module called by the orchestrator *before* the existing scout stage (or replacing it for goal-driven runs). It uses the established `/api/ai/chat` proxy pattern for LLM calls, stores its gap report as a JSON TEXT column on `conductor_runs`, and writes backlog items to the existing `ideas` table with source metadata to distinguish conductor-generated items from scout-generated ones. Brain integration follows the proven `getBehavioralContext()` pattern already used by `conflictDetector.ts`.

**Primary recommendation:** Build a `goalAnalyzer.ts` module as a pure async function that accepts goal, file contents, and Brain context, calls the LLM once, and returns typed `GapReport` + `BacklogItem[]`. Wire it into the orchestrator as a pre-scout step for goal-driven runs. Store all outputs using existing DB patterns (JSON TEXT columns, ideas table).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- LLM-only analysis: feed goal + relevant file contents to LLM to identify gaps -- no ts-morph dependency
- File discovery: context-first with keyword fallback. If goal has a contextId, focus on that context's file list. If no contextId, use file tree + grep keywords to find relevant files
- Gap report stored as structured JSON TEXT column on conductor_runs (like triage_data, execution_report)
- Gaps categorized by type: missing_feature, tech_debt, missing_tests, missing_docs
- Single LLM pass: include scan type perspectives (zen_architect, bug_hunter, ui_perfectionist) as prompt sections in the goal analysis call -- no separate scout stage dispatch
- Only the core three scan types specified in BACK-02 (zen_architect, bug_hunter, ui_perfectionist)
- Each backlog item tagged with source: 'structural_analysis' or 'creative_suggestion' (with originating scan type)
- No auto-filtering of off-topic items -- show all items at triage with relevance scores, let user decide
- Brain constraints injected into the LLM analysis prompt -- topInsights + patterns section from getBehavioralContext()
- Brain data guides what gaps are found (analysis guidance), but does NOT influence priority scoring
- When Brain has no data (getBehavioralContext().hasData === false), skip Brain constraints section entirely
- Backlog items stored in the existing ideas table -- reuses tinder UI for approve/reject at triage
- Conductor-generated items distinguished via source field + run_id in metadata -- filter by run_id to get backlog for a specific pipeline run
- Effort expressed as 1-10 numeric scale
- Affected domain assigned by LLM from the project's existing context list

### Claude's Discretion
- Exact LLM prompt template for goal analysis (structure, ordering of sections)
- How file contents are chunked/summarized if they exceed context limits
- Gap report JSON schema details (beyond the categorization decision)
- How scan type perspectives are woven into the analysis prompt
- How context list is formatted for domain assignment

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GOAL-02 | Conductor analyzes codebase relative to stated goal using LLM interpretation | goalAnalyzer module with file discovery + LLM analysis; context-first file discovery with keyword fallback |
| GOAL-03 | Goal analysis produces a gap report identifying missing code, debt, and untested areas relevant to the goal | GapReport type with categorized gaps (missing_feature, tech_debt, missing_tests, missing_docs); stored as JSON TEXT column |
| BACK-01 | Conductor generates prioritized backlog items from goal gap analysis | backlogGenerator extracts structured items from LLM response; stores in ideas table with effort/impact/risk scores |
| BACK-02 | Backlog generation integrates Ideas module scan types for creative suggestions | Three scan type perspectives woven into single LLM prompt; items tagged with source scan type |
| BACK-03 | Each backlog item includes rationale, estimated effort, and affected domain | Maps to ideas table fields: reasoning, effort (1-10), context_id (domain assignment from context list) |
| BRAIN-01 | Brain serves as pattern library -- Conductor queries stored patterns during Scout and Spec generation | getBehavioralContext().topInsights + patterns injected into goal analysis prompt as "project has learned..." constraints |
| BRAIN-02 | Brain serves as active decision engine -- Conductor consults Brain before architecture decisions and task routing | Brain data shapes gap detection (what to look for), not just decorative metadata; formatBehavioralForPrompt() provides prompt text |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | existing | Gap report + backlog persistence | Project DB layer, synchronous API |
| uuid (v4) | existing | IDs for backlog items, gap entries | Already used across conductor |
| node:fs + node:path | built-in | File discovery and content reading | No external dep needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| getBehavioralContext | internal | Brain pattern extraction | Called at analysis start for prompt injection |
| ideaRepository | internal | Backlog item CRUD | Stores generated backlog items |
| contextDb | internal | Context/domain lookup | File lists for context-scoped analysis, domain assignment |
| /api/ai/chat | internal | LLM proxy | Single analysis call per goal |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| /api/ai/chat proxy | Direct SDK call | Proxy is established pattern; keeps provider abstraction |
| ts-morph structural analysis | LLM-only analysis | User locked: LLM-only, no ts-morph |
| Multiple LLM calls per scan type | Single pass with perspectives | User locked: single pass, no separate dispatch |

## Architecture Patterns

### Recommended Project Structure
```
src/app/features/Manager/lib/conductor/
  stages/
    goalAnalyzer.ts          # Core analysis: file discovery + LLM call + response parsing
    goalAnalyzer.types.ts    # GapReport, GapItem, BacklogItemInput types
  # Existing files unchanged:
  conductorOrchestrator.ts   # Modified: call goalAnalyzer before scout for goal-driven runs
  conductor.repository.ts    # Unchanged (gap_report column added via migration)
  types.ts                   # Extended: GoalAnalyzerInput, GoalAnalyzerOutput

src/app/db/migrations/
  205_goal_analyzer_columns.ts  # Adds gap_report TEXT column to conductor_runs
```

### Pattern 1: Single-Pass LLM Analysis with Structured Output
**What:** One LLM call receives goal + file contents + Brain context + scan type perspectives and returns structured JSON with gap report + backlog items.
**When to use:** When the analysis is goal-scoped and all perspectives can fit in one context window.
**Example:**
```typescript
// Source: project pattern from diffReviewer.ts (review/diffReviewer.ts)
const response = await fetch('http://localhost:3000/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: analysisPrompt }],
    model: config.scanModel || 'sonnet',
  }),
});

const responseText = await response.text();
const jsonMatch = responseText.match(/\{[\s\S]*\}/);
const result = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
```

### Pattern 2: Context-First File Discovery with Keyword Fallback
**What:** If goal has a contextId, use that context's file_paths. Otherwise, build a file tree + grep for goal keywords to find relevant files.
**When to use:** Always -- determines which files feed into the LLM analysis.
**Example:**
```typescript
// Source: existing contextDb pattern
function discoverRelevantFiles(
  projectId: string,
  projectPath: string,
  goalContextId: string | null,
  goalKeywords: string[]
): string[] {
  if (goalContextId) {
    const ctx = contextDb.getContextById(goalContextId);
    if (ctx) {
      const filePaths = JSON.parse(ctx.file_paths || '[]');
      return filePaths;
    }
  }
  // Fallback: file tree + keyword grep
  // Walk src/ directory, filter by keyword matches in path/content
}
```

### Pattern 3: Brain Context Injection (Proven Pattern)
**What:** Extract behavioral context and format as prompt section, skip entirely if no data.
**When to use:** When Brain should guide analysis without being a hard gate.
**Example:**
```typescript
// Source: conflictDetector.ts + behavioralContext.ts
const brainCtx = getBehavioralContext(projectId);
let brainSection = '';
if (brainCtx.hasData) {
  brainSection = formatBehavioralForPrompt(brainCtx);
  // Or build custom section focusing on topInsights + patterns
}
// Include brainSection in analysis prompt only when non-empty
```

### Pattern 4: Migration for New JSON TEXT Column
**What:** Add nullable TEXT column to conductor_runs using established migration pattern.
**When to use:** For gap_report storage.
**Example:**
```typescript
// Source: migration 204 pattern (204_triage_data_column.ts)
export function migrate205GoalAnalyzerColumns(db: DbConnection, logger?: MigrationLogger): void {
  runOnce(db, 'm205', () => {
    addColumnIfNotExists(db, 'conductor_runs', 'gap_report', 'TEXT', logger);
    logger?.success('Migration 205: added gap_report column to conductor_runs');
  }, logger);
}
```

### Anti-Patterns to Avoid
- **Multiple LLM calls for each scan type perspective:** User locked single-pass. All three perspectives go in one prompt.
- **Using ts-morph for structural analysis:** User explicitly rejected this; LLM-only approach.
- **Auto-filtering backlog items by relevance:** User wants all items shown at triage with relevance scores, not pre-filtered.
- **Brain data influencing effort/impact scoring:** Brain guides gap detection only; scoring stays objective.
- **Creating a new table for backlog items:** Use existing `ideas` table with source metadata.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idea persistence | Custom backlog table | `ideaRepository.createIdea()` | Ideas table has all needed fields: effort, impact, risk, scan_type, context_id, goal_id, reasoning |
| Brain context extraction | Custom signal queries | `getBehavioralContext()` + `formatBehavioralForPrompt()` | Proven pattern, handles no-data case, token-conscious formatting |
| ID generation | Custom ID scheme | `uuid.v4()` | Standard across conductor |
| DB column additions | Manual ALTER TABLE | `addColumnIfNotExists()` + `runOnce()` | Migration safety pattern, idempotent |
| LLM call abstraction | Direct provider SDK | `/api/ai/chat` proxy | Provider-agnostic, existing pattern |
| File path normalization | Custom normalizer | `path.normalize() + backslash replace` | Phase 3 established pattern |

**Key insight:** Almost every persistence and integration need is already solved by existing modules. The novel work is the LLM prompt template and response parsing.

## Common Pitfalls

### Pitfall 1: LLM Response Parsing Failure
**What goes wrong:** LLM returns malformed JSON or wraps it in markdown code fences, causing JSON.parse to fail.
**Why it happens:** LLMs inconsistently format JSON responses, especially with complex schemas.
**How to avoid:** Use the regex extraction pattern from diffReviewer.ts (`responseText.match(/\{[\s\S]*\}/)`). Add fallback parsing for common edge cases (code fences, trailing commas). Validate parsed result against expected schema before using.
**Warning signs:** Empty gap reports or zero backlog items when the goal clearly has work to do.

### Pitfall 2: Context Window Overflow
**What goes wrong:** Feeding too many file contents into the LLM exhausts the context window, causing truncation or failure.
**Why it happens:** Large codebases can have thousands of lines in relevant files.
**How to avoid:** Limit file content to first ~200 lines per file. Cap total files at ~20. Prioritize entry points and key files. Include file tree listing for breadth, full content only for depth.
**Warning signs:** LLM responses become incoherent or miss obvious gaps.

### Pitfall 3: Domain Assignment Mismatch
**What goes wrong:** LLM assigns a domain/context that doesn't exist in the project's context list.
**Why it happens:** LLM invents context names instead of selecting from the provided list.
**How to avoid:** Include the exact context list (id + name) in the prompt. Validate returned context_id against the project's actual contexts. Fall back to null context_id for unmatched domains.
**Warning signs:** Foreign key errors when inserting ideas, or items appearing with no domain.

### Pitfall 4: Missing scan_id for Idea Creation
**What goes wrong:** `ideaRepository.createIdea()` requires a `scan_id` field.
**Why it happens:** Conductor-generated backlog items don't come from a traditional scan.
**How to avoid:** Generate a synthetic scan_id (e.g., `conductor-${runId}`) that groups all items from one analysis run. This also enables `getIdeasByScanId()` for run-scoped queries.
**Warning signs:** DB insert failures on NOT NULL constraint.

### Pitfall 5: Brain Data Absence on Fresh Projects
**What goes wrong:** `getBehavioralContext()` returns `{ hasData: false }` on projects with no behavioral signals.
**Why it happens:** New projects or projects that haven't been used with Brain features.
**How to avoid:** Check `hasData` before including Brain section in prompt. The analysis should work identically with or without Brain data -- it's enrichment, not a requirement. Match the conflictDetector no-data pattern.
**Warning signs:** Analysis crashes or returns empty results on new projects.

## Code Examples

### Goal Analyzer Input/Output Types
```typescript
// Types for the goal analyzer module
export interface GapItem {
  type: 'missing_feature' | 'tech_debt' | 'missing_tests' | 'missing_docs';
  title: string;
  description: string;
  affectedFiles: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface GapReport {
  goalId: string;
  analyzedFiles: string[];
  gaps: GapItem[];
  analyzedAt: string;
}

export interface BacklogItemInput {
  title: string;
  description: string;
  reasoning: string;
  effort: number;       // 1-10
  impact: number;       // 1-10
  risk: number;         // 1-10
  category: string;     // IdeaCategory value
  contextId: string | null;  // Domain assignment
  source: 'structural_analysis' | 'creative_suggestion';
  sourceScanType?: 'zen_architect' | 'bug_hunter' | 'ui_perfectionist';
  relevanceScore: number; // 0-1, how relevant to the goal
}

export interface GoalAnalyzerOutput {
  gapReport: GapReport;
  backlogItems: BacklogItemInput[];
}
```

### Orchestrator Integration Point
```typescript
// In conductorOrchestrator.ts runPipelineLoop(), before scout stage:
// Goal-driven analysis replaces scout for conductor runs with a goal
if (goalRecord && goalRecord.description) {
  const analyzerResult = await executeGoalAnalysis({
    runId,
    projectId,
    projectPath,
    goal: goalRecord,
    config,
    abortSignal: abortController.signal,
  });

  // Store gap report
  updateRunInDb(runId, { gap_report: JSON.stringify(analyzerResult.gapReport) });

  // Create backlog items in ideas table
  for (const item of analyzerResult.backlogItems) {
    ideaRepository.createIdea({
      id: uuidv4(),
      scan_id: `conductor-${runId}`,
      project_id: projectId,
      context_id: item.contextId,
      scan_type: item.sourceScanType || 'zen_architect',
      category: item.category,
      title: item.title,
      description: item.description,
      reasoning: item.reasoning,
      effort: item.effort,
      impact: item.impact,
      risk: item.risk,
      goal_id: goalId,
    });
  }

  // Skip scout stage, proceed to triage with generated items
}
```

### Brain Context Prompt Section
```typescript
// Format Brain data as "institutional knowledge" in the analysis prompt
function buildBrainSection(projectId: string): string {
  const ctx = getBehavioralContext(projectId);
  if (!ctx.hasData) return '';

  const sections: string[] = [];

  if (ctx.topInsights.length > 0) {
    const insights = ctx.topInsights
      .map(i => `- ${i.title}: ${i.description} (${i.confidence}% confidence)`)
      .join('\n');
    sections.push(`### This project has learned:\n${insights}`);
  }

  if (ctx.patterns.preferredContexts.length > 0) {
    sections.push(`### Preferred areas: ${ctx.patterns.preferredContexts.join(', ')}`);
  }

  if (ctx.patterns.revertedCount > 0) {
    sections.push(`### Caution: ${ctx.patterns.revertedCount} recent reverts -- avoid similar patterns`);
  }

  return sections.length > 0
    ? `\n## Project Intelligence (Brain Patterns)\n\nApply these learned patterns as constraints:\n\n${sections.join('\n\n')}\n`
    : '';
}
```

### File Discovery Implementation
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import { contextDb } from '@/app/db';

function discoverFiles(
  projectId: string,
  projectPath: string,
  contextId: string | null,
  goalText: string
): { files: Array<{ path: string; content: string }>; fileTree: string } {
  let filePaths: string[] = [];

  // Context-first: use context file list
  if (contextId) {
    const ctx = contextDb.getContextById(contextId);
    if (ctx) {
      filePaths = JSON.parse(ctx.file_paths || '[]');
    }
  }

  // Keyword fallback: grep for goal-related terms
  if (filePaths.length === 0) {
    const keywords = extractKeywords(goalText);
    filePaths = walkAndFilter(projectPath, keywords);
  }

  // Read file contents (capped at ~200 lines each, max 20 files)
  const files = filePaths.slice(0, 20).map(fp => {
    const fullPath = path.resolve(projectPath, fp);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n').slice(0, 200);
      return { path: fp, content: lines.join('\n') };
    } catch {
      return { path: fp, content: '// [file not readable]' };
    }
  });

  // Build file tree for breadth
  const fileTree = buildFileTree(projectPath);

  return { files, fileTree };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Scout dispatches CLI per (scanType, context) pair | Goal analyzer runs single LLM pass with all perspectives | Phase 6 | Reduces API calls from N to 1, more coherent analysis |
| Brain as passive enrichment | Brain as active decision engine | Phase 6 (BRAIN-02) | Brain patterns shape what gaps are found, not just decorate results |
| Generic code scanning | Goal-constrained analysis | Phase 6 (GOAL-02) | Only finds gaps relevant to the stated goal, not generic improvements |

## Open Questions

1. **How should the orchestrator decide between scout stage and goal analyzer?**
   - What we know: Goal-driven runs use the goal analyzer; the scout stage exists for non-goal runs
   - What's unclear: Whether goal analyzer fully replaces scout or runs alongside it
   - Recommendation: Goal analyzer replaces scout for goal-driven runs. The orchestrator checks if goalRecord has a description; if so, run goal analyzer and skip scout. Backlog items go directly to triage.

2. **What is the optimal max file content to include per LLM call?**
   - What we know: Context windows vary by model (100K-200K tokens). ~200 lines per file x 20 files = ~4000 lines is conservative.
   - What's unclear: Whether summarization is needed or raw content suffices
   - Recommendation: Start with raw content (200 lines x 20 files). Add summarization only if context limits are hit in practice. The prompt template itself should be ~500-1000 tokens.

3. **How to handle the relevance score field for triage display?**
   - What we know: User wants relevance scores shown at triage. Ideas table doesn't have a relevance_score column.
   - What's unclear: Whether to add a column or use metadata
   - Recommendation: Store relevance_score in the idea's reasoning field as a structured prefix (e.g., "[Relevance: 0.85] ...") or add it to a JSON metadata field. Avoid adding a new column for a single-use field.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + better-sqlite3 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run tests/api/conductor/goal-analyzer.test.ts` |
| Full suite command | `npx vitest run tests/api/conductor/` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GOAL-02 | Codebase analysis relative to goal produces results | integration | `npx vitest run tests/api/conductor/goal-analyzer.test.ts -t "analyzes codebase" -x` | No -- Wave 0 |
| GOAL-03 | Gap report has categorized gaps (missing_feature, tech_debt, missing_tests, missing_docs) | unit | `npx vitest run tests/api/conductor/goal-analyzer.test.ts -t "gap report" -x` | No -- Wave 0 |
| BACK-01 | Backlog items generated from gap analysis with priority | unit | `npx vitest run tests/api/conductor/goal-analyzer.test.ts -t "backlog items" -x` | No -- Wave 0 |
| BACK-02 | Scan type perspectives produce creative suggestions | unit | `npx vitest run tests/api/conductor/goal-analyzer.test.ts -t "scan type" -x` | No -- Wave 0 |
| BACK-03 | Items include rationale, effort, affected domain | unit | `npx vitest run tests/api/conductor/goal-analyzer.test.ts -t "rationale" -x` | No -- Wave 0 |
| BRAIN-01 | Brain patterns included in analysis prompt | unit | `npx vitest run tests/api/conductor/goal-analyzer.test.ts -t "brain patterns" -x` | No -- Wave 0 |
| BRAIN-02 | Brain serves as decision engine, not decoration | unit | `npx vitest run tests/api/conductor/goal-analyzer.test.ts -t "brain decision" -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/api/conductor/goal-analyzer.test.ts -x`
- **Per wave merge:** `npx vitest run tests/api/conductor/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/api/conductor/goal-analyzer.test.ts` -- covers GOAL-02, GOAL-03, BACK-01, BACK-02, BACK-03, BRAIN-01, BRAIN-02
- [ ] Test DB setup function for goal analyzer tables (extend existing `createConductorTables`)
- [ ] Mock for `/api/ai/chat` responses (structured JSON matching GoalAnalyzerOutput)

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/app/features/Manager/lib/conductor/` -- orchestrator, stage patterns, types
- Project codebase: `src/lib/brain/behavioralContext.ts` -- getBehavioralContext() API and return type
- Project codebase: `src/lib/brain/conflictDetector.ts` -- Brain no-data handling pattern
- Project codebase: `src/app/db/repositories/idea.repository.ts` -- createIdea() signature and fields
- Project codebase: `src/app/features/Ideas/lib/scanTypes.ts` -- ScanType enum and AGENT_REGISTRY
- Project codebase: `src/app/db/migrations/204_triage_data_column.ts` -- migration pattern
- Project codebase: `src/app/features/Manager/lib/conductor/review/diffReviewer.ts` -- /api/ai/chat call pattern

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions -- user-locked implementation choices

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries are already in the project
- Architecture: HIGH - follows established conductor patterns exactly
- Pitfalls: HIGH - derived from actual codebase inspection (e.g., scan_id requirement, JSON parsing)

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable internal architecture, no external dependencies)
