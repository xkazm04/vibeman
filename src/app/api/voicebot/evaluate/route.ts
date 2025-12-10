import { NextRequest, NextResponse } from 'next/server';
import { OllamaClient } from '@/lib/llm/providers/ollama-client';

export const dynamic = 'force-dynamic';

/**
 * Evaluate conversation quality using Ollama
 * Uses ministral-3:14b model for evaluation
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'No evaluation prompt provided' },
        { status: 400 }
      );
    }

    // Initialize Ollama client with fixed model
    const ollamaClient = new OllamaClient({
      baseUrl: 'http://localhost:11434',
      defaultModel: 'ministral-3:14b'
    });

    // Check if Ollama is available
    const isAvailable = await ollamaClient.checkAvailability();
    if (!isAvailable) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ollama is not available. Please ensure Ollama is running at http://localhost:11434' 
        },
        { status: 503 }
      );
    }

    // Generate evaluation
    const response = await ollamaClient.generate({
      prompt,
      model: 'ministral-3:14b',
      stream: false,
      taskType: 'conversation-evaluation',
      taskDescription: 'Evaluate voicebot conversation quality'
    });

    if (!response.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: response.error || 'Evaluation failed' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      evaluation: response.response,
      model: response.model,
      usage: response.usage
    });

  } catch (error) {
    console.error('Evaluation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}
