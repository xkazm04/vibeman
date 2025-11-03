// Models endpoint for internal LLM API

import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '@/lib/llm';

function createErrorResponse(error: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (provider) {
      const models = await llmManager.getProviderModels(provider as any);

      return NextResponse.json({
        success: true,
        provider,
        models
      });
    } else {
      const allModels = await llmManager.getAllProviderModels();

      return NextResponse.json({
        success: true,
        models: allModels
      });
    }

  } catch (error) {
    return createErrorResponse(error);
  }
}