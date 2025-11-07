/**
 * Main analyzer that orchestrates file scanning, pattern detection, and AI analysis
 * Updated to use ScanStrategy plugin architecture for multitech support
 */
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { getScanStrategy } from '@/lib/scan';
import type { ProjectType } from '@/lib/scan';
import { scanProjectFiles as legacyScanProjectFiles } from './fileScanner';
import { analyzeWithAI, deduplicateOpportunities } from './aiAnalyzer';
import type { FileAnalysis, AnalysisResult } from './types';

// Re-export types and functions for backward compatibility
export { analyzeWithAI } from './aiAnalyzer';
export type { FileAnalysis, AnalysisResult } from './types';

/**
 * Backward compatibility wrapper for scanProjectFiles
 * @deprecated Use getScanStrategy().scanProjectFiles() instead
 */
export async function scanProjectFiles(projectPath: string, projectType?: ProjectType): Promise<FileAnalysis[]> {
  try {
    const strategy = await getScanStrategy(projectPath, projectType);
    return strategy.scanProjectFiles(projectPath);
  } catch (error) {
    // Fallback to legacy scanner if strategy fails
    console.warn('Strategy scan failed, falling back to legacy scanner:', error);
    return legacyScanProjectFiles(projectPath);
  }
}

/**
 * Analyzes code for common refactor opportunities (legacy function kept for compatibility)
 * @deprecated This function is kept for backward compatibility but no longer used
 */
export function analyzeCodePatterns(
  files: FileAnalysis[],
  selectedGroups?: string[]
): RefactorOpportunity[] {
  // This function is deprecated but kept for backward compatibility
  // The actual pattern detection is now done by strategies
  return [];
}

/**
 * Combines pattern-based and AI analysis
 * Now uses ScanStrategy plugin architecture for multitech support
 */
export async function analyzeProject(
  projectPath: string,
  useAI: boolean = true,
  provider?: string,
  model?: string,
  selectedGroups?: string[],
  projectType?: ProjectType
): Promise<AnalysisResult> {
  // Get appropriate strategy for the project
  const strategy = await getScanStrategy(projectPath, projectType);

  // Scan files using strategy
  const files = await strategy.scanProjectFiles(projectPath);

  // Pattern-based analysis using strategy (tech-specific detection)
  const patternOpportunities = strategy.detectOpportunities(files);

  // AI-based analysis (if enabled)
  let aiOpportunities: RefactorOpportunity[] = [];
  if (useAI && files.length > 0) {
    aiOpportunities = await analyzeWithAI(files, provider, model);
  }

  // Combine and deduplicate
  const allOpportunities = [...patternOpportunities, ...aiOpportunities];
  const uniqueOpportunities = deduplicateOpportunities(allOpportunities);

  // Generate summary
  const categoryCounts: Record<string, number> = {};
  uniqueOpportunities.forEach(opp => {
    categoryCounts[opp.category] = (categoryCounts[opp.category] || 0) + 1;
  });

  return {
    opportunities: uniqueOpportunities,
    summary: {
      totalFiles: files.length,
      totalLines: files.reduce((sum, f) => sum + f.lines, 0),
      issuesFound: uniqueOpportunities.length,
      categoryCounts,
    },
  };
}
