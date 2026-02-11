#!/usr/bin/env npx tsx
/**
 * Persona Tool Template
 *
 * All persona tools follow this pattern:
 * - Accept --input <json> and optionally --credentials <filepath>
 * - Output JSON to stdout: {success: boolean, data?: any, error?: string}
 * - Exit code 0 = success, non-zero = failure
 *
 * Usage: npx tsx persona-tools/<category>/<tool>.ts --input '{"key":"value"}'
 */

import * as fs from 'fs';

interface ToolInput {
  // Define your input schema here
  [key: string]: unknown;
}

interface ToolOutput {
  success: boolean;
  data?: unknown;
  error?: string;
}

function parseArgs(): { input: ToolInput; credentials?: Record<string, string> } {
  const args = process.argv.slice(2);
  let input: ToolInput = {};
  let credentials: Record<string, string> | undefined;

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

function output(result: ToolOutput): void {
  console.log(JSON.stringify(result));
  process.exit(result.success ? 0 : 1);
}

async function main() {
  try {
    const { input, credentials } = parseArgs();

    // TODO: Implement tool logic here
    // Use `input` for tool parameters
    // Use `credentials` for authentication tokens

    output({
      success: true,
      data: { message: 'Tool executed successfully', input },
    });
  } catch (error) {
    output({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

main();
