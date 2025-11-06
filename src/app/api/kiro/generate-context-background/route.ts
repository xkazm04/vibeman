import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { eventDb, contextDb } from '@/app/db';
import { ollamaClient } from '@/lib/ollama';

interface ContextGenerationRequest {
  contextId: string;
  contextName: string;
  filePaths: string[];
  projectPath: string;
  projectId: string;
}

function generateEventId(): string {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createErrorResponse(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

function validateRequest(body: Partial<ContextGenerationRequest>) {
  const { contextId, contextName, filePaths, projectPath, projectId } = body;

  if (!contextId || !contextName || !filePaths || !projectPath || !projectId) {
    return createErrorResponse(
      'Context ID, name, file paths, project path, and project ID are required',
      400
    );
  }

  return null;
}

async function logStartEvent(projectId: string, contextName: string, fileCount: number): Promise<string> {
  const startEventId = generateEventId();
  await eventDb.createEvent({
    id: startEventId,
    project_id: projectId,
    title: 'Context File Generation Started',
    description: `Started generating context file for "${contextName}" in background`,
    type: 'info',
    agent: 'system',
    message: `Processing ${fileCount} files`
  });
  return startEventId;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationError = validateRequest(body);
    if (validationError) return validationError;

    const { contextId, contextName, filePaths, projectPath, projectId } = body;

    const startEventId = await logStartEvent(projectId, contextName, filePaths.length);

    processContextFileGeneration({
      contextId,
      contextName,
      filePaths,
      projectPath,
      projectId
    }).catch(() => {
      // Error handling done in processContextFileGeneration
    });

    return NextResponse.json({
      success: true,
      message: 'Context file generation started in background',
      eventId: startEventId
    });
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

async function generateContextWithLLM(contextName: string, filePaths: string[], projectId: string): Promise<string> {
  const prompt = `Generate comprehensive documentation for the context "${contextName}" based on the following files:\n\n${filePaths.map((fp: string) => `- ${fp}`).join('\n')}\n\nProvide a detailed explanation of what these files do, how they relate to each other, and their purpose in the project.`;

  const result = await ollamaClient.generate({
    prompt,
    model: 'llama3.1:8b',
    projectId,
    taskType: 'context_generation',
    taskDescription: `Generate context documentation for: ${contextName}`
  });

  if (!result.success || !result.response) {
    throw new Error('Failed to generate context file content');
  }

  return result.response;
}

async function createContextDirectory(projectPath: string): Promise<string> {
  const contextDir = join(projectPath, '.kiro', 'contexts');
  if (!existsSync(contextDir)) {
    await mkdir(contextDir, { recursive: true });
  }
  return contextDir;
}

function buildContextFileContent(contextName: string, filePaths: string[], contextResponse: string): string {
  return `# ${contextName}

## Files
${filePaths.map((fp: string) => `- \`${fp}\``).join('\n')}

## Generated Context

${contextResponse}

---
*Generated on ${new Date().toISOString()}*
`;
}

async function logSuccessEvent(projectId: string, contextName: string, fileName: string): Promise<void> {
  const successEventId = generateEventId();
  await eventDb.createEvent({
    id: successEventId,
    project_id: projectId,
    title: 'Context File Generated Successfully',
    description: `Context file for "${contextName}" has been generated and saved`,
    type: 'success',
    agent: 'system',
    message: `File saved to: context/${fileName}`
  });
}

async function logErrorEvent(projectId: string, contextName: string, error: unknown): Promise<void> {
  const errorEventId = generateEventId();
  await eventDb.createEvent({
    id: errorEventId,
    project_id: projectId,
    title: 'Context File Generation Failed',
    description: `Failed to generate context file for "${contextName}"`,
    type: 'error',
    agent: 'system',
    message: error instanceof Error ? error.message : 'Unknown error occurred'
  });
}

async function processContextFileGeneration({
  contextId,
  contextName,
  filePaths,
  projectPath,
  projectId
}: {
  contextId: string;
  contextName: string;
  filePaths: string[];
  projectPath: string;
  projectId: string;
}) {
  try {
    const contextResponse = await generateContextWithLLM(contextName, filePaths, projectId);
    const contextDir = await createContextDirectory(projectPath);

    const fileName = `${contextName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    const filePath = join(contextDir, fileName);
    const contextContent = buildContextFileContent(contextName, filePaths, contextResponse);

    await writeFile(filePath, contextContent, 'utf-8');

    const relativePath = join('.kiro', 'contexts', fileName);
    contextDb.updateContext(contextId, {
      has_context_file: true,
      context_file_path: relativePath
    });

    await logSuccessEvent(projectId, contextName, fileName);
  } catch (error) {
    await logErrorEvent(projectId, contextName, error);
  }
}