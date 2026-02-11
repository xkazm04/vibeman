#!/usr/bin/env npx tsx
/**
 * Gmail Send Tool
 *
 * Sends an email via Gmail using OAuth2 credentials.
 *
 * Input: {to: string, subject: string, body: string, threadId?: string}
 * Output: {messageId: string, threadId: string}
 * Credentials: {client_id, client_secret, refresh_token}
 */

import * as fs from 'fs';

interface ToolInput {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
}

interface GmailCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

function parseArgs(): { input: ToolInput; credentials?: GmailCredentials } {
  const args = process.argv.slice(2);
  let input: ToolInput = { to: '', subject: '', body: '' };
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

    if (!input.to || !input.subject || !input.body) {
      output({ success: false, error: 'to, subject, and body are required' });
      return;
    }

    const { google } = await import('googleapis');

    const oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
    );
    oauth2Client.setCredentials({ refresh_token: credentials.refresh_token });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Build RFC 2822 email
    const emailLines = [
      `To: ${input.to}`,
      `Subject: ${input.subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      input.body,
    ];
    const rawEmail = Buffer.from(emailLines.join('\r\n')).toString('base64url');

    const sendParams: Record<string, unknown> = {
      userId: 'me',
      requestBody: {
        raw: rawEmail,
        ...(input.threadId ? { threadId: input.threadId } : {}),
      },
    };

    const res = await gmail.users.messages.send(sendParams as Parameters<typeof gmail.users.messages.send>[0]);

    output({
      success: true,
      data: {
        messageId: res.data.id,
        threadId: res.data.threadId,
      },
    });
  } catch (error) {
    output({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

main();
