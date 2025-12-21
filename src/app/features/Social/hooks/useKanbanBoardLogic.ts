import { useState, useCallback, useMemo, useEffect } from 'react';
import type { FeedbackItem, KanbanStatus, KanbanChannel } from '../lib/types/feedbackTypes';
import type { RequirementAnalysisResult } from '../lib/types/aiTypes';
import { useAIProcessing } from './useAIProcessing';
import { useFeedbackItems } from './useFeedbackItems';
import { useDragState, useSelectionState, useViewMode } from '../state';
import { useFilters } from './useFilters';
import { useSwimlanes } from './useSwimlanes';
import { useActivity, createStatusChangeEvent } from './useActivity';

interface ToastType {
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
  info: (title: string, message: string) => void;
}

interface UseKanbanBoardLogicProps {
  toast: ToastType;
  projectId?: string;
}

// Map channel types from API to KanbanChannel
const channelTypeToKanbanChannel: Record<string, KanbanChannel> = {
  instagram: 'instagram',
  facebook: 'facebook',
  x: 'x',
  gmail: 'email',
  discord: 'support_chat',
};

const kanbanChannelToType: Record<KanbanChannel, string> = {
  instagram: 'instagram',
  facebook: 'facebook',
  x: 'x',
  email: 'gmail',
  support_chat: 'discord',
  trustpilot: 'trustpilot',
  app_store: 'app_store',
};

export function useKanbanBoardLogic({ toast, projectId = 'default' }: UseKanbanBoardLogicProps) {
  const { addEvent } = useActivity();

  // Get state from providers
  const dragState = useDragState();
  const selectionState = useSelectionState();
  const viewModeState = useViewMode();

  // Normalized feedback items state - start empty
  const feedbackState = useFeedbackItems({ initialItems: [] });

  // Convenience accessor for feedbackItems array
  const feedbackItems = feedbackState.getAllItems();

  // Modal state
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Track which channels have been loaded
  const [loadedChannels, setLoadedChannels] = useState<Set<KanbanChannel>>(new Set());

  // Track which channels are configured in the database
  const [configuredChannels, setConfiguredChannels] = useState<Set<KanbanChannel>>(new Set());

  // Track loading state per channel
  const [loadingChannels, setLoadingChannels] = useState<Set<KanbanChannel>>(new Set());

  // Fetch configured channels on mount
  useEffect(() => {
    const fetchConfiguredChannels = async () => {
      try {
        const response = await fetch(`/api/social/fetch?projectId=${projectId}`);
        if (response.ok) {
          const data = await response.json();
          const channels = (data.configuredChannels || []).map(
            (type: string) => channelTypeToKanbanChannel[type]
          ).filter(Boolean);
          setConfiguredChannels(new Set(channels));
        }
      } catch (error) {
        console.error('Failed to fetch configured channels:', error);
      }
    };
    fetchConfiguredChannels();
  }, [projectId]);

  // Load or unload data for a specific channel
  const handleLoadChannelData = useCallback(async (channel: KanbanChannel) => {
    if (loadedChannels.has(channel)) {
      // Unload channel
      const itemsToRemove = feedbackItems
        .filter(item => item.channel === channel)
        .map(item => item.id);
      itemsToRemove.forEach(id => feedbackState.removeItem(id));
      setLoadedChannels(prev => {
        const next = new Set(prev);
        next.delete(channel);
        return next;
      });
      return;
    }

    // Start loading
    setLoadingChannels(prev => new Set(prev).add(channel));

    try {
      const channelType = kanbanChannelToType[channel];
      const response = await fetch('/api/social/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelType,
          projectId,
          limit: 10,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch feedback');
      }

      const data = await response.json();
      const newItems: FeedbackItem[] = (data.items || []).map((item: {
        external_id: string;
        content: string;
        author_name?: string;
        author_id?: string;
        created_at?: string;
        channel: string;
      }) => ({
        id: item.external_id,
        channel: channel,
        status: 'new' as KanbanStatus,
        content: item.content,
        author: item.author_name || 'Unknown',
        priority: 'medium' as const,
        timestamp: item.created_at || new Date().toISOString(),
        tags: [],
      }));

      // Add items to the board
      if (newItems.length > 0) {
        feedbackState.addItems(newItems);
      }

      setLoadedChannels(prev => new Set(prev).add(channel));
      toast.success(
        'Feedback loaded',
        `Loaded ${newItems.length} new item${newItems.length !== 1 ? 's' : ''} from ${channel}`
      );
    } catch (error) {
      toast.error('Load failed', error instanceof Error ? error.message : 'Failed to load feedback');
    } finally {
      setLoadingChannels(prev => {
        const next = new Set(prev);
        next.delete(channel);
        return next;
      });
    }
  }, [loadedChannels, feedbackItems, feedbackState, toast, projectId]);

  // Filters hook
  const filtersState = useFilters(feedbackItems);

  // Swimlanes hook
  const swimlanesState = useSwimlanes(filtersState.filteredItems, viewModeState.groupBy);

  // AI Processing state
  const aiProcessingState = useAIProcessing({
    onSuccess: (results) => {
      const resultMap = new Map(results.map((r) => [r.feedbackId, r]));
      const resultIds = Array.from(resultMap.keys());

      feedbackState.updateItems(resultIds, (item) => {
        const result = resultMap.get(item.id);
        if (!result) return item;
        return {
          ...item,
          status: 'analyzed' as KanbanStatus,
          priority: result.priority || item.priority,
          analysis: {
            bugId: result.jiraTicket?.summary || 'AI-Analysis',
            bugTag: result.classification.toUpperCase() || 'ANALYZED',
            sentiment: item.analysis?.sentiment || 'neutral',
            suggestedPipeline: result.suggestedPipeline || 'manual',
            confidence: result.confidence || 0.8,
            assignedTeam: result.assignedTeam,
            reasoning: result.reasoning,
          },
          customerResponse: result.customerResponse,
        };
      });
      selectionState.deselectAll();
      toast.success(
        'Classification completed',
        `Successfully analyzed ${results.length} feedback item${results.length !== 1 ? 's' : ''}`
      );
    },
    onRequirementSuccess: (results: RequirementAnalysisResult[]) => {
      const resultMap = new Map(results.map((r) => [r.feedbackId, r]));
      const resultIds = Array.from(resultMap.keys());

      feedbackState.updateItems(resultIds, (item) => {
        const result = resultMap.get(item.id);
        if (!result) return item;
        const newStatus = result.analysisOutcome === 'automatic' ? 'automatic' : 'manual';
        return {
          ...item,
          status: newStatus as KanbanStatus,
          analysis: {
            ...item.analysis,
            bugId: result.relatedBugReference || item.analysis?.bugId || 'REQ-Analysis',
            bugTag: result.originalClassification.toUpperCase(),
            sentiment: item.analysis?.sentiment || 'neutral',
            suggestedPipeline: result.analysisOutcome,
            confidence: result.confidence,
            assignedTeam: item.analysis?.assignedTeam,
            reasoning: result.reasoning || item.analysis?.reasoning,
          },
        };
      });
      selectionState.deselectAll();
      const manualCount = results.filter((r) => r.analysisOutcome === 'manual').length;
      const autoCount = results.filter((r) => r.analysisOutcome === 'automatic').length;
      toast.success(
        'Requirement analysis completed',
        `${autoCount} item${autoCount !== 1 ? 's' : ''} ready for automation, ${manualCount} need${manualCount === 1 ? 's' : ''} manual review`
      );
    },
    onError: (error) => {
      console.error('AI Processing error:', error);
      toast.error('Processing failed', error);
    },
  });

  // Reset the view
  const handleResetView = useCallback(() => {
    feedbackState.clear();
    selectionState.deselectAll();
    aiProcessingState.clearResults();
    setLoadedChannels(new Set());
  }, [feedbackState, selectionState, aiProcessingState]);

  // Group filtered items by status
  const filteredItemsByStatus = useMemo(() => {
    const grouped: Record<KanbanStatus, FeedbackItem[]> = {
      new: [],
      analyzed: [],
      manual: [],
      automatic: [],
      done: [],
    };
    filtersState.filteredItems.forEach((item) => {
      grouped[item.status].push(item);
    });
    return grouped;
  }, [filtersState.filteredItems]);

  // Select all items in 'new' column
  const handleSelectAllNew = useCallback(() => {
    const newItemIds = filteredItemsByStatus.new.map((item) => item.id);
    selectionState.selectAll(newItemIds);
  }, [filteredItemsByStatus.new, selectionState]);

  return {
    // State
    dragState,
    selectionState,
    viewModeState,
    feedbackState,
    filtersState,
    swimlanesState,
    aiProcessingState,
    selectedItem,
    setSelectedItem,
    modalOpen,
    setModalOpen,
    feedbackItems,
    filteredItemsByStatus,
    loadedChannels,
    configuredChannels,
    loadingChannels,

    // Handlers
    handleLoadChannelData,
    handleResetView,
    handleSelectAllNew,

    // Utilities
    addEvent,
    createStatusChangeEvent,
    toast,
  };
}
