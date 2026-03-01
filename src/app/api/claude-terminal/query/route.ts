/**
 * Claude Terminal Query API Route (CLI-based)
 *
 * POST: Start a new CLI execution with prompt
 * DELETE: Abort an ongoing execution
 * GET: Get execution status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  startExecution,
  abortExecution,
  getExecution,
} from '@/lib/claude-terminal/cli-service';
import type { CLIProvider, CLIModel } from '@/lib/claude-terminal/types';

interface QueryRequestBody {
  projectPath: string;
  prompt: string;
  resumeSessionId?: string;
  provider?: CLIProvider;
  model?: CLIModel;
  /** Extra environment variables for the CLI process (e.g., VIBEMAN_PROJECT_ID, VIBEMAN_TASK_ID) */
  extraEnv?: Record<string, string>;
}

/**
 * Pre-flight check for Ollama cloud model auth.
 * Returns null if OK, or an error object with signin_url if auth fails.
 */
async function checkOllamaCloudAuth(model: string): Promise<{ error: string; signinUrl?: string } | null> {
  if (!model.includes('cloud')) return null; // Only check cloud models

  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ping' }], stream: false }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      return {
        error: `Ollama cloud not authenticated. Run "ollama signin" in your terminal to sign in.`,
        signinUrl: data.signin_url,
      };
    }
    // Any other response (including success) means auth is fine — abort the actual generation
    return null;
  } catch {
    return { error: 'Ollama is not running. Start it with "ollama serve".' };
  }
}

/**
 * POST: Start a new CLI execution
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QueryRequestBody;
    const { projectPath, prompt, resumeSessionId, provider, model, extraEnv } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Pre-flight: verify Ollama cloud auth before spawning a CLI process
    if (provider === 'ollama') {
      const authCheck = await checkOllamaCloudAuth(model || 'qwen3.5:cloud');
      if (authCheck) {
        return NextResponse.json(
          { error: authCheck.error, signinUrl: authCheck.signinUrl },
          { status: 401 }
        );
      }
    }

    // Start CLI execution with provider-specific configuration
    const executionId = startExecution(
      projectPath,
      prompt,
      resumeSessionId,
      undefined,
      provider ? { provider, model: model || undefined } : undefined,
      extraEnv
    );

    // Return execution ID and stream URL
    return NextResponse.json({
      success: true,
      executionId,
      streamUrl: `/api/claude-terminal/stream?executionId=${executionId}`,
    });
  } catch (error) {
    console.error('Claude Terminal query error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start execution' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Abort an ongoing execution
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json(
        { error: 'Execution ID is required' },
        { status: 400 }
      );
    }

    const execution = getExecution(executionId);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    const aborted = abortExecution(executionId);

    return NextResponse.json({
      success: aborted,
      message: aborted ? 'Execution aborted' : 'Failed to abort execution',
    });
  } catch (error) {
    console.error('Claude Terminal abort error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to abort execution' },
      { status: 500 }
    );
  }
}

/**
 * GET: Get execution status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
      return NextResponse.json(
        { error: 'Execution ID is required' },
        { status: 400 }
      );
    }

    const execution = getExecution(executionId);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      execution: {
        id: execution.id,
        projectPath: execution.projectPath,
        status: execution.status,
        sessionId: execution.sessionId,
        startTime: execution.startTime,
        endTime: execution.endTime,
        eventCount: execution.events.length,
        logFilePath: execution.logFilePath,
      },
    });
  } catch (error) {
    console.error('Claude Terminal status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get execution status' },
      { status: 500 }
    );
  }
}
