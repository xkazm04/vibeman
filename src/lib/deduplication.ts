/**
 * Shared Deduplication Utilities
 *
 * Generic deduplication functions for consistent behavior across the codebase.
 * Consolidates duplicate implementations from buildScanner.ts, file-fixer/route.ts,
 * aiAnalyzer.ts, and OpportunityFilters.ts.
 */

import type { RefactorOpportunity } from '@/stores/refactorStore';

/**
 * BuildError interface for build-related deduplication
 */
export interface BuildError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  type: 'typescript' | 'eslint' | 'webpack' | 'nextjs' | 'unknown';
  rule?: string;
}

/**
 * Deduplicate build errors based on file, line, column, and message.
 * Used by build scanners and file fixers.
 *
 * @param errors - Array of build errors to deduplicate
 * @returns Array of unique build errors
 */
export function deduplicateBuildErrors<T extends { file: string; line?: number; column?: number; message: string }>(
  errors: T[]
): T[] {
  const seen = new Set<string>();
  return errors.filter(error => {
    const key = `${error.file}:${error.line}:${error.column}:${error.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Deduplicate refactor opportunities based on category, files, and description.
 * Uses fuzzy matching on description (first 50 chars) to catch slight variations.
 *
 * @param opportunities - Array of refactor opportunities to deduplicate
 * @returns Array of unique refactor opportunities
 */
export function deduplicateRefactorOpportunities(
  opportunities: RefactorOpportunity[]
): RefactorOpportunity[] {
  const seen = new Set<string>();
  const unique: RefactorOpportunity[] = [];

  for (const opp of opportunities) {
    // Create a key based on category, files, and description
    // Use a fuzzy match for description (first 50 chars) to catch slight variations
    const key = `${opp.category}-${opp.files.sort().join(',')}-${opp.description.slice(0, 50)}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(opp);
    }
  }

  return unique;
}

/**
 * Smart deduplication that merges similar opportunities across files.
 * Groups by category + title pattern and merges if more than 5 files affected.
 *
 * @param opportunities - Array of refactor opportunities to deduplicate
 * @returns Array of unique/merged refactor opportunities
 */
export function deduplicateAndMergeOpportunities(
  opportunities: RefactorOpportunity[]
): RefactorOpportunity[] {
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

/**
 * Generic array deduplication with a custom key function.
 *
 * @param items - Array of items to deduplicate
 * @param keyFn - Function to generate a unique key for each item
 * @returns Array of unique items
 */
export function deduplicateBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
