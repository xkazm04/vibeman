// Health check endpoint for internal LLM API

import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '@/lib/llm';

interface HealthData {
  success: boolean;
  providers: Record<string, boolean>;
  enabledProviders: string[];
  defaultProvider: string;
}

function createHealthResponse(status: string, data: HealthData) {
  return NextResponse.json({
    ...data,
    status,
    timestamp: new Date().toISOString()
  });
}

function createErrorResponse(error: unknown) {
  return NextResponse.json(
    {
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const availability = await llmManager.checkAllProvidersAvailability();
    const enabledProviders = llmManager.getEnabledProviders();
    const hasAvailableProvider = enabledProviders.some(provider => availability[provider]);

    return createHealthResponse(
      hasAvailableProvider ? 'healthy' : 'degraded',
      {
        success: true,
        providers: availability,
        enabledProviders,
        defaultProvider: llmManager.getDefaultProvider()
      }
    );

  } catch (error) {
    return createErrorResponse(error);
  }
}