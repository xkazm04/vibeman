/**
 * Shared Deduplication Utilities
 *
 * Generic deduplication functions for consistent behavior across the codebase.
 * Consolidates duplicate implementations from buildScanner.ts, file-fixer/route.ts,
 * aiAnalyzer.ts, and OpportunityFilters.ts.
 */

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

