/**
 * Main analyzer that orchestrates file scanning, pattern detection, and AI analysis
 */
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { scanProjectFiles } from './fileScanner';
import {
  detectDuplication,
  detectLongFunctions,
  detectConsoleStatements,
  detectAnyTypes,
  detectUnusedImports,
} from './patternDetectors';
import { analyzeWithAI, deduplicateOpportunities } from './aiAnalyzer';
import type { FileAnalysis, AnalysisResult } from './types';

// Re-export types and functions for backward compatibility
export { scanProjectFiles } from './fileScanner';
export { analyzeWithAI } from './aiAnalyzer';
export type { FileAnalysis, AnalysisResult } from './types';

/**
 * Analyzes code for common refactor opportunities using pattern detection
 */
export function analyzeCodePatterns(files: FileAnalysis[]): RefactorOpportunity[] {
  const opportunities: RefactorOpportunity[] = [];

  for (const file of files) {
    // Check for long files
    if (file.lines > 500) {
      opportunities.push({
        id: `long-file-${file.path}`,
        title: `Large file detected: ${file.path}`,
        description: `This file has ${file.lines} lines. Consider splitting it into smaller, more focused modules.`,
        category: 'maintainability',
        severity: file.lines > 1000 ? 'high' : 'medium',
        impact: 'Improves code organization and maintainability',
        effort: 'high',
        files: [file.path],
        autoFixAvailable: false,
        estimatedTime: '2-4 hours',
      });
    }

    // Check for duplicated code patterns
    const duplicatePatterns = detectDuplication(file.content);
    if (duplicatePatterns.length > 0) {
      opportunities.push({
        id: `duplication-${file.path}`,
        title: `Code duplication in ${file.path}`,
        description: `Found ${duplicatePatterns.length} duplicated code blocks that could be extracted into reusable functions.`,
        category: 'duplication',
        severity: 'medium',
        impact: 'Reduces code duplication and improves maintainability',
        effort: 'medium',
        files: [file.path],
        autoFixAvailable: true,
        estimatedTime: '1-2 hours',
      });
    }

    // Check for long functions
    const longFunctions = detectLongFunctions(file.content);
    if (longFunctions.length > 0) {
      opportunities.push({
        id: `long-functions-${file.path}`,
        title: `Long functions in ${file.path}`,
        description: `Found ${longFunctions.length} functions exceeding 50 lines. Consider breaking them into smaller functions.`,
        category: 'maintainability',
        severity: 'low',
        impact: 'Improves code readability and testability',
        effort: 'medium',
        files: [file.path],
        lineNumbers: { [file.path]: longFunctions },
        autoFixAvailable: true,
        estimatedTime: '1-3 hours',
      });
    }

    // Check for console.log statements
    const consoleStatements = detectConsoleStatements(file.content);
    if (consoleStatements.length > 0) {
      opportunities.push({
        id: `console-logs-${file.path}`,
        title: `Console statements in ${file.path}`,
        description: `Found ${consoleStatements.length} console.log statements that should be removed or replaced with proper logging.`,
        category: 'code-quality',
        severity: 'low',
        impact: 'Cleaner production code',
        effort: 'low',
        files: [file.path],
        lineNumbers: { [file.path]: consoleStatements },
        autoFixAvailable: true,
        estimatedTime: '15-30 minutes',
      });
    }

    // Check for any type usage
    const anyTypes = detectAnyTypes(file.content);
    if (anyTypes.length > 0) {
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

    // Check for unused imports
    const unusedImports = detectUnusedImports(file.content);
    if (unusedImports.length > 0) {
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
  }

  return opportunities;
}

/**
 * Combines pattern-based and AI analysis
 */
export async function analyzeProject(
  projectPath: string,
  useAI: boolean = true,
  provider?: string,
  model?: string
): Promise<AnalysisResult> {
  // Scan files
  const files = await scanProjectFiles(projectPath);

  // Pattern-based analysis
  const patternOpportunities = analyzeCodePatterns(files);

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
