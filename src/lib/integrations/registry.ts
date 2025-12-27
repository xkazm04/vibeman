/**
 * Integration Registry
 * Provides metadata about available integrations and their configuration schemas
 */

import type {
  IntegrationProvider,
  IntegrationEventType,
  IntegrationRegistryEntry,
} from '@/app/db/models/integration.types';

/**
 * All supported event types
 */
export const ALL_EVENT_TYPES: IntegrationEventType[] = [
  'goal.created',
  'goal.updated',
  'goal.completed',
  'idea.generated',
  'idea.accepted',
  'idea.rejected',
  'idea.implemented',
  'scan.completed',
  'implementation.completed',
  'context.updated',
  'standup.generated',
  'automation.started',
  'automation.completed',
  'automation.failed',
];

/**
 * Event type display names
 */
export const EVENT_TYPE_LABELS: Record<IntegrationEventType, string> = {
  'goal.created': 'Goal Created',
  'goal.updated': 'Goal Updated',
  'goal.completed': 'Goal Completed',
  'idea.generated': 'Idea Generated',
  'idea.accepted': 'Idea Accepted',
  'idea.rejected': 'Idea Rejected',
  'idea.implemented': 'Idea Implemented',
  'scan.completed': 'Scan Completed',
  'implementation.completed': 'Implementation Completed',
  'context.updated': 'Context Updated',
  'standup.generated': 'Standup Generated',
  'automation.started': 'Automation Started',
  'automation.completed': 'Automation Completed',
  'automation.failed': 'Automation Failed',
};

/**
 * Integration registry with metadata for all supported providers
 */
export const INTEGRATION_REGISTRY: Record<IntegrationProvider, IntegrationRegistryEntry> = {
  github: {
    provider: 'github',
    name: 'GitHub',
    description: 'Sync goals and ideas with GitHub issues and pull requests',
    icon: 'github',
    configSchema: {
      type: 'object',
      required: ['owner', 'repo'],
      properties: {
        owner: { type: 'string', title: 'Repository Owner', description: 'GitHub username or organization' },
        repo: { type: 'string', title: 'Repository Name', description: 'Name of the repository' },
        defaultBranch: { type: 'string', title: 'Default Branch', default: 'main' },
        syncIssues: { type: 'boolean', title: 'Sync Issues', default: true },
        syncPRs: { type: 'boolean', title: 'Sync Pull Requests', default: false },
        autoCreateIssues: { type: 'boolean', title: 'Auto-create Issues', default: false },
        autoUpdateIssues: { type: 'boolean', title: 'Auto-update Issues', default: true },
        labelMapping: {
          type: 'object',
          title: 'Label Mapping',
          description: 'Map Vibeman categories to GitHub labels',
          additionalProperties: { type: 'string' },
        },
      },
    },
    credentialsSchema: {
      type: 'object',
      required: ['accessToken'],
      properties: {
        accessToken: { type: 'string', title: 'Personal Access Token', format: 'password' },
        tokenType: {
          type: 'string',
          title: 'Token Type',
          enum: ['personal', 'oauth', 'app'],
          default: 'personal',
        },
      },
    },
    supportedEvents: [
      'goal.created',
      'goal.updated',
      'goal.completed',
      'idea.accepted',
      'idea.implemented',
      'implementation.completed',
    ],
    documentationUrl: 'https://docs.github.com/en/rest',
  },

  gitlab: {
    provider: 'gitlab',
    name: 'GitLab',
    description: 'Sync goals and ideas with GitLab issues and merge requests',
    icon: 'gitlab',
    configSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'string', title: 'Project ID', description: 'GitLab project ID or path' },
        baseUrl: { type: 'string', title: 'GitLab URL', default: 'https://gitlab.com' },
        syncIssues: { type: 'boolean', title: 'Sync Issues', default: true },
        syncMRs: { type: 'boolean', title: 'Sync Merge Requests', default: false },
      },
    },
    credentialsSchema: {
      type: 'object',
      required: ['accessToken'],
      properties: {
        accessToken: { type: 'string', title: 'Personal Access Token', format: 'password' },
      },
    },
    supportedEvents: [
      'goal.created',
      'goal.updated',
      'goal.completed',
      'idea.accepted',
      'idea.implemented',
    ],
    documentationUrl: 'https://docs.gitlab.com/ee/api/',
  },

  slack: {
    provider: 'slack',
    name: 'Slack',
    description: 'Send notifications to Slack channels',
    icon: 'slack',
    configSchema: {
      type: 'object',
      required: ['channel'],
      properties: {
        channel: { type: 'string', title: 'Channel', description: 'Channel ID or name (e.g., #general)' },
        username: { type: 'string', title: 'Bot Username', default: 'Vibeman' },
        iconEmoji: { type: 'string', title: 'Bot Icon Emoji', default: ':robot_face:' },
        threadMode: { type: 'boolean', title: 'Group in Threads', default: false },
      },
    },
    credentialsSchema: {
      type: 'object',
      properties: {
        webhookUrl: { type: 'string', title: 'Webhook URL', format: 'uri' },
        botToken: { type: 'string', title: 'Bot Token', format: 'password' },
      },
    },
    supportedEvents: ALL_EVENT_TYPES,
    documentationUrl: 'https://api.slack.com/messaging/webhooks',
  },

  discord: {
    provider: 'discord',
    name: 'Discord',
    description: 'Send notifications to Discord channels',
    icon: 'discord',
    configSchema: {
      type: 'object',
      required: [],
      properties: {
        channelId: { type: 'string', title: 'Channel ID', description: 'Discord channel ID (optional for webhooks)' },
        username: { type: 'string', title: 'Bot Username', default: 'Vibeman' },
        avatarUrl: { type: 'string', title: 'Avatar URL', format: 'uri' },
        embedMode: { type: 'boolean', title: 'Use Rich Embeds', default: true },
      },
    },
    credentialsSchema: {
      type: 'object',
      required: ['webhookUrl'],
      properties: {
        webhookUrl: { type: 'string', title: 'Webhook URL', format: 'uri' },
      },
    },
    supportedEvents: ALL_EVENT_TYPES,
    documentationUrl: 'https://discord.com/developers/docs/resources/webhook',
  },

  webhook: {
    provider: 'webhook',
    name: 'Custom Webhook',
    description: 'Send events to any HTTP endpoint',
    icon: 'webhook',
    configSchema: {
      type: 'object',
      properties: {
        payloadFormat: {
          type: 'string',
          title: 'Payload Format',
          enum: ['json', 'form'],
          default: 'json',
        },
        includeMetadata: { type: 'boolean', title: 'Include Metadata', default: true },
        customFields: {
          type: 'object',
          title: 'Custom Fields',
          description: 'Additional fields to include in payload',
          additionalProperties: { type: 'string' },
        },
      },
    },
    credentialsSchema: {
      type: 'object',
      properties: {
        // Webhook URL and headers are stored in the webhooks table
      },
    },
    supportedEvents: ALL_EVENT_TYPES,
  },

  jira: {
    provider: 'jira',
    name: 'Jira',
    description: 'Sync goals with Jira issues',
    icon: 'jira',
    configSchema: {
      type: 'object',
      required: ['baseUrl', 'projectKey'],
      properties: {
        baseUrl: { type: 'string', title: 'Jira URL', description: 'Your Jira instance URL' },
        projectKey: { type: 'string', title: 'Project Key', description: 'Jira project key (e.g., PROJ)' },
        issueType: { type: 'string', title: 'Default Issue Type', default: 'Task' },
        statusMapping: {
          type: 'object',
          title: 'Status Mapping',
          description: 'Map Vibeman statuses to Jira statuses',
          additionalProperties: { type: 'string' },
        },
      },
    },
    credentialsSchema: {
      type: 'object',
      required: ['email', 'apiToken'],
      properties: {
        email: { type: 'string', title: 'Email', format: 'email' },
        apiToken: { type: 'string', title: 'API Token', format: 'password' },
      },
    },
    supportedEvents: [
      'goal.created',
      'goal.updated',
      'goal.completed',
      'idea.accepted',
    ],
    documentationUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
  },

  linear: {
    provider: 'linear',
    name: 'Linear',
    description: 'Sync goals with Linear issues',
    icon: 'linear',
    configSchema: {
      type: 'object',
      required: ['teamId'],
      properties: {
        teamId: { type: 'string', title: 'Team ID', description: 'Linear team ID' },
        projectId: { type: 'string', title: 'Project ID', description: 'Optional project to add issues to' },
        labelIds: {
          type: 'array',
          title: 'Labels',
          items: { type: 'string' },
          description: 'Label IDs to apply to issues',
        },
      },
    },
    credentialsSchema: {
      type: 'object',
      required: ['apiKey'],
      properties: {
        apiKey: { type: 'string', title: 'API Key', format: 'password' },
      },
    },
    supportedEvents: [
      'goal.created',
      'goal.updated',
      'goal.completed',
      'idea.accepted',
    ],
    documentationUrl: 'https://developers.linear.app/docs',
  },

  notion: {
    provider: 'notion',
    name: 'Notion',
    description: 'Sync goals and documentation with Notion',
    icon: 'notion',
    configSchema: {
      type: 'object',
      required: ['databaseId'],
      properties: {
        databaseId: { type: 'string', title: 'Database ID', description: 'Notion database ID' },
        pageId: { type: 'string', title: 'Page ID', description: 'Optional parent page for new pages' },
        propertyMapping: {
          type: 'object',
          title: 'Property Mapping',
          description: 'Map Vibeman fields to Notion properties',
          additionalProperties: { type: 'string' },
        },
      },
    },
    credentialsSchema: {
      type: 'object',
      required: ['accessToken'],
      properties: {
        accessToken: { type: 'string', title: 'Integration Token', format: 'password' },
      },
    },
    supportedEvents: [
      'goal.created',
      'goal.updated',
      'goal.completed',
      'implementation.completed',
      'standup.generated',
    ],
    documentationUrl: 'https://developers.notion.com/',
  },
};

/**
 * Get integration registry entry by provider
 */
export function getIntegrationInfo(provider: IntegrationProvider): IntegrationRegistryEntry {
  return INTEGRATION_REGISTRY[provider];
}

/**
 * Get all available integrations
 */
export function getAllIntegrations(): IntegrationRegistryEntry[] {
  return Object.values(INTEGRATION_REGISTRY);
}

/**
 * Check if an event type is supported by a provider
 */
export function isEventSupported(provider: IntegrationProvider, eventType: IntegrationEventType): boolean {
  return INTEGRATION_REGISTRY[provider].supportedEvents.includes(eventType);
}
