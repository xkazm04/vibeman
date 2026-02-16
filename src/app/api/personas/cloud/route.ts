import { NextResponse } from 'next/server';
import { cloudClient, isCloudMode, isCloudConfigured } from '@/lib/personas/cloudClient';

/**
 * GET /api/personas/cloud
 * Returns cloud orchestrator connection status.
 */
export async function GET() {
  const configured = isCloudConfigured();
  const executionMode = isCloudMode() ? 'cloud' : 'local';

  if (!configured) {
    return NextResponse.json({
      configured: false,
      connected: false,
      executionMode,
      workers: null,
      hasToken: false,
    });
  }

  try {
    const status = await cloudClient.getStatus();
    return NextResponse.json({
      configured: true,
      connected: true,
      executionMode,
      workers: status.workers,
      hasToken: status.hasClaudeToken,
      oauth: status.oauth,
    });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      connected: false,
      executionMode,
      workers: null,
      hasToken: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    });
  }
}
