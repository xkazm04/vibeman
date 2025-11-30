import { TreeNode } from '../../../../types';
import {
  SearchResult,
  SearchRankingStrategy,
  RankingContext,
  DEFAULT_STRATEGY,
  createFileSearchStrategy,
  createContextSearchStrategy,
} from './searchRankingStrategy';

/**
 * Count total nodes in a tree structure
 */
export function countTreeNodes(node: TreeNode | null): number {
  if (!node) return 0;
  
  const countNodes = (n: TreeNode): number => {
    let count = 1;
    if (n.children) {
      count += n.children.reduce((sum, child) => sum + countNodes(child), 0);
    }
    return count;
  };
  
  return countNodes(node) - 1; // Exclude root
}

/**
 * Search tree nodes by search term
 */
export function searchTreeNodes(
  node: TreeNode,
  searchTerm: string,
  currentPath: string = ''
): Array<{ node: TreeNode; path: string; matchType: 'name' | 'description' }> {
  const results: Array<{ node: TreeNode; path: string; matchType: 'name' | 'description' }> = [];
  const searchLower = searchTerm.toLowerCase();

  const searchNode = (n: TreeNode, path: string = '') => {
    const nodePath = path ? `${path}/${n.name}` : n.name;
    
    // Check name match
    if (n.name.toLowerCase().includes(searchLower)) {
      results.push({
        node: n,
        path: nodePath,
        matchType: 'name'
      });
    }
    // Check description match
    else if (n.description.toLowerCase().includes(searchLower)) {
      results.push({
        node: n,
        path: nodePath,
        matchType: 'description'
      });
    }

    // Search children
    if (n.children) {
      n.children.forEach(child => searchNode(child, nodePath));
    }
  };

  // Start search from children, not root
  if (node.children) {
    node.children.forEach(child => searchNode(child, currentPath));
  }

  return results;
}

/**
 * Options for sorting search results with strategy pattern
 */
export interface SortSearchResultsOptions {
  /** Custom ranking strategy to use */
  strategy?: SearchRankingStrategy;
  /** Additional context for ranking (recent files, etc.) */
  context?: RankingContext;
  /** Maximum number of results (overrides strategy limit if provided) */
  limit?: number;
}

/**
 * Sort search results by relevance using a configurable ranking strategy
 *
 * @param results - Array of search results to sort
 * @param searchTerm - The search term used
 * @param limitOrOptions - Either a number (legacy limit) or options object
 * @returns Sorted and limited array of search results
 *
 * @example
 * // Basic usage (backward compatible)
 * sortSearchResults(results, 'search', 5);
 *
 * @example
 * // With custom strategy
 * sortSearchResults(results, 'search', {
 *   strategy: createContextSearchStrategy(),
 *   limit: 10
 * });
 *
 * @example
 * // With ranking context
 * sortSearchResults(results, 'search', {
 *   context: { recentFiles: ['path/to/recent.ts'] }
 * });
 */
export function sortSearchResults(
  results: SearchResult[],
  searchTerm: string,
  limitOrOptions: number | SortSearchResultsOptions = 5
): SearchResult[] {
  // Handle legacy signature (just a number for limit)
  if (typeof limitOrOptions === 'number') {
    const strategy = DEFAULT_STRATEGY;
    const ranked = strategy.rank(results, searchTerm);
    return ranked.slice(0, limitOrOptions);
  }

  // Handle new options-based signature
  const { strategy = DEFAULT_STRATEGY, context, limit } = limitOrOptions;
  const ranked = strategy.rank(results, searchTerm, context);

  // Apply custom limit if provided, otherwise use strategy's limit
  if (limit !== undefined) {
    return ranked.slice(0, limit);
  }

  return ranked;
}

/**
 * Sort search results optimized for file search
 * Uses exact match priority and path depth weighting
 */
export function sortSearchResultsForFileSearch(
  results: SearchResult[],
  searchTerm: string,
  options?: Omit<SortSearchResultsOptions, 'strategy'>
): SearchResult[] {
  return sortSearchResults(results, searchTerm, {
    ...options,
    strategy: createFileSearchStrategy(),
  });
}

/**
 * Sort search results optimized for context search
 * Prioritizes name matches over description matches
 */
export function sortSearchResultsForContextSearch(
  results: SearchResult[],
  searchTerm: string,
  options?: Omit<SortSearchResultsOptions, 'strategy'>
): SearchResult[] {
  return sortSearchResults(results, searchTerm, {
    ...options,
    strategy: createContextSearchStrategy(),
  });
}

/**
 * Highlight matching text in search results
 */
export function highlightMatch(text: string, searchTerm: string): Array<{ text: string; isMatch: boolean }> {
  if (!searchTerm) return [{ text, isMatch: false }];
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map(part => ({
    text: part,
    isMatch: regex.test(part)
  }));
}
