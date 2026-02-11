/**
 * Message Delivery Engine
 *
 * Handles delivery of persona messages to configured notification channels.
 * Each message gets delivered to all enabled channels on the persona.
 * In-app delivery is always created. External channels (Slack, Telegram, Email)
 * are delivered via their respective APIs.
 */

import { personaRepository, personaMessageDeliveryRepository, personaCredentialRepository } from '@/app/db/repositories/persona.repository';
import { decryptCredential } from './credentialCrypto';
import type { NotificationChannel } from '@/app/db/models/persona.types';

/**
 * Deliver a message to all configured notification channels for a persona.
 * Fire-and-forget pattern — failures are recorded but don't throw.
 */
export async function deliverMessage(messageId: string, personaId: string): Promise<void> {
  try {
    const persona = personaRepository.getById(personaId);
    if (!persona) return;

    // Parse notification channels
    let channels: NotificationChannel[] = [];
    if (persona.notification_channels) {
      try {
        channels = JSON.parse(persona.notification_channels);
      } catch {
        // Invalid JSON — skip external delivery
      }
    }

    // Always create an in-app delivery record (immediately delivered)
    const now = new Date().toISOString();
    personaMessageDeliveryRepository.create({
      message_id: messageId,
      channel_type: 'in_app',
      status: 'delivered',
      delivered_at: now,
    });

    // Deliver to each enabled external channel
    for (const channel of channels) {
      if (!channel.enabled || channel.type === 'in_app') continue;

      try {
        await deliverToChannel(messageId, channel);
      } catch (err) {
        // Record failure but don't block other channels
        personaMessageDeliveryRepository.create({
          message_id: messageId,
          channel_type: channel.type,
          status: 'failed',
          error_message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } catch {
    // Don't let delivery errors propagate
  }
}

/**
 * Deliver a message to a specific external channel.
 */
async function deliverToChannel(messageId: string, channel: NotificationChannel): Promise<void> {
  if (!channel.credential_id) {
    personaMessageDeliveryRepository.create({
      message_id: messageId,
      channel_type: channel.type,
      status: 'failed',
      error_message: 'Credential not configured',
    });
    return;
  }

  // Look up and decrypt credential
  const credential = personaCredentialRepository.getById(channel.credential_id);
  if (!credential) {
    personaMessageDeliveryRepository.create({
      message_id: messageId,
      channel_type: channel.type,
      status: 'failed',
      error_message: 'Credential not found',
    });
    return;
  }

  let credData: Record<string, string>;
  try {
    const decrypted = decryptCredential(credential.encrypted_data, credential.iv);
    credData = JSON.parse(decrypted);
  } catch {
    personaMessageDeliveryRepository.create({
      message_id: messageId,
      channel_type: channel.type,
      status: 'failed',
      error_message: 'Failed to decrypt credential',
    });
    return;
  }

  // Get message content
  const { personaMessageRepository } = await import('@/app/db/repositories/persona.repository');
  const message = personaMessageRepository.getById(messageId);
  if (!message) return;

  const text = message.title
    ? `*${message.title}*\n${message.content}`
    : message.content;

  const now = new Date().toISOString();

  switch (channel.type) {
    case 'slack': {
      const token = credData.bot_token || credData.token;
      const slackChannel = channel.config.channel || '#general';
      if (!token) {
        personaMessageDeliveryRepository.create({
          message_id: messageId,
          channel_type: 'slack',
          status: 'failed',
          error_message: 'No bot_token in credential',
        });
        return;
      }

      try {
        const res = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ channel: slackChannel, text }),
        });
        const data = await res.json();

        if (data.ok) {
          personaMessageDeliveryRepository.create({
            message_id: messageId,
            channel_type: 'slack',
            status: 'delivered',
            external_id: data.ts,
            delivered_at: now,
          });
        } else {
          personaMessageDeliveryRepository.create({
            message_id: messageId,
            channel_type: 'slack',
            status: 'failed',
            error_message: data.error || 'Slack API error',
          });
        }
      } catch (err) {
        personaMessageDeliveryRepository.create({
          message_id: messageId,
          channel_type: 'slack',
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Slack request failed',
        });
      }
      break;
    }

    case 'telegram': {
      const botToken = credData.bot_token || credData.token;
      const chatId = channel.config.chat_id;
      if (!botToken || !chatId) {
        personaMessageDeliveryRepository.create({
          message_id: messageId,
          channel_type: 'telegram',
          status: 'failed',
          error_message: !botToken ? 'No bot_token in credential' : 'No chat_id configured',
        });
        return;
      }

      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
        });
        const data = await res.json();

        if (data.ok) {
          personaMessageDeliveryRepository.create({
            message_id: messageId,
            channel_type: 'telegram',
            status: 'delivered',
            external_id: String(data.result?.message_id || ''),
            delivered_at: now,
          });
        } else {
          personaMessageDeliveryRepository.create({
            message_id: messageId,
            channel_type: 'telegram',
            status: 'failed',
            error_message: data.description || 'Telegram API error',
          });
        }
      } catch (err) {
        personaMessageDeliveryRepository.create({
          message_id: messageId,
          channel_type: 'telegram',
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Telegram request failed',
        });
      }
      break;
    }

    case 'email': {
      // Email delivery not yet implemented — record as failed with explanation
      personaMessageDeliveryRepository.create({
        message_id: messageId,
        channel_type: 'email',
        status: 'failed',
        error_message: 'Email delivery not yet implemented',
      });
      break;
    }

    default: {
      personaMessageDeliveryRepository.create({
        message_id: messageId,
        channel_type: channel.type,
        status: 'failed',
        error_message: `Unknown channel type: ${channel.type}`,
      });
    }
  }
}
