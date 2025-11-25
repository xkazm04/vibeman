/**
 * Dynamic imports detection technique (Next.js specific)
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';

export function checkDynamicImports(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  const hasUseClient = file.content.includes("'use client'");
  const isLarge = file.lines > 300;
  const hasHeavyLibs =
    file.content.includes('import Chart') ||
    file.content.includes('import { Editor') ||
    file.content.includes('import * as THREE');

  if (hasUseClient && (isLarge || hasHeavyLibs)) {
    const hasDynamic = file.content.includes("from 'next/dynamic'");
    if (!hasDynamic) {
      opportunities.push({
        id: `dynamic-import-${file.path}`,
        title: `Consider dynamic imports in ${file.path}`,
        description: 'This large client component could benefit from code splitting with next/dynamic.',
        category: 'performance',
        severity: 'low',
        impact: 'Reduces initial bundle size and improves page load',
        effort: 'low',
        files: [file.path],
        autoFixAvailable: false,
        estimatedTime: '30 minutes',
      });
    }
  }
}
