/**
 * Complex conditional detection technique
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { detectComplexConditionals } from '@/lib/scan/patterns';

export function checkComplexConditionals(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  const issues = detectComplexConditionals(file.content);
  if (issues.length === 0) return;

  // Group by type
  const deepNesting = issues.filter(i => i.type === 'deep-nesting');
  const complexBoolean = issues.filter(i => i.type === 'complex-boolean');

  if (deepNesting.length > 0) {
    const lines = deepNesting.map(i => i.line);
    opportunities.push({
      id: `complex-nesting-${file.path}`,
      title: `Deep conditional nesting in ${file.path}`,
      description: `Found ${deepNesting.length} deeply nested conditional blocks (>3 levels). Consider using early returns, guard clauses, or extracting to functions.`,
      category: 'maintainability',
      severity: deepNesting.some(i => i.severity === 'high') ? 'high' : 'medium',
      impact: 'Improves code readability and reduces cognitive complexity',
      effort: 'medium',
      files: [file.path],
      lineNumbers: { [file.path]: lines },
      autoFixAvailable: false,
      estimatedTime: '1-2 hours',
    });
  }

  if (complexBoolean.length > 0) {
    const lines = complexBoolean.map(i => i.line);
    opportunities.push({
      id: `complex-boolean-${file.path}`,
      title: `Complex boolean expressions in ${file.path}`,
      description: `Found ${complexBoolean.length} complex conditions with multiple logical operators. Consider extracting to named boolean variables.`,
      category: 'maintainability',
      severity: 'medium',
      impact: 'Improves code readability and maintainability',
      effort: 'low',
      files: [file.path],
      lineNumbers: { [file.path]: lines },
      autoFixAvailable: true,
      estimatedTime: '30-60 minutes',
    });
  }
}
