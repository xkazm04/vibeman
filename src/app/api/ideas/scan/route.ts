/**
 * @route /api/ideas/scan
 * POST - Headless idea scan over a context or a whole context group.
 *
 * Unlike /api/ideas/generate (which requires the caller to ship file contents),
 * this route reads each context's files server-side (path-secured) and runs the
 * chosen Idea scanner, so a CLI can scan by ID alone.
 *
 * Body: { projectId, contextId?, groupId?, scanType?, detailed?, provider? }
 *   Provide exactly one of contextId or groupId.
 */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { projectDb } from '@/lib/project_database';
import { contextQueries } from '@/lib/queries/contextQueries';
import { generateIdeas } from '@/app/projects/ProjectAI/ScanIdeas/generateIdeas';
import type { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { withObservability } from '@/lib/observability/middleware';
import { validatePathTraversal, validatePathWithinBase } from '@/lib/pathSecurity';
import { logger } from '@/lib/logger';

const MAX_FILES_PER_CONTEXT = 50;
const MAX_CHARS_PER_FILE = 8000;
const CONCURRENCY = 5;

async function readFileContents(
  projectPath: string,
  filePaths: string[],
): Promise<Array<{ path: string; content: string; type: string }>> {
  const out: Array<{ path: string; content: string; type: string }> = [];
  const files = filePaths.slice(0, MAX_FILES_PER_CONTEXT);

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (filePath) => {
        if (validatePathTraversal(filePath)) return null;
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(projectPath, filePath);
        if (validatePathWithinBase(fullPath, projectPath)) return null;
        const content = await fs.readFile(fullPath, 'utf-8');
        return {
          path: filePath,
          content: content.substring(0, MAX_CHARS_PER_FILE),
          type: path.extname(filePath).slice(1) || 'file',
        };
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
    const body = await request.json();
    const { projectId, contextId, groupId, scanType, detailed, provider } = body as {
      projectId?: string;
      contextId?: string;
      groupId?: string;
      scanType?: ScanType;
      detailed?: boolean;
      provider?: string;
    };

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    if (!contextId && !groupId) {
      return NextResponse.json({ error: 'Provide a contextId or a groupId to scan' }, { status: 400 });
    }

    const project = projectDb.projects.get(projectId);
    if (!project?.path) {
      return NextResponse.json({ error: 'Project not found or has no path configured' }, { status: 404 });
    }

    // Resolve the target contexts.
    const contexts = contextId
      ? [await contextQueries.getContextById(contextId)].filter(Boolean)
      : await contextQueries.getContextsByGroup(groupId!);

    if (!contexts || contexts.length === 0) {
      return NextResponse.json({ error: 'No contexts found to scan' }, { status: 404 });
    }

    const perContext: Array<{ contextId: string; contextName: string; scanId: string; ideaCount: number; error?: string }> = [];
    let totalIdeas = 0;

    for (const ctx of contexts) {
      if (!ctx) continue;
      if (!ctx.filePaths || ctx.filePaths.length === 0) {
        perContext.push({ contextId: ctx.id, contextName: ctx.name, scanId: '', ideaCount: 0, error: 'no files' });
        continue;
      }

      const codebaseFiles = await readFileContents(project.path, ctx.filePaths);
      if (codebaseFiles.length === 0) {
        perContext.push({ contextId: ctx.id, contextName: ctx.name, scanId: '', ideaCount: 0, error: 'no readable files' });
        continue;
      }

      const result = await generateIdeas({
        projectId,
        projectName: project.name,
        projectPath: project.path,
        contextId: ctx.id,
        provider,
        scanType,
        detailed,
        codebaseFiles,
      });

      const ideaCount = (result.ideas || []).length;
      totalIdeas += ideaCount;
      perContext.push({
        contextId: ctx.id,
        contextName: ctx.name,
        scanId: result.scanId || '',
        ideaCount,
        ...(result.success ? {} : { error: result.error || 'scan failed' }),
      });
    }

    logger.info(`[ideas/scan] Scanned ${perContext.length} context(s) for project ${projectId}, ${totalIdeas} ideas`);

    return NextResponse.json({
      success: true,
      projectId,
      scanType: scanType || 'all',
      contextsScanned: perContext.length,
      totalIdeas,
      perContext,
    });
  } catch (error) {
    logger.error('[ideas/scan] Error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/ideas/scan');
export const maxDuration = 500;
