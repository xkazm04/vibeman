import { useState, useEffect, useCallback } from 'react';
import { BacklogProposal, CustomBacklogItem } from '@/types';
import { Database, supabase } from '@/lib/supabase';
import { useAnalysisStore } from '@/stores/analysisStore';

type DbBacklogItem = Database['public']['Tables']['backlog_items']['Row'];

// Convert database backlog item to app types
const convertDbBacklogItemToAppType = (dbItem: DbBacklogItem): BacklogProposal | CustomBacklogItem => {
  const baseItem = {
    id: dbItem.id,
    title: dbItem.title,
    description: dbItem.description,
    timestamp: new Date(dbItem.created_at),
    impactedFiles: dbItem.impacted_files || []
  };

  if (dbItem.type === 'custom') {
    return {
      ...baseItem,
      type: 'custom'
    } as CustomBacklogItem;
  } else {
    return {
      ...baseItem,
      agent: dbItem.agent as 'developer' | 'mastermind' | 'tester' | 'artist',
      status: dbItem.status as 'pending' | 'accepted' | 'rejected' | 'in_progress'
    } as BacklogProposal;
  }
};

export const useBacklog = (projectId: string | null) => {
  const [backlogProposals, setBacklogProposals] = useState<BacklogProposal[]>([]);
  const [customBacklogItems, setCustomBacklogItems] = useState<CustomBacklogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const { isActive } = useAnalysisStore();

  const fetchBacklogItems = useCallback(async () => {
    if (!projectId) {
      setBacklogProposals([]);
      setCustomBacklogItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/backlog?projectId=${encodeURIComponent(projectId)}`);
      
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
      console.error('Error fetching backlog items:', err);
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
        agent: isCustomItem ? 'custom' : (itemData as BacklogProposal).agent,
        title: itemData.title,
        description: itemData.description,
        type: isCustomItem ? 'custom' : 'proposal',
        impactedFiles: itemData.impactedFiles || [],
        status: isCustomItem ? 'pending' : (itemData as BacklogProposal).status || 'pending'
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
      console.error('Error creating backlog item:', err);
      return null;
    }
  }, [projectId]);

  const updateBacklogItem = useCallback(async (
    itemId: string, 
    updates: Partial<BacklogProposal> | Partial<CustomBacklogItem>
  ) => {
    try {
      const requestBody: any = { id: itemId };
      
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
      console.error('Error updating backlog item:', err);
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
      console.error('Error deleting backlog item:', err);
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

  // Real-time subscription for new backlog items during analysis
  useEffect(() => {
    if (!projectId || !isActive) return;

    const subscription = supabase
      .channel('backlog_items')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'backlog_items',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newItem = convertDbBacklogItemToAppType(payload.new as DbBacklogItem);
          
          // Mark as new for animation
          setNewItemIds(prev => new Set([...prev, newItem.id]));
          
          // Remove the "new" flag after animation
          setTimeout(() => {
            setNewItemIds(prev => {
              const updated = new Set(prev);
              updated.delete(newItem.id);
              return updated;
            });
          }, 2000);
          
          // Add to appropriate list
          if ('type' in newItem && newItem.type === 'custom') {
            setCustomBacklogItems(prev => [newItem as CustomBacklogItem, ...prev]);
          } else {
            setBacklogProposals(prev => [newItem as BacklogProposal, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [projectId, isActive]);

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