import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { llmManager } from '@/lib/llm/llm-manager';
import { SupportedProvider } from '@/lib/llm/types';
import { buildContextDescriptionPrompt } from '@/app/projects/ProjectAI/lib/promptBuilder';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { validatePathTraversal, validatePathWithinBase } from '@/lib/pathSecurity';

interface FileContent {
  path: string;
  content: string;
}

interface RequestBody {
  filePaths: string[];
  projectPath: string;
  provider?: string;
  model?: string;
  contextName?: string;
  initialDescription?: string;
}

async function handlePost(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { filePaths, projectPath, provider, model, contextName, initialDescription } = body;

    // Validate input
    const validationError = validateInput(filePaths, projectPath);
    if (validationError) {
      return validationError;
    }

    // Read file contents
    const fileContents = await readFileContents(projectPath, filePaths);

    if (fileContents.length === 0) {
      return NextResponse.json(
        { error: 'No files could be read successfully' },
        { status: 400 }
      );
    }

    // Build prompt using standardized template
    const promptResult = buildContextDescriptionPrompt(
      contextName || 'Context',
      initialDescription || '',
      fileContents
    );

    // Generate description using LLM
    const result = await generateDescription(
      promptResult,
      provider,
      model
    );

    if (!result.success || !result.response) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate description' },
        { status: 500 }
      );
    }

    // Parse and clean the response
    const { cleanedDescription, fileStructure } = parseAndCleanResponse(result.response);

    return NextResponse.json({
      description: cleanedDescription,
      fileStructure: fileStructure,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to generate description',
      },
      { status: 500 }
    );
  }
}

/**
 * Validate request input parameters
 */
function validateInput(
  filePaths: string[],
  projectPath: string
): NextResponse | null {
  if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
    return NextResponse.json(
      { error: 'File paths array is required' },
      { status: 400 }
    );
  }

  if (!projectPath) {
    return NextResponse.json(
      { error: 'Project path is required' },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Read file contents from disk
 */
async function readFileContents(
  projectPath: string,
  filePaths: string[]
): Promise<FileContent[]> {
  const fileContents: FileContent[] = [];
  const maxFiles = 20;
  const maxCharsPerFile = 500;

  // Read files in parallel with concurrency limit of 5
  const filesToRead = filePaths.slice(0, maxFiles);
  const CONCURRENCY = 5;

  for (let i = 0; i < filesToRead.length; i += CONCURRENCY) {
    const batch = filesToRead.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (filePath) => {
        const traversalError = validatePathTraversal(filePath);
        if (traversalError) return null;

        const fullPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(projectPath, filePath);

        const baseError = validatePathWithinBase(fullPath, projectPath);
        if (baseError) return null;

        const content = await fs.readFile(fullPath, 'utf-8');
        return {
          path: filePath,
          content: content.substring(0, maxCharsPerFile),
        };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        fileContents.push(result.value);
      }
    }
  }

  return fileContents;
}

/**
 * Generate description using LLM Manager
 */
async function generateDescription(
  promptResult: any,
  provider: string | undefined,
  model: string | undefined
) {
  const selectedProvider: SupportedProvider = (provider as SupportedProvider) || 'ollama';

  return await llmManager.generate({
    prompt: promptResult.fullPrompt,
    provider: selectedProvider,
    model: model,
    maxTokens: promptResult.llmConfig.maxTokens || 4000,
    temperature: promptResult.llmConfig.temperature || 0.7,
    taskType: 'context-description-generation',
    taskDescription: 'Generate context description from files',
  });
}

/**
 * Parse and clean LLM response
 */
function parseAndCleanResponse(response: string): {
  cleanedDescription: string;
  fileStructure: string;
} {
  let cleanedDescription = response;
  let fileStructure = '';

  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(response);

    if (parsed.description) {
      cleanedDescription = parsed.description;
      fileStructure = parsed.fileStructure || '';
    }
  } catch {
    // If JSON parsing fails, treat as raw markdown
    cleanedDescription = response;
  }

  // Clean description
  cleanedDescription = cleanDescription(cleanedDescription);

  // Clean file structure
  fileStructure = cleanFileStructure(fileStructure);

  return { cleanedDescription, fileStructure };
}

/**
 * Clean description by removing JSON artifacts
 */
function cleanDescription(description: string): string {
  return description
    // Remove everything before the first '#' (markdown heading)
    .replace(/^[^#]*(?=#)/s, '')
    // Remove any trailing JSON syntax: " } or "}
    .replace(/"\s*\}\s*$/g, '')
    .replace(/'\s*\}\s*$/g, '')
    // Remove standalone curly braces at end
    .replace(/\s*[\{\}]+\s*$/, '')
    // Remove any remaining quote wrappers at very end
    .replace(/["'`]+$/, '')
    // Convert escaped newlines to actual newlines
    .replace(/\\n/g, '\n')
    // Remove escaped quotes
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .trim();
}

/**
 * Clean file structure string
 */
function cleanFileStructure(fileStructure: string): string {
  return fileStructure
    .replace(/^["'`{}\[\]]+|["'`{}\[\]]+$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .trim();
}

export const POST = withObservability(withRateLimit(handlePost, '/api/contexts/generate-description', 'expensive'), '/api/contexts/generate-description');
