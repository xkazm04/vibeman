/**
 * Action Engine
 * Generates auto-fix requirements from predictions
 * Manages the auto-fix queue and approval workflow
 */

import { observatoryDb } from '@/app/db';
import type { DbLearnedPattern, DbAutoFixItem, CreateAutoFixItem } from '@/app/db/models/observatory.types';
import type { Prediction } from './PredictionEngine';

// Action templates for different issue types
interface ActionTemplate {
  type: string;
  title: string;
  requirementTemplate: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresTests: boolean;
  expiresInHours: number;
}

const ACTION_TEMPLATES: Record<string, ActionTemplate> = {
  'high-complexity': {
    type: 'refactor',
    title: 'Reduce complexity in {{file}}',
    requirementTemplate: `# Reduce Complexity

## Target File
{{file}}

## Issue
The file has high cyclomatic complexity (score: {{complexityScore}}).

## Requirements
1. Identify the most complex functions in the file
2. Extract helper functions where appropriate
3. Simplify conditional logic where possible
4. Ensure all existing tests pass after changes

## Constraints
- Do not change the public API of the file
- Keep the refactoring focused and minimal
- Add comments for any non-obvious logic`,
    riskLevel: 'medium',
    requiresTests: true,
    expiresInHours: 72,
  },

  'deep-nesting': {
    type: 'refactor',
    title: 'Reduce nesting depth in {{file}}',
    requirementTemplate: `# Reduce Nesting Depth

## Target File
{{file}}

## Issue
The file has excessive nesting depth which reduces readability.

## Requirements
1. Apply early return pattern where possible
2. Extract nested conditions into guard clauses
3. Consider extracting deeply nested logic into separate functions
4. Ensure all existing tests pass

## Constraints
- Maintain the same behavior
- Do not introduce new dependencies`,
    riskLevel: 'low',
    requiresTests: true,
    expiresInHours: 48,
  },

  'many-dependencies': {
    type: 'refactor',
    title: 'Reduce dependencies in {{file}}',
    requirementTemplate: `# Reduce Import Dependencies

## Target File
{{file}}

## Issue
The file imports many dependencies which can indicate:
- Too many responsibilities
- Tight coupling
- Potential for circular dependencies

## Requirements
1. Review all imports and identify unused ones
2. Consider if some dependencies can be passed as parameters
3. If the file does too much, consider splitting it
4. Ensure all tests pass

## Constraints
- Keep changes minimal
- Maintain existing functionality`,
    riskLevel: 'medium',
    requiresTests: true,
    expiresInHours: 72,
  },

  'high-commit-frequency': {
    type: 'prevention',
    title: 'Stabilize frequently changed file {{file}}',
    requirementTemplate: `# Stabilize High-Churn File

## Target File
{{file}}

## Issue
This file is changed very frequently, which can indicate:
- Unclear requirements
- Missing abstractions
- Poor separation of concerns

## Requirements
1. Review recent changes to identify patterns
2. Add integration tests for common use cases
3. Consider if the file should be split by concern
4. Document any unclear logic

## Constraints
- Focus on preventing future churn
- Do not make unnecessary changes`,
    riskLevel: 'low',
    requiresTests: true,
    expiresInHours: 48,
  },

  'frequent-failures': {
    type: 'fix',
    title: 'Fix reliability issues in {{file}}',
    requirementTemplate: `# Fix Reliability Issues

## Target File
{{file}}

## Issue
Previous executions targeting this file have frequently failed.

## Requirements
1. Review error patterns from recent failures
2. Add defensive coding where appropriate
3. Improve error handling
4. Add tests for edge cases

## Constraints
- Focus on reliability improvements
- Keep changes minimal`,
    riskLevel: 'medium',
    requiresTests: true,
    expiresInHours: 24,
  },

  'regression-prone': {
    type: 'prevention',
    title: 'Prevent regressions in {{file}}',
    requirementTemplate: `# Prevent Regressions

## Target File
{{file}}

## Issue
Changes to this file have caused regressions in the past.

## Requirements
1. Review the file's test coverage
2. Add tests for critical paths
3. Consider adding integration tests
4. Add documentation for complex logic

## Constraints
- Focus on test coverage
- Do not change existing behavior`,
    riskLevel: 'low',
    requiresTests: true,
    expiresInHours: 48,
  },
};

/**
 * Generate a requirement from a template
 */
function generateRequirement(template: ActionTemplate, context: Record<string, string>): string {
  let requirement = template.requirementTemplate;

  for (const [key, value] of Object.entries(context)) {
    requirement = requirement.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  return requirement;
}

/**
 * Select the best action template for a prediction
 */
function selectActionTemplate(prediction: Prediction): ActionTemplate | null {
  // Priority order of flags to match
  const flagPriority = [
    'frequent-failures',
    'regression-prone',
    'very-long-file',
    'high-complexity',
    'deep-nesting',
    'many-dependencies',
    'high-commit-frequency',
  ];

  // Build a set of all relevant indicators
  const indicators: string[] = [];

  // From signals
  if (prediction.signals.complexity !== undefined && prediction.signals.complexity < 40) {
    indicators.push('high-complexity');
  }
  if (prediction.signals.churn !== undefined && prediction.signals.churn < 40) {
    indicators.push('high-commit-frequency');
  }
  if (prediction.signals.historicalIssues !== undefined && prediction.signals.historicalIssues > 50) {
    indicators.push('frequent-failures');
  }

  // Find the highest priority matching template
  for (const flag of flagPriority) {
    if (indicators.includes(flag) && ACTION_TEMPLATES[flag]) {
      return ACTION_TEMPLATES[flag];
    }
  }

  // Default to complexity reduction if nothing specific matches
  if (prediction.severity === 'high' || prediction.severity === 'critical') {
    return ACTION_TEMPLATES['high-complexity'];
  }

  return null;
}

/**
 * Generate auto-fix items from predictions
 */
export async function generateAutoFixes(
  projectId: string,
  predictions: Prediction[],
  options: {
    maxItems?: number;
    minConfidence?: number;
    minUrgency?: number;
  } = {}
): Promise<DbAutoFixItem[]> {
  const { maxItems = 10, minConfidence = 0.5, minUrgency = 0.4 } = options;

  // Get learned patterns that have auto-fix templates
  const patterns = observatoryDb.getLearnedPatterns(projectId, {
    hasAutoFix: true,
    status: 'active',
  });
  const patternMap = new Map(patterns.map((p) => [p.id, p]));

  const autoFixes: DbAutoFixItem[] = [];

  // Sort predictions by urgency and confidence
  const sortedPredictions = [...predictions]
    .filter((p) => p.confidence >= minConfidence && p.urgency >= minUrgency)
    .sort((a, b) => b.urgency * b.confidence - a.urgency * a.confidence);

  for (const prediction of sortedPredictions) {
    if (autoFixes.length >= maxItems) break;

    // Check if we have a learned pattern with an auto-fix
    let requirement: string | null = null;
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    let title = prediction.title;

    if (prediction.patternId && patternMap.has(prediction.patternId)) {
      const pattern = patternMap.get(prediction.patternId)!;
      if (pattern.auto_fix_template) {
        requirement = pattern.auto_fix_template.replace(/\{\{file\}\}/g, prediction.file);
        riskLevel = pattern.auto_fix_risk || 'medium';
        title = `[Learned] ${prediction.title}`;
      }
    }

    // Fall back to template-based generation
    if (!requirement) {
      const template = selectActionTemplate(prediction);
      if (!template) continue;

      const context = {
        file: prediction.file,
        complexityScore: String(prediction.signals.complexity || 0),
        churnScore: String(prediction.signals.churn || 0),
      };

      requirement = generateRequirement(template, context);
      riskLevel = template.riskLevel;
      title = template.title.replace(/\{\{file\}\}/g, prediction.file.split('/').pop() || prediction.file);
    }

    // Calculate expiry
    const expiresAt = new Date(
      Date.now() + (riskLevel === 'low' ? 48 : riskLevel === 'medium' ? 72 : 96) * 60 * 60 * 1000
    ).toISOString();

    // Create the auto-fix item
    const autoFix = observatoryDb.createAutoFixItem({
      project_id: projectId,
      prediction_id: prediction.patternId || 'prediction',
      pattern_id: prediction.patternId || 'manual',
      title,
      description: prediction.description,
      target_files: [prediction.file],
      generated_requirement: requirement,
      priority: Math.round(prediction.urgency * 10),
      urgency_score: prediction.urgency,
      confidence_score: prediction.confidence,
      estimated_impact: prediction.severity === 'critical' ? 'high' : prediction.severity === 'high' ? 'medium' : 'low',
      risk_level: riskLevel,
      expires_at: expiresAt,
    });

    autoFixes.push(autoFix);
  }

  return autoFixes;
}

/**
 * Approve an auto-fix for execution
 */
export function approveAutoFix(id: string, approvedBy: string = 'auto'): DbAutoFixItem | null {
  return observatoryDb.approveAutoFix(id, approvedBy);
}

/**
 * Reject an auto-fix
 */
export function rejectAutoFix(id: string): DbAutoFixItem | null {
  return observatoryDb.updateAutoFixItem(id, { status: 'rejected' });
}

/**
 * Get pending auto-fixes for a project
 */
export function getPendingAutoFixes(projectId: string): DbAutoFixItem[] {
  return observatoryDb.getPendingAutoFixes(projectId);
}

/**
 * Get approved auto-fixes ready for execution
 */
export function getApprovedAutoFixes(projectId: string): DbAutoFixItem[] {
  const db = observatoryDb;
  // Get items with approved status
  const pending = db.getPendingAutoFixes(projectId);
  // Filter would need a separate query, but we can check after
  return pending.filter((item) => item.status === 'approved');
}

/**
 * Mark an auto-fix as executing
 */
export function markAutoFixExecuting(id: string, executionId: string): DbAutoFixItem | null {
  return observatoryDb.updateAutoFixItem(id, {
    status: 'executing',
    execution_id: executionId,
  });
}

/**
 * Complete an auto-fix execution
 */
export function completeAutoFix(id: string, success: boolean): DbAutoFixItem | null {
  return observatoryDb.updateAutoFixItem(id, {
    status: success ? 'completed' : 'failed',
  });
}

/**
 * Expire old auto-fixes
 */
export function expireOldAutoFixes(projectId: string): number {
  return observatoryDb.expireOldAutoFixes(projectId);
}

export type { ActionTemplate };
