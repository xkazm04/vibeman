/**
 * useProjectContexts Hook
 * Fetches contexts and context groups for a project
 */

import { useState, useEffect, useCallback } from 'react';

export interface ContextGroup {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface Context {
  id: string;
  name: string;
  description: string | null;
  groupId: string | null;
  groupName?: string;
  groupColor?: string;
}

export interface GroupedContexts {
  group: ContextGroup | null;
  contexts: Context[];
}

interface UseProjectContextsReturn {
  groups: ContextGroup[];
  contexts: Context[];
  groupedContexts: GroupedContexts[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProjectContexts(projectId: string | null): UseProjectContextsReturn {
  const [groups, setGroups] = useState<ContextGroup[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContexts = useCallback(async () => {
    if (!projectId) {
      setGroups([]);
      setContexts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch both groups and contexts in parallel
      const [groupsRes, contextsRes] = await Promise.all([
        fetch(`/api/context-groups?projectId=${projectId}`),
        fetch(`/api/contexts?projectId=${projectId}`),
      ]);

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        // API returns { success: true, data: [...] }
        setGroups(groupsData.data || []);
      }

      if (contextsRes.ok) {
        const contextsData = await contextsRes.json();
        // API returns { success: true, data: { contexts: [...], groups: [...] } }
        setContexts(contextsData.data?.contexts || []);
      }
    } catch (err) {
      setError('Failed to load contexts');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchContexts();
  }, [fetchContexts]);

  // Group contexts by their groupId
  const groupedContexts: GroupedContexts[] = [];

  // Add contexts with groups
  groups.forEach(group => {
    const groupContexts = contexts.filter(c => c.groupId === group.id);
    if (groupContexts.length > 0) {
      groupedContexts.push({
        group,
        contexts: groupContexts,
      });
    }
  });

  // Add contexts without groups
  const ungroupedContexts = contexts.filter(c => !c.groupId);
  if (ungroupedContexts.length > 0) {
    groupedContexts.push({
      group: null,
      contexts: ungroupedContexts,
    });
  }

  return {
    groups,
    contexts,
    groupedContexts,
    isLoading,
    error,
    refresh: fetchContexts,
  };
}

export default useProjectContexts;
