/**
 * Copilot SDK Models API Route
 *
 * GET: List available models from the Copilot SDK at runtime.
 */

import { NextResponse } from 'next/server';
import { CopilotClient } from '@github/copilot-sdk';
import { join } from 'path';
import { existsSync } from 'fs';

/** Resolve the bundled CLI path to avoid Turbopack import.meta.resolve breakage */
function resolveCopilotCliPath(): string | undefined {
  const cliPath = join(process.cwd(), 'node_modules', '@github', 'copilot', 'index.js');
  if (existsSync(cliPath)) return cliPath;
  return undefined;
}

/**
 * GET: Query available models from the Copilot SDK
 */
export async function GET() {
  let client: CopilotClient | undefined;

  try {
    const options: Record<string, unknown> = {};
    const cliPath = resolveCopilotCliPath();
    if (cliPath) options.cliPath = cliPath;

    client = new CopilotClient(options);
    await client.start();

    const models = await client.listModels();

    return NextResponse.json({
      success: true,
      models: models.map((m) => ({
        id: m.id,
        name: m.name,
        capabilities: m.capabilities,
        billing: m.billing,
        policy: m.policy,
      })),
    });
  } catch (error) {
    console.error('Copilot SDK models error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to list models',
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.stop().catch(() => {});
    }
  }
}
