/**
 * GitHub Integration Connector
 * Handles GitHub API interactions for issues and pull requests
 */

import type {
  IntegrationConnector,
  IntegrationEventPayload,
  GitHubConfig,
  GitHubCredentials,
} from '@/app/db/models/integration.types';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Map Vibeman event types to GitHub issue labels
 */
function getLabelsForEvent(eventType: string, labelMapping?: Record<string, string>): string[] {
  const defaultLabels: Record<string, string[]> = {
    'goal.created': ['vibeman', 'goal'],
    'goal.completed': ['vibeman', 'goal', 'completed'],
    'idea.accepted': ['vibeman', 'idea', 'accepted'],
    'idea.implemented': ['vibeman', 'idea', 'implemented'],
    'implementation.completed': ['vibeman', 'implementation'],
  };

  const labels = defaultLabels[eventType] || ['vibeman'];

  // Apply custom label mapping
  if (labelMapping) {
    return labels.map((label) => labelMapping[label] || label);
  }

  return labels;
}

/**
 * Format event data as GitHub issue body
 */
function formatIssueBody(payload: IntegrationEventPayload): string {
  const { eventType, data, timestamp, metadata } = payload;

  const sections: string[] = [
    `## Event: ${eventType}`,
    `**Timestamp:** ${new Date(timestamp).toLocaleString()}`,
  ];

  if (metadata?.source) {
    sections.push(`**Source:** ${metadata.source}`);
  }

  sections.push('', '---', '');

  // Add data fields
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object') {
        sections.push(`### ${key}`);
        sections.push('```json');
        sections.push(JSON.stringify(value, null, 2));
        sections.push('```');
      } else {
        sections.push(`**${key}:** ${value}`);
      }
    }
  }

  sections.push('', '---', '_Sent by Vibeman Integration_');

  return sections.join('\n');
}

/**
 * Make authenticated GitHub API request
 */
async function githubRequest(
  method: string,
  endpoint: string,
  credentials: GitHubCredentials,
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${credentials.accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Vibeman-Integration',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `GitHub API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        // Keep default error message
      }
      return { success: false, error: errorMessage };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * GitHub Connector implementation
 */
export const GitHubConnector: IntegrationConnector = {
  provider: 'github',

  async validate(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    const githubConfig = config as unknown as GitHubConfig;
    const githubCreds = credentials as unknown as GitHubCredentials;

    if (!githubConfig.owner) {
      return { valid: false, error: 'Repository owner is required' };
    }
    if (!githubConfig.repo) {
      return { valid: false, error: 'Repository name is required' };
    }
    if (!githubCreds.accessToken) {
      return { valid: false, error: 'Access token is required' };
    }

    return { valid: true };
  },

  async testConnection(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> {
    const githubConfig = config as unknown as GitHubConfig;
    const githubCreds = credentials as unknown as GitHubCredentials;

    // Validate first
    const validation = await this.validate(config, credentials);
    if (!validation.valid) {
      return { success: false, message: validation.error || 'Invalid configuration' };
    }

    // Test by getting repository info
    const result = await githubRequest(
      'GET',
      `/repos/${githubConfig.owner}/${githubConfig.repo}`,
      githubCreds
    );

    if (!result.success) {
      return { success: false, message: result.error || 'Failed to connect to GitHub' };
    }

    const repo = result.data as { full_name: string; private: boolean };
    return {
      success: true,
      message: `Connected to ${repo.full_name} (${repo.private ? 'private' : 'public'})`,
    };
  },

  async sendEvent(
    event: IntegrationEventPayload,
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; response?: unknown; error?: string }> {
    const githubConfig = config as unknown as GitHubConfig;
    const githubCreds = credentials as unknown as GitHubCredentials;

    // Validate
    const validation = await this.validate(config, credentials);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { eventType, data } = event;

    // Determine action based on event type
    switch (eventType) {
      case 'goal.created':
      case 'idea.accepted':
        if (githubConfig.autoCreateIssues) {
          return createIssue(githubConfig, githubCreds, event);
        }
        break;

      case 'goal.updated':
      case 'goal.completed':
      case 'idea.implemented':
        if (githubConfig.autoUpdateIssues && data.githubIssueNumber) {
          return updateIssue(
            githubConfig,
            githubCreds,
            data.githubIssueNumber as number,
            event
          );
        }
        break;

      case 'implementation.completed':
        // Create a comment on related issue if exists
        if (data.githubIssueNumber) {
          return addIssueComment(
            githubConfig,
            githubCreds,
            data.githubIssueNumber as number,
            event
          );
        }
        break;
    }

    // Default: just log the event (no action needed)
    return {
      success: true,
      response: { message: 'Event received but no action configured' },
    };
  },
};

/**
 * Create a new GitHub issue
 */
async function createIssue(
  config: GitHubConfig,
  credentials: GitHubCredentials,
  event: IntegrationEventPayload
): Promise<{ success: boolean; response?: unknown; error?: string }> {
  const { data } = event;

  const title = (data.title as string) || `[Vibeman] ${event.eventType}`;
  const body = formatIssueBody(event);
  const labels = getLabelsForEvent(event.eventType, config.labelMapping);

  const result = await githubRequest(
    'POST',
    `/repos/${config.owner}/${config.repo}/issues`,
    credentials,
    { title, body, labels }
  );

  if (result.success) {
    const issue = result.data as { number: number; html_url: string };
    return {
      success: true,
      response: { issueNumber: issue.number, url: issue.html_url },
    };
  }

  return { success: false, error: result.error };
}

/**
 * Update an existing GitHub issue
 */
async function updateIssue(
  config: GitHubConfig,
  credentials: GitHubCredentials,
  issueNumber: number,
  event: IntegrationEventPayload
): Promise<{ success: boolean; response?: unknown; error?: string }> {
  const updates: Record<string, unknown> = {};

  // Update state if goal/idea completed
  if (event.eventType === 'goal.completed' || event.eventType === 'idea.implemented') {
    updates.state = 'closed';
    updates.state_reason = 'completed';
  }

  // Add labels
  const labels = getLabelsForEvent(event.eventType, config.labelMapping);
  if (labels.length > 0) {
    updates.labels = labels;
  }

  if (Object.keys(updates).length === 0) {
    return { success: true, response: { message: 'No updates needed' } };
  }

  const result = await githubRequest(
    'PATCH',
    `/repos/${config.owner}/${config.repo}/issues/${issueNumber}`,
    credentials,
    updates
  );

  if (result.success) {
    return {
      success: true,
      response: { issueNumber, updated: true },
    };
  }

  return { success: false, error: result.error };
}

/**
 * Add a comment to a GitHub issue
 */
async function addIssueComment(
  config: GitHubConfig,
  credentials: GitHubCredentials,
  issueNumber: number,
  event: IntegrationEventPayload
): Promise<{ success: boolean; response?: unknown; error?: string }> {
  const body = formatIssueBody(event);

  const result = await githubRequest(
    'POST',
    `/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments`,
    credentials,
    { body }
  );

  if (result.success) {
    const comment = result.data as { id: number };
    return {
      success: true,
      response: { issueNumber, commentId: comment.id },
    };
  }

  return { success: false, error: result.error };
}
