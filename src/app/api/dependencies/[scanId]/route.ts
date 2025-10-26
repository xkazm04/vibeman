import { NextRequest, NextResponse } from 'next/server';
import {
  dependencyScanDb,
  projectDependencyDb,
  sharedDependencyDb,
  codeDuplicateDb,
  dependencyRelationshipDb
} from '@/lib/dependency_database';
import { projectDb } from '@/lib/project_database';

/**
 * GET /api/dependencies/[scanId]
 * Get detailed information about a specific dependency scan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const scanId = params.scanId;

    // Get scan info
    const scan = dependencyScanDb.getScanById(scanId);
    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Parse project IDs
    const projectIds = JSON.parse(scan.project_ids);

    // Get project details
    const allProjects = projectDb.getAllProjects();
    const projects = projectIds.map((id: string) => {
      const project = allProjects.find(p => p.id === id);
      return project ? {
        id: project.id,
        name: project.name,
        path: project.path,
        type: project.type
      } : null;
    }).filter(Boolean);

    // Get all dependencies
    const projectDependencies = projectDependencyDb.getDependenciesByScan(scanId);

    // Group dependencies by project
    const dependenciesByProject = projectIds.reduce((acc: any, projectId: string) => {
      acc[projectId] = projectDependencies.filter(d => d.project_id === projectId);
      return acc;
    }, {});

    // Get shared dependencies
    const sharedDependencies = sharedDependencyDb.getSharedDependenciesByScan(scanId);
    const sharedDepsWithParsedData = sharedDependencies.map(dep => ({
      ...dep,
      project_ids: JSON.parse(dep.project_ids),
      version_conflicts: dep.version_conflicts ? JSON.parse(dep.version_conflicts) : null
    }));

    // Get code duplicates
    const codeDuplicates = codeDuplicateDb.getDuplicatesByScan(scanId);
    const duplicatesWithParsedData = codeDuplicates.map(dup => ({
      ...dup,
      occurrences: JSON.parse(dup.occurrences)
    }));

    // Get dependency relationships
    const relationships = dependencyRelationshipDb.getRelationshipsByScan(scanId);

    return NextResponse.json({
      scan: {
        ...scan,
        project_ids: projectIds
      },
      projects,
      dependencies: dependenciesByProject,
      sharedDependencies: sharedDepsWithParsedData,
      codeDuplicates: duplicatesWithParsedData,
      relationships
    });
  } catch (error) {
    console.error('Error fetching scan details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scan details', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dependencies/[scanId]
 * Delete a dependency scan
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const scanId = params.scanId;

    const success = dependencyScanDb.deleteScan(scanId);

    if (!success) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Scan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting scan:', error);
    return NextResponse.json(
      { error: 'Failed to delete scan', details: (error as Error).message },
      { status: 500 }
    );
  }
}
