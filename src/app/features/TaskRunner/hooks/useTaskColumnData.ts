import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [hasFetchedAggregation, setHasFetchedAggregation] = useState(false);
  const [hasFetchedIdeas, setHasFetchedIdeas] = useState(false);
  const [hasFetchedContexts, setHasFetchedContexts] = useState(false);

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

  useEffect(() => {
    if (aggregationData === undefined && !hasFetchedAggregation) {
      setHasFetchedAggregation(true);
      checkAggregation();
    }
  }, [checkAggregation, aggregationData, hasFetchedAggregation]);

  // Reset fetch state when project changes
  useEffect(() => {
    setHasFetchedAggregation(false);
    setHasFetchedIdeas(false);
    setHasFetchedContexts(false);
    setAggregationCheck(null);
    setIdeasMap({});
    setContextsMap({});
  }, [projectPath]);

  // Batch fetch ideas
  const requirementNames = useMemo(() => requirements.map((r) => r.requirementName), [requirements]);

  useEffect(() => {
    if (ideasData !== undefined) {
      setIdeasMap(ideasData);
      return;
    }

    if (hasFetchedIdeas) return;
    setHasFetchedIdeas(true);

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
  }, [requirementNames, ideasData, hasFetchedIdeas]);

  // Fetch contexts for grouping
  useEffect(() => {
    if (contextsData !== undefined) {
      setContextsMap(contextsData);
      return;
    }

    if (hasFetchedContexts) return;
    setHasFetchedContexts(true);

    const fetchContexts = async () => {
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
      } catch (error) {
        console.debug('Failed to fetch contexts:', error);
      }
    };

    fetchContexts();
  }, [projectId, contextsData, hasFetchedContexts]);

  return {
    aggregationCheck,
    setAggregationCheck,
    ideasMap,
    contextsMap,
    checkAggregation,
  };
}
