import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'gpt-oss:20b';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = DEFAULT_MODEL } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Call Ollama API
    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      })
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { 
          success: false, 
          error: `Ollama API error (${ollamaResponse.status}): ${errorText}` 
        },
        { status: ollamaResponse.status }
      );
    }

    const result = await ollamaResponse.json();
    
    return NextResponse.json({
      success: true,
      response: result.response,
      model: result.model,
      created_at: result.created_at,
      done: result.done,
      total_duration: result.total_duration,
      load_duration: result.load_duration,
      prompt_eval_count: result.prompt_eval_count,
      prompt_eval_duration: result.prompt_eval_duration,
      eval_count: result.eval_count,
      eval_duration: result.eval_duration
    });
  } catch (error) {
    console.error('Context generation API error:', error);
    
    // Check if it's a connection error to Ollama
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unable to connect to Ollama. Please ensure Ollama is running on localhost:11434' 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}