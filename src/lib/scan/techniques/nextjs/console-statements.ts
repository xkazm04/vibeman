/**
 * Console statement detection technique
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { detectConsoleStatements } from '@/lib/scan/patterns';

export function checkConsoleStatements(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  const consoleStatements = detectConsoleStatements(file.content);
  if (consoleStatements.length < 3) return; // Only flag files with 3+ console statements

  opportunities.push({
    id: `console-logs-${file.path}`,
    title: `Console statements in ${file.path}`,
    description: `Found ${consoleStatements.length} console.log statements that should be removed or replaced with proper logging.`,
    category: 'code-quality',
    severity: 'low',
    impact: 'Cleaner production code',
    effort: 'low',
    files: [file.path],
    lineNumbers: { [file.path]: consoleStatements },
    autoFixAvailable: true,
    estimatedTime: '15-30 minutes',
  });
}
