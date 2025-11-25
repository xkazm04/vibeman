/**
 * TypeScript 'any' type detection technique
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { detectAnyTypes } from '@/lib/scan/patterns';

export function checkAnyTypes(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  const anyTypes = detectAnyTypes(file.content);
  if (anyTypes.length < 3) return; // Only flag files with 3+ 'any' type usages

  opportunities.push({
    id: `any-types-${file.path}`,
    title: `'any' type usage in ${file.path}`,
    description: `Found ${anyTypes.length} uses of 'any' type. Consider using proper TypeScript types for better type safety.`,
    category: 'code-quality',
    severity: 'medium',
    impact: 'Improves type safety and prevents runtime errors',
    effort: 'medium',
    files: [file.path],
    lineNumbers: { [file.path]: anyTypes },
    autoFixAvailable: false,
    estimatedTime: '30-60 minutes',
  });
}
