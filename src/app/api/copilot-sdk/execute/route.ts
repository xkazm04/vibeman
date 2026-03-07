/**
 * Copilot SDK Execute API Route
 *
 * POST: Start a new Copilot SDK execution (with optional session resume)
 * GET: Get execution status
 * DELETE: Abort an ongoing execution
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  startCopilotExecution,
  getCopilotExecution,
  abortCopilotExecution,
  getCachedSessionId,
} from '@/lib/copilot-sdk/client';

interface ExecuteRequestBody {
  projectPath: string;
  prompt: string;
  model?: string;
  apiKey?: string;
  /** Resume a specific session by ID */
  resumeSessionId?: string;
}

/**
 * POST: Start a new Copilot SDK execution
 *
 * If `resumeSessionId` is provided, the execution will resume that session,
 * preserving conversation history. If not provided but a cached session
 * exists for the project path, it will be auto-resumed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExecuteRequestBody;
    const { projectPath, prompt, model, apiKey, resumeSessionId } = body;

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

    // Auto-resume: use cached session for this project if no explicit ID
    const effectiveResumeId = resumeSessionId || getCachedSessionId(projectPath);

    const executionId = startCopilotExecution(
      projectPath,
      prompt,
      model,
      apiKey,
      effectiveResumeId
    );

    return NextResponse.json({
      success: true,
      executionId,
      streamUrl: `/api/copilot-sdk/stream?executionId=${executionId}`,
      resumed: !!effectiveResumeId,
    });
  } catch (error) {
    console.error('Copilot SDK execute error:', error);
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

    const execution = getCopilotExecution(executionId);
    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    const aborted = await abortCopilotExecution(executionId);

    return NextResponse.json({
      success: aborted,
      message: aborted ? 'Execution aborted' : 'Failed to abort execution',
    });
  } catch (error) {
    console.error('Copilot SDK abort error:', error);
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

    const execution = getCopilotExecution(executionId);
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
        model: execution.model,
        status: execution.status,
        sessionId: execution.sessionId,
        resumed: execution.resumed,
        startTime: execution.startTime,
        endTime: execution.endTime,
        eventCount: execution.events.length,
      },
    });
  } catch (error) {
    console.error('Copilot SDK status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get execution status' },
      { status: 500 }
    );
  }
}
