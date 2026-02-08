/**
 * StagingBuffer<T> - Generic entity lifecycle abstraction
 *
 * Unifies the staging/buffer pattern used by Ideas, Questions, and Directions.
 * All three follow the same lifecycle: pending -> accepted/rejected -> implemented.
 *
 * Instead of each entity type reimplementing grouping, sorting, filtering,
 * and lifecycle logic, they configure this generic abstraction.
 *
 * @example
 * const ideaBuffer = createStagingBuffer<DbIdea>({
 *   getProjectId: (idea) => idea.project_id,
 *   getContextId: (idea) => idea.context_id ?? 'no-context',
 *   getStatus: (idea) => idea.status,
 *   statusOrder: ['pending', 'accepted', 'implemented', 'rejected'],
 *   sortWithinStatus: (a, b) => a.category.localeCompare(b.category),
 * });
 *
 * const grouped = ideaBuffer.group(ideas, { filterProject: 'proj-1' });
 * const sorted = ideaBuffer.sort(ideas);
 * const counts = ideaBuffer.counts(ideas);
 */

// ============================================================================
// Configuration
// ============================================================================

export interface StagingBufferConfig<T> {
  /** Extract project ID from entity */
  getProjectId: (item: T) => string;
  /** Extract context ID from entity (return 'no-context' for null) */
  getContextId: (item: T) => string;
  /** Extract status string from entity */
  getStatus: (item: T) => string;
  /** Status display order (first = top priority) */
  statusOrder: string[];
  /** Optional secondary sort within same status group */
  sortWithinStatus?: (a: T, b: T) => number;
  /** Label for items with no context (default: 'General') */
  noContextLabel?: string;
}

// ============================================================================
// Types
// ============================================================================

/** Grouped items: projectId -> contextId -> items[] */
export type GroupedItems<T> = Record<string, Record<string, T[]>>;

/** Sorted group entry for rendering */
export interface ProjectGroup<T> {
  projectId: string;
  contexts: Array<{ contextId: string; items: T[] }>;
  totalCount: number;
}

/** Status counts */
export type StatusCounts = Record<string, number>;

/** Filter options for grouping/filtering */
export interface StagingFilterOptions {
  filterProject?: string;
  filterStatus?: string;
}

// ============================================================================
// StagingBuffer interface
// ============================================================================

export interface StagingBuffer<T> {
  /** Group items by project and context with optional filtering */
  group: (items: T[], options?: StagingFilterOptions) => GroupedItems<T>;

  /** Group and sort into render-ready project groups (sorted by count desc) */
  groupSorted: (items: T[], options?: StagingFilterOptions) => ProjectGroup<T>[];

  /** Sort items by status order, then secondary sort */
  sort: (items: T[]) => T[];

  /** Count items by status */
  counts: (items: T[]) => StatusCounts;

  /** Filter items by project and/or status */
  filter: (items: T[], options: StagingFilterOptions) => T[];

  /** Get items with a specific status */
  byStatus: (items: T[], status: string) => T[];

  /** Check if an item is in a "pending" state (first status in order) */
  isPending: (item: T) => boolean;

  /** The configuration */
  config: Readonly<StagingBufferConfig<T>>;
}

// ============================================================================
// Factory
// ============================================================================

export function createStagingBuffer<T>(config: StagingBufferConfig<T>): StagingBuffer<T> {
  const { getProjectId, getContextId, getStatus, statusOrder, sortWithinStatus } = config;

  const statusOrderMap = new Map(statusOrder.map((s, i) => [s, i]));

  const getStatusRank = (item: T): number => {
    return statusOrderMap.get(getStatus(item)) ?? 99;
  };

  const filter = (items: T[], options: StagingFilterOptions): T[] => {
    let result = items;

    if (options.filterProject && options.filterProject !== 'all') {
      result = result.filter(item => getProjectId(item) === options.filterProject);
    }

    if (options.filterStatus && options.filterStatus !== 'all') {
      result = result.filter(item => getStatus(item) === options.filterStatus);
    }

    return result;
  };

  const sort = (items: T[]): T[] => {
    return [...items].sort((a, b) => {
      const statusDiff = getStatusRank(a) - getStatusRank(b);
      if (statusDiff !== 0) return statusDiff;
      return sortWithinStatus ? sortWithinStatus(a, b) : 0;
    });
  };

  const group = (items: T[], options: StagingFilterOptions = {}): GroupedItems<T> => {
    const filtered = filter(items, options);
    const groups: GroupedItems<T> = {};

    for (const item of filtered) {
      const projectId = getProjectId(item) || 'unknown';
      const contextId = getContextId(item);

      if (!groups[projectId]) groups[projectId] = {};
      if (!groups[projectId][contextId]) groups[projectId][contextId] = [];

      groups[projectId][contextId].push(item);
    }

    return groups;
  };

  const groupSorted = (items: T[], options: StagingFilterOptions = {}): ProjectGroup<T>[] => {
    const grouped = group(items, options);

    return Object.entries(grouped).map(([projectId, contexts]) => {
      const contextEntries = Object.entries(contexts)
        .map(([contextId, ctxItems]) => ({
          contextId,
          items: sort(ctxItems),
        }))
        .sort((a, b) => b.items.length - a.items.length);

      const totalCount = contextEntries.reduce((sum, c) => sum + c.items.length, 0);

      return { projectId, contexts: contextEntries, totalCount };
    });
  };

  const counts = (items: T[]): StatusCounts => {
    const result: StatusCounts = {};
    for (const s of statusOrder) result[s] = 0;

    for (const item of items) {
      const status = getStatus(item);
      result[status] = (result[status] ?? 0) + 1;
    }

    return result;
  };

  const byStatus = (items: T[], status: string): T[] => {
    return items.filter(item => getStatus(item) === status);
  };

  const isPending = (item: T): boolean => {
    return statusOrder.length > 0 && getStatus(item) === statusOrder[0];
  };

  return {
    group,
    groupSorted,
    sort,
    counts,
    filter,
    byStatus,
    isPending,
    config,
  };
}

// ============================================================================
// Pre-configured entity buffers
// ============================================================================

/**
 * Ideas staging buffer configuration.
 * Used by BufferView, BufferColumn, and idea lifecycle operations.
 */
export function createIdeaStagingBuffer<T extends {
  project_id: string;
  context_id: string | null;
  status: string;
  category: string;
}>() {
  return createStagingBuffer<T>({
    getProjectId: (idea) => idea.project_id,
    getContextId: (idea) => idea.context_id ?? 'no-context',
    getStatus: (idea) => idea.status,
    statusOrder: ['pending', 'accepted', 'implemented', 'rejected'],
    sortWithinStatus: (a, b) => a.category.localeCompare(b.category),
    noContextLabel: 'General',
  });
}

/**
 * Questions staging buffer configuration.
 */
export function createQuestionStagingBuffer<T extends {
  project_id: string;
  context_map_id: string;
  status: string;
}>() {
  return createStagingBuffer<T>({
    getProjectId: (q) => q.project_id,
    getContextId: (q) => q.context_map_id || 'no-context',
    getStatus: (q) => q.status,
    statusOrder: ['pending', 'answered'],
    noContextLabel: 'General',
  });
}

/**
 * Directions staging buffer configuration.
 */
export function createDirectionStagingBuffer<T extends {
  project_id: string;
  context_id: string | null;
  context_map_id: string;
  status: string;
}>() {
  return createStagingBuffer<T>({
    getProjectId: (d) => d.project_id,
    getContextId: (d) => d.context_id ?? d.context_map_id ?? 'no-context',
    getStatus: (d) => d.status,
    statusOrder: ['pending', 'processing', 'accepted', 'rejected'],
    noContextLabel: 'General',
  });
}
