/**
 * Image optimization detection technique (Next.js specific)
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';

export function checkImageOptimization(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  const hasHtmlImg = /<img\s+/g.test(file.content);
  const hasNextImage = /from ['"]next\/image['"]/g.test(file.content);

  if (hasHtmlImg && !hasNextImage) {
    const matches = file.content.match(/<img\s+/g);
    if (matches && matches.length > 0) {
      opportunities.push({
        id: `image-optimization-${file.path}`,
        title: `Use Next.js Image component in ${file.path}`,
        description: `Found ${matches.length} <img> tags. Consider using next/image for automatic optimization.`,
        category: 'performance',
        severity: 'medium',
        impact: 'Improves image loading performance and LCP',
        effort: 'low',
        files: [file.path],
        autoFixAvailable: false,
        estimatedTime: '30-60 minutes',
      });
    }
  }
}
