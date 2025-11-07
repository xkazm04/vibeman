import { NextRequest, NextResponse } from 'next/server';
import {
  dependencyScanDb,
  sharedDependencyDb,
  dependencyRelationshipDb,
  projectDependencyDb
} from '@/lib/dependency_database';
import {
  createErrorResponse,
  getProjectColor,
  getDependencyColor,
  extractProjectSummaries,
  parseVersionConflicts
} from '../../utils';

interface GraphNode {
  id: string;
  name: string;
  type: 'project' | 'dependency';
  projectType?: string;
  path?: string;
  dependencyCount?: number;
  dependencyType?: string;
  projectCount?: number;
  versionConflicts?: boolean;
  priority?: string | null;
  refactoringOpportunity?: string | null;
  group: number;
  size: number;
  color: string;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
  type: string;
  version?: string | null;
  label?: string;
  color: string;
}

interface Project {
  id: string;
  name: string;
  type: string;
  path: string;
}

/**
 * Calculate statistics for the dependency graph
 */
function calculateStatistics(
  projects: Project[],
  sharedDependencies: ReturnType<typeof sharedDependencyDb.getSharedDependenciesByScan>,
  relationships: ReturnType<typeof dependencyRelationshipDb.getRelationshipsByScan>
) {
  return {
    totalProjects: projects.length,
    totalSharedDependencies: sharedDependencies.length,
    totalRelationships: relationships.length,
    versionConflicts: sharedDependencies.filter(d =>
      d.version_conflicts && JSON.parse(d.version_conflicts)
    ).length,
    criticalDependencies: sharedDependencies.filter(d => d.priority === 'critical').length,
    highPriorityDependencies: sharedDependencies.filter(d => d.priority === 'high').length
  };
}

/**
 * GET /api/dependencies/[scanId]/graph
 * Get graph visualization data for a dependency scan
 * Returns nodes and links for visualization libraries like react-force-graph
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await params;

    // Get scan info
    const scan = dependencyScanDb.getScanById(scanId);
    if (!scan) {
      return createErrorResponse('Scan not found', undefined, 404);
    }

    // Parse project IDs
    const projectIds = JSON.parse(scan.project_ids) as string[];

    // Get project details
    const projects = extractProjectSummaries(projectIds);

    // Get shared dependencies and relationships
    const sharedDependencies = sharedDependencyDb.getSharedDependenciesByScan(scanId);
    const relationships = dependencyRelationshipDb.getRelationshipsByScan(scanId);
    const projectDependencies = projectDependencyDb.getDependenciesByScan(scanId);

    // Build graph nodes
    const nodes: GraphNode[] = [];
    const nodeMap = new Map<string, number>();

    // Add project nodes
    projects.forEach((project, index: number) => {
      const nodeId = `project-${project.id}`;
      nodeMap.set(nodeId, nodes.length);

      const projectDeps = projectDependencies.filter(d => d.project_id === project.id);
      const uniqueDeps = new Set(projectDeps.map(d => d.dependency_name)).size;

      nodes.push({
        id: nodeId,
        name: project.name,
        type: 'project',
        projectType: project.type,
        path: project.path,
        dependencyCount: uniqueDeps,
        group: index + 1,
        size: 20,
        color: getProjectColor(project.type)
      });
    });

    // Add shared dependency nodes
    sharedDependencies.forEach((dep) => {
      const nodeId = `dep-${dep.dependency_name}`;
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, nodes.length);

        const projectIdsArray = JSON.parse(dep.project_ids) as string[];
        const versionConflicts = parseVersionConflicts(dep.version_conflicts);

        nodes.push({
          id: nodeId,
          name: dep.dependency_name,
          type: 'dependency',
          dependencyType: dep.dependency_type,
          projectCount: projectIdsArray.length,
          versionConflicts: versionConflicts !== null,
          priority: dep.priority,
          refactoringOpportunity: dep.refactoring_opportunity,
          size: 10 + (projectIdsArray.length * 2),
          group: 0,
          color: getDependencyColor(dep.priority, versionConflicts !== null)
        });
      }
    });

    // Build graph links
    const links: GraphLink[] = [];

    // Add links from projects to shared dependencies
    sharedDependencies.forEach((dep) => {
      const depNodeId = `dep-${dep.dependency_name}`;
      const projectIdsArray = JSON.parse(dep.project_ids) as string[];
      const versionConflicts = parseVersionConflicts(dep.version_conflicts);

      projectIdsArray.forEach((projectId: string) => {
        const projectNodeId = `project-${projectId}`;

        if (nodeMap.has(projectNodeId) && nodeMap.has(depNodeId)) {
          links.push({
            source: projectNodeId,
            target: depNodeId,
            value: 1,
            type: 'uses',
            version: versionConflicts ? versionConflicts[projectId] : null,
            color: versionConflicts ? '#ff6b6b' : '#888'
          });
        }
      });
    });

    // Add links between projects based on relationships
    relationships.forEach((rel) => {
      const sourceNodeId = `project-${rel.source_project_id}`;
      const targetNodeId = `project-${rel.target_project_id}`;

      if (nodeMap.has(sourceNodeId) && nodeMap.has(targetNodeId)) {
        links.push({
          source: sourceNodeId,
          target: targetNodeId,
          value: rel.strength,
          type: rel.relationship_type,
          label: rel.relationship_type,
          color: '#4ecdc4'
        });
      }
    });

    // Calculate statistics
    const stats = calculateStatistics(projects, sharedDependencies, relationships);

    return NextResponse.json({
      nodes,
      links,
      stats,
      scan: {
        id: scan.id,
        name: scan.scan_name,
        date: scan.scan_date
      }
    });

  } catch (error) {
    return createErrorResponse(
      'Failed to generate graph data',
      (error as Error).message
    );
  }
}
