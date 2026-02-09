import { useState, useEffect, useCallback } from 'react';
import { BacklogProposal, CustomBacklogItem, ImpactedFile } from '@/types';

// API response item structure (converted by the API route)
interface ApiBacklogItem {
  id: string;
  project_id: string;
  goal_id: string | null;
  agent?: string;
  title: string;
  description: string;
  steps?: string[] | string | null; // Can be array, string, or null
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'undecided';
  type: 'proposal' | 'custom';
  impacted_files?: ImpactedFile[]; // Parsed by API
  impactedFiles?: ImpactedFile[]; // Alternative field name
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
}

// Parse impacted files from various formats
const parseImpactedFilesFromDb = (impactedFilesData: unknown): ImpactedFile[] => {
  if (!impactedFilesData) return [];

  // Handle case where it's already an array
  if (Array.isArray(impactedFilesData)) {
    return impactedFilesData;
  }

  // Handle case where it's a JSON string
  if (typeof impactedFilesData === 'string') {
    try {
      const parsed = JSON.parse(impactedFilesData);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  return [];
};

// Convert API response item to app types
const convertDbBacklogItemToAppType = (apiItem: ApiBacklogItem): BacklogProposal | CustomBacklogItem => {
  // Parse steps safely - they might already be parsed by the API
  let steps: string[] | undefined;
  if (apiItem.steps) {
    if (Array.isArray(apiItem.steps)) {
      steps = apiItem.steps;
    } else if (typeof apiItem.steps === 'string') {
      try {
        const parsed = JSON.parse(apiItem.steps);
        steps = Array.isArray(parsed) ? parsed : undefined;
      } catch (error) {
        steps = [apiItem.steps]; // Treat as single step
      }
    }
  }

  const baseItem = {
    id: apiItem.id,
    title: apiItem.title,
    description: apiItem.description,
    timestamp: new Date(apiItem.created_at),
    steps: steps,
    // Handle both impacted_files (from API) and impactedFiles (from frontend)
    impactedFiles: parseImpactedFilesFromDb(apiItem.impacted_files || apiItem.impactedFiles)
  };

  // Handle custom items
  if (apiItem.type === 'custom') {
    return {
      ...baseItem,
      type: 'custom'
    } as CustomBacklogItem;
  }

  // Map agent from API response or use default
  const agent = apiItem.agent || 'developer';
  
  return {
    ...baseItem,
    agent: agent as 'developer' | 'mastermind' | 'tester' | 'artist',
    status: apiItem.status === 'undecided' ? 'pending' : apiItem.status as 'pending' | 'accepted' | 'rejected' | 'in_progress'
  } as BacklogProposal;
};

export const useBacklog = (projectId: string | null) => {
  const [backlogProposals, setBacklogProposals] = useState<BacklogProposal[]>([]);
  const [customBacklogItems, setCustomBacklogItems] = useState<CustomBacklogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());

  const fetchBacklogItems = useCallback(async () => {
    if (!projectId) {
      setBacklogProposals([]);
      setCustomBacklogItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/backlog?projectId=${encodeURIComponent(projectId)}&_t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch backlog items');
      }

      const data = await response.json();
      const convertedItems = data.backlogItems.map(convertDbBacklogItemToAppType);
      
      // Separate proposals and custom items
      const proposals = convertedItems.filter((item: BacklogProposal | CustomBacklogItem): item is BacklogProposal => 
        'agent' in item && 'status' in item
      );
      
      const customItems = convertedItems.filter((item: BacklogProposal | CustomBacklogItem): item is CustomBacklogItem => 
        'type' in item && item.type === 'custom'
      );
      
      setBacklogProposals(proposals);
      setCustomBacklogItems(customItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch backlog items');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createBacklogItem = useCallback(async (
    itemData: Omit<BacklogProposal, 'id' | 'timestamp'> | Omit<CustomBacklogItem, 'id' | 'timestamp'>,
    goalId?: string
  ) => {
    if (!projectId) return null;

    try {
      const isCustomItem = 'type' in itemData && itemData.type === 'custom';
      
      const requestBody = {
        projectId,
        goalId,
        title: itemData.title,
        description: itemData.description,
        type: isCustomItem ? 'optimization' : 'feature', // Map to database schema
        impactedFiles: itemData.impactedFiles || [],
        status: isCustomItem ? 'pending' : (itemData as BacklogProposal).status || 'pending',
        steps: itemData.steps || []
      };

      const response = await fetch('/api/backlog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to create backlog item');
      }

      const data = await response.json();
      const newItem = convertDbBacklogItemToAppType(data.backlogItem);
      
      if (isCustomItem) {
        setCustomBacklogItems(prev => [newItem as CustomBacklogItem, ...prev]);
      } else {
        setBacklogProposals(prev => [newItem as BacklogProposal, ...prev]);
      }
      
      return newItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backlog item');
      return null;
    }
  }, [projectId]);

  const updateBacklogItem = useCallback(async (
    itemId: string,
    updates: Partial<BacklogProposal> | Partial<CustomBacklogItem>
  ) => {
    try {
      const requestBody: Record<string, unknown> = { id: itemId };

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

      const data = await response.json();
      const updatedItem = convertDbBacklogItemToAppType(data.backlogItem);
      
      // Update the appropriate list
      if ('type' in updatedItem && updatedItem.type === 'custom') {
        setCustomBacklogItems(prev => 
          prev.map(item => 
            item.id === itemId ? updatedItem as CustomBacklogItem : item
          )
        );
      } else {
        setBacklogProposals(prev => 
          prev.map(item => 
            item.id === itemId ? updatedItem as BacklogProposal : item
          )
        );
      }
      
      return updatedItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update backlog item');
      return null;
    }
  }, []);

  const deleteBacklogItem = useCallback(async (itemId: string) => {
    try {
      const response = await fetch(`/api/backlog?id=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete backlog item');
      }

      // Remove from both lists (one will be a no-op)
      setBacklogProposals(prev => prev.filter(item => item.id !== itemId));
      setCustomBacklogItems(prev => prev.filter(item => item.id !== itemId));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete backlog item');
      return false;
    }
  }, []);

  const acceptProposal = useCallback(async (proposalId: string) => {
    return await updateBacklogItem(proposalId, { status: 'accepted' });
  }, [updateBacklogItem]);

  const rejectProposal = useCallback(async (proposalId: string) => {
    return await updateBacklogItem(proposalId, { status: 'rejected' });
  }, [updateBacklogItem]);

  const moveToInProgress = useCallback(async (proposalId: string) => {
    return await updateBacklogItem(proposalId, { status: 'in_progress' });
  }, [updateBacklogItem]);

  // Fetch backlog items when projectId changes
  useEffect(() => {
    fetchBacklogItems();
  }, [fetchBacklogItems]);

  return {
    backlogProposals,
    customBacklogItems,
    loading,
    error,
    newItemIds,
    fetchBacklogItems,
    createBacklogItem,
    updateBacklogItem,
    deleteBacklogItem,
    acceptProposal,
    rejectProposal,
    moveToInProgress,
    clearError: () => setError(null)
  };
}; 