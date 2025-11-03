import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '../../../../lib/llm';

function getConfiguredProviders(): Record<string, boolean> {
  return {
    ollama: true,
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    internal: !!process.env.INTERNAL_API_BASE_URL
  };
}

async function checkProviderStatus(provider: string, configured: boolean) {
  if (!configured) {
    return { available: false, configured: false };
  }

  try {
    const isAvailable = await llmManager.checkProviderAvailability(provider as any);
    return { available: isAvailable, configured: true };
  } catch (error) {
    return { available: false, configured: true };
  }
}

export async function GET(request: NextRequest) {
  try {
    const availableProviders = getConfiguredProviders();
    const providerStatus: Record<string, { available: boolean; configured: boolean }> = {};

    for (const [provider, configured] of Object.entries(availableProviders)) {
      providerStatus[provider] = await checkProviderStatus(provider, configured);
    }

    return NextResponse.json({
      success: true,
      providers: providerStatus
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to check provider availability' },
      { status: 500 }
    );
  }
}