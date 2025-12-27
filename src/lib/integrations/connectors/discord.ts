/**
 * Discord Integration Connector
 * Handles Discord webhook interactions for notifications
 */

import type {
  IntegrationConnector,
  IntegrationEventPayload,
  DiscordConfig,
  DiscordCredentials,
} from '@/app/db/models/integration.types';

/**
 * Event type to color mapping (Discord uses decimal colors)
 */
const EVENT_COLORS: Record<string, number> = {
  'goal.created': 0x36a64f,     // Green
  'goal.updated': 0x2196f3,     // Blue
  'goal.completed': 0x4caf50,   // Green
  'idea.generated': 0xff9800,   // Orange
  'idea.accepted': 0x4caf50,    // Green
  'idea.rejected': 0xf44336,    // Red
  'idea.implemented': 0x9c27b0, // Purple
  'scan.completed': 0x2196f3,   // Blue
  'implementation.completed': 0x9c27b0, // Purple
  'context.updated': 0x607d8b,  // Gray
  'standup.generated': 0x00bcd4, // Cyan
  'automation.started': 0x673ab7, // Deep Purple
  'automation.completed': 0x4caf50, // Green
  'automation.failed': 0xf44336, // Red
};

/**
 * Event type to emoji mapping
 */
const EVENT_EMOJIS: Record<string, string> = {
  'goal.created': '🎯',
  'goal.updated': '✏️',
  'goal.completed': '✅',
  'idea.generated': '💡',
  'idea.accepted': '👍',
  'idea.rejected': '👎',
  'idea.implemented': '🚀',
  'scan.completed': '🔍',
  'implementation.completed': '🛠️',
  'context.updated': '📁',
  'standup.generated': '📋',
  'automation.started': '🤖',
  'automation.completed': '🎉',
  'automation.failed': '❌',
};

/**
 * Format event as Discord embed
 */
function formatDiscordEmbed(payload: IntegrationEventPayload): {
  embeds: unknown[];
} {
  const { eventType, data, timestamp, projectName } = payload;
  const color = EVENT_COLORS[eventType] || 0x808080;
  const emoji = EVENT_EMOJIS[eventType] || '🔔';

  const title = (data.title as string) || `${emoji} ${eventType.replace('.', ' ').toUpperCase()}`;
  const description = (data.description as string) || '';

  // Build fields
  const fields: { name: string; value: string; inline?: boolean }[] = [];

  // Add event type
  fields.push({
    name: 'Event',
    value: eventType,
    inline: true,
  });

  // Add project if available
  if (projectName) {
    fields.push({
      name: 'Project',
      value: projectName,
      inline: true,
    });
  }

  // Add data fields (limit to prevent embed size issues)
  let fieldCount = 0;
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'title' && key !== 'description' && value !== null && value !== undefined && fieldCount < 10) {
      if (typeof value !== 'object') {
        fields.push({
          name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
          value: String(value).slice(0, 1024), // Discord field value limit
          inline: true,
        });
        fieldCount++;
      }
    }
  }

  const embed = {
    title: `${emoji} ${title}`.slice(0, 256), // Discord title limit
    description: description.slice(0, 4096), // Discord description limit
    color,
    fields,
    timestamp,
    footer: {
      text: 'Vibeman',
    },
  };

  return { embeds: [embed] };
}

/**
 * Format event as simple Discord message
 */
function formatDiscordMessage(payload: IntegrationEventPayload): { content: string } {
  const { eventType, data, projectName } = payload;
  const emoji = EVENT_EMOJIS[eventType] || '🔔';
  const title = (data.title as string) || eventType.replace('.', ' ').toUpperCase();
  const description = (data.description as string) || '';

  let content = `${emoji} **${title}**`;
  if (projectName) {
    content += ` | Project: ${projectName}`;
  }
  content += `\nEvent: \`${eventType}\``;
  if (description) {
    content += `\n${description.slice(0, 1500)}`; // Limit description length
  }
  content += '\n\n_Sent by Vibeman_';

  return { content: content.slice(0, 2000) }; // Discord message limit
}

/**
 * Discord Connector implementation
 */
export const DiscordConnector: IntegrationConnector = {
  provider: 'discord',

  async validate(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    const discordCreds = credentials as unknown as DiscordCredentials;

    if (!discordCreds.webhookUrl) {
      return { valid: false, error: 'Webhook URL is required' };
    }

    if (!discordCreds.webhookUrl.includes('discord.com/api/webhooks/')) {
      return { valid: false, error: 'Invalid Discord webhook URL' };
    }

    return { valid: true };
  },

  async testConnection(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> {
    const discordConfig = config as unknown as DiscordConfig;
    const discordCreds = credentials as unknown as DiscordCredentials;

    // Validate first
    const validation = await this.validate(config, credentials);
    if (!validation.valid) {
      return { success: false, message: validation.error || 'Invalid configuration' };
    }

    try {
      // Build test message
      const payload: Record<string, unknown> = {
        content: '✅ **Vibeman Integration Connected!**\nThis is a test message to verify the integration is working correctly.',
      };

      if (discordConfig.username) {
        payload.username = discordConfig.username;
      }
      if (discordConfig.avatarUrl) {
        payload.avatar_url = discordConfig.avatarUrl;
      }

      const response = await fetch(discordCreds.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, message: `Discord API error: ${errorText}` };
      }

      return { success: true, message: 'Connected to Discord webhook' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to Discord',
      };
    }
  },

  async sendEvent(
    event: IntegrationEventPayload,
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; response?: unknown; error?: string }> {
    const discordConfig = config as unknown as DiscordConfig;
    const discordCreds = credentials as unknown as DiscordCredentials;

    // Validate
    const validation = await this.validate(config, credentials);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Format message based on embed mode
      const payload: Record<string, unknown> = discordConfig.embedMode !== false
        ? formatDiscordEmbed(event)
        : formatDiscordMessage(event);

      // Add optional fields
      if (discordConfig.username) {
        payload.username = discordConfig.username;
      }
      if (discordConfig.avatarUrl) {
        payload.avatar_url = discordConfig.avatarUrl;
      }

      const response = await fetch(discordCreds.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Discord API error: ${errorText}` };
      }

      return { success: true, response: { sent: true } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send to Discord',
      };
    }
  },
};
