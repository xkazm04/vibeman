/**
 * @route /api/contexts/audit
 * GET - Advisory balance audit of a project's context map.
 *
 * Grades contexts/groups against the granularity policy + taxonomy and returns
 * findings (oversized/uncategorized contexts, file overlap, groups missing a
 * domain, etc.). Advisory only — never mutates.
 *
 * Query params: projectId (required)
 */
import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import path from 'path';
import { contextQueries, contextGroupQueries } from '@/lib/queries/contextQueries';
import { auditContexts } from '@/lib/contexts/audit';
import { bootstrapMissingBaselines, buildStaleResolver } from '@/lib/contexts/fileHashes';
import { projectDb } from '@/lib/project_database';
import { validatePathWithinBase } from '@/lib/pathSecurity';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    const [contexts, groups] = await Promise.all([
      contextQueries.getContextsByProject(projectId),
      contextGroupQueries.getGroupsByProject(projectId),
    ]);

    // Resolve the project's filesystem root so we can detect context-map drift
    // (files[] entries that 404). If the project has no path we skip disk checks.
    const projectPath = projectDb.getProject(projectId)?.path;
    const fileExists = projectPath
      ? (filePath: string): boolean => {
          // Reject anything that would escape the project root before touching disk.
          if (validatePathWithinBase(filePath, projectPath) !== null) return false;
          return existsSync(path.resolve(projectPath, filePath));
        }
      : undefined;

    // Content-drift: baseline any files without a hash yet (bootstrap for
    // pre-existing contexts), then flag files whose content changed since.
    let isStale: ((filePath: string) => boolean) | undefined;
    if (projectPath) {
      const allPaths = Array.from(new Set(contexts.flatMap((c) => c.filePaths ?? [])));
      const baseline = bootstrapMissingBaselines(projectId, projectPath, allPaths);
      isStale = buildStaleResolver(projectPath, baseline);
    }

    const report = auditContexts(
      contexts.map((c) => ({
        id: c.id,
        name: c.name,
        groupId: c.groupId,
        filePaths: c.filePaths,
        category: c.category,
        crossRefs: c.crossRefs,
      })),
      groups.map((g) => ({ id: g.id, name: g.name, domain: g.domain })),
      { fileExists, isStale },
    );

    return NextResponse.json({ success: true, projectId, ...report });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/contexts/audit');
