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
} from './reviewTypes';

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

  const prompt = `You are a code reviewer. Review each file's changes against this quality rubric:

1. **Logic Correctness** (pass/fail): Does the code correctly implement the intended behavior? Are there logic errors, edge cases missed, or incorrect algorithms?
2. **Naming & Conventions** (pass/fail): Do variable names, function names, and code structure follow consistent patterns? Is the code readable?
3. **Type Safety** (pass/fail): Is TypeScript used properly? Are there any \`any\` types, missing type annotations, or unsafe type assertions?

For each file, provide a pass/fail verdict with a brief rationale.

${fileSections}

Respond with ONLY valid JSON in this exact shape:
{
  "files": [
    {
      "filePath": "path/to/file.ts",
      "passed": true,
      "rationale": "Brief explanation of verdict",
      "rubricScores": {
        "logicCorrectness": "pass",
        "namingConventions": "pass",
        "typeSafety": "pass"
      }
    }
  ]
}`;

  // Handle files with extraction errors
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
            passed: boolean;
            rationale: string;
            rubricScores: RubricScores;
          }>
        ).map((f) => ({
          filePath: f.filePath,
          passed: f.passed,
          rationale: f.rationale,
          rubricScores: {
            logicCorrectness: f.rubricScores?.logicCorrectness || 'fail',
            namingConventions: f.rubricScores?.namingConventions || 'fail',
            typeSafety: f.rubricScores?.typeSafety || 'fail',
          },
        }));
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
