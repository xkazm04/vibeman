import { NextResponse } from 'next/server';
import { projectServiceDb } from '@/lib/projectServiceDb';
import { implementationLogRepository } from '@/app/db/repositories/implementation-log.repository';

/**
 * GET /api/reflector/project-implementations
 * Returns project implementation statistics sorted by implementation count
 */
export async function GET() {
  try {
    // Get all projects
    const projects = await projectServiceDb.getAllProjects();

    // Get all implementation logs
    const allLogs = implementationLogRepository.getLogsByProject('');

    // Group logs by project
    const projectStats = projects.map(project => {
      // Get logs for this project
      const projectLogs = implementationLogRepository.getLogsByProject(project.id);

      // Find most recent implementation
      const lastImplementation = projectLogs.length > 0
        ? projectLogs[0].created_at // Already sorted by created_at DESC in repository
        : null;

      return {
        projectId: project.id,
        projectName: project.name,
        implementationCount: projectLogs.length,
        lastImplementation,
      };
    });

    // Sort by implementation count descending
    const sortedStats = projectStats.sort((a, b) => b.implementationCount - a.implementationCount);

    return NextResponse.json({
      projects: sortedStats,
      total: sortedStats.length,
    });
  } catch (error) {
    console.error('[ProjectImplementations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project implementation statistics' },
      { status: 500 }
    );
  }
}
