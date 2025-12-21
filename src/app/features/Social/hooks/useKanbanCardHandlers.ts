import { useCallback } from 'react';
import type { FeedbackItem, KanbanStatus } from '../lib/types/feedbackTypes';
import type { FeedbackAnalysisResult, RequirementAnalysisResult } from '../lib/types/aiTypes';
import type { UseFeedbackItemsResult } from './useFeedbackItems';
import {
  handleAnalyzeAction,
  handleAssignManualAction,
  handleAssignAutoAction,
  handleMarkDoneAction,
  handleReopenAction,
  handleCopyLinkAction,
} from './useCardActions';
import { handleCreateGithubIssue } from './useGitHubIntegration';

interface ToastType {
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
  info: (title: string, message: string) => void;
}

interface UseKanbanCardHandlersProps {
  feedbackState: UseFeedbackItemsResult;
  aiResults: Map<string, FeedbackAnalysisResult>;
  requirementResults?: Map<string, RequirementAnalysisResult>;
  toast: ToastType;
  addEvent: (event: any) => void;
  setSelectedItem: (item: FeedbackItem | null) => void;
  setModalOpen: (open: boolean) => void;
  createStatusChangeEvent: (feedbackId: string, from: KanbanStatus, to: KanbanStatus) => any;
}

export function useKanbanCardHandlers({
  feedbackState,
  aiResults,
  requirementResults,
  toast,
  addEvent,
  setSelectedItem,
  setModalOpen,
  createStatusChangeEvent,
}: UseKanbanCardHandlersProps) {
  // Track status change events
  const trackStatusChange = useCallback(
    (from: KanbanStatus, to: KanbanStatus) => {
      // Status changes are tracked via events
    },
    []
  );

  // Optimistic update helper
  const performOptimisticUpdate = useCallback(
    async <T>(
      updateFn: () => T,
      asyncOperation?: () => Promise<void>,
      rollbackFn?: () => void,
      successMessage?: { title: string; description: string }
    ) => {
      try {
        updateFn();
        if (asyncOperation) {
          await asyncOperation();
        }
        if (successMessage) {
          toast.success(successMessage.title, successMessage.description);
        }
      } catch (error) {
        if (rollbackFn) {
          rollbackFn();
        }
        toast.error('Action failed', error instanceof Error ? error.message : 'Unknown error');
      }
    },
    [toast]
  );

  // Card click handler - opens modal
  const handleCardClick = useCallback(
    (item: FeedbackItem) => {
      setSelectedItem(item);
      setModalOpen(true);
    },
    [setSelectedItem, setModalOpen]
  );

  // Card right-click handler - toggles selection
  const handleCardRightClick = useCallback(
    (item: FeedbackItem, e: React.MouseEvent, toggleSelection: (id: string) => void) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSelection(item.id);
    },
    []
  );

  // Card action handler
  const handleCardAction = useCallback(
    async (action: string, item: FeedbackItem) => {
      const originalItem = { ...item };

      switch (action) {
        case 'view':
          setSelectedItem(item);
          setModalOpen(true);
          break;

        case 'analyze':
          handleAnalyzeAction(item, feedbackState, addEvent, trackStatusChange);
          break;

        case 'assign-manual':
          handleAssignManualAction(
            item,
            originalItem,
            feedbackState,
            trackStatusChange,
            performOptimisticUpdate
          );
          break;

        case 'assign-auto':
          handleAssignAutoAction(
            item,
            originalItem,
            feedbackState,
            trackStatusChange,
            performOptimisticUpdate,
            aiResults.get(item.id)
          );
          break;

        case 'mark-done':
          handleMarkDoneAction(
            item,
            originalItem,
            feedbackState,
            addEvent,
            trackStatusChange,
            performOptimisticUpdate
          );
          break;

        case 'reopen':
          handleReopenAction(
            item,
            originalItem,
            feedbackState,
            addEvent,
            performOptimisticUpdate
          );
          break;

        case 'create-github':
          await handleCreateGithubIssue(
            item,
            aiResults,
            requirementResults,
            feedbackState,
            addEvent,
            toast
          );
          break;

        case 'copy-link':
          handleCopyLinkAction(item, toast);
          break;
      }
    },
    [
      feedbackState,
      aiResults,
      requirementResults,
      toast,
      addEvent,
      setSelectedItem,
      setModalOpen,
      trackStatusChange,
      performOptimisticUpdate,
    ]
  );

  return {
    handleCardClick,
    handleCardRightClick,
    handleCardAction,
  };
}
