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
import { contextQueries, contextGroupQueries } from '@/lib/queries/contextQueries';
import { auditContexts } from '@/lib/contexts/audit';
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

    const report = auditContexts(
      contexts.map((c) => ({
        id: c.id,
        name: c.name,
        groupId: c.groupId,
        filePaths: c.filePaths,
        category: c.category,
      })),
      groups.map((g) => ({ id: g.id, name: g.name, domain: g.domain })),
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
