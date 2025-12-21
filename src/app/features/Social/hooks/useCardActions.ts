import type { FeedbackItem, KanbanStatus } from '../lib/types/feedbackTypes';
import type { FeedbackAnalysisResult } from '../lib/types/aiTypes';
import type { UseFeedbackItemsResult } from './useFeedbackItems';

interface ToastType {
  success?: (title: string, message: string) => void;
  error?: (title: string, message: string) => void;
  info: (title: string, message: string) => void;
}

export function handleAnalyzeAction(
  item: FeedbackItem,
  feedbackState: UseFeedbackItemsResult,
  addEvent: (event: any) => void,
  trackStatusChange: (from: KanbanStatus, to: KanbanStatus) => void
) {
  const analysisData = {
    bugId: `BUG_${Date.now()}`,
    bugTag: 'Auto-detected',
    sentiment: 'neutral' as const,
    suggestedPipeline: 'automatic' as const,
    confidence: 0.85,
  };

  feedbackState.updateItem(item.id, (fb) => ({
    ...fb,
    status: 'analyzed' as KanbanStatus,
    analysis: analysisData,
  }));
  trackStatusChange(item.status, 'analyzed');
  addEvent({ feedbackId: item.id, type: 'analyzed', actor: 'ai', metadata: { confidence: 0.85 } });
}

export function handleAssignManualAction(
  item: FeedbackItem,
  originalItem: FeedbackItem,
  feedbackState: UseFeedbackItemsResult,
  trackStatusChange: (from: KanbanStatus, to: KanbanStatus) => void,
  performOptimisticUpdate: <T>(
    updateFn: () => T,
    asyncOperation?: () => Promise<void>,
    rollbackFn?: () => void,
    successMessage?: { title: string; description: string }
  ) => Promise<void>
) {
  feedbackState.updateItemStatus(item.id, 'manual');
  trackStatusChange(item.status, 'manual');

  performOptimisticUpdate(
    () => {},
    async () => {},
    () => {
      feedbackState.updateItemStatus(item.id, originalItem.status);
    }
  );
}

export function handleAssignAutoAction(
  item: FeedbackItem,
  originalItem: FeedbackItem,
  feedbackState: UseFeedbackItemsResult,
  trackStatusChange: (from: KanbanStatus, to: KanbanStatus) => void,
  performOptimisticUpdate: <T>(
    updateFn: () => T,
    asyncOperation?: () => Promise<void>,
    rollbackFn?: () => void,
    successMessage?: { title: string; description: string }
  ) => Promise<void>,
  aiResult?: FeedbackAnalysisResult
) {
  feedbackState.updateItemStatus(item.id, 'automatic');
  trackStatusChange(item.status, 'automatic');

  performOptimisticUpdate(
    () => {},
    async () => {
      // Push to GitHub Projects Backlog
      await addToGitHubProjects(item, aiResult);
    },
    () => {
      feedbackState.updateItemStatus(item.id, originalItem.status);
    },
    { title: 'Added to automation', description: 'Item pushed to GitHub Projects backlog' }
  );
}

// Helper to add item to GitHub Projects
async function addToGitHubProjects(
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
      console.log('[GitHub Projects] Item added to backlog');
    }
  } catch (error) {
    console.error('[GitHub Projects] Error:', error);
  }
}

export function handleMarkDoneAction(
  item: FeedbackItem,
  originalItem: FeedbackItem,
  feedbackState: UseFeedbackItemsResult,
  addEvent: (event: any) => void,
  trackStatusChange: (from: KanbanStatus, to: KanbanStatus) => void,
  performOptimisticUpdate: <T>(
    updateFn: () => T,
    asyncOperation?: () => Promise<void>,
    rollbackFn?: () => void,
    successMessage?: { title: string; description: string }
  ) => Promise<void>
) {
  const resolvedAt = new Date().toISOString();
  const resolvedBy = item.status === 'automatic' ? 'ai' as const : 'human' as const;

  feedbackState.updateItem(item.id, (fb) => ({
    ...fb,
    status: 'done' as KanbanStatus,
    resolvedAt,
    resolvedBy,
  }));
  trackStatusChange(item.status, 'done');
  addEvent({ feedbackId: item.id, type: 'resolved', actor: item.status === 'automatic' ? 'ai' : 'user', metadata: {} });

  performOptimisticUpdate(
    () => {},
    async () => {},
    () => {
      feedbackState.updateItem(item.id, (fb) => ({
        ...fb,
        status: originalItem.status,
        resolvedAt: undefined,
        resolvedBy: undefined,
      }));
    },
    { title: 'Feedback resolved', description: 'Item marked as done' }
  );
}

export function handleReopenAction(
  item: FeedbackItem,
  originalItem: FeedbackItem,
  feedbackState: UseFeedbackItemsResult,
  addEvent: (event: any) => void,
  performOptimisticUpdate: <T>(
    updateFn: () => T,
    asyncOperation?: () => Promise<void>,
    rollbackFn?: () => void,
    successMessage?: { title: string; description: string }
  ) => Promise<void>
) {
  feedbackState.updateItem(item.id, (fb) => ({
    ...fb,
    status: 'analyzed' as KanbanStatus,
    resolvedAt: undefined,
    resolvedBy: undefined,
  }));
  addEvent({ feedbackId: item.id, type: 'reopened', actor: 'user', metadata: {} });

  performOptimisticUpdate(
    () => {},
    async () => {},
    () => {
      feedbackState.updateItem(item.id, (fb) => ({
        ...fb,
        status: originalItem.status,
        resolvedAt: originalItem.resolvedAt,
        resolvedBy: originalItem.resolvedBy,
      }));
    }
  );
}

export function handleCopyLinkAction(item: FeedbackItem, toast: ToastType) {
  navigator.clipboard.writeText(`https://app.example.com/feedback/${item.id}`);
  toast.info('Link copied', 'Feedback link copied to clipboard');
}
