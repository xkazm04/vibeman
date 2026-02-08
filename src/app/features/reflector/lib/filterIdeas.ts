/**
 * Filter logic for idea groups on Reflector dashboard
 * Also includes stats calculation helpers
 */

import { DbIdea } from '@/app/db';
import { SuggestionFilter } from './unifiedTypes';

// ============================================================================
// Stats Types and Helpers
// ============================================================================

export interface ReflectorStats {
  today: number;
  week: number;
  month: number;
}

/**
 * Calculate stats for implemented ideas
 */
export function calculateImplementedStats(ideas: DbIdea[]): ReflectorStats {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  return {
    today: ideas.filter(i => {
      if (!i.implemented_at) return false;
      const date = new Date(i.implemented_at);
      return date >= today;
    }).length,
    week: ideas.filter(i => {
      if (!i.implemented_at) return false;
      const date = new Date(i.implemented_at);
      return date >= weekAgo;
    }).length,
    month: ideas.filter(i => {
      if (!i.implemented_at) return false;
      const date = new Date(i.implemented_at);
      return date >= monthAgo;
    }).length,
  };
}

/**
 * Filter ideas by view mode (weekly vs total)
 */
export function filterIdeasByViewMode(
  ideas: DbIdea[],
  viewMode: 'weekly' | 'total' | 'ideas_stats' | 'dependencies' | 'observability'
): DbIdea[] {
  if (viewMode === 'weekly') {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return ideas.filter(idea => {
      if (!idea.implemented_at) return false;
      const implementedDate = new Date(idea.implemented_at);
      return implementedDate >= oneWeekAgo;
    });
  }

  return ideas;
}

// ============================================================================
// Filter Types and Interfaces
// ============================================================================

/**
 * Unified filter state that works for all views (Weekly, Total, Stats).
 * Weekly view uses weekOffset for week navigation.
 * Total view uses the standard filter fields.
 */
export interface FilterState {
  projectIds: string[];
  contextIds: string[];
  statuses: string[];
  scanTypes: string[];
  effortLevels: string[];  // 'low', 'medium', 'high'
  impactLevels: string[];  // 'low', 'medium', 'high'
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchQuery: string;
  weekOffset?: number; // 0 = current week, -1 = last week, etc.
  suggestionType?: SuggestionFilter; // 'ideas' | 'directions' | 'both'
}

/** @deprecated Use FilterState instead */
export type IdeaFilterState = FilterState;
/** @deprecated Use FilterState instead */
export type UnifiedFilterState = FilterState;

/**
 * Configuration for which filter controls to show in the FilterBar
 */
export interface FilterBarConfig {
  showProjectFilter?: boolean;
  showContextFilter?: boolean;
  showStatusFilter?: boolean;
  showDateRangeFilter?: boolean;
  showSearchFilter?: boolean;
  showWeekNavigation?: boolean;
  /** Use single-select dropdown for project instead of multi-select */
  singleProjectSelect?: boolean;
  /** Variant for the filter bar style */
  variant?: 'inline' | 'panel';
}

/**
 * Get empty filter state with sensible defaults
 */
export function getEmptyFilterState(): FilterState {
  return {
    projectIds: [],
    contextIds: [],
    statuses: [],
    scanTypes: [],
    effortLevels: [],
    impactLevels: [],
    dateRange: {
      start: null,
      end: null,
    },
    searchQuery: '',
    weekOffset: 0,
    suggestionType: 'both',
  };
}

/** @deprecated Use getEmptyFilterState instead */
export const getEmptyUnifiedFilterState = getEmptyFilterState;


/**
 * Check if date is within range
 */
function isDateInRange(date: Date | null, start: Date | null, end: Date | null): boolean {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

/**
 * Check if text matches search query
 */
function matchesSearchQuery(text: string | null | undefined, query: string): boolean {
  return text?.toLowerCase().includes(query) || false;
}

/**
 * Categorize effort value into level
 */
function getEffortLevel(effort: number | null): string {
  if (effort === null || effort === undefined) return 'unknown';
  if (effort <= 3) return 'low';
  if (effort <= 6) return 'medium';
  return 'high';
}

/**
 * Categorize impact value into level
 */
function getImpactLevel(impact: number | null): string {
  if (impact === null || impact === undefined) return 'unknown';
  if (impact <= 3) return 'low';
  if (impact <= 6) return 'medium';
  return 'high';
}

/**
 * Apply filters to idea array and return filtered results grouped by date
 */
export function applyFilters(
  ideas: DbIdea[],
  filters: FilterState
): DbIdea[] {
  return ideas.filter((idea) => {
    // Filter by project
    if (filters.projectIds.length > 0 && !filters.projectIds.includes(idea.project_id)) {
      return false;
    }

    // Filter by context
    if (filters.contextIds.length > 0) {
      // Include ideas with no context if 'null' is in the filter
      const includeNoContext = filters.contextIds.includes('null');
      if (!idea.context_id && !includeNoContext) {
        return false;
      }
      if (idea.context_id && !filters.contextIds.includes(idea.context_id)) {
        return false;
      }
    }

    // Filter by status
    if (filters.statuses.length > 0 && !filters.statuses.includes(idea.status)) {
      return false;
    }

    // Filter by scan type
    if (filters.scanTypes.length > 0 && !filters.scanTypes.includes(idea.scan_type)) {
      return false;
    }

    // Filter by effort level
    if (filters.effortLevels.length > 0) {
      const ideaEffort = (idea as DbIdea & { effort?: number }).effort ?? null;
      const effortLevel = getEffortLevel(ideaEffort);
      if (!filters.effortLevels.includes(effortLevel)) {
        return false;
      }
    }

    // Filter by impact level
    if (filters.impactLevels.length > 0) {
      const ideaImpact = (idea as DbIdea & { impact?: number }).impact ?? null;
      const impactLevel = getImpactLevel(ideaImpact);
      if (!filters.impactLevels.includes(impactLevel)) {
        return false;
      }
    }

    // Filter by date range
    if (filters.dateRange.start || filters.dateRange.end) {
      const implementedDate = idea.implemented_at ? new Date(idea.implemented_at) : null;
      if (!isDateInRange(implementedDate, filters.dateRange.start, filters.dateRange.end)) {
        return false;
      }
    }

    // Filter by search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      const matchesTitle = matchesSearchQuery(idea.title, query);
      const matchesDescription = matchesSearchQuery(idea.description, query);
      const matchesReasoning = matchesSearchQuery(idea.reasoning, query);

      if (!matchesTitle && !matchesDescription && !matchesReasoning) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Count active filters
 */
export function countActiveFilters(filters: FilterState): number {
  let count = 0;

  if (filters.projectIds.length > 0) count++;
  if (filters.contextIds.length > 0) count++;
  if (filters.statuses.length > 0) count++;
  if (filters.scanTypes.length > 0) count++;
  if (filters.effortLevels.length > 0) count++;
  if (filters.impactLevels.length > 0) count++;
  if (filters.dateRange.start || filters.dateRange.end) count++;
  if (filters.searchQuery.trim()) count++;

  return count;
}

/**
 * Smart suggestion: detect if most ideas are from a specific quarter
 */
export function getSuggestedFilters(ideas: DbIdea[]): Array<{
  label: string;
  filter: Partial<FilterState>;
}> {
  const suggestions: Array<{ label: string; filter: Partial<FilterState> }> = [];

  // Suggestion: Recent ideas (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentIdeas = ideas.filter((idea) =>
    idea.implemented_at ? new Date(idea.implemented_at) >= thirtyDaysAgo : false
  );

  if (recentIdeas.length > 3) {
    suggestions.push({
      label: `Last 30 Days (${recentIdeas.length})`,
      filter: {
        dateRange: {
          start: thirtyDaysAgo,
          end: new Date(),
        },
      },
    });
  }

  // Suggestion: Current quarter
  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const quarterIdeas = ideas.filter((idea) =>
    idea.implemented_at ? new Date(idea.implemented_at) >= quarterStart : false
  );

  if (quarterIdeas.length > 5) {
    const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
    const currentQuarter = quarterNames[Math.floor(now.getMonth() / 3)];
    suggestions.push({
      label: `${currentQuarter} ${now.getFullYear()} (${quarterIdeas.length})`,
      filter: {
        dateRange: {
          start: quarterStart,
          end: new Date(),
        },
      },
    });
  }

  return suggestions;
}
