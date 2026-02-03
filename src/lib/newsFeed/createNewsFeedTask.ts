/**
 * News Feed Task Creator
 *
 * Creates a QueuedTask for news feed discovery.
 * Fetches the prompt from res API and returns a task ready for CLI execution.
 */

import type { QueuedTask } from '@/components/cli/types';

const RES_API_BASE = 'http://localhost:3001';

export interface NewsFeedTaskConfig {
  /** Time period for news discovery (e.g., "last 24 hours", "yesterday") */
  period: string;
}

interface PromptResponse {
  prompt: string;
  config: {
    period: string;
    sources: string[];
    date: string;
  };
}

/**
 * Fetch the news feed discovery prompt from res API
 */
async function fetchNewsFeedPrompt(period: string): Promise<PromptResponse> {
  const response = await fetch(`${RES_API_BASE}/api/topics/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Failed to fetch prompt: ${error.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Create a QueuedTask for news feed discovery
 *
 * @param config - Task configuration with period
 * @returns QueuedTask ready for CLI session execution
 */
export async function createNewsFeedTask(config: NewsFeedTaskConfig): Promise<QueuedTask> {
  const { period } = config;

  // Fetch prompt from res API
  const { prompt, config: promptConfig } = await fetchNewsFeedPrompt(period);

  // Create task with directPrompt (bypasses requirement file)
  const task: QueuedTask = {
    id: `news-feed-${Date.now()}`,
    projectId: 'res',
    projectPath: 'C:\\Users\\mkdol\\dolla\\res',
    projectName: 'Research Explorer',
    requirementName: `News Feed Discovery (${period})`,
    status: 'pending',
    addedAt: Date.now(),
    directPrompt: prompt,
  };

  return task;
}

/**
 * Period options for the UI dropdown
 */
export const PERIOD_OPTIONS = [
  { value: 'last 24 hours', label: 'Last 24 Hours' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last 3 days', label: 'Last 3 Days' },
  { value: 'this week', label: 'This Week' },
] as const;

export type PeriodOption = (typeof PERIOD_OPTIONS)[number]['value'];
