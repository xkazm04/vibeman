import { useCallback } from 'react';
import type { FeedbackItem } from '../lib/types/feedbackTypes';
import type { UIFeedbackItem, FeedbackAnalysisResult } from '../lib/types/aiTypes';

interface UseKanbanAIProcessingProps {
  feedbackItems: FeedbackItem[];
  selectedIds: Set<string>;
  aiResults: Map<string, FeedbackAnalysisResult>;
  processFeedback: (items: UIFeedbackItem[]) => Promise<any>;
  processRequirements: (items: UIFeedbackItem[]) => Promise<any>;
  toast: {
    error: (title: string, message: string) => void;
    info: (title: string, message: string) => void;
  };
}

export function useKanbanAIProcessing({
  feedbackItems,
  selectedIds,
  aiResults,
  processFeedback,
  processRequirements,
  toast,
}: UseKanbanAIProcessingProps) {
  // Transform FeedbackItem to UIFeedbackItem for the API
  const transformToUIItem = useCallback((item: FeedbackItem): UIFeedbackItem => ({
    id: item.id,
    channel: item.channel,
    timestamp: item.timestamp,
    author: item.author,
    content: item.content,
    conversation: item.conversation,
    rating: item.rating,
    bugReference: item.analysis?.bugId || '',
    sentiment: item.analysis?.sentiment || 'neutral',
    priority: item.priority,
    tags: item.tags,
    engagement: item.engagement,
    aiResult: aiResults.get(item.id),
  }), [aiResults]);

  const handleProcessSelected = useCallback(async () => {
    const selectedItems = feedbackItems.filter((item) => selectedIds.has(item.id));
    if (selectedItems.length === 0) return;

    const itemsInNew = selectedItems.filter((item) => item.status === 'new');
    const itemsInAnalyzed = selectedItems.filter((item) => item.status === 'analyzed');

    if (itemsInNew.length > 0 && itemsInAnalyzed.length > 0) {
      toast.error(
        'Mixed selection',
        'Please select items from only one column (New or Analyzed) for processing'
      );
      return;
    }

    if (itemsInNew.length > 0) {
      // Stage 1: Classification (New -> Analyzed)
      const uiFeedbackItems = itemsInNew.map(transformToUIItem);
      await processFeedback(uiFeedbackItems);
    } else if (itemsInAnalyzed.length > 0) {
      // Stage 2: Requirement Analysis (Analyzed -> Manual/Automatic)
      const uiFeedbackItems = itemsInAnalyzed.map(transformToUIItem);
      await processRequirements(uiFeedbackItems);
    } else {
      toast.info(
        'Nothing to process',
        'Selected items have already been processed. Select items from New or Analyzed columns.'
      );
    }
  }, [feedbackItems, selectedIds, transformToUIItem, processFeedback, processRequirements, toast]);

  return {
    handleProcessSelected,
  };
}
