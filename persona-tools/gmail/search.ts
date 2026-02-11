#!/usr/bin/env npx tsx
/**
 * Gmail Search Tool
 *
 * Searches Gmail using Gmail search syntax.
 *
 * Input: {query: string, maxResults?: number}
 * Output: {emails: [{id, from, to, subject, snippet, date, labels}]}
 * Credentials: {client_id, client_secret, refresh_token}
 */

import * as fs from 'fs';

interface ToolInput {
  query: string;
  maxResults?: number;
}

interface GmailCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

function parseArgs(): { input: ToolInput; credentials?: GmailCredentials } {
  const args = process.argv.slice(2);
  let input: ToolInput = { query: '' };
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

    if (!input.query) {
      output({ success: false, error: 'query is required' });
      return;
    }

    const { google } = await import('googleapis');

    const oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
    );
    oauth2Client.setCredentials({ refresh_token: credentials.refresh_token });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Search messages
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: input.query,
      maxResults: input.maxResults || 10,
    });

    const messageIds = listRes.data.messages || [];

    // Fetch metadata for each message (lighter than full content)
    const emails = [];
    for (const msg of messageIds) {
      if (!msg.id) continue;

      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = msgRes.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      emails.push({
        id: msg.id,
        threadId: msgRes.data.threadId,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        snippet: msgRes.data.snippet,
        labels: msgRes.data.labelIds || [],
      });
    }

    output({
      success: true,
      data: { emails, totalResults: listRes.data.resultSizeEstimate },
    });
  } catch (error) {
    output({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

main();
