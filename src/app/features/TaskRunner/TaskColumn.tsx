'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Square, Trash2, XCircle, Layers, FolderOpen } from 'lucide-react';
import TaskItem from './TaskItem';
import type { ProjectRequirement } from './lib/types';
import type { AggregationCheckResult } from './lib/ideaAggregator';
import type { DbIdea, DbContext } from '@/app/db';

// Context info for grouping
interface ContextInfo {
  id: string;
  name: string;
  groupName?: string; // Context group name for display
  color?: string;
}

interface TaskColumnProps {
  projectId: string;
  projectName: string;
  projectPath: string;
  requirements: ProjectRequirement[];
  selectedRequirements: Set<string>;
  onToggleSelect: (reqId: string) => void;
  onDelete: (reqId: string) => void;
  onBulkDelete?: (reqIds: string[]) => void;
  onToggleProjectSelection: (projectId: string) => void;
  getRequirementId: (req: ProjectRequirement) => string;
  onRefresh?: () => void;
  // Optional pre-loaded data to avoid duplicate fetches
  aggregationData?: AggregationCheckResult | null;
  ideasData?: Record<string, DbIdea | null>;
  contextsData?: Record<string, ContextInfo>;
}

const TaskColumn = React.memo(function TaskColumn({
  projectId,
  projectName,
  projectPath,
  requirements,
  selectedRequirements,
  onToggleSelect,
  onDelete,
  onBulkDelete,
  onToggleProjectSelection,
  getRequirementId,
  onRefresh,
  aggregationData,
  ideasData,
  contextsData,
}: TaskColumnProps) {
  // Aggregation state - use prop if provided, otherwise fetch
  const [aggregationCheck, setAggregationCheck] = useState<AggregationCheckResult | null>(aggregationData || null);
  const [isAggregating, setIsAggregating] = useState(false);
  // Batch-loaded ideas for all requirements in this column
  const [ideasMap, setIdeasMap] = useState<Record<string, DbIdea | null>>(ideasData || {});
  // Contexts map for grouping
  const [contextsMap, setContextsMap] = useState<Record<string, ContextInfo>>(contextsData || {});
  // Refs to prevent duplicate fetches (React Strict Mode double-mount)
  const aggregationFetchedRef = useRef(false);
  const ideasFetchedRef = useRef(false);
  const contextsFetchedRef = useRef(false);

  // Check for aggregatable files - skip if data provided via prop
  const checkAggregation = useCallback(async () => {
    if (!projectPath || aggregationData !== undefined) return;
    if (aggregationFetchedRef.current) return; // Prevent duplicate fetch

    aggregationFetchedRef.current = true;

    try {
      const response = await fetch(
        `/api/idea-aggregator?projectPath=${encodeURIComponent(projectPath)}`
      );
      const data = await response.json();
      if (data.success) {
        setAggregationCheck(data);
      }
    } catch (error) {
      console.error('Failed to check aggregation:', error);
    }
  }, [projectPath, aggregationData]);

  useEffect(() => {
    if (aggregationData === undefined) {
      checkAggregation();
    }
  }, [checkAggregation, aggregationData]);

  // Reset fetch guard when project changes
  useEffect(() => {
    aggregationFetchedRef.current = false;
    ideasFetchedRef.current = false;
    contextsFetchedRef.current = false;
  }, [projectPath]);

  // Batch fetch ideas - skip if data provided via prop
  const requirementNames = useMemo(
    () => requirements.map((r) => r.requirementName),
    [requirements]
  );

  useEffect(() => {
    // Skip if ideas data was provided via prop
    if (ideasData !== undefined) {
      setIdeasMap(ideasData);
      return;
    }

    if (ideasFetchedRef.current) return; // Prevent duplicate fetch
    ideasFetchedRef.current = true;

    const fetchIdeasBatch = async () => {
      if (requirementNames.length === 0) {
        setIdeasMap({});
        return;
      }

      try {
        const response = await fetch('/api/ideas/by-requirements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requirementIds: requirementNames }),
        });

        if (response.ok) {
          const data = await response.json();
          setIdeasMap(data.ideas || {});
        }
      } catch (error) {
        console.debug('Failed to batch fetch ideas:', error);
      }
    };

    fetchIdeasBatch();
  }, [requirementNames, ideasData]);

  // Fetch contexts for grouping - skip if data provided via prop
  useEffect(() => {
    if (contextsData !== undefined) {
      setContextsMap(contextsData);
      return;
    }

    if (contextsFetchedRef.current) return;
    contextsFetchedRef.current = true;

    const fetchContexts = async () => {
      try {
        const response = await fetch(`/api/contexts?projectId=${encodeURIComponent(projectId)}`);
        if (response.ok) {
          const data = await response.json();
          const contexts = data.data?.contexts || [];
          const groups = data.data?.groups || [];

          // Build maps for group info (color and name)
          const groupInfo: Record<string, { color: string; name: string }> = {};
          groups.forEach((g: { id: string; color: string; name: string }) => {
            groupInfo[g.id] = { color: g.color, name: g.name };
          });

          const map: Record<string, ContextInfo> = {};
          contexts.forEach((ctx: DbContext) => {
            const group = ctx.group_id ? groupInfo[ctx.group_id] : undefined;
            map[ctx.id] = {
              id: ctx.id,
              name: ctx.name,
              groupName: group?.name,
              color: group?.color,
            };
          });
          setContextsMap(map);
        }
      } catch (error) {
        console.debug('Failed to fetch contexts:', error);
      }
    };

    fetchContexts();
  }, [projectId, contextsData]);

  // Group requirements by context
  const groupedRequirements = useMemo(() => {
    // First sort by status
    const sorted = [...requirements].sort((a, b) => {
      const statusOrder = { idle: 0, queued: 1, running: 2, failed: 3, 'session-limit': 4, completed: 5 };
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });

    // Group by context_id from the associated idea
    const groups: Record<string, { context: ContextInfo | null; requirements: ProjectRequirement[] }> = {};
    const NO_CONTEXT_KEY = '__no_context__';

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
  }, [requirements, ideasMap, contextsMap]);

  // Handle aggregation
  const handleAggregate = async () => {
    if (!projectPath || isAggregating) return;

    setIsAggregating(true);
    try {
      const response = await fetch('/api/idea-aggregator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      });

      const data = await response.json();
      if (data.success) {
        // Log aggregation results for debugging
        if (data.results) {
          data.results.forEach((result: { role: string; deletedFiles: string[]; newFileName: string }) => {
            console.log(`[Aggregate] ${result.role}: Created ${result.newFileName}, deleted ${result.deletedFiles?.length || 0} files`);
          });
        }

        // Small delay to ensure file system operations complete (Windows)
        await new Promise(resolve => setTimeout(resolve, 100));

        // Refresh the requirements list for this project only
        await onRefresh?.();

        // Re-check aggregation state after refresh
        await checkAggregation();
      } else {
        console.error('Aggregation failed:', data.error, data.errors);
      }
    } catch (error) {
      console.error('Failed to aggregate:', error);
    } finally {
      setIsAggregating(false);
    }
  };

  // Calculate selection state
  const selectableRequirements = requirements.filter(
    (req) => req.status !== 'running' && req.status !== 'queued'
  );
  const selectedCount = selectableRequirements.filter((req) =>
    selectedRequirements.has(getRequirementId(req))
  ).length;
  const allSelected = selectableRequirements.length > 0 && selectedCount === selectableRequirements.length;
  const someSelected = selectedCount > 0 && !allSelected;

  // Calculate clearable (completed/failed) count
  const clearableRequirements = requirements.filter(
    (r) => r.status === 'completed' || r.status === 'failed' || r.status === 'session-limit'
  );
  const clearableCount = clearableRequirements.length;

  // Get selected requirements in this column
  const selectedInColumn = requirements.filter((r) =>
    selectedRequirements.has(getRequirementId(r))
  );

  const handleBulkDeleteSelected = () => {
    if (selectedInColumn.length > 0 && onBulkDelete) {
      const selectedIds = selectedInColumn.map((r) => getRequirementId(r));
      onBulkDelete(selectedIds);
    }
  };

  const handleClearCompleted = () => {
    if (clearableCount > 0 && onBulkDelete) {
      const clearableIds = clearableRequirements.map((r) => getRequirementId(r));
      onBulkDelete(clearableIds);
    }
  };

  const handleProjectSelectionToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleProjectSelection(projectId);
  };

  return (
    <motion.div
      className="flex flex-col bg-gray-900/40 border border-gray-700/40 rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-testid={`task-column-${projectId}`}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-gray-800/60 border-b border-gray-700/40">
        <div className="flex items-center justify-between gap-2">
          {/* Project name and selection toggle */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={handleProjectSelectionToggle}
              className="flex-shrink-0 text-gray-400 hover:text-emerald-400 transition-colors"
              title={allSelected ? 'Deselect all' : 'Select all'}
              disabled={selectableRequirements.length === 0}
              data-testid={`select-all-btn-${projectId}`}
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-emerald-400" />
              ) : someSelected ? (
                <Square className="w-4 h-4 text-emerald-400/60" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <h3 className="text-sm font-semibold text-gray-300 truncate" title={projectName}>
              {projectName}
            </h3>
          </div>

          {/* Action buttons and count badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Aggregate button - only show when aggregation is possible */}
            {aggregationCheck?.canAggregate && (
              <button
                onClick={handleAggregate}
                disabled={isAggregating}
                className="text-violet-400 hover:text-violet-300 text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-500/10 hover:bg-violet-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Aggregate ${aggregationCheck.aggregatableFiles} idea files into ${aggregationCheck.groups.filter(g => g.canAggregate).length} combined files`}
                data-testid={`aggregate-btn-${projectId}`}
              >
                <Layers className="w-3 h-3" />
                <span>{aggregationCheck.aggregatableFiles}</span>
              </button>
            )}

            {/* Delete selected button */}
            {selectedInColumn.length > 0 && onBulkDelete && (
              <button
                onClick={handleBulkDeleteSelected}
                className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                title={`Delete ${selectedInColumn.length} selected`}
                data-testid={`bulk-delete-selected-btn-${projectId}`}
              >
                <Trash2 className="w-3 h-3" />
                <span>{selectedInColumn.length}</span>
              </button>
            )}

            {/* Clear completed/failed button */}
            {clearableCount > 0 && onBulkDelete && (
              <button
                onClick={handleClearCompleted}
                className="text-gray-400 hover:text-gray-300 text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-500/10 hover:bg-gray-500/20 transition-colors"
                title="Clear completed and failed tasks"
                data-testid={`clear-completed-btn-${projectId}`}
              >
                <XCircle className="w-3 h-3" />
                <span>{clearableCount}</span>
              </button>
            )}

            {selectedCount > 0 && (
              <span className="text-[10px] text-emerald-400 font-mono">
                {selectedCount}/{selectableRequirements.length}
              </span>
            )}
            <span className="text-[10px] text-gray-500 font-mono">
              {requirements.length}
            </span>
          </div>
        </div>
      </div>

      {/* Requirements List - Grouped by Context */}
      <div className="flex-1 px-2 py-2 min-h-[100px] max-h-[500px] overflow-y-auto custom-scrollbar">
        {requirements.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[10px] text-gray-600">
            No requirements
          </div>
        ) : (
          groupedRequirements.map((group) => (
            <div key={group.key} className="mb-3 last:mb-0">
              {/* Context Divider - Always show when we have context info */}
              <div className="flex items-center gap-2 py-1 px-1 mb-1">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.context?.color || '#4b5563' }}
                />
                <span
                  className="text-[10px] font-medium truncate"
                  style={{ color: group.context?.color || '#9ca3af' }}
                >
                  {group.context
                    ? group.context.groupName
                      ? `${group.context.groupName} - ${group.context.name}`
                      : group.context.name
                    : 'Without Context'}
                </span>
                <div className="flex-1 h-px bg-gray-700/40" />
                <span className="text-[9px] text-gray-500 font-mono">
                  {group.requirements.length}
                </span>
              </div>

              {/* Tasks in this group */}
              <div className="space-y-1 pl-1">
                {group.requirements.map((req) => {
                  const reqId = getRequirementId(req);
                  return (
                    <TaskItem
                      key={reqId}
                      requirement={req}
                      isSelected={selectedRequirements.has(reqId)}
                      onToggleSelect={() => onToggleSelect(reqId)}
                      onDelete={() => onDelete(reqId)}
                      projectPath={req.projectPath}
                      projectId={projectId}
                      idea={ideasMap[req.requirementName]}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
});

export default TaskColumn;
