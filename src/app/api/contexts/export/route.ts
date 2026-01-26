/**
 * API Route: Context Export
 *
 * GET /api/contexts/export?projectId={id}
 * Exports all contexts and groups for a project to a structured JSON format
 * optimized for Claude Code CLI orientation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextQueries, contextGroupQueries } from '@/lib/queries/contextQueries';
import { projectDb, DbProject } from '@/lib/project_database';
import { promises as fs } from 'fs';
import path from 'path';

// Types for the export format
interface ExportedContext {
  name: string;
  description: string | null;
  businessFeature: string | null;
  category: 'ui' | 'lib' | 'api' | 'data' | null;
  filePaths: string[];
  target: string | null;
  apiRoutes: string[];
}

interface ExportedGroup {
  name: string;
  type: 'pages' | 'client' | 'server' | 'external' | null;
  color: string;
  icon: string | null;
  contexts: ExportedContext[];
}

interface ContextMapExport {
  $schema: string;
  projectId: string;
  projectName: string;
  projectPath: string;
  generatedAt: string;
  version: string;
  groups: ExportedGroup[];
  ungrouped: ExportedContext[];
  summary: {
    totalGroups: number;
    totalContexts: number;
    totalFiles: number;
    categories: Record<string, number>;
    types: Record<string, number>;
  };
  instructions: string;
}

/**
 * Transform a context to the export format
 */
function transformContext(ctx: {
  name: string;
  description?: string | null;
  businessFeature?: string | null;
  category?: 'ui' | 'lib' | 'api' | 'data' | null;
  filePaths: string[];
  target?: string | null;
  apiRoutes?: string[];
}): ExportedContext {
  return {
    name: ctx.name,
    description: ctx.description || null,
    businessFeature: ctx.businessFeature || null,
    category: ctx.category || null,
    filePaths: ctx.filePaths || [],
    target: ctx.target || null,
    apiRoutes: ctx.apiRoutes || [],
  };
}

/**
 * GET - Export contexts for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const writeToFile = searchParams.get('write') === 'true';

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get project info
    const project = projectDb.getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch all contexts and groups
    const [contexts, groups] = await Promise.all([
      contextQueries.getContextsByProject(projectId),
      contextGroupQueries.getGroupsByProject(projectId),
    ]);

    // Build the export structure
    const categoryCounts: Record<string, number> = { ui: 0, lib: 0, api: 0, data: 0, uncategorized: 0 };
    const typeCounts: Record<string, number> = { pages: 0, client: 0, server: 0, external: 0, ungrouped: 0 };
    let totalFiles = 0;

    // Map contexts to groups
    const groupedContexts = new Map<string, ExportedContext[]>();
    const ungroupedContexts: ExportedContext[] = [];

    for (const ctx of contexts) {
      const exported = transformContext({
        name: ctx.name,
        description: ctx.description,
        businessFeature: (ctx as any).businessFeature,
        category: (ctx as any).category,
        filePaths: ctx.filePaths,
        target: ctx.target,
        apiRoutes: (ctx as any).apiRoutes ? JSON.parse((ctx as any).apiRoutes) : [],
      });

      totalFiles += exported.filePaths.length;

      // Count categories
      if (exported.category) {
        categoryCounts[exported.category] = (categoryCounts[exported.category] || 0) + 1;
      } else {
        categoryCounts.uncategorized++;
      }

      if (ctx.groupId) {
        if (!groupedContexts.has(ctx.groupId)) {
          groupedContexts.set(ctx.groupId, []);
        }
        groupedContexts.get(ctx.groupId)!.push(exported);
      } else {
        ungroupedContexts.push(exported);
        typeCounts.ungrouped++;
      }
    }

    // Build groups with their contexts
    const exportedGroups: ExportedGroup[] = groups.map(group => {
      const groupContexts = groupedContexts.get(group.id) || [];

      // Count types
      if (group.type) {
        typeCounts[group.type] = (typeCounts[group.type] || 0) + groupContexts.length;
      }

      return {
        name: group.name,
        type: group.type || null,
        color: group.color,
        icon: group.icon || null,
        contexts: groupContexts,
      };
    });

    // Build the final export object
    const contextMap: ContextMapExport = {
      $schema: 'https://vibeman.dev/schemas/context-map.json',
      projectId,
      projectName: project.name,
      projectPath: project.path,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      groups: exportedGroups,
      ungrouped: ungroupedContexts,
      summary: {
        totalGroups: groups.length,
        totalContexts: contexts.length,
        totalFiles,
        categories: categoryCounts,
        types: typeCounts,
      },
      instructions: `This context map describes the codebase organization for ${project.name}.
Each group represents a business domain or architectural layer.
Each context within a group represents a specific feature or module.
Use filePaths to navigate to relevant code.
The 'target' field describes the intended functionality.
The 'category' helps identify whether code is UI, API, library, or data-related.`,
    };

    // Optionally write to file in project root
    if (writeToFile && project.path) {
      try {
        const exportPath = path.join(project.path, 'context-map.json');
        await fs.writeFile(exportPath, JSON.stringify(contextMap, null, 2), 'utf-8');

        return NextResponse.json({
          success: true,
          data: contextMap,
          exportedTo: exportPath,
          message: `Context map exported to ${exportPath}`,
        });
      } catch (writeError) {
        console.error('[API] Failed to write context map file:', writeError);
        // Return the data even if file write fails
        return NextResponse.json({
          success: true,
          data: contextMap,
          warning: 'Failed to write file to disk, but data is returned',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: contextMap,
    });
  } catch (error) {
    console.error('[API] Context Export error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
