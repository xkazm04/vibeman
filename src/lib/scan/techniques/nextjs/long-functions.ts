/**
 * Long function detection technique
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { detectLongFunctions } from '@/lib/scan/patterns';

export function checkLongFunctions(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  const longFunctions = detectLongFunctions(file.content);
  if (longFunctions.length === 0) return;

  opportunities.push({
    id: `long-functions-${file.path}`,
    title: `Long functions in ${file.path}`,
    description: `Found ${longFunctions.length} functions exceeding 50 lines. Consider breaking them into smaller functions.`,
    category: 'maintainability',
    severity: 'low',
    impact: 'Improves code readability and testability',
    effort: 'medium',
    files: [file.path],
    lineNumbers: { [file.path]: longFunctions },
    autoFixAvailable: true,
    estimatedTime: '1-3 hours',
  });
}
