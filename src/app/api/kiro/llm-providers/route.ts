import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '../../../../lib/llm';

export async function GET(request: NextRequest) {
  try {
    // Check which providers are available based on environment variables
    const availableProviders: Record<string, boolean> = {
      ollama: true, // Always available (local)
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      internal: !!process.env.INTERNAL_API_BASE_URL
    };

    // Test actual availability for configured providers
    const providerStatus: Record<string, { available: boolean; configured: boolean }> = {};
    
    for (const [provider, configured] of Object.entries(availableProviders)) {
      if (configured) {
        try {
          const isAvailable = await llmManager.checkProviderAvailability(provider as any);
          providerStatus[provider] = { available: isAvailable, configured: true };
        } catch (error) {
          providerStatus[provider] = { available: false, configured: true };
        }
      } else {
        providerStatus[provider] = { available: false, configured: false };
      }
    }

    return NextResponse.json({
      success: true,
      providers: providerStatus
    });
  } catch (error) {
    console.error('Error checking LLM providers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check provider availability' },
      { status: 500 }
    );
  }
}