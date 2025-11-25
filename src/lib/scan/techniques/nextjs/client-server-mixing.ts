/**
 * Client/Server code mixing detection technique (Next.js specific)
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';

export function checkClientServerMixing(
  file: FileAnalysis,
  opportunities: RefactorOpportunity[]
): void {
  const hasUseClient = file.content.includes("'use client'");
  const hasServerCode =
    file.content.includes('import { cookies }') ||
    file.content.includes('import { headers }') ||
    file.content.includes('import { draftMode }');

  if (hasUseClient && hasServerCode) {
    opportunities.push({
      id: `client-server-mixing-${file.path}`,
      title: `Mixed client/server code in ${file.path}`,
      description: "This file has 'use client' directive but also imports server-only APIs. Consider splitting into separate files.",
      category: 'architecture',
      severity: 'high',
      impact: 'Prevents runtime errors and improves code clarity',
      effort: 'medium',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '1-2 hours',
    });
  }
}
