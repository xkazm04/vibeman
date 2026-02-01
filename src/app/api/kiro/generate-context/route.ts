import { NextRequest, NextResponse } from 'next/server';
import { ollamaClient } from '../../../../lib/ollama';
import { contextDb } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { ContextEntity } from '@/stores/context/ContextEntity';

interface ContextRequest {
  contextName: string;
  description?: string;
  filePaths: string[];
  groupId?: string;
  projectId: string;
  projectPath?: string;
  generateFile?: boolean;
  prompt?: string;
  model?: string;
}

interface ContextFileResult {
  contextFilePath?: string;
  hasContextFile: boolean;
}

function createErrorResponse(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

/**
 * Validates context creation request using ContextEntity domain rules
 */
function validateContextRequest(data: Partial<ContextRequest>): NextResponse | null {
  if (!data.projectId) {
    return createErrorResponse('Project ID is required', 400);
  }

  // Use ContextEntity for name validation
  if (!data.contextName) {
    return createErrorResponse('Context name is required', 400);
  }

  const nameValidation = ContextEntity.validateName(data.contextName);
  if (!nameValidation.valid) {
    return createErrorResponse(nameValidation.error || 'Invalid context name', 400);
  }

  // Use ContextEntity for file paths validation
  const filePathsValidation = ContextEntity.validateFilePaths(data.filePaths || []);
  if (!filePathsValidation.valid) {
    return createErrorResponse(filePathsValidation.error || 'At least one file path is required', 400);
  }

  return null;
}

function ensureContextDirectory(projectPath: string): string {
  const contextDir = path.join(projectPath, '.kiro', 'contexts');
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }
  return contextDir;
}

function generateContextFileContent(
  contextName: string,
  filePaths: string[],
  response: string,
  description?: string
): string {
  return `# ${contextName}

${description ? `## Description\n${description}\n\n` : ''}## Files
${filePaths.map((filePath: string) => `- \`${filePath}\``).join('\n')}

## Generated Context

${response}

---
*Generated on ${new Date().toISOString()}*
`;
}

async function generateContextFile(
  contextName: string,
  description: string | undefined,
  filePaths: string[],
  projectPath: string,
  projectId: string,
  prompt: string,
  model?: string
): Promise<ContextFileResult> {
  try {
    const result = await ollamaClient.generate({
      prompt,
      model,
      projectId,
      taskType: 'context_generation',
      taskDescription: `Generate context documentation for: ${contextName}`
    });

    if (result.success && result.response) {
      const contextDir = ensureContextDirectory(projectPath);
      const fileName = `${contextName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
      const absolutePath = path.join(contextDir, fileName);

      const contextContent = generateContextFileContent(
        contextName,
        filePaths,
        result.response,
        description
      );

      fs.writeFileSync(absolutePath, contextContent, 'utf8');

      return {
        contextFilePath: path.relative(projectPath, absolutePath),
        hasContextFile: true
      };
    }
  } catch (error) {
    // Continue without context file - we'll still save the context
  }

  return { hasContextFile: false };
}

interface DbContext {
  id: string;
  project_id: string;
  group_id: string | null;
  name: string;
  description: string | null;
  file_paths: string;
  has_context_file: number;
  context_file_path: string | null;
  created_at: string;
  updated_at: string;
}

function convertDbContextToFrontend(dbContext: DbContext) {
  return {
    id: dbContext.id,
    projectId: dbContext.project_id,
    groupId: dbContext.group_id,
    name: dbContext.name,
    description: dbContext.description,
    filePaths: JSON.parse(dbContext.file_paths),
    hasContextFile: Boolean(dbContext.has_context_file),
    contextFilePath: dbContext.context_file_path,
    createdAt: new Date(dbContext.created_at),
    updatedAt: new Date(dbContext.updated_at)
  };
}

async function handleContextFileGeneration(
  data: ContextRequest,
  contextName: string,
  description: string | undefined,
  filePaths: string[],
  projectPath: string | undefined,
  projectId: string,
  model: string | undefined
): Promise<ContextFileResult> {
  if (data.generateFile && data.prompt && projectPath) {
    return await generateContextFile(
      contextName,
      description,
      filePaths,
      projectPath,
      projectId,
      data.prompt,
      model
    );
  }
  return { hasContextFile: false };
}

function saveContextToDatabase(
  contextId: string,
  projectId: string,
  groupId: string | undefined,
  contextName: string,
  description: string | undefined,
  filePaths: string[],
  hasContextFile: boolean,
  contextFilePath: string | undefined
) {
  return contextDb.createContext({
    id: contextId,
    project_id: projectId,
    group_id: groupId || null,
    name: contextName,
    description: description || undefined,
    file_paths: filePaths,
    has_context_file: hasContextFile,
    context_file_path: contextFilePath
  });
}

function createSuccessResponse(context: ReturnType<typeof convertDbContextToFrontend>, hasContextFile: boolean, contextFilePath: string | undefined) {
  return NextResponse.json({
    success: true,
    context,
    contextFilePath: hasContextFile ? contextFilePath : null,
    message: hasContextFile
      ? 'Context created successfully with generated file'
      : 'Context created successfully'
  });
}

export async function POST(request: NextRequest) {
  try {
    const data: ContextRequest = await request.json();

    const validationError = validateContextRequest(data);
    if (validationError) {
      return validationError;
    }

    const {
      contextName,
      description,
      filePaths,
      groupId,
      projectId,
      projectPath,
      model
    } = data;

    const contextId = uuidv4();

    const fileResult = await handleContextFileGeneration(
      data,
      contextName,
      description,
      filePaths,
      projectPath,
      projectId,
      model
    );

    try {
      const dbContext = saveContextToDatabase(
        contextId,
        projectId,
        groupId,
        contextName,
        description,
        filePaths,
        fileResult.hasContextFile,
        fileResult.contextFilePath
      );

      const context = convertDbContextToFrontend(dbContext);

      return createSuccessResponse(context, fileResult.hasContextFile, fileResult.contextFilePath);

    } catch (dbError) {
      return createErrorResponse(
        `Failed to save context: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`,
        500
      );
    }

  } catch (error) {
    return createErrorResponse(
      `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}