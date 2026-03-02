import { useState, useEffect, useMemo, useRef } from 'react';
import type { ProjectRequirement } from '../lib/types';
import type { AggregationCheckResult } from '../lib/ideaAggregator';
import type { ContextInfo } from './useTaskColumnData';
import type { DbIdea } from '@/app/db';

interface BatchDataResult {
  /** Aggregation check results keyed by projectId */
  aggregationByProject: Record<string, AggregationCheckResult | null>;
  /** Ideas keyed by requirementName (shared across all projects) */
  ideasMap: Record<string, DbIdea | null>;
  /** Contexts keyed by contextId (shared across all projects) */
  contextsMap: Record<string, ContextInfo>;
}

/**
 * Batch-fetches aggregation, ideas, and contexts data for ALL project columns
 * in a minimal number of API calls, then distributes results per-project.
 *
 * - Aggregation: 1 call per project (API is single-project only), fired in parallel
 * - Ideas: 1 single POST with all requirement names across all projects
 * - Contexts: 1 single GET with comma-separated projectIds
 */
export function useTaskRunnerBatchData(
  groupedRequirements: Record<string, ProjectRequirement[]>
): BatchDataResult {
  const [aggregationByProject, setAggregationByProject] = useState<Record<string, AggregationCheckResult | null>>({});
  const [ideasMap, setIdeasMap] = useState<Record<string, DbIdea | null>>({});
  const [contextsMap, setContextsMap] = useState<Record<string, ContextInfo>>({});

  // Track what we've fetched to avoid re-fetching on re-renders
  const fetchedRef = useRef<{
    aggregationKeys: string;
    ideasKeys: string;
    contextsKeys: string;
  }>({ aggregationKeys: '', ideasKeys: '', contextsKeys: '' });

  // Derive stable keys for comparison
  const projectEntries = useMemo(() => {
    return Object.entries(groupedRequirements).map(([projectId, reqs]) => ({
      projectId,
      projectPath: reqs[0]?.projectPath || '',
      requirementNames: reqs.map((r) => r.requirementName),
    }));
  }, [groupedRequirements]);

  const allProjectIds = useMemo(
    () => projectEntries.map((e) => e.projectId),
    [projectEntries]
  );

  const allRequirementNames = useMemo(
    () => projectEntries.flatMap((e) => e.requirementNames),
    [projectEntries]
  );

  // === Batch aggregation (1 call per project, all in parallel) ===
  useEffect(() => {
    const key = projectEntries.map((e) => e.projectPath).sort().join(',');
    if (!key || key === fetchedRef.current.aggregationKeys) return;
    fetchedRef.current.aggregationKeys = key;

    const fetchAll = async () => {
      const results = await Promise.allSettled(
        projectEntries.map(async ({ projectId, projectPath }) => {
          if (!projectPath) return { projectId, data: null };
          const res = await fetch(`/api/idea-aggregator?projectPath=${encodeURIComponent(projectPath)}`);
          const json = await res.json();
          return { projectId, data: json.success ? json as AggregationCheckResult : null };
        })
      );

      const map: Record<string, AggregationCheckResult | null> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') {
          map[r.value.projectId] = r.value.data;
        }
      }
      setAggregationByProject(map);
    };

    fetchAll();
  }, [projectEntries]);

  // === Batch ideas (1 single POST) ===
  useEffect(() => {
    const key = [...allRequirementNames].sort().join(',');
    if (!key || key === fetchedRef.current.ideasKeys) return;
    fetchedRef.current.ideasKeys = key;

    const fetchIdeas = async () => {
      try {
        const res = await fetch('/api/ideas/by-requirements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requirementIds: allRequirementNames }),
        });
        if (res.ok) {
          const data = await res.json();
          setIdeasMap(data.ideas || {});
        }
      } catch {
        // Non-critical
      }
    };

    fetchIdeas();
  }, [allRequirementNames]);

  // === Batch contexts (1 single GET with comma-separated projectIds) ===
  useEffect(() => {
    const key = [...allProjectIds].sort().join(',');
    if (!key || key === fetchedRef.current.contextsKeys) return;
    fetchedRef.current.contextsKeys = key;

    const fetchContexts = async () => {
      try {
        const res = await fetch(`/api/contexts?projectId=${encodeURIComponent(allProjectIds.join(','))}`);
        if (res.ok) {
          const data = await res.json();
          const contexts = data.data?.contexts || [];
          const groups = data.data?.groups || [];

          const groupInfo: Record<string, { color: string; name: string }> = {};
          groups.forEach((g: { id: string; color: string; name: string }) => {
            groupInfo[g.id] = { color: g.color, name: g.name };
          });

          const map: Record<string, ContextInfo> = {};
          contexts.forEach((ctx: { id: string; name: string; group_id?: string; groupId?: string }) => {
            const contextGroupId = ctx.group_id || ctx.groupId;
            const group = contextGroupId ? groupInfo[contextGroupId] : undefined;
            map[ctx.id] = {
              id: ctx.id,
              name: ctx.name,
              groupName: group?.name,
              color: group?.color,
            };
          });
          setContextsMap(map);
        }
      } catch {
        // Non-critical
      }
    };

    fetchContexts();
  }, [allProjectIds]);

  return { aggregationByProject, ideasMap, contextsMap };
}
