/**
 * Opportunity Filters
 *
 * Filters to reduce noise and duplicates from scan results.
 * Helps prevent thousands of low-value opportunities from overwhelming users.
 */

import type { RefactorOpportunity } from '@/stores/refactorStore';

/**
 * Configuration for filtering opportunities
 */
export interface FilterConfig {
  /** Minimum file size to flag as "large" (lines) */
  largeFileThreshold: number;

  /** Minimum duplication block size (characters) */
  minDuplicationSize: number;

  /** Minimum function length to flag (lines) */
  longFunctionThreshold: number;

  /** Minimum number of console statements before flagging */
  minConsoleStatementsThreshold: number;

  /** Minimum number of 'any' types before flagging */
  minAnyTypesThreshold: number;

  /** Skip flagging test/spec files */
  skipTestFiles: boolean;

  /** Skip flagging certain file patterns */
  ignorePatterns: string[];
}

export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  largeFileThreshold: 400, // Only flag files > 400 lines (focus on truly large files)
  minDuplicationSize: 150, // Only flag duplicates > 150 chars (meaningful blocks)
  longFunctionThreshold: 100, // Only flag functions > 100 lines (really long)
  minConsoleStatementsThreshold: 5, // Only flag if 5+ console statements
  minAnyTypesThreshold: 5, // Only flag if 5+ any types (systemic issue)
  skipTestFiles: true,
  ignorePatterns: [
    '**/*.test.*',
    '**/*.spec.*',
    '**/__tests__/**',
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/*.d.ts', // Type definition files
    '**/*.min.*', // Minified files
    '**/vendor/**', // Vendor files
    '**/migrations/**', // DB migrations (often verbose)
    '**/*.generated.*', // Generated files
  ],
};

/**
 * Check if a file should be ignored based on patterns
 */
export function shouldIgnoreFile(filePath: string, config: FilterConfig): boolean {
  if (config.skipTestFiles) {
    const testPatterns = ['.test.', '.spec.', '/__tests__/'];
    if (testPatterns.some(pattern => filePath.includes(pattern))) {
      return true;
    }
  }

  for (const pattern of config.ignorePatterns) {
    // Simple glob matching
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.');

    if (new RegExp(regexPattern).test(filePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Filter out low-value opportunities
 */
export function filterOpportunities(
  opportunities: RefactorOpportunity[],
  config: FilterConfig = DEFAULT_FILTER_CONFIG
): RefactorOpportunity[] {
  const filtered: RefactorOpportunity[] = [];
  const seen = new Set<string>();

  for (const opp of opportunities) {
    // Skip ignored files
    if (opp.files.some(file => shouldIgnoreFile(file, config))) {
      continue;
    }

    // Create dedupe key (category + main file + description prefix)
    const dedupeKey = `${opp.category}:${opp.files[0]}:${opp.description.substring(0, 50)}`;
    if (seen.has(dedupeKey)) {
      continue; // Skip duplicate
    }
    seen.add(dedupeKey);

    // Apply specific filters based on category/title
    if (shouldFilterOpportunity(opp, config)) {
      continue;
    }

    filtered.push(opp);
  }

  return filtered;
}

/**
 * Determine if an opportunity should be filtered out
 */
function shouldFilterOpportunity(opp: RefactorOpportunity, config: FilterConfig): boolean {
  const title = opp.title.toLowerCase();
  const description = opp.description.toLowerCase();

  // NEVER filter security issues
  if (opp.category === 'security') {
    return false;
  }

  // NEVER filter critical/high severity issues
  if (opp.severity === 'critical' || opp.severity === 'high') {
    return false;
  }

  // Filter large files (only flag if REALLY large)
  if (title.includes('large file') || description.includes('lines')) {
    const match = description.match(/(\d+)\s+lines/);
    if (match) {
      const lineCount = parseInt(match[1], 10);
      if (lineCount < config.largeFileThreshold) {
        return true; // Skip, not large enough
      }
    }
  }

  // Filter console statements (only flag if multiple)
  if (title.includes('console')) {
    const match = description.match(/found\s+(\d+)/i);
    if (match) {
      const count = parseInt(match[1], 10);
      if (count < config.minConsoleStatementsThreshold) {
        return true; // Skip, too few
      }
    }
  }

  // Filter any types (only flag if multiple)
  if (title.includes('any') && title.includes('type')) {
    const match = description.match(/found\s+(\d+)/i);
    if (match) {
      const count = parseInt(match[1], 10);
      if (count < config.minAnyTypesThreshold) {
        return true; // Skip, too few
      }
    }
  }

  // Filter long functions (only flag if REALLY long)
  if (title.includes('long functions')) {
    const match = description.match(/exceeding\s+(\d+)\s+lines/i);
    if (match) {
      const threshold = parseInt(match[1], 10);
      // If the function length is close to our higher threshold, keep it
      // Otherwise, it's just over 50 lines but not worth flagging
      if (threshold < config.longFunctionThreshold) {
        return true; // Skip, not long enough by our standards
      }
    }
  }

  // Filter minor duplication
  if (title.includes('duplication')) {
    // Only flag if description mentions significant duplication
    if (!description.includes('multiple') && !description.match(/\d+\s+(or more|duplicate)/)) {
      const match = description.match(/(\d+)\s+duplicated/);
      if (match) {
        const count = parseInt(match[1], 10);
        if (count < 3) {
          return true; // Skip minor duplications
        }
      }
    }
  }

  // Filter magic numbers (often noisy - only keep high severity)
  if (title.includes('magic number')) {
    if (opp.severity === 'low') {
      return true; // Skip low severity magic numbers
    }
  }

  // Filter unused imports (often false positives with JSX)
  if (title.includes('unused import')) {
    const match = description.match(/found\s+(\d+)/i);
    if (match) {
      const count = parseInt(match[1], 10);
      if (count < 3) {
        return true; // Skip files with few unused imports
      }
    }
  }

  // Filter low-severity, low-impact items with short descriptions
  if (opp.severity === 'low' && description.length < 100) {
    return true; // Too vague/short to be actionable
  }

  return false;
}

/**
 * Deduplicate opportunities by combining similar issues
 */
export function deduplicateOpportunities(opportunities: RefactorOpportunity[]): RefactorOpportunity[] {
  const groupedByType = new Map<string, RefactorOpportunity[]>();

  // Group by category + title pattern
  for (const opp of opportunities) {
    // Extract the type of issue (remove file-specific parts)
    const type = opp.title.replace(/in\s+[\w\/.]+$/, '').trim();
    const key = `${opp.category}:${type}`;

    if (!groupedByType.has(key)) {
      groupedByType.set(key, []);
    }
    groupedByType.get(key)!.push(opp);
  }

  const deduplicated: RefactorOpportunity[] = [];

  // For each group, merge if multiple files have the same issue
  for (const [key, group] of groupedByType) {
    if (group.length === 1) {
      deduplicated.push(group[0]);
      continue;
    }

    // Merge opportunities for the same issue type affecting multiple files
    const allFiles = [...new Set(group.flatMap(opp => opp.files))];

    // Only merge if there are many files (> 5) to reduce noise
    if (allFiles.length > 5) {
      const merged: RefactorOpportunity = {
        ...group[0],
        id: `merged-${key}`,
        title: `${group[0].title.replace(/in\s+[\w\/.]+$/, '')} (${allFiles.length} files)`,
        description: `This issue affects ${allFiles.length} files across the codebase. ${group[0].description}`,
        files: allFiles.slice(0, 10), // Limit to first 10 files to avoid overwhelming
        lineNumbers: undefined, // Clear line numbers when merging
      };
      deduplicated.push(merged);
    } else {
      // Keep individual opportunities if not too many
      deduplicated.push(...group);
    }
  }

  return deduplicated;
}
