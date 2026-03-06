// Provider configuration check endpoint
// Checks which providers are configured without making actual API calls

import { NextRequest, NextResponse } from 'next/server';
import { SupportedProvider } from '@/lib/llm/types';

export interface ProviderStatus {
  configured: boolean;
  reason: string;
  suggestion: string;
}

function checkApiKey(envVar: string | undefined, envName: string, providerName: string): ProviderStatus {
  if (envVar) {
    return { configured: true, reason: 'api_key_set', suggestion: '' };
  }
  return {
    configured: false,
    reason: 'missing_api_key',
    suggestion: `Set ${envName} in .env`,
  };
}

async function checkOllamaAvailability(): Promise<ProviderStatus> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { configured: true, reason: 'connected', suggestion: '' };
    }
    return {
      configured: false,
      reason: 'server_error',
      suggestion: `Ollama returned HTTP ${response.status}. Check Ollama logs.`,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        configured: false,
        reason: 'connection_timeout',
        suggestion: `Start Ollama on ${ollamaUrl}`,
      };
    }
    return {
      configured: false,
      reason: 'connection_refused',
      suggestion: `Start Ollama on ${ollamaUrl}`,
    };
  }
}

/**
 * GET /api/llm/providers
 * Returns which providers are configured (have API keys or are available locally)
 * Each provider includes { configured, reason, suggestion } for actionable UI feedback
 */
export async function GET(request: NextRequest) {
  try {
    const providers: Record<SupportedProvider, ProviderStatus> = {
      ollama: { configured: false, reason: 'unchecked', suggestion: '' },
      openai: { configured: false, reason: 'unchecked', suggestion: '' },
      anthropic: { configured: false, reason: 'unchecked', suggestion: '' },
      gemini: { configured: false, reason: 'unchecked', suggestion: '' },
      groq: { configured: false, reason: 'unchecked', suggestion: '' },
      internal: { configured: false, reason: 'unchecked', suggestion: '' },
    };

    if (typeof window === 'undefined') {
      providers.openai = checkApiKey(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY', 'OpenAI');
      providers.anthropic = checkApiKey(process.env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY', 'Anthropic');
      providers.gemini = checkApiKey(process.env.GEMINI_API_KEY, 'GEMINI_API_KEY', 'Gemini');
      providers.groq = checkApiKey(process.env.GROQ_API_KEY, 'GROQ_API_KEY', 'Groq');
      providers.ollama = await checkOllamaAvailability();
      providers.internal = checkApiKey(process.env.INTERNAL_API_BASE_URL, 'INTERNAL_API_BASE_URL', 'Internal');
    }

    // Backward-compatible: include both `providers` (new) and `configured` (legacy boolean map)
    const configured: Record<SupportedProvider, boolean> = {} as Record<SupportedProvider, boolean>;
    for (const [key, status] of Object.entries(providers)) {
      configured[key as SupportedProvider] = status.configured;
    }

    return NextResponse.json({
      success: true,
      configured,
      providers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
