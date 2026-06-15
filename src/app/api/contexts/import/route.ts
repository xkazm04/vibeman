/**
 * @route /api/contexts/import
 * POST - Reconcile a project's committed context-map.json back into Vibeman's DB.
 *
 * The committed file is the server-free read source; a project's own CLI may edit
 * it (e.g. add files to a context) while Vibeman is offline. This upserts those
 * edits by name when Vibeman next runs. Upsert-only — never deletes (so a manual
 * edit can't wipe DB data). After importing, the debounced export re-writes the
 * file with Vibeman's enrichment.
 *
 * Body: { projectId }   (reads {projectPath}/context-map.json)
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { projectDb } from '@/lib/project_database';
import { contextQueries, contextGroupQueries } from '@/lib/queries/contextQueries';
import { withObservability } from '@/lib/observability/middleware';
import { logger } from '@/lib/logger';

interface ImportStats {
  groupsCreated: number;
  groupsUpdated: number;
  contextsCreated: number;
  contextsUpdated: number;
}

interface MapContext {
  name: string;
  description?: string | null;
  category?: string | null;
  businessFeature?: string | null;
  filePaths?: string[];
  apiRoutes?: string[];
}

interface MapGroup {
  name: string;
  domain?: string | null;
  color?: string;
  icon?: string | null;
  contexts?: MapContext[];
}

async function handlePost(request: NextRequest) {
  try {
    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    const project = projectDb.getProject(projectId);
    if (!project?.path) {
      return NextResponse.json({ success: false, error: 'Project not found or has no path' }, { status: 404 });
    }

    const mapPath = path.join(project.path, 'context-map.json');
    let raw: string;
    try {
      raw = await fs.readFile(mapPath, 'utf-8');
    } catch {
      return NextResponse.json({ success: false, error: 'context-map.json not found in project root' }, { status: 404 });
    }

    const map = JSON.parse(raw) as { groups?: MapGroup[]; ungrouped?: MapContext[] };
    const stats: ImportStats = { groupsCreated: 0, groupsUpdated: 0, contextsCreated: 0, contextsUpdated: 0 };

    const existingGroups = await contextGroupQueries.getGroupsByProject(projectId);
    const groupByName = new Map(existingGroups.map((g) => [g.name.toLowerCase(), g]));

    for (const g of map.groups || []) {
      let group = groupByName.get(g.name.toLowerCase());
      if (!group) {
        group = await contextGroupQueries.createGroup({
          projectId,
          name: g.name,
          color: g.color,
          icon: g.icon || undefined,
          domain: g.domain || undefined,
        });
        groupByName.set(g.name.toLowerCase(), group);
        stats.groupsCreated++;
      } else if (g.domain && g.domain !== group.domain) {
        await contextGroupQueries.updateGroup(group.id, { domain: g.domain as never });
        stats.groupsUpdated++;
      }
      for (const c of g.contexts || []) {
        await upsertContext(projectId, c, group.id, stats);
      }
    }

    for (const c of map.ungrouped || []) {
      await upsertContext(projectId, c, null, stats);
    }

    logger.info(`[contexts/import] Reconciled map for ${projectId}: ${JSON.stringify(stats)}`);
    return NextResponse.json({ success: true, projectId, stats });
  } catch (error) {
    logger.error('[contexts/import] Error:', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function upsertContext(
  projectId: string,
  c: MapContext,
  groupId: string | null,
  stats: ImportStats
): Promise<void> {
  const existing = await contextQueries.getContextByName(c.name, projectId);
  if (!existing) {
    await contextQueries.createContext({
      projectId,
      groupId,
      name: c.name,
      description: c.description || undefined,
      filePaths: c.filePaths || [],
      category: c.category || undefined,
      businessFeature: c.businessFeature || undefined,
      apiRoutes: c.apiRoutes || undefined,
    });
    stats.contextsCreated++;
  } else {
    await contextQueries.updateContext(existing.id, {
      filePaths: c.filePaths,
      description: c.description || undefined,
      category: c.category || undefined,
      businessFeature: c.businessFeature || undefined,
      apiRoutes: c.apiRoutes || undefined,
      groupId: groupId || undefined,
    });
    stats.contextsUpdated++;
  }
}

export const POST = withObservability(handlePost, '/api/contexts/import');
