import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePolling } from '@/hooks/usePolling';
import type { ProjectRequirement } from '../lib/types';
import type { AggregationCheckResult } from '../lib/ideaAggregator';
import type { DbIdea } from '@/app/db';

export interface ContextInfo {
  id: string;
  name: string;
  groupName?: string;
  color?: string;
}

interface UseTaskColumnDataProps {
  projectId: string;
  projectPath: string;
  requirements: ProjectRequirement[];
  aggregationData?: AggregationCheckResult | null;
  ideasData?: Record<string, DbIdea | null>;
  contextsData?: Record<string, ContextInfo>;
}

export function useTaskColumnData({
  projectId,
  projectPath,
  requirements,
  aggregationData,
  ideasData,
  contextsData,
}: UseTaskColumnDataProps) {
  const [aggregationCheck, setAggregationCheck] = useState<AggregationCheckResult | null>(aggregationData || null);
  const [ideasMap, setIdeasMap] = useState<Record<string, DbIdea | null>>(ideasData || {});
  const [contextsMap, setContextsMap] = useState<Record<string, ContextInfo>>(contextsData || {});

  const requirementNames = useMemo(() => requirements.map((r) => r.requirementName), [requirements]);

  // Check for aggregatable files
  const checkAggregation = useCallback(async () => {
    if (!projectPath || aggregationData !== undefined) return;

    try {
      const response = await fetch(`/api/idea-aggregator?projectPath=${encodeURIComponent(projectPath)}`);
      const data = await response.json();
      if (data.success) {
        setAggregationCheck(data);
      }
    } catch (error) {
      console.error('Failed to check aggregation:', error);
    }
  }, [projectPath, aggregationData]);

  // Batch fetch ideas
  const fetchIdeas = useCallback(async () => {
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
    } catch {
      // Batch fetch failed - non-critical
    }
  }, [requirementNames]);

  // Fetch contexts for grouping
  const fetchContexts = useCallback(async () => {
    try {
      const response = await fetch(`/api/contexts?projectId=${encodeURIComponent(projectId)}`);
      if (response.ok) {
        const data = await response.json();
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
      // Context fetch failed - non-critical
    }
  }, [projectId]);

  // One-shot fetches via usePolling (maxAttempts: 2 runs the callback exactly once)
  const { restart: restartAggregation } = usePolling(checkAggregation, {
    enabled: aggregationData === undefined,
    intervalMs: 60_000,
    maxAttempts: 2,
    immediate: true,
  });

  const { restart: restartIdeas } = usePolling(fetchIdeas, {
    enabled: ideasData === undefined,
    intervalMs: 60_000,
    maxAttempts: 2,
    immediate: true,
  });

  const { restart: restartContexts } = usePolling(fetchContexts, {
    enabled: contextsData === undefined,
    intervalMs: 60_000,
    maxAttempts: 2,
    immediate: true,
  });

  // Sync prop data when provided externally
  useEffect(() => {
    if (ideasData !== undefined) setIdeasMap(ideasData);
  }, [ideasData]);

  useEffect(() => {
    if (contextsData !== undefined) setContextsMap(contextsData);
  }, [contextsData]);

  // Reset and re-fetch when project changes
  useEffect(() => {
    setAggregationCheck(null);
    setIdeasMap({});
    setContextsMap({});
    if (aggregationData === undefined) restartAggregation();
    if (ideasData === undefined) restartIdeas();
    if (contextsData === undefined) restartContexts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath]);

  return {
    aggregationCheck,
    setAggregationCheck,
    ideasMap,
    contextsMap,
    checkAggregation,
  };
}
