import { useCallback } from 'react';
import type { FeedbackItem, KanbanStatus } from '../lib/types/feedbackTypes';
import type { FeedbackAnalysisResult } from '../lib/types/aiTypes';
import { KANBAN_COLUMNS } from '../lib/config/columnConfig';
import type { UseFeedbackItemsResult } from './useFeedbackItems';

interface UseKanbanDragHandlersProps {
  draggingItem: FeedbackItem | null;
  feedbackState: UseFeedbackItemsResult;
  handleCardDragEnd: () => void;
  aiResults?: Map<string, FeedbackAnalysisResult>;
}

interface DropCheckResult {
  allowed: boolean;
  reason?: string;
}

// Helper to push item to GitHub Projects when moved to automatic
async function pushToGitHubProjects(
  item: FeedbackItem,
  aiResult?: FeedbackAnalysisResult
): Promise<void> {
  try {
    const title = aiResult?.title || item.content.body.substring(0, 80);

    const bodyParts: string[] = [];
    if (aiResult?.reasoning) {
      bodyParts.push(`## Summary\n${aiResult.reasoning}`);
    } else {
      bodyParts.push(`## Original Feedback\n${item.content.body}`);
    }
    if (aiResult?.classification) bodyParts.push(`**Type:** ${aiResult.classification}`);
    if (item.analysis?.sentiment) bodyParts.push(`**Sentiment:** ${item.analysis.sentiment}`);
    if (aiResult?.assignedTeam) bodyParts.push(`**Team:** ${aiResult.assignedTeam}`);
    if (item.channel) bodyParts.push(`**Source:** ${item.channel}`);
    if (item.priority) bodyParts.push(`**Priority:** ${item.priority}`);

    const response = await fetch('/api/social/github/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackId: item.id,
        title,
        body: bodyParts.join('\n\n'),
        priority: item.priority,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      console.error('[GitHub Projects] Failed to add item:', data.error);
    } else {
      console.log('[GitHub Projects] Item added to backlog via drag-drop');
    }
  } catch (error) {
    console.error('[GitHub Projects] Error:', error);
  }
}

export function useKanbanDragHandlers({
  draggingItem,
  feedbackState,
  handleCardDragEnd,
  aiResults,
}: UseKanbanDragHandlersProps) {
  const canDrop = useCallback(
    (sourceColumn: KanbanStatus, targetColumn: KanbanStatus): DropCheckResult => {
      const targetConfig = KANBAN_COLUMNS.find((c) => c.id === targetColumn);
      const sourceConfig = KANBAN_COLUMNS.find((c) => c.id === sourceColumn);
      if (!targetConfig) return { allowed: false, reason: 'Invalid column' };

      if (sourceColumn === targetColumn) {
        return { allowed: false, reason: 'Already in this column' };
      }

      if (!targetConfig.acceptsFrom.includes(sourceColumn)) {
        if (sourceColumn === 'new' && targetColumn !== 'analyzed') {
          return { allowed: false, reason: 'Must be analyzed first' };
        }
        if (sourceColumn === 'analyzed' && targetColumn === 'done') {
          return { allowed: false, reason: 'Cannot skip processing stage' };
        }
        if (sourceColumn === 'analyzed' && targetColumn === 'new') {
          return { allowed: false, reason: 'Cannot move back to New' };
        }
        if ((sourceColumn === 'manual' || sourceColumn === 'automatic') && targetColumn !== 'done') {
          return { allowed: false, reason: 'Can only move to Done' };
        }
        if (sourceColumn === 'done') {
          return { allowed: false, reason: 'Resolved items cannot be moved' };
        }
        return { allowed: false, reason: `Cannot move from ${sourceConfig?.title || sourceColumn} here` };
      }

      const currentCount = feedbackState.getCountByStatus(targetColumn);
      if (targetConfig.maxItems && currentCount >= targetConfig.maxItems) {
        return { allowed: false, reason: `${targetConfig.title} queue is full (${targetConfig.maxItems} max)` };
      }

      return { allowed: true };
    },
    [feedbackState]
  );

  const handleDrop = useCallback(
    (targetColumn: KanbanStatus) => (e: React.DragEvent) => {
      e.preventDefault();

      if (!draggingItem) return;

      const sourceColumn = draggingItem.status;
      const dropCheck = canDrop(sourceColumn, targetColumn);

      if (!dropCheck.allowed) {
        console.log('Drop not allowed:', dropCheck.reason);
        handleCardDragEnd();
        return;
      }

      feedbackState.updateItemStatus(draggingItem.id, targetColumn);

      // Push to GitHub Projects when moving to automatic column
      if (targetColumn === 'automatic') {
        const aiResult = aiResults?.get(draggingItem.id);
        pushToGitHubProjects(draggingItem, aiResult);
      }

      handleCardDragEnd();
    },
    [draggingItem, canDrop, handleCardDragEnd, feedbackState, aiResults]
  );

  return {
    canDrop,
    handleDrop,
  };
}
