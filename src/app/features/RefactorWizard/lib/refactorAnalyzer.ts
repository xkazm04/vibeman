/**
 * Main analyzer (FIXED VERSION)
 *
 * CHANGES:
 * - Pass selectedGroups parameter to strategy.detectOpportunities()
 * - ENABLED: OpportunityFilters for noise reduction
 */
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { getScanStrategy } from '@/lib/scan';
import type { ProjectType } from '@/lib/scan';
import { scanProjectFiles as legacyScanProjectFiles } from './fileScanner';
import { analyzeWithAI, deduplicateOpportunities } from './aiAnalyzer';
import type { FileAnalysis, AnalysisResult } from './types';
import { filterOpportunities, deduplicateOpportunities as dedupeFiltered, DEFAULT_FILTER_CONFIG } from '@/lib/scan/OpportunityFilters';

export { analyzeWithAI } from './aiAnalyzer';
export type { FileAnalysis, AnalysisResult } from './types';

/**
 * Backward compatibility wrapper for scanProjectFiles
 */
export async function scanProjectFiles(projectPath: string, projectType?: ProjectType, selectedFolders?: string[]): Promise<FileAnalysis[]> {
  try {
    const strategy = await getScanStrategy(projectPath, projectType);
    return strategy.scanProjectFiles(projectPath, selectedFolders);
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
 * Progress callback type for analysis
 */
export type AnalysisProgressCallback = (progress: {
  phase: 'scanning' | 'detecting' | 'ai-analyzing';
  processed: number;
  total: number;
  message: string;
}) => void | Promise<void>;

/**
 * Combines pattern-based and AI analysis
 * NOW PROPERLY USES selectedGroups, selectedFolders, AND PROGRESS CALLBACKS!
 */
export async function analyzeProject(
  projectPath: string,
  useAI: boolean = true,
  provider?: string,
  model?: string,
  selectedGroups?: string[],
  projectType?: ProjectType,
  onProgress?: AnalysisProgressCallback,
  selectedFolders?: string[]
): Promise<AnalysisResult> {
  const strategy = await getScanStrategy(projectPath, projectType);
  const files = await strategy.scanProjectFiles(projectPath, selectedFolders);

  // FIXED: Now async with progress callbacks
  console.log('[RefactorAnalyzer] Running scan with groups:', selectedGroups || 'all');
  console.log('[RefactorAnalyzer] Selected folders:', selectedFolders && selectedFolders.length > 0 ? `${selectedFolders.length} folder(s)` : 'all (full project)');

  if (onProgress) {
    await onProgress({
      phase: 'detecting',
      processed: 0,
      total: files.length,
      message: 'Starting pattern detection...',
    });
  }

  // Pattern detection with progress tracking
  const patternOpportunities = await strategy.detectOpportunities(
    files,
    selectedGroups,
    async (detectionProgress) => {
      if (onProgress) {
        await onProgress({
          phase: 'detecting',
          processed: detectionProgress.processedFiles,
          total: detectionProgress.totalFiles,
          message: `Analyzing ${detectionProgress.currentFile} (${detectionProgress.opportunitiesFound} issues found)`,
        });
      }
    }
  );

  // AI-based analysis (if enabled)
  let aiOpportunities: RefactorOpportunity[] = [];
  if (useAI && files.length > 0) {
    if (onProgress) {
      await onProgress({
        phase: 'ai-analyzing',
        processed: 0,
        total: files.length,
        message: 'Running AI analysis...',
      });
    }
    aiOpportunities = await analyzeWithAI(files, provider, model);
  }

  // Combine and deduplicate
  const allOpportunities = [...patternOpportunities, ...aiOpportunities];

  console.log(`[RefactorAnalyzer] Raw opportunities: ${allOpportunities.length}`);

  // Apply quality filters to reduce noise
  const filteredOpportunities = filterOpportunities(allOpportunities, DEFAULT_FILTER_CONFIG);
  console.log(`[RefactorAnalyzer] After filtering: ${filteredOpportunities.length}`);

  // Apply smart deduplication (merges similar issues across files)
  const uniqueOpportunities = dedupeFiltered(filteredOpportunities);

  console.log(`[RefactorAnalyzer] Final unique opportunities: ${uniqueOpportunities.length}`);

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
