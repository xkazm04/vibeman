// Models endpoint for internal LLM API

import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '@/lib/llm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (provider) {
      // Get models for specific provider
      const models = await llmManager.getProviderModels(provider as any);
      
      return NextResponse.json({
        success: true,
        provider,
        models
      });
    } else {
      // Get models for all providers
      const allModels = await llmManager.getAllProviderModels();
      
      return NextResponse.json({
        success: true,
        models: allModels
      });
    }

  } catch (error) {
    console.error('Models API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}