// Legacy file - functionality moved to ContextGenerator module
// This file maintains backward compatibility for existing imports

import { generateContexts as generateContextsNew } from './ContextGenerator';
import type { ProjectAnalysis, GenerationResult } from './ContextGenerator';

/**
 * Generate context files for a project
 * @deprecated Use ContextGenerator module directly for new implementations
 */
export async function generateContexts(
  projectName: string,
  projectPath: string,
  analysis: ProjectAnalysis,
  projectId?: string,
  provider?: string
): Promise<GenerationResult> {
  return generateContextsNew(projectName, projectPath, analysis, projectId, provider);
}

// Re-export types for backward compatibility
export type { ProjectAnalysis, GenerationResult };