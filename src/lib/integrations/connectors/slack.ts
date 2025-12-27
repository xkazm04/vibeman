/**
 * Slack Integration Connector
 * Handles Slack webhook and API interactions for notifications
 */

import type {
  IntegrationConnector,
  IntegrationEventPayload,
  SlackConfig,
  SlackCredentials,
} from '@/app/db/models/integration.types';

/**
 * Event type to emoji mapping
 */
const EVENT_EMOJIS: Record<string, string> = {
  'goal.created': ':dart:',
  'goal.updated': ':pencil2:',
  'goal.completed': ':white_check_mark:',
  'idea.generated': ':bulb:',
  'idea.accepted': ':thumbsup:',
  'idea.rejected': ':thumbsdown:',
  'idea.implemented': ':rocket:',
  'scan.completed': ':mag:',
  'implementation.completed': ':hammer_and_wrench:',
  'context.updated': ':file_folder:',
  'standup.generated': ':clipboard:',
  'automation.started': ':robot_face:',
  'automation.completed': ':tada:',
  'automation.failed': ':x:',
};

/**
 * Event type to color mapping for attachments
 */
const EVENT_COLORS: Record<string, string> = {
  'goal.created': '#36a64f',
  'goal.updated': '#2196f3',
  'goal.completed': '#4caf50',
  'idea.generated': '#ff9800',
  'idea.accepted': '#4caf50',
  'idea.rejected': '#f44336',
  'idea.implemented': '#9c27b0',
  'scan.completed': '#2196f3',
  'implementation.completed': '#9c27b0',
  'context.updated': '#607d8b',
  'standup.generated': '#00bcd4',
  'automation.started': '#673ab7',
  'automation.completed': '#4caf50',
  'automation.failed': '#f44336',
};

/**
 * Format event as Slack message blocks
 */
function formatSlackMessage(
  payload: IntegrationEventPayload,
  config: SlackConfig
): {
  text: string;
  blocks: unknown[];
  attachments?: unknown[];
} {
  const { eventType, data, timestamp, projectName } = payload;
  const emoji = EVENT_EMOJIS[eventType] || ':bell:';
  const color = EVENT_COLORS[eventType] || '#808080';

  const title = (data.title as string) || eventType.replace('.', ' ').toUpperCase();
  const description = (data.description as string) || '';

  // Build blocks
  const blocks: unknown[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${title}`,
        emoji: true,
      },
    },
  ];

  // Add context
  const contextElements: unknown[] = [
    {
      type: 'mrkdwn',
      text: `*Event:* ${eventType}`,
    },
    {
      type: 'mrkdwn',
      text: `*Time:* ${new Date(timestamp).toLocaleString()}`,
    },
  ];

  if (projectName) {
    contextElements.push({
      type: 'mrkdwn',
      text: `*Project:* ${projectName}`,
    });
  }

  blocks.push({
    type: 'context',
    elements: contextElements,
  });

  // Add description if present
  if (description) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: description,
      },
    });
  }

  // Add data fields
  const fields: unknown[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'title' && key !== 'description' && value !== null && value !== undefined) {
      if (typeof value !== 'object') {
        fields.push({
          type: 'mrkdwn',
          text: `*${key}:* ${value}`,
        });
      }
    }
  }

  if (fields.length > 0) {
    // Slack limits fields to 10 per section
    for (let i = 0; i < fields.length; i += 10) {
      blocks.push({
        type: 'section',
        fields: fields.slice(i, i + 10),
      });
    }
  }

  // Add divider
  blocks.push({ type: 'divider' });

  // Add footer
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: '_Sent by Vibeman_',
      },
    ],
  });

  return {
    text: `${emoji} ${title} - ${eventType}`,
    blocks,
    attachments: [
      {
        color,
        fallback: `${title} - ${eventType}`,
      },
    ],
  };
}

/**
 * Slack Connector implementation
 */
export const SlackConnector: IntegrationConnector = {
  provider: 'slack',

  async validate(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    const slackCreds = credentials as SlackCredentials;

    if (!slackCreds.webhookUrl && !slackCreds.botToken) {
      return { valid: false, error: 'Either webhook URL or bot token is required' };
    }

    if (slackCreds.webhookUrl && !slackCreds.webhookUrl.startsWith('https://hooks.slack.com/')) {
      return { valid: false, error: 'Invalid Slack webhook URL' };
    }

    return { valid: true };
  },

  async testConnection(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> {
    const slackConfig = config as unknown as SlackConfig;
    const slackCreds = credentials as unknown as SlackCredentials;

    // Validate first
    const validation = await this.validate(config, credentials);
    if (!validation.valid) {
      return { success: false, message: validation.error || 'Invalid configuration' };
    }

    // Test with a simple message
    try {
      const testPayload = {
        text: 'Vibeman integration test',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: ':white_check_mark: *Vibeman Integration Connected!*\nThis is a test message to verify the integration is working correctly.',
            },
          },
        ],
      };

      if (slackCreds.webhookUrl) {
        const response = await fetch(slackCreds.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return { success: false, message: `Slack API error: ${errorText}` };
        }

        return { success: true, message: `Connected to Slack channel${slackConfig.channel ? ` #${slackConfig.channel}` : ''}` };
      }

      // TODO: Implement bot token test
      return { success: false, message: 'Bot token authentication not yet implemented' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to Slack',
      };
    }
  },

  async sendEvent(
    event: IntegrationEventPayload,
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; response?: unknown; error?: string }> {
    const slackConfig = config as unknown as SlackConfig;
    const slackCreds = credentials as unknown as SlackCredentials;

    // Validate
    const validation = await this.validate(config, credentials);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const message = formatSlackMessage(event, slackConfig);

      // Add optional fields
      if (slackConfig.username) {
        (message as Record<string, unknown>).username = slackConfig.username;
      }
      if (slackConfig.iconEmoji) {
        (message as Record<string, unknown>).icon_emoji = slackConfig.iconEmoji;
      }
      if (slackConfig.channel) {
        (message as Record<string, unknown>).channel = slackConfig.channel;
      }

      if (slackCreds.webhookUrl) {
        const response = await fetch(slackCreds.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return { success: false, error: `Slack API error: ${errorText}` };
        }

        return { success: true, response: { sent: true } };
      }

      // TODO: Implement bot token sending
      return { success: false, error: 'Bot token authentication not yet implemented' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send to Slack',
      };
    }
  },
};
