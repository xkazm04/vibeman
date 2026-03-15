/**
 * Diff Reviewer
 *
 * Extracts per-file diffs from git and sends them to an LLM for
 * rubric-based code review. Returns structured pass/fail results
 * per file with rationale.
 */

import { execSync } from 'child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ExecutionResult, SpecMetadata } from '../types';
import type {
  FileDiff,
  FileReviewResult,
  ReviewStageResult,
  RubricScores,
  DeepRubricScores,
  RubricDimension,
} from './reviewTypes';
import { CRITICAL_DIMENSIONS } from './reviewTypes';

const MAX_DIFF_LINES = 500;

// ============================================================================
// Diff Extraction
// ============================================================================

/**
 * Extract file diffs for all changed files across execution results.
 *
 * - Modified files: git diff HEAD
 * - New files: full file content via fs.readFileSync
 * - Truncates diffs > 500 lines
 * - Normalizes Windows backslashes to forward slashes
 */
export function extractFileDiffs(
  projectPath: string,
  executionResults: ExecutionResult[],
  specs: SpecMetadata[]
): FileDiff[] {
  // Collect all unique file paths from execution results
  const allFiles = new Set<string>();
  for (const result of executionResults) {
    if (result.filesChanged) {
      for (const file of result.filesChanged) {
        allFiles.add(file.replace(/\\/g, '/'));
      }
    }
  }

  // Determine which files are new (appear in any spec's affectedFiles.create)
  const newFiles = new Set<string>();
  for (const spec of specs) {
    if (spec.affectedFiles?.create) {
      for (const file of spec.affectedFiles.create) {
        newFiles.add(file.replace(/\\/g, '/'));
      }
    }
  }

  const diffs: FileDiff[] = [];

  for (const filePath of allFiles) {
    try {
      const normalized = filePath.replace(/\\/g, '/');
      const isNew = newFiles.has(normalized);
      let diff: string;

      if (isNew) {
        // New file: read full content
        const fullPath = path.join(projectPath, normalized);
        diff = fs.readFileSync(fullPath, 'utf-8');
      } else {
        // Modified file: git diff HEAD
        diff = execSync(`git diff HEAD -- "${normalized}"`, {
          cwd: projectPath,
          encoding: 'utf-8',
          timeout: 10000,
        });

        // Fallback to cached diff if HEAD diff is empty
        if (!diff.trim()) {
          diff = execSync(`git diff --cached -- "${normalized}"`, {
            cwd: projectPath,
            encoding: 'utf-8',
            timeout: 10000,
          });
        }
      }

      // Truncate large diffs
      const lines = diff.split('\n');
      if (lines.length > MAX_DIFF_LINES) {
        console.log(
          `[review] Truncating diff for ${normalized}: ${lines.length} lines -> ${MAX_DIFF_LINES}`
        );
        diff = lines.slice(0, MAX_DIFF_LINES).join('\n') + '\n... (truncated)';
      }

      diffs.push({ filePath: normalized, diff, isNew, error: null });
    } catch (error) {
      diffs.push({
        filePath: filePath.replace(/\\/g, '/'),
        diff: '',
        isNew: false,
        error: String(error),
      });
    }
  }

  return diffs;
}

// ============================================================================
// LLM Review
// ============================================================================

/**
 * Send file diffs to LLM for rubric-based code review.
 *
 * Uses the project's existing AI chat proxy at /api/ai/chat.
 * Reviews against three dimensions: logic correctness, naming conventions,
 * and type safety.
 */
export async function reviewFileDiffs(
  fileDiffs: FileDiff[],
  specs: SpecMetadata[],
  reviewModel: string | null
): Promise<ReviewStageResult> {
  const model = reviewModel || 'sonnet';

  // Build spec context map: filePath -> spec acceptance criteria
  const specContextByFile = new Map<string, string[]>();
  for (const spec of specs) {
    const allSpecFiles = [
      ...(spec.affectedFiles?.create || []),
      ...(spec.affectedFiles?.modify || []),
    ].map((f) => f.replace(/\\/g, '/'));

    for (const file of allSpecFiles) {
      if (!specContextByFile.has(file)) {
        specContextByFile.set(file, []);
      }
      specContextByFile.get(file)!.push(spec.title);
    }
  }

  // Build file sections for the prompt
  const fileSections = fileDiffs
    .filter((fd) => !(fd.diff === '' && fd.error))
    .map((fd) => {
      const specContext = specContextByFile.get(fd.filePath);
      const specInfo = specContext
        ? `\nRelated specs: ${specContext.join(', ')}`
        : '';
      return `### File: ${fd.filePath} (${fd.isNew ? 'NEW' : 'MODIFIED'})${specInfo}\n\`\`\`\n${fd.diff}\n\`\`\``;
    })
    .join('\n\n');

  const prompt = `You are a code reviewer. Review each file's changes against this 10-dimension quality rubric. Score each dimension 1-5 (1=terrible, 5=excellent):

1. **structureSize**: Functions/files < 200 LOC, well-decomposed
2. **noAnyTypes**: No \`any\` usage, proper TypeScript types throughout
3. **errorHandling**: Try/catch, error boundaries, graceful failures
4. **security**: OWASP compliance — no injection, XSS, CSRF vulnerabilities
5. **resilience**: Circuit-breaking, graceful degradation, retry logic
6. **performance**: No N+1 queries, efficient algorithms, no unnecessary work
7. **naming**: Consistent, descriptive variable/function/class names
8. **dependencies**: No circular imports, clean dependency graph
9. **testing**: Code is testable, edge cases considered
10. **reversibility**: Changes are safe to roll back, no data loss risk

For each file, provide scores and a brief rationale.

${fileSections}

Respond with ONLY valid JSON in this exact shape:
{
  "files": [
    {
      "filePath": "path/to/file.ts",
      "rationale": "Brief explanation of verdict",
      "scores": {
        "structureSize": 4,
        "noAnyTypes": 5,
        "errorHandling": 3,
        "security": 4,
        "resilience": 3,
        "performance": 4,
        "naming": 5,
        "dependencies": 4,
        "testing": 2,
        "reversibility": 4
      }
    }
  ]
}`;

  // Handle files with extraction errors
  const failDimension = (critical: boolean): RubricDimension => ({ score: 1, critical, note: 'Diff extraction failed' });
  const errorResults: FileReviewResult[] = fileDiffs
    .filter((fd) => fd.diff === '' && fd.error)
    .map((fd) => ({
      filePath: fd.filePath,
      passed: false,
      rationale: 'Diff extraction failed',
      rubricScores: {
        logicCorrectness: 'fail' as const,
        namingConventions: 'fail' as const,
        typeSafety: 'fail' as const,
      },
      deepScores: {
        structureSize: failDimension(true),
        noAnyTypes: failDimension(true),
        errorHandling: failDimension(true),
        security: failDimension(true),
        resilience: failDimension(false),
        performance: failDimension(false),
        naming: failDimension(false),
        dependencies: failDimension(false),
        testing: failDimension(false),
        reversibility: failDimension(false),
      },
    }));

  let llmResults: FileReviewResult[] = [];

  // Only call LLM if there are files to review
  const reviewableFiles = fileDiffs.filter(
    (fd) => !(fd.diff === '' && fd.error)
  );
  if (reviewableFiles.length > 0) {
    try {
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model,
        }),
      });

      const responseText = await response.text();

      try {
        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

        llmResults = (
          parsed.files as Array<{
            filePath: string;
            rationale: string;
            scores: Record<string, number>;
          }>
        ).map((f) => parseDeepReviewResult(f));
      } catch {
        // JSON parse failure — create error result
        llmResults = [
          {
            filePath: 'review_error',
            passed: false,
            rationale: `LLM response parse failed: ${responseText.slice(0, 500)}`,
            rubricScores: {
              logicCorrectness: 'fail',
              namingConventions: 'fail',
              typeSafety: 'fail',
            },
          },
        ];
      }
    } catch (error) {
      // Network/fetch failure
      llmResults = [
        {
          filePath: 'review_error',
          passed: false,
          rationale: `LLM review request failed: ${String(error)}`,
          rubricScores: {
            logicCorrectness: 'fail',
            namingConventions: 'fail',
            typeSafety: 'fail',
          },
        },
      ];
    }
  }

  const fileResults = [...errorResults, ...llmResults];

  return {
    overallPassed: fileResults.every((r) => r.passed),
    fileResults,
    reviewModel: model,
    reviewedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Deep Review Parsing Helpers
// ============================================================================

const DIMENSION_NAMES: (keyof DeepRubricScores)[] = [
  'structureSize', 'noAnyTypes', 'errorHandling', 'security',
  'resilience', 'performance', 'naming', 'dependencies',
  'testing', 'reversibility',
];

/**
 * Parse a single file's LLM response into a FileReviewResult with deep scores.
 *
 * - Builds DeepRubricScores from the 10-dimension scores
 * - Marks critical dimensions per CRITICAL_DIMENSIONS
 * - Derives pass/fail: fails if ANY critical dimension scores < 2
 * - Backward-compat: maps to legacy RubricScores
 */
function parseDeepReviewResult(raw: {
  filePath: string;
  rationale: string;
  scores: Record<string, number>;
}): FileReviewResult {
  const scores = raw.scores || {};

  // Build deep rubric scores
  const deepScores: DeepRubricScores = {} as DeepRubricScores;
  for (const dim of DIMENSION_NAMES) {
    const score = Math.max(1, Math.min(5, Math.round(scores[dim] || 1)));
    const critical = CRITICAL_DIMENSIONS.includes(dim);
    deepScores[dim] = { score, critical };
  }

  // A file FAILS if ANY critical dimension has score < 2
  const hasCriticalFailure = CRITICAL_DIMENSIONS.some(
    (dim) => deepScores[dim].score < 2
  );
  const passed = !hasCriticalFailure;

  // Backward-compat: derive legacy RubricScores
  const avgLogic = (deepScores.structureSize.score + deepScores.errorHandling.score) / 2;
  const rubricScores: RubricScores = {
    logicCorrectness: avgLogic >= 2.5 ? 'pass' : 'fail',
    namingConventions: deepScores.naming.score >= 3 ? 'pass' : 'fail',
    typeSafety: deepScores.noAnyTypes.score >= 3 ? 'pass' : 'fail',
  };

  return {
    filePath: raw.filePath,
    passed,
    rationale: raw.rationale,
    rubricScores,
    deepScores,
  };
}
