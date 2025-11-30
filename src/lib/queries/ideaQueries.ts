import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { DbIdea } from '@/app/db';

// Idea status type for filtering
export type IdeaStatus = 'pending' | 'accepted' | 'rejected' | 'implemented';

// Query key factory for consistent cache keys
export const ideaQueryKeys = {
  all: ['ideas'] as const,
  lists: () => [...ideaQueryKeys.all, 'list'] as const,
  list: (filters: { status?: IdeaStatus; projectId?: string }) =>
    [...ideaQueryKeys.lists(), filters] as const,
  byStatus: (status: IdeaStatus) =>
    [...ideaQueryKeys.lists(), { status }] as const,
  byProject: (projectId: string) =>
    [...ideaQueryKeys.lists(), { projectId }] as const,
  buffer: () => [...ideaQueryKeys.lists(), 'buffer'] as const,
  detail: (id: string) => [...ideaQueryKeys.all, 'detail', id] as const,
};

// API functions
async function fetchIdeas(filters?: {
  status?: IdeaStatus;
  projectId?: string;
}): Promise<DbIdea[]> {
  const params = new URLSearchParams();

  if (filters?.status) {
    params.append('status', filters.status);
  }
  if (filters?.projectId) {
    params.append('projectId', filters.projectId);
  }

  const url = `/api/ideas${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch ideas');
  }

  const data = await response.json();
  return data.ideas || [];
}

async function fetchBufferIdeas(): Promise<DbIdea[]> {
  // Buffer shows pending and accepted ideas
  const response = await fetch('/api/ideas', {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch ideas');
  }

  const data = await response.json();
  const ideas: DbIdea[] = data.ideas || [];

  // Filter to only pending and accepted for buffer view
  return ideas.filter(
    (idea) => idea.status === 'pending' || idea.status === 'accepted'
  );
}

async function updateIdeaApi(
  ideaId: string,
  updates: Partial<DbIdea>
): Promise<DbIdea> {
  const response = await fetch('/api/ideas', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: ideaId,
      ...updates,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update idea');
  }

  const data = await response.json();
  return data.idea;
}

async function deleteIdeaApi(ideaId: string): Promise<boolean> {
  const response = await fetch(`/api/ideas?id=${encodeURIComponent(ideaId)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete idea');
  }

  return true;
}

async function deleteContextIdeasApi(
  contextId: string,
  projectPath?: string
): Promise<number> {
  const params = new URLSearchParams();
  params.append('contextId', contextId);
  if (projectPath) {
    params.append('projectPath', projectPath);
  }

  const response = await fetch(`/api/contexts/ideas?${params.toString()}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete context ideas');
  }

  const data = await response.json();
  return data.deletedCount || 0;
}

/**
 * Hook for fetching buffer ideas (pending + accepted)
 * Uses React Query for caching, automatic refetching, and optimistic updates
 */
export function useBufferIdeas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ideaQueryKeys.buffer(),
    queryFn: fetchBufferIdeas,
    staleTime: 5000, // Consider data fresh for 5 seconds
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Invalidate and refetch
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ideaQueryKeys.buffer() });
  }, [queryClient]);

  // Optimistic update for a single idea
  const updateIdeaOptimistically = useCallback(
    (ideaId: string, updates: Partial<DbIdea>) => {
      queryClient.setQueryData<DbIdea[]>(ideaQueryKeys.buffer(), (oldData) => {
        if (!oldData) return oldData;

        return oldData.map((idea) =>
          idea.id === ideaId ? { ...idea, ...updates } : idea
        );
      });
    },
    [queryClient]
  );

  // Optimistic remove for a single idea
  const removeIdeaOptimistically = useCallback(
    (ideaId: string) => {
      queryClient.setQueryData<DbIdea[]>(ideaQueryKeys.buffer(), (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter((idea) => idea.id !== ideaId);
      });
    },
    [queryClient]
  );

  // Optimistic remove for all ideas in a context
  const removeContextIdeasOptimistically = useCallback(
    (contextId: string) => {
      queryClient.setQueryData<DbIdea[]>(ideaQueryKeys.buffer(), (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter((idea) => idea.context_id !== contextId);
      });
    },
    [queryClient]
  );

  // Add idea back (for rollback)
  const addIdeaOptimistically = useCallback(
    (idea: DbIdea) => {
      queryClient.setQueryData<DbIdea[]>(ideaQueryKeys.buffer(), (oldData) => {
        if (!oldData) return [idea];
        // Only add if not already present
        if (oldData.some((i) => i.id === idea.id)) return oldData;
        return [...oldData, idea];
      });
    },
    [queryClient]
  );

  // Add ideas back (for rollback)
  const addIdeasOptimistically = useCallback(
    (ideas: DbIdea[]) => {
      queryClient.setQueryData<DbIdea[]>(ideaQueryKeys.buffer(), (oldData) => {
        if (!oldData) return ideas;
        const existingIds = new Set(oldData.map((i) => i.id));
        const newIdeas = ideas.filter((idea) => !existingIds.has(idea.id));
        return [...oldData, ...newIdeas];
      });
    },
    [queryClient]
  );

  return {
    ideas: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error?.message,
    refetch,
    updateIdeaOptimistically,
    removeIdeaOptimistically,
    removeContextIdeasOptimistically,
    addIdeaOptimistically,
    addIdeasOptimistically,
  };
}

/**
 * Hook for fetching ideas with optional filters
 */
export function useIdeas(filters?: { status?: IdeaStatus; projectId?: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ideaQueryKeys.list(filters ?? {}),
    queryFn: () => fetchIdeas(filters),
    staleTime: 5000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ideaQueryKeys.list(filters ?? {}) });
  }, [queryClient, filters]);

  return {
    ideas: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error?.message,
    refetch,
  };
}

/**
 * Mutation hook for updating an idea with optimistic updates
 */
export function useUpdateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ideaId, updates }: { ideaId: string; updates: Partial<DbIdea> }) =>
      updateIdeaApi(ideaId, updates),
    onMutate: async ({ ideaId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ideaQueryKeys.buffer() });

      // Snapshot previous value
      const previousIdeas = queryClient.getQueryData<DbIdea[]>(ideaQueryKeys.buffer());

      // Optimistically update
      queryClient.setQueryData<DbIdea[]>(ideaQueryKeys.buffer(), (old) => {
        if (!old) return old;

        // If status changed to implemented or rejected, remove from buffer
        if (updates.status === 'implemented' || updates.status === 'rejected') {
          return old.filter((idea) => idea.id !== ideaId);
        }

        return old.map((idea) =>
          idea.id === ideaId ? { ...idea, ...updates } : idea
        );
      });

      return { previousIdeas };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousIdeas) {
        queryClient.setQueryData(ideaQueryKeys.buffer(), context.previousIdeas);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all });
    },
  });
}

/**
 * Mutation hook for deleting an idea with optimistic updates
 */
export function useDeleteIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ideaId: string) => deleteIdeaApi(ideaId),
    onMutate: async (ideaId) => {
      await queryClient.cancelQueries({ queryKey: ideaQueryKeys.buffer() });

      const previousIdeas = queryClient.getQueryData<DbIdea[]>(ideaQueryKeys.buffer());
      const deletedIdea = previousIdeas?.find((idea) => idea.id === ideaId);

      queryClient.setQueryData<DbIdea[]>(ideaQueryKeys.buffer(), (old) => {
        if (!old) return old;
        return old.filter((idea) => idea.id !== ideaId);
      });

      return { previousIdeas, deletedIdea };
    },
    onError: (_err, _ideaId, context) => {
      if (context?.previousIdeas) {
        queryClient.setQueryData(ideaQueryKeys.buffer(), context.previousIdeas);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all });
    },
  });
}

/**
 * Mutation hook for deleting all ideas in a context with optimistic updates
 * Supports 'no-context' for deleting General ideas (null context_id)
 */
export function useDeleteContextIdeas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contextId, projectPath }: { contextId: string; projectPath?: string }) =>
      deleteContextIdeasApi(contextId, projectPath),
    onMutate: async ({ contextId }) => {
      await queryClient.cancelQueries({ queryKey: ideaQueryKeys.buffer() });

      const previousIdeas = queryClient.getQueryData<DbIdea[]>(ideaQueryKeys.buffer());
      
      // Handle 'no-context' for General ideas (null context_id)
      const isGeneralContext = contextId === 'no-context';
      const deletedIdeas = previousIdeas?.filter((idea) =>
        isGeneralContext
          ? idea.context_id === null
          : idea.context_id === contextId
      ) ?? [];

      queryClient.setQueryData<DbIdea[]>(ideaQueryKeys.buffer(), (old) => {
        if (!old) return old;
        return old.filter((idea) =>
          isGeneralContext
            ? idea.context_id !== null
            : idea.context_id !== contextId
        );
      });

      return { previousIdeas, deletedIdeas };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousIdeas) {
        queryClient.setQueryData(ideaQueryKeys.buffer(), context.previousIdeas);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all });
    },
  });
}

/**
 * Hook to invalidate all idea queries (useful after external mutations)
 */
export function useInvalidateIdeas() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ideaQueryKeys.all });
  }, [queryClient]);
}
