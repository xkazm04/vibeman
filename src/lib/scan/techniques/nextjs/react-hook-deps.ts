/**
 * React Hook dependencies detection technique
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { detectReactHookDeps } from '@/lib/scan/patterns';

export function checkReactHookDeps(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  // Only check React/TSX files
  if (!file.path.endsWith('.tsx') && !file.path.endsWith('.jsx')) {
    return;
  }

  const issues = detectReactHookDeps(file.content);
  if (issues.length === 0) return;

  // Group by issue type
  const missingDeps = issues.filter(i => i.issueType === 'missing-dependency');
  const unnecessaryDeps = issues.filter(i => i.issueType === 'unnecessary-dependency');
  const missingArray = issues.filter(i => i.issueType === 'missing-array');

  if (missingDeps.length > 0) {
    const lines = missingDeps.map(i => i.line);
    opportunities.push({
      id: `missing-hook-deps-${file.path}`,
      title: `Missing React Hook dependencies in ${file.path}`,
      description: `Found ${missingDeps.length} hooks with missing dependencies. This can cause stale closures and bugs.`,
      category: 'code-quality',
      severity: 'high',
      impact: 'Prevents bugs caused by stale closures',
      effort: 'low',
      files: [file.path],
      lineNumbers: { [file.path]: lines },
      autoFixAvailable: true,
      estimatedTime: '15-30 minutes',
    });
  }

  if (missingArray.length > 0) {
    const lines = missingArray.map(i => i.line);
    opportunities.push({
      id: `missing-deps-array-${file.path}`,
      title: `Missing dependency arrays in ${file.path}`,
      description: `Found ${missingArray.length} hooks without dependency arrays. This can cause infinite loops or stale data.`,
      category: 'code-quality',
      severity: 'high',
      impact: 'Prevents infinite loops and ensures correct behavior',
      effort: 'low',
      files: [file.path],
      lineNumbers: { [file.path]: lines },
      autoFixAvailable: true,
      estimatedTime: '15-30 minutes',
    });
  }

  if (unnecessaryDeps.length > 0) {
    const lines = unnecessaryDeps.map(i => i.line);
    opportunities.push({
      id: `unnecessary-hook-deps-${file.path}`,
      title: `Unnecessary React Hook dependencies in ${file.path}`,
      description: `Found ${unnecessaryDeps.length} hooks with unnecessary dependencies. This causes unnecessary re-renders.`,
      category: 'performance',
      severity: 'low',
      impact: 'Reduces unnecessary re-renders',
      effort: 'low',
      files: [file.path],
      lineNumbers: { [file.path]: lines },
      autoFixAvailable: true,
      estimatedTime: '10-15 minutes',
    });
  }
}
