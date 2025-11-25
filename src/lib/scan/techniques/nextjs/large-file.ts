/**
 * Large file detection technique
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';

export function checkLargeFile(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  // Stricter threshold: 200 lines (was 500)
  if (file.lines <= 200) return;

  // Escalate severity based on size
  let severity: RefactorOpportunity['severity'] = 'low';
  let effort: RefactorOpportunity['effort'] = 'medium';
  let estimatedTime = '1-2 hours';

  if (file.lines > 500) {
    severity = 'high';
    effort = 'high';
    estimatedTime = '3-5 hours';
  } else if (file.lines > 350) {
    severity = 'medium';
    effort = 'high';
    estimatedTime = '2-4 hours';
  } else if (file.lines > 200) {
    severity = 'low';
    effort = 'medium';
    estimatedTime = '1-2 hours';
  }

  opportunities.push({
    id: `long-file-${file.path}`,
    title: `Large file detected: ${file.path}`,
    description: `This file has ${file.lines} lines. Consider splitting it into smaller, more focused modules. Target: Keep files under 200 lines for better maintainability.`,
    category: 'maintainability',
    severity,
    impact: 'Improves code organization, readability, and maintainability',
    effort,
    files: [file.path],
    autoFixAvailable: false,
    estimatedTime,
  });
}
