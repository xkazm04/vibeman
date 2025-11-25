/**
 * Magic numbers detection technique
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { detectMagicNumbers } from '@/lib/scan/patterns';

export function checkMagicNumbers(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  const magicNumbers = detectMagicNumbers(file.content);
  if (magicNumbers.length === 0) return;

  // Group by severity
  const highSeverity = magicNumbers.filter(m => m.severity === 'high');
  const mediumSeverity = magicNumbers.filter(m => m.severity === 'medium');
  const total = magicNumbers.length;

  if (total > 0) {
    const lines = magicNumbers.map(m => m.line);
    const suggestedNames = magicNumbers
      .filter(m => m.suggestedName)
      .map(m => m.suggestedName)
      .slice(0, 3);

    const severity = highSeverity.length > 0 ? 'high' : mediumSeverity.length > 0 ? 'medium' : 'low';

    opportunities.push({
      id: `magic-numbers-${file.path}`,
      title: `Magic numbers in ${file.path}`,
      description: `Found ${total} magic numbers that should be extracted to named constants.${
        suggestedNames.length > 0 ? ` Suggested names: ${suggestedNames.join(', ')}` : ''
      }`,
      category: 'maintainability',
      severity,
      impact: 'Improves code maintainability and clarity',
      effort: total > 10 ? 'medium' : 'low',
      files: [file.path],
      lineNumbers: { [file.path]: lines },
      autoFixAvailable: true,
      estimatedTime: total > 10 ? '1-2 hours' : '30-60 minutes',
    });
  }
}
