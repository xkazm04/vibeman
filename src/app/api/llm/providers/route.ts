// Provider configuration check endpoint
// Checks which providers are configured without making actual API calls

import { NextRequest, NextResponse } from 'next/server';
import { SupportedProvider } from '@/lib/llm/types';

/**
 * GET /api/llm/providers
 * Returns which providers are configured (have API keys or are available locally)
 * This is a fast check that doesn't make actual API calls
 */
export async function GET(request: NextRequest) {
  try {
    const configured: Record<SupportedProvider, boolean> = {
      ollama: false,
      openai: false,
      anthropic: false,
      gemini: false,
      internal: false
    };

    // Check if we're on server side (API keys are only available server-side)
    if (typeof window === 'undefined') {
      // OpenAI - check if API key is configured
      configured.openai = !!process.env.OPENAI_API_KEY;

      // Anthropic - check if API key is configured
      configured.anthropic = !!process.env.ANTHROPIC_API_KEY;

      // Gemini - check if API key is configured
      configured.gemini = !!process.env.GEMINI_API_KEY;

      // Ollama - check if it's available (try to connect)
      try {
        const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        const response = await fetch(`${ollamaUrl}/api/tags`, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        configured.ollama = response.ok;
      } catch (error) {
        console.log('[Provider Check] Ollama is not available');
        configured.ollama = false;
      }

      // Internal - check if base URL is configured
      configured.internal = !!process.env.INTERNAL_API_BASE_URL;
    }

    return NextResponse.json({
      success: true,
      configured,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Provider check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
