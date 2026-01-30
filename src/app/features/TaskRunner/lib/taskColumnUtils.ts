import type { ProjectRequirement } from './types';
import type { DbIdea } from '@/app/db';
import type { ContextInfo } from '../hooks/useTaskColumnData';
import type { GroupedRequirement } from '../components/TaskGroupedList';

const NO_CONTEXT_KEY = '__no_context__';

const STATUS_ORDER: Record<string, number> = {
  idle: 0,
  queued: 1,
  running: 2,
  failed: 3,
  'session-limit': 4,
  completed: 5,
};

/**
 * Groups requirements by their associated context
 */
export function groupRequirementsByContext(
  requirements: ProjectRequirement[],
  ideasMap: Record<string, DbIdea | null>,
  contextsMap: Record<string, ContextInfo>
): GroupedRequirement[] {
  // Sort by status first
  const sorted = [...requirements].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
  );

  // Group by context_id from the associated idea
  const groups: Record<string, { context: ContextInfo | null; requirements: ProjectRequirement[] }> = {};

  sorted.forEach((req) => {
    const idea = ideasMap[req.requirementName];
    const contextId = idea?.context_id || null;
    const key = contextId || NO_CONTEXT_KEY;

    if (!groups[key]) {
      const contextInfo = contextId ? contextsMap[contextId] : null;
      groups[key] = {
        context: contextId
          ? contextInfo || { id: contextId, name: 'Unknown Context', groupName: undefined, color: undefined }
          : null,
        requirements: [],
      };
    }
    groups[key].requirements.push(req);
  });

  // Convert to array and sort: contexts first (alphabetically), then no-context
  const entries = Object.entries(groups);
  entries.sort(([keyA, a], [keyB, b]) => {
    if (keyA === NO_CONTEXT_KEY) return 1;
    if (keyB === NO_CONTEXT_KEY) return -1;
    return (a.context?.name || '').localeCompare(b.context?.name || '');
  });

  return entries.map(([key, value]) => ({
    key,
    context: value.context,
    requirements: value.requirements,
  }));
}

/**
 * Calculate selection statistics for a column
 */
export function calculateSelectionStats(
  requirements: ProjectRequirement[],
  selectedRequirements: Set<string>,
  getRequirementId: (req: ProjectRequirement) => string
) {
  const selectableRequirements = requirements.filter(
    (req) => req.status !== 'running' && req.status !== 'queued'
  );

  const selectedCount = selectableRequirements.filter((req) =>
    selectedRequirements.has(getRequirementId(req))
  ).length;

  const allSelected = selectableRequirements.length > 0 && selectedCount === selectableRequirements.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const clearableRequirements = requirements.filter(
    (r) => r.status === 'completed' || r.status === 'failed' || r.status === 'session-limit'
  );

  const failedRequirements = requirements.filter(
    (r) => r.status === 'failed' || r.status === 'session-limit'
  );

  const selectedInColumn = requirements.filter((r) => selectedRequirements.has(getRequirementId(r)));

  return {
    selectableRequirements,
    selectedCount,
    allSelected,
    someSelected,
    clearableRequirements,
    clearableCount: clearableRequirements.length,
    failedRequirements,
    failedCount: failedRequirements.length,
    selectedInColumn,
  };
}
