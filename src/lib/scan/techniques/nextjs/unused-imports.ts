/**
 * Unused imports detection technique
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { detectUnusedImports } from '@/lib/scan/patterns';

export function checkUnusedImports(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  const unusedImports = detectUnusedImports(file.content);
  if (unusedImports.length === 0) return;

  opportunities.push({
    id: `unused-imports-${file.path}`,
    title: `Unused imports in ${file.path}`,
    description: `Found ${unusedImports.length} potentially unused imports that could be removed.`,
    category: 'code-quality',
    severity: 'low',
    impact: 'Cleaner code and smaller bundle size',
    effort: 'low',
    files: [file.path],
    autoFixAvailable: true,
    estimatedTime: '10-15 minutes',
  });
}
