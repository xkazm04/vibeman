/**
 * Filter logic for idea groups on Reflector dashboard
 */

import { DbIdea } from '@/app/db';

export interface IdeaFilterState {
  projectIds: string[];
  contextIds: string[];
  statuses: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchQuery: string;
}

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

export interface FilteredIdeaGroup {
  date: string;
  ideas: DbIdea[];
  count: number;
}

/**
 * Apply filters to idea array and return filtered results grouped by date
 */
export function applyFilters(
  ideas: DbIdea[],
  filters: IdeaFilterState
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
 * Group ideas by implementation date
 */
export function groupIdeasByDate(ideas: DbIdea[]): FilteredIdeaGroup[] {
  const groups: Record<string, DbIdea[]> = {};

  ideas.forEach((idea) => {
    if (!idea.implemented_at) return;

    const date = new Date(idea.implemented_at);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(idea);
  });

  // Convert to array and sort by date (newest first)
  return Object.entries(groups)
    .map(([date, ideas]) => ({
      date,
      ideas,
      count: ideas.length,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Count active filters
 */
export function countActiveFilters(filters: IdeaFilterState): number {
  let count = 0;

  if (filters.projectIds.length > 0) count++;
  if (filters.contextIds.length > 0) count++;
  if (filters.statuses.length > 0) count++;
  if (filters.dateRange.start || filters.dateRange.end) count++;
  if (filters.searchQuery.trim()) count++;

  return count;
}

/**
 * Get empty filter state
 */
export function getEmptyFilterState(): IdeaFilterState {
  return {
    projectIds: [],
    contextIds: [],
    statuses: [],
    dateRange: {
      start: null,
      end: null,
    },
    searchQuery: '',
  };
}

/**
 * Smart suggestion: detect if most ideas are from a specific quarter
 */
export function getSuggestedFilters(ideas: DbIdea[]): Array<{
  label: string;
  filter: Partial<IdeaFilterState>;
}> {
  const suggestions: Array<{ label: string; filter: Partial<IdeaFilterState> }> = [];

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
