#!/usr/bin/env npx tsx
/**
 * HTTP Request Tool
 *
 * Makes HTTP requests to any URL. No credentials required.
 *
 * Input: {url: string, method?: string, headers?: object, body?: any}
 * Output: {status: number, headers: object, body: any}
 */

import * as fs from 'fs';

interface ToolInput {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

function parseArgs(): { input: ToolInput } {
  const args = process.argv.slice(2);
  let input: ToolInput = { url: '' };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      input = JSON.parse(args[i + 1]);
      i++;
    }
  }

  return { input };
}

function output(result: { success: boolean; data?: unknown; error?: string }): void {
  console.log(JSON.stringify(result));
  process.exit(result.success ? 0 : 1);
}

async function main() {
  try {
    const { input } = parseArgs();

    if (!input.url) {
      output({ success: false, error: 'url is required' });
      return;
    }

    const fetchOptions: RequestInit = {
      method: (input.method || 'GET').toUpperCase(),
      headers: input.headers || {},
    };

    if (input.body && fetchOptions.method !== 'GET') {
      fetchOptions.body = typeof input.body === 'string'
        ? input.body
        : JSON.stringify(input.body);

      if (!input.headers?.['Content-Type'] && !input.headers?.['content-type']) {
        (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(input.url, fetchOptions);

    // Parse response body
    const contentType = response.headers.get('content-type') || '';
    let body: unknown;
    if (contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    // Collect response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    output({
      success: true,
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body,
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
