/**
 * Main analyzer (FIXED VERSION)
 *
 * CHANGES:
 * - Pass selectedGroups parameter to strategy.detectOpportunities()
 *
 * TO APPLY: Copy to src/app/features/RefactorWizard/lib/refactorAnalyzer.ts
 */
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { getScanStrategy } from '@/lib/scan';
import type { ProjectType } from '@/lib/scan';
import { scanProjectFiles as legacyScanProjectFiles } from './fileScanner';
import { analyzeWithAI, deduplicateOpportunities } from './aiAnalyzer';
import type { FileAnalysis, AnalysisResult } from './types';

export { analyzeWithAI } from './aiAnalyzer';
export type { FileAnalysis, AnalysisResult } from './types';

/**
 * Backward compatibility wrapper for scanProjectFiles
 */
export async function scanProjectFiles(projectPath: string, projectType?: ProjectType): Promise<FileAnalysis[]> {
  try {
    const strategy = await getScanStrategy(projectPath, projectType);
    return strategy.scanProjectFiles(projectPath);
  } catch (error) {
    console.warn('Strategy scan failed, falling back to legacy scanner:', error);
    return legacyScanProjectFiles(projectPath);
  }
}

/**
 * Analyzes code for common refactor opportunities (legacy - deprecated)
 */
export function analyzeCodePatterns(
  files: FileAnalysis[],
  selectedGroups?: string[]
): RefactorOpportunity[] {
  return [];
}

/**
 * Combines pattern-based and AI analysis
 * NOW PROPERLY USES selectedGroups!
 */
export async function analyzeProject(
  projectPath: string,
  useAI: boolean = true,
  provider?: string,
  model?: string,
  selectedGroups?: string[],
  projectType?: ProjectType
): Promise<AnalysisResult> {
  const strategy = await getScanStrategy(projectPath, projectType);
  const files = await strategy.scanProjectFiles(projectPath);

  // FIXED: Pass selectedGroups to detectOpportunities!
  console.log('[RefactorAnalyzer] Running scan with groups:', selectedGroups || 'all');
  const patternOpportunities = strategy.detectOpportunities(files, selectedGroups);

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
