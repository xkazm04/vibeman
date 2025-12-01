/**
 * API Route: Get Untested Implementation Logs
 * Fetches implementation logs that have not been tested (tested = 0)
 * Enriches data with project and context names
 */

import { NextRequest, NextResponse } from 'next/server';
import { implementationLogRepository } from '@/app/db/repositories/implementation-log.repository';
import { projectDb } from '@/lib/project_database';
import { contextRepository } from '@/app/db/repositories/context.repository';

export interface EnrichedImplementationLog {
  id: string;
  project_id: string;
  project_name: string | null;
  context_id: string | null;
  context_name: string | null;
  context_group_id: string | null;
  requirement_name: string;
  title: string;
  overview: string;
  overview_bullets: string | null;
  tested: number;
  screenshot: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');
    const projectId = searchParams.get('projectId');

    let logs;

    if (contextId) {
      // Get untested logs for specific context
      logs = implementationLogRepository.getUntestedLogsByContext(contextId);
    } else if (projectId) {
      // Get untested logs for entire project
      logs = implementationLogRepository.getUntestedLogsByProject(projectId);
    } else {
      // Get all untested logs
      logs = implementationLogRepository.getAllUntestedLogs();
    }

    // Enrich each log with project, context names, and group id
    const enrichedLogs: EnrichedImplementationLog[] = logs.map((log) => {
      // Get project name
      let projectName: string | null = null;
      try {
        const project = projectDb.getProject(log.project_id);
        projectName = project?.name || null;
      } catch {
        // Project might not exist
      }

      // Get context name and group id
      let contextName: string | null = null;
      let contextGroupId: string | null = null;
      if (log.context_id) {
        try {
          const context = contextRepository.getContextById(log.context_id);
          contextName = context?.name || null;
          contextGroupId = context?.group_id || null;
        } catch {
          // Context might not exist
        }
      }

      return {
        ...log,
        project_name: projectName,
        context_name: contextName,
        context_group_id: contextGroupId,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedLogs,
      count: enrichedLogs.length,
    });
  } catch (error) {
    console.error('Error fetching untested implementation logs:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch untested logs'
      },
      { status: 500 }
    );
  }
}
