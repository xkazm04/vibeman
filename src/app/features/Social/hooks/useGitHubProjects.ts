import { useCallback, useState } from 'react';
import type { FeedbackItem } from '../lib/types/feedbackTypes';
import type { FeedbackAnalysisResult } from '../lib/types/aiTypes';

interface UseGitHubProjectsResult {
  addToBacklog: (item: FeedbackItem, aiResult?: FeedbackAnalysisResult) => Promise<boolean>;
  isAdding: boolean;
  error: string | null;
}

/**
 * Hook to integrate feedback items with GitHub Projects
 * Adds items to the project's Backlog column when they move to "automatic" status
 */
export function useGitHubProjects(): UseGitHubProjectsResult {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addToBacklog = useCallback(async (
    item: FeedbackItem,
    aiResult?: FeedbackAnalysisResult
  ): Promise<boolean> => {
    setIsAdding(true);
    setError(null);

    try {
      // Build title from AI result or item content
      const title = aiResult?.title || item.content.body.substring(0, 80);

      // Build body with context
      const bodyParts: string[] = [];

      if (aiResult?.reasoning) {
        bodyParts.push(`## Summary\n${aiResult.reasoning}`);
      } else {
        bodyParts.push(`## Original Feedback\n${item.content.body}`);
      }

      if (aiResult?.classification) {
        bodyParts.push(`**Type:** ${aiResult.classification}`);
      }

      if (item.analysis?.sentiment) {
        bodyParts.push(`**Sentiment:** ${item.analysis.sentiment}`);
      }

      if (aiResult?.assignedTeam) {
        bodyParts.push(`**Team:** ${aiResult.assignedTeam}`);
      }

      if (item.channel) {
        bodyParts.push(`**Source:** ${item.channel}`);
      }

      if (item.priority) {
        bodyParts.push(`**Priority:** ${item.priority}`);
      }

      const body = bodyParts.join('\n\n');

      const response = await fetch('/api/social/github/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackId: item.id,
          title,
          body,
          priority: item.priority,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add to GitHub Projects');
      }

      const result = await response.json();
      console.log('[GitHub Projects] Added to backlog:', result);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[GitHub Projects] Error:', message);
      setError(message);
      return false;
    } finally {
      setIsAdding(false);
    }
  }, []);

  return { addToBacklog, isAdding, error };
}
