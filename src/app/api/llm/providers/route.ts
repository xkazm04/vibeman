// Provider configuration check endpoint
// Checks which providers are configured without making actual API calls

import { NextRequest, NextResponse } from 'next/server';
import { SupportedProvider } from '@/lib/llm/types';

function checkApiKeyConfigured(envVar?: string): boolean {
  return !!envVar;
}

async function checkOllamaAvailability(): Promise<boolean> {
  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

function createSuccessResponse(configured: Record<SupportedProvider, boolean>) {
  return NextResponse.json({
    success: true,
    configured,
    timestamp: new Date().toISOString()
  });
}

function createErrorResponse(error: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  );
}

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
      groq: false,
      internal: false
    };

    if (typeof window === 'undefined') {
      configured.openai = checkApiKeyConfigured(process.env.OPENAI_API_KEY);
      configured.anthropic = checkApiKeyConfigured(process.env.ANTHROPIC_API_KEY);
      configured.gemini = checkApiKeyConfigured(process.env.GEMINI_API_KEY);
      configured.groq = checkApiKeyConfigured(process.env.GROQ_API_KEY);
      configured.ollama = await checkOllamaAvailability();
      configured.internal = checkApiKeyConfigured(process.env.INTERNAL_API_BASE_URL);
    }

    return createSuccessResponse(configured);

  } catch (error) {
    return createErrorResponse(error);
  }
}
