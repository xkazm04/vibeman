/**
 * API Route: Regenerate Single Context
 *
 * POST /api/context-generation/regenerate
 * Re-generates description and metadata for a single context by reading
 * its current file list, running the LLM description prompt scoped to
 * those files, and updating the context in-place.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { projectDb } from '@/lib/project_database';
import { contextQueries } from '@/lib/queries/contextQueries';
import { llmManager } from '@/lib/llm/llm-manager';
import { SupportedProvider } from '@/lib/llm/types';
import { buildContextDescriptionPrompt } from '@/app/projects/ProjectAI/lib/promptBuilder';
import { withObservability } from '@/lib/observability/middleware';
import { withRateLimit } from '@/lib/api-helpers/rateLimiter';
import { validatePathTraversal, validatePathWithinBase } from '@/lib/pathSecurity';
import { logger } from '@/lib/logger';

interface RegenerateRequestBody {
  contextId: string;
  provider?: string;
  model?: string;
}

async function handlePost(request: NextRequest) {
  try {
    const body: RegenerateRequestBody = await request.json();
    const { contextId, provider, model } = body;

    if (!contextId) {
      return NextResponse.json(
        { error: 'contextId is required' },
        { status: 400 }
      );
    }

    // 1. Load the existing context
    const context = await contextQueries.getContextById(contextId);
    if (!context) {
      return NextResponse.json(
        { error: 'Context not found' },
        { status: 404 }
      );
    }

    if (!context.filePaths || context.filePaths.length === 0) {
      return NextResponse.json(
        { error: 'Context has no files to analyze' },
        { status: 400 }
      );
    }

    // 2. Resolve project path
    const project = projectDb.projects.get(context.projectId);
    if (!project?.path) {
      return NextResponse.json(
        { error: 'Project not found or has no path configured' },
        { status: 404 }
      );
    }

    const projectPath = project.path;

    // 3. Read file contents (scoped to this context's files only)
    const fileContents = await readFileContents(projectPath, context.filePaths);

    if (fileContents.length === 0) {
      return NextResponse.json(
        { error: 'No files could be read — they may have been moved or deleted' },
        { status: 400 }
      );
    }

    // 4. Build prompt and generate new description
    const promptResult = buildContextDescriptionPrompt(
      context.name,
      context.description || '',
      fileContents
    );

    const selectedProvider: SupportedProvider = (provider as SupportedProvider) || 'ollama';

    const result = await llmManager.generate({
      prompt: promptResult.fullPrompt,
      provider: selectedProvider,
      model,
      maxTokens: promptResult.llmConfig.maxTokens || 4000,
      temperature: promptResult.llmConfig.temperature || 0.7,
      taskType: 'context-description-generation',
      taskDescription: `Regenerate description for context: ${context.name}`,
    });

    if (!result.success || !result.response) {
      return NextResponse.json(
        { error: result.error || 'LLM generation failed' },
        { status: 500 }
      );
    }

    // 5. Parse the response
    const { cleanedDescription } = parseResponse(result.response);

    // 6. Update the context in the database
    const updated = await contextQueries.updateContext(contextId, {
      description: cleanedDescription,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update context after regeneration' },
        { status: 500 }
      );
    }

    logger.info('[API] Context regenerated successfully:', {
      contextId,
      contextName: context.name,
      filesRead: fileContents.length,
      totalFiles: context.filePaths.length,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      stats: {
        filesAnalyzed: fileContents.length,
        totalFiles: context.filePaths.length,
        skippedFiles: context.filePaths.length - fileContents.length,
      },
    });
  } catch (error) {
    logger.error('[API] Context regeneration error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Read file contents from disk, scoped to the context's file list
 */
async function readFileContents(
  projectPath: string,
  filePaths: string[]
): Promise<Array<{ path: string; content: string }>> {
  const MAX_FILES = 50;
  const MAX_CHARS_PER_FILE = 500;
  const CONCURRENCY = 5;

  const fileContents: Array<{ path: string; content: string }> = [];
  const filesToRead = filePaths.slice(0, MAX_FILES);

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
          content: content.substring(0, MAX_CHARS_PER_FILE),
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
 * Parse and clean LLM response
 */
function parseResponse(response: string): { cleanedDescription: string } {
  let cleanedDescription = response;

  try {
    const parsed = JSON.parse(response);
    if (parsed.description) {
      cleanedDescription = parsed.description;
    }
  } catch {
    // Raw markdown — use as-is
  }

  // Clean artifacts
  cleanedDescription = cleanedDescription
    .replace(/^[^#]*(?=#)/s, '')
    .replace(/"\s*\}\s*$/g, '')
    .replace(/'\s*\}\s*$/g, '')
    .replace(/\s*[\{\}]+\s*$/, '')
    .replace(/["'`]+$/, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .trim();

  return { cleanedDescription };
}

export const POST = withObservability(
  withRateLimit(handlePost, '/api/context-generation/regenerate', 'expensive'),
  '/api/context-generation/regenerate'
);
