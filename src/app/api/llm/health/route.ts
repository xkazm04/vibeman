// Health check endpoint for internal LLM API

import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '@/lib/llm';

export async function GET(request: NextRequest) {
  try {
    // Check availability of all providers
    const availability = await llmManager.checkAllProvidersAvailability();
    
    // Get enabled providers
    const enabledProviders = llmManager.getEnabledProviders();
    
    // Check if at least one provider is available and enabled
    const hasAvailableProvider = enabledProviders.some(provider => availability[provider]);

    return NextResponse.json({
      success: true,
      status: hasAvailableProvider ? 'healthy' : 'degraded',
      providers: availability,
      enabledProviders,
      defaultProvider: llmManager.getDefaultProvider(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check error:', error);
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
}