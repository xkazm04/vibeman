import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '@/lib/llm/llm-manager';
import { SupportedProvider } from '@/lib/llm/types';

export const dynamic = 'force-dynamic';

interface LLMRequestBody {
  provider: SupportedProvider;
  model?: string;
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: LLMRequestBody = await request.json();
    
    const {
      provider = 'ollama',
      model,
      message,
      conversationHistory = [],
      systemPrompt = 'You are a helpful AI assistant.',
      temperature = 0.7,
      maxTokens = 150
    } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'No message provided' },
        { status: 400 }
      );
    }

    // Build conversation context
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Create prompt from messages
    const prompt = messages
      .map(msg => {
        if (msg.role === 'system') return `System: ${msg.content}`;
        if (msg.role === 'user') return `User: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        return '';
      })
      .filter(Boolean)
      .join('\n\n');

    // Use LLM Manager to generate response
    const response = await llmManager.generate({
      prompt,
      provider,
      model,
      temperature,
      maxTokens,
      systemPrompt
    });

    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          error: response.error || 'LLM generation failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      response: response.response,
      model: response.model,
      provider: response.provider
    });

  } catch (error) {
    console.error('LLM API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}
