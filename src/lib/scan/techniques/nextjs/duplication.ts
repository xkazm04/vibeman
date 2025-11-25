/**
 * Code duplication detection technique
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { detectDuplication } from '@/lib/scan/patterns';

export function checkDuplication(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  const duplicatePatterns = detectDuplication(file.content);
  if (duplicatePatterns.length === 0) return;

  opportunities.push({
    id: `duplication-${file.path}`,
    title: `Code duplication in ${file.path}`,
    description: `Found ${duplicatePatterns.length} duplicated code blocks that could be extracted into reusable functions.`,
    category: 'duplication',
    severity: 'medium',
    impact: 'Reduces code duplication and improves maintainability',
    effort: 'medium',
    files: [file.path],
    autoFixAvailable: true,
    estimatedTime: '1-2 hours',
  });
}
