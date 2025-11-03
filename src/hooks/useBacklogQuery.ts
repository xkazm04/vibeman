import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export interface ImpactedFile {
  path: string;
  change: string;
}

interface BacklogItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress';
  timestamp: Date;
  agent: 'developer' | 'mastermind' | 'tester' | 'artist';
  type: 'proposal' | 'custom';
  impactedFiles?: ImpactedFile[];
  steps?: string[];
}

interface BacklogResponse {
  backlogProposals: BacklogItem[];
  customBacklogItems: BacklogItem[];
  newItemIds: Set<string>;
}

// API response item structure (converted from database)
interface ApiBacklogItem {
  id: string;
  project_id: string;
  goal_id: string | null;
  agent: 'developer' | 'mastermind' | 'tester' | 'artist';
  title: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'undecided';
  type: 'proposal' | 'custom';
  steps?: string[]; // Array of implementation steps
  impacted_files: string | null; // JSON string
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
}

interface ApiResponse {
  backlogItems: ApiBacklogItem[];
}

// Parse impacted files from JSON string
const parseImpactedFilesFromDb = (impactedFilesJson: string | null): ImpactedFile[] => {
  if (!impactedFilesJson) return [];
  try {
    return JSON.parse(impactedFilesJson);
  } catch (error) {
    return [];
  }
};

// Convert API response item to app types
const convertApiItemToAppType = (apiItem: ApiBacklogItem): BacklogItem => {
  return {
    id: apiItem.id,
    title: apiItem.title,
    description: apiItem.description,
    status: apiItem.status === 'undecided' ? 'pending' : apiItem.status,
    timestamp: new Date(apiItem.created_at),
    agent: apiItem.agent,
    type: apiItem.type,
    steps: apiItem.steps, // Include steps from API
    impactedFiles: parseImpactedFilesFromDb(apiItem.impacted_files)
  };
};

const fetchBacklogItems = async (projectId: string): Promise<BacklogResponse> => {
  const response = await fetch(`/api/backlog?projectId=${encodeURIComponent(projectId)}&_t=${Date.now()}`, {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch backlog items');
  }

  const data: ApiResponse = await response.json();
  const convertedItems = data.backlogItems.map(convertApiItemToAppType);
  
  // Separate proposals and custom items
  const backlogProposals = convertedItems.filter((item: BacklogItem) => 
    item.type === 'proposal'
  );
  
  const customBacklogItems = convertedItems.filter((item: BacklogItem) => 
    item.type === 'custom'
  );
  
  return {
    backlogProposals,
    customBacklogItems,
    newItemIds: new Set() // We'll implement new item detection later if needed
  };
};

export const useBacklogQuery = (projectId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => fetchBacklogItems(projectId!),
    enabled: !!projectId,
    staleTime: 5000, // Consider data fresh for 5 seconds
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true,
  });

  // Manual refetch function
  const refetchBacklog = useCallback(() => {
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['backlog', projectId] });
    }
  }, [projectId, queryClient]);

  // Optimistic update for item status changes
  const updateItemOptimistically = useCallback((itemId: string, updates: Partial<BacklogItem>) => {
    if (!projectId) return;

    queryClient.setQueryData<BacklogResponse>(['backlog', projectId], (oldData) => {
      if (!oldData) return oldData;

      const updateItem = (item: BacklogItem) =>
        item.id === itemId ? { ...item, ...updates } : item;

      return {
        ...oldData,
        backlogProposals: oldData.backlogProposals.map(updateItem),
        customBacklogItems: oldData.customBacklogItems.map(updateItem)
      };
    });
  }, [projectId, queryClient]);

  // Server update function
  const updateItemOnServer = useCallback(async (itemId: string, updates: Partial<BacklogItem>) => {
    const requestBody: Partial<BacklogItem> & { id: string } = { id: itemId };

    if ('status' in updates) requestBody.status = updates.status;
    if ('title' in updates) requestBody.title = updates.title;
    if ('description' in updates) requestBody.description = updates.description;
    if ('impactedFiles' in updates) requestBody.impactedFiles = updates.impactedFiles;

    const response = await fetch('/api/backlog', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error('Failed to update backlog item');
    }

    return response.json();
  }, []);

  // Server delete function
  const deleteItemOnServer = useCallback(async (itemId: string) => {
    const response = await fetch(`/api/backlog?id=${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete backlog item');
    }

    return response.json();
  }, []);

  // Remove item optimistically
  const removeItemOptimistically = useCallback((itemId: string) => {
    if (!projectId) return;

    queryClient.setQueryData<BacklogResponse>(['backlog', projectId], (oldData) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        backlogProposals: oldData.backlogProposals.filter(item => item.id !== itemId),
        customBacklogItems: oldData.customBacklogItems.filter(item => item.id !== itemId)
      };
    });
  }, [projectId, queryClient]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error?.message,
    refetch: refetchBacklog,
    updateItemOptimistically,
    removeItemOptimistically,
    updateItemOnServer,
    deleteItemOnServer,
    isRefetching: query.isRefetching
  };
};