#!/usr/bin/env npx tsx
/**
 * Gmail Mark Read Tool
 *
 * Marks one or more Gmail messages as read by removing the UNREAD label.
 *
 * Input: {messageIds: string[]}
 * Output: {markedCount: number, messageIds: string[]}
 * Credentials: {client_id, client_secret, refresh_token}
 */

import * as fs from 'fs';

interface ToolInput {
  messageIds: string[];
}

interface GmailCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

function parseArgs(): { input: ToolInput; credentials?: GmailCredentials } {
  const args = process.argv.slice(2);
  let input: ToolInput = { messageIds: [] };
  let credentials: GmailCredentials | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      input = JSON.parse(args[i + 1]);
      i++;
    } else if (args[i] === '--credentials' && args[i + 1]) {
      const credData = fs.readFileSync(args[i + 1], 'utf-8');
      credentials = JSON.parse(credData);
      i++;
    }
  }

  return { input, credentials };
}

function output(result: { success: boolean; data?: unknown; error?: string }): void {
  console.log(JSON.stringify(result));
  process.exit(result.success ? 0 : 1);
}

async function main() {
  try {
    const { input, credentials } = parseArgs();

    if (!credentials) {
      output({ success: false, error: 'Gmail credentials required (client_id, client_secret, refresh_token)' });
      return;
    }

    if (!input.messageIds || input.messageIds.length === 0) {
      output({ success: false, error: 'messageIds array is required and must not be empty' });
      return;
    }

    const { google } = await import('googleapis');

    const oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
    );
    oauth2Client.setCredentials({ refresh_token: credentials.refresh_token });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Use batchModify for efficiency when multiple messages
    if (input.messageIds.length > 1) {
      await gmail.users.messages.batchModify({
        userId: 'me',
        requestBody: {
          ids: input.messageIds,
          removeLabelIds: ['UNREAD'],
        },
      });
    } else {
      // Single message - use modify directly
      await gmail.users.messages.modify({
        userId: 'me',
        id: input.messageIds[0],
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
    }

    output({
      success: true,
      data: { markedCount: input.messageIds.length, messageIds: input.messageIds },
    });
  } catch (error) {
    output({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

main();
