/**
 * API Route: Regenerate All Contexts in a Group
 *
 * POST /api/context-generation/regenerate-group
 * Re-generates the description/metadata for every context in a group by reading
 * each context's files server-side and running the LLM description prompt. Keeps
 * a group's contexts fresh after a headless implementation pass.
 *
 * Body: { groupId, provider?, model? }
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
import { parseDescriptionResponse } from '@/lib/llm/parse-response';
import { logger } from '@/lib/logger';
import { scheduleContextMapExport } from '@/lib/contexts/exportContextMap';

const MAX_FILES = 50;
const MAX_CHARS_PER_FILE = 8000;
const CONCURRENCY = 5;

async function readFileContents(projectPath: string, filePaths: string[]): Promise<Array<{ path: string; content: string }>> {
  const out: Array<{ path: string; content: string }> = [];
  const files = filePaths.slice(0, MAX_FILES);
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (filePath) => {
        if (validatePathTraversal(filePath)) return null;
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
        if (validatePathWithinBase(fullPath, projectPath)) return null;
        const content = await fs.readFile(fullPath, 'utf-8');
        return { path: filePath, content: content.substring(0, MAX_CHARS_PER_FILE) };
      }),
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) out.push(r.value);
    }
  }
  return out;
}

async function handlePost(request: NextRequest) {
  try {
    const { groupId, provider, model } = await request.json();
    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }

    const contexts = await contextQueries.getContextsByGroup(groupId);
    if (!contexts || contexts.length === 0) {
      return NextResponse.json({ error: 'No contexts found in group' }, { status: 404 });
    }

    const selectedProvider: SupportedProvider = (provider as SupportedProvider) || 'ollama';
    const results: Array<{ contextId: string; contextName: string; updated: boolean; error?: string }> = [];

    for (const context of contexts) {
      try {
        if (!context.filePaths || context.filePaths.length === 0) {
          results.push({ contextId: context.id, contextName: context.name, updated: false, error: 'no files' });
          continue;
        }
        const project = projectDb.projects.get(context.projectId);
        if (!project?.path) {
          results.push({ contextId: context.id, contextName: context.name, updated: false, error: 'no project path' });
          continue;
        }

        const fileContents = await readFileContents(project.path, context.filePaths);
        if (fileContents.length === 0) {
          results.push({ contextId: context.id, contextName: context.name, updated: false, error: 'no readable files' });
          continue;
        }

        const promptResult = buildContextDescriptionPrompt(context.name, context.description || '', fileContents);
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
          results.push({ contextId: context.id, contextName: context.name, updated: false, error: result.error || 'LLM failed' });
          continue;
        }

        const { cleanedDescription } = parseDescriptionResponse(result.response);
        const updated = await contextQueries.updateContext(context.id, { description: cleanedDescription });
        results.push({ contextId: context.id, contextName: context.name, updated: !!updated });
      } catch (err) {
        results.push({
          contextId: context.id,
          contextName: context.name,
          updated: false,
          error: err instanceof Error ? err.message : 'unknown error',
        });
      }
    }

    const updatedCount = results.filter((r) => r.updated).length;
    if (contexts[0]?.projectId) scheduleContextMapExport(contexts[0].projectId);
    logger.info(`[regenerate-group] Regenerated ${updatedCount}/${contexts.length} contexts in group ${groupId}`);

    return NextResponse.json({
      success: true,
      groupId,
      totalContexts: contexts.length,
      updatedCount,
      results,
    });
  } catch (error) {
    logger.error('[regenerate-group] Error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(
  withRateLimit(handlePost, '/api/context-generation/regenerate-group', 'expensive'),
  '/api/context-generation/regenerate-group',
);
export const maxDuration = 500;
