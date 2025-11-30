import { TreeNode } from '../../../../types';

/**
 * Search result type used throughout the ranking system
 */
export interface SearchResult {
  node: TreeNode;
  path: string;
  matchType: 'name' | 'description';
}

/**
 * Individual ranking rule that can boost or penalize search results
 */
export interface RankingRule {
  /** Unique identifier for this rule */
  id: string;
  /** Human-readable name for debugging/configuration */
  name: string;
  /**
   * Calculate a score modifier for a search result.
   * Negative values = higher priority (sorted ascending)
   * Return 0 to not affect ranking
   */
  calculateScore: (result: SearchResult, searchTerm: string, context?: RankingContext) => number;
  /** Weight multiplier for this rule (default: 1) */
  weight?: number;
  /** Whether this rule is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Additional context that can be passed to ranking rules
 */
export interface RankingContext {
  /** Recently accessed file paths */
  recentFiles?: string[];
  /** Frequently accessed file paths with access counts */
  frequentFiles?: Map<string, number>;
  /** Current working directory or focus area */
  currentDirectory?: string;
  /** Custom metadata for extensibility */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration object for a complete ranking strategy
 */
export interface SearchRankingStrategyConfig {
  /** Unique identifier for this strategy */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of when to use this strategy */
  description?: string;
  /** Ordered list of ranking rules to apply */
  rules: RankingRule[];
  /** Maximum number of results to return */
  limit?: number;
  /** Whether to apply rules in sequence (true) or combine scores (false) */
  sequentialRanking?: boolean;
}

/**
 * Search ranking strategy interface
 */
export interface SearchRankingStrategy {
  readonly config: SearchRankingStrategyConfig;

  /**
   * Rank and sort search results according to the strategy
   */
  rank(
    results: SearchResult[],
    searchTerm: string,
    context?: RankingContext
  ): SearchResult[];

  /**
   * Get the configured limit for this strategy
   */
  getLimit(): number;
}

// ============================================================================
// Built-in Ranking Rules
// ============================================================================

/**
 * Prioritize exact name matches
 */
export const exactMatchRule: RankingRule = {
  id: 'exact-match',
  name: 'Exact Match Priority',
  calculateScore: (result, searchTerm) => {
    const isExact = result.node.name.toLowerCase() === searchTerm.toLowerCase();
    return isExact ? -1000 : 0; // Negative = higher priority
  },
  weight: 1,
  enabled: true,
};

/**
 * Prioritize shorter paths (closer to root)
 */
export const pathDepthRule: RankingRule = {
  id: 'path-depth',
  name: 'Path Depth Weighting',
  calculateScore: (result) => {
    return result.path.length;
  },
  weight: 1,
  enabled: true,
};

/**
 * Prioritize name matches over description matches
 */
export const matchTypeRule: RankingRule = {
  id: 'match-type',
  name: 'Name Match Priority',
  calculateScore: (result) => {
    return result.matchType === 'name' ? -100 : 0;
  },
  weight: 1,
  enabled: true,
};

/**
 * Prioritize recently accessed files
 */
export const recentFilesRule: RankingRule = {
  id: 'recent-files',
  name: 'Recent Files Priority',
  calculateScore: (result, _searchTerm, context) => {
    if (!context?.recentFiles) return 0;
    const index = context.recentFiles.indexOf(result.path);
    if (index === -1) return 0;
    // More recent = more negative = higher priority
    return -(context.recentFiles.length - index) * 10;
  },
  weight: 1,
  enabled: true,
};

/**
 * Prioritize frequently accessed files
 */
export const frequentFilesRule: RankingRule = {
  id: 'frequent-files',
  name: 'Frequent Files Priority',
  calculateScore: (result, _searchTerm, context) => {
    if (!context?.frequentFiles) return 0;
    const count = context.frequentFiles.get(result.path) || 0;
    return -count * 5; // More accesses = higher priority
  },
  weight: 1,
  enabled: true,
};

/**
 * Prioritize files in current directory
 */
export const currentDirectoryRule: RankingRule = {
  id: 'current-directory',
  name: 'Current Directory Priority',
  calculateScore: (result, _searchTerm, context) => {
    if (!context?.currentDirectory) return 0;
    const isInCurrentDir = result.path.startsWith(context.currentDirectory);
    return isInCurrentDir ? -50 : 0;
  },
  weight: 1,
  enabled: true,
};

/**
 * Prioritize files by extension (for specific file type searches)
 */
export const fileExtensionRule: RankingRule = {
  id: 'file-extension',
  name: 'File Extension Priority',
  calculateScore: (result, _searchTerm, context) => {
    const preferredExtensions = context?.metadata?.preferredExtensions as string[] | undefined;
    if (!preferredExtensions) return 0;

    const ext = result.node.name.split('.').pop()?.toLowerCase();
    if (!ext) return 0;

    const index = preferredExtensions.indexOf(ext);
    if (index === -1) return 0;

    return -(preferredExtensions.length - index) * 20;
  },
  weight: 1,
  enabled: true,
};

/**
 * Prioritize by starts-with match (prefix matching)
 */
export const prefixMatchRule: RankingRule = {
  id: 'prefix-match',
  name: 'Prefix Match Priority',
  calculateScore: (result, searchTerm) => {
    const startsWithTerm = result.node.name.toLowerCase().startsWith(searchTerm.toLowerCase());
    return startsWithTerm ? -500 : 0;
  },
  weight: 1,
  enabled: true,
};

// ============================================================================
// Strategy Implementation
// ============================================================================

/**
 * Default implementation of SearchRankingStrategy
 */
export class DefaultSearchRankingStrategy implements SearchRankingStrategy {
  constructor(public readonly config: SearchRankingStrategyConfig) {}

  rank(
    results: SearchResult[],
    searchTerm: string,
    context?: RankingContext
  ): SearchResult[] {
    const limit = this.getLimit();
    const enabledRules = this.config.rules.filter(rule => rule.enabled !== false);

    if (enabledRules.length === 0) {
      return results.slice(0, limit);
    }

    const scoredResults = results.map(result => {
      let totalScore = 0;

      for (const rule of enabledRules) {
        const ruleScore = rule.calculateScore(result, searchTerm, context);
        const weight = rule.weight ?? 1;
        totalScore += ruleScore * weight;
      }

      return { result, score: totalScore };
    });

    // Sort by score (ascending - lower scores rank higher)
    scoredResults.sort((a, b) => a.score - b.score);

    return scoredResults.slice(0, limit).map(sr => sr.result);
  }

  getLimit(): number {
    return this.config.limit ?? 5;
  }
}

// ============================================================================
// Pre-built Strategy Configurations
// ============================================================================

/**
 * Default file search strategy - prioritizes exact matches and shorter paths
 */
export const FILE_SEARCH_STRATEGY_CONFIG: SearchRankingStrategyConfig = {
  id: 'file-search',
  name: 'File Search',
  description: 'Standard file search ranking with exact match priority and path depth weighting',
  rules: [
    exactMatchRule,
    prefixMatchRule,
    pathDepthRule,
  ],
  limit: 5,
  sequentialRanking: false,
};

/**
 * Context search strategy - optimized for searching within contexts
 * Prioritizes name matches and considers match type
 */
export const CONTEXT_SEARCH_STRATEGY_CONFIG: SearchRankingStrategyConfig = {
  id: 'context-search',
  name: 'Context Search',
  description: 'Context-aware search ranking with match type priority',
  rules: [
    exactMatchRule,
    matchTypeRule,
    pathDepthRule,
  ],
  limit: 10,
  sequentialRanking: false,
};

/**
 * Recent files strategy - useful for "quick open" style searches
 */
export const RECENT_FILES_STRATEGY_CONFIG: SearchRankingStrategyConfig = {
  id: 'recent-files-search',
  name: 'Recent Files Search',
  description: 'Prioritizes recently and frequently accessed files',
  rules: [
    exactMatchRule,
    recentFilesRule,
    frequentFilesRule,
    prefixMatchRule,
    pathDepthRule,
  ],
  limit: 10,
  sequentialRanking: false,
};

/**
 * Directory-focused strategy - prioritizes files in current working area
 */
export const DIRECTORY_FOCUSED_STRATEGY_CONFIG: SearchRankingStrategyConfig = {
  id: 'directory-focused',
  name: 'Directory Focused Search',
  description: 'Prioritizes files within current directory context',
  rules: [
    exactMatchRule,
    currentDirectoryRule,
    prefixMatchRule,
    pathDepthRule,
  ],
  limit: 5,
  sequentialRanking: false,
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a file search strategy (default)
 */
export function createFileSearchStrategy(): SearchRankingStrategy {
  return new DefaultSearchRankingStrategy(FILE_SEARCH_STRATEGY_CONFIG);
}

/**
 * Create a context search strategy
 */
export function createContextSearchStrategy(): SearchRankingStrategy {
  return new DefaultSearchRankingStrategy(CONTEXT_SEARCH_STRATEGY_CONFIG);
}

/**
 * Create a recent files strategy
 */
export function createRecentFilesStrategy(): SearchRankingStrategy {
  return new DefaultSearchRankingStrategy(RECENT_FILES_STRATEGY_CONFIG);
}

/**
 * Create a directory-focused strategy
 */
export function createDirectoryFocusedStrategy(): SearchRankingStrategy {
  return new DefaultSearchRankingStrategy(DIRECTORY_FOCUSED_STRATEGY_CONFIG);
}

/**
 * Create a custom strategy from a config object
 */
export function createCustomStrategy(config: SearchRankingStrategyConfig): SearchRankingStrategy {
  return new DefaultSearchRankingStrategy(config);
}

/**
 * Create a strategy by composing existing rules
 */
export function createComposedStrategy(
  id: string,
  name: string,
  rules: RankingRule[],
  options?: {
    description?: string;
    limit?: number;
    sequentialRanking?: boolean;
  }
): SearchRankingStrategy {
  return new DefaultSearchRankingStrategy({
    id,
    name,
    description: options?.description,
    rules,
    limit: options?.limit ?? 5,
    sequentialRanking: options?.sequentialRanking ?? false,
  });
}

// ============================================================================
// Default Strategy Export
// ============================================================================

/**
 * The default strategy used when none is specified
 */
export const DEFAULT_STRATEGY = createFileSearchStrategy();

/**
 * Map of all built-in strategies for easy access
 */
export const BUILT_IN_STRATEGIES: Record<string, SearchRankingStrategy> = {
  'file-search': createFileSearchStrategy(),
  'context-search': createContextSearchStrategy(),
  'recent-files-search': createRecentFilesStrategy(),
  'directory-focused': createDirectoryFocusedStrategy(),
};

/**
 * Get a built-in strategy by ID
 */
export function getStrategyById(id: string): SearchRankingStrategy | undefined {
  return BUILT_IN_STRATEGIES[id];
}
