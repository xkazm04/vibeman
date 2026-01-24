/**
 * Project Filter Utility
 *
 * Parses the projectId query parameter supporting:
 * - 'all' or null/undefined → fetch all data
 * - Single project ID → filter to one project
 * - Comma-separated IDs → filter to multiple projects (workspace scope)
 */

export interface ProjectFilter {
  mode: 'all' | 'single' | 'multi';
  projectId: string | null;
  projectIds: string[] | null;
}

/**
 * Parse projectId from URL search params into a structured filter.
 * Supports comma-separated project IDs for workspace-scoped "All" queries.
 */
export function parseProjectIds(searchParams: URLSearchParams): ProjectFilter {
  const raw = searchParams.get('projectId');

  if (!raw || raw === 'all') {
    return { mode: 'all', projectId: null, projectIds: null };
  }

  if (raw.includes(',')) {
    return { mode: 'multi', projectId: null, projectIds: raw.split(',') };
  }

  return { mode: 'single', projectId: raw, projectIds: null };
}

/**
 * Filter an array of items by project_id using the parsed filter.
 * Works with any object that has a project_id field.
 */
export function filterByProject<T extends { project_id: string }>(
  items: T[],
  filter: ProjectFilter
): T[] {
  if (filter.mode === 'all') return items;

  if (filter.mode === 'single') {
    return items.filter(item => item.project_id === filter.projectId);
  }

  // Multi mode
  const idSet = new Set(filter.projectIds!);
  return items.filter(item => idSet.has(item.project_id));
}
