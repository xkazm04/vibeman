/**
 * Spec Quality Gate
 *
 * Validates specs before the Execute stage. Checks that each spec has
 * valid metadata, referenced files exist, and scope is contained.
 * Currently informational (logs issues but does not hard-block).
 */

import { specRepository } from '../spec/specRepository';
import type { SpecMetadata } from '../types';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// Types
// ============================================================================

export interface SpecGateResult {
  passed: boolean;
  specResults: Array<{
    specId: string;
    title: string;
    passed: boolean;
    issues: string[];
  }>;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Run the spec quality gate for all specs in a given run.
 *
 * Validates each spec's metadata and file references against the
 * project filesystem. Returns per-spec pass/fail with issue details.
 */
export function runSpecQualityGate(runId: string, projectPath: string): SpecGateResult {
  const specs = specRepository.getSpecsByRunId(runId);
  const specResults = specs.map((spec) => validateSpec(spec, projectPath));
  return {
    passed: specResults.every((r) => r.passed),
    specResults,
  };
}

// ============================================================================
// Validation
// ============================================================================

const MAX_AFFECTED_FILES = 15;

function validateSpec(
  spec: SpecMetadata,
  projectPath: string
): {
  specId: string;
  title: string;
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check affected files exist (for modify/delete only — create files won't exist yet)
  const filesToCheck = [
    ...(spec.affectedFiles?.modify || []),
    ...(spec.affectedFiles?.delete || []),
  ];
  for (const file of filesToCheck) {
    const fullPath = path.join(projectPath, file);
    if (!fs.existsSync(fullPath)) {
      issues.push(`Referenced file not found: ${file}`);
    }
  }

  // Check scope containment (too many files = risky)
  const totalFiles =
    (spec.affectedFiles?.create?.length || 0) +
    (spec.affectedFiles?.modify?.length || 0) +
    (spec.affectedFiles?.delete?.length || 0);
  if (totalFiles > MAX_AFFECTED_FILES) {
    issues.push(`Scope too large: ${totalFiles} affected files (max ${MAX_AFFECTED_FILES})`);
  }

  // Check has a title
  if (!spec.title || spec.title.trim() === '') {
    issues.push('Missing spec title');
  }

  return {
    specId: spec.id,
    title: spec.title,
    passed: issues.length === 0,
    issues,
  };
}
