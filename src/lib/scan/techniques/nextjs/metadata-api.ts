/**
 * Metadata API detection technique (Next.js specific)
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';

export function checkMetadataAPI(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  const hasHead = /import\s+Head\s+from\s+['"]next\/head['"]/g.test(
    file.content
  );
  const isAppRouter =
    file.path.startsWith('app/') || file.path.includes('/app/');

  if (hasHead && isAppRouter) {
    opportunities.push({
      id: `metadata-api-${file.path}`,
      title: `Migrate to Metadata API in ${file.path}`,
      description: "Using next/head in App Router. Consider migrating to the Metadata API or generateMetadata() function.",
      category: 'maintainability',
      severity: 'low',
      impact: 'Uses modern Next.js patterns and improves SEO',
      effort: 'medium',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '30-60 minutes',
    });
  }
}
