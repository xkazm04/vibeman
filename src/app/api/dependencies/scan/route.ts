import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  dependencyScanDb,
  projectDependencyDb,
  sharedDependencyDb,
  codeDuplicateDb,
  dependencyRelationshipDb
} from '@/lib/dependency_database';
import { scanMultipleProjects } from '@/lib/dependencyScanner';
import { projectDb } from '@/lib/project_database';

/**
 * POST /api/dependencies/scan
 * Scan multiple projects for dependencies and analyze relationships
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectIds, scanName } = body;

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid projectIds: must be a non-empty array' },
        { status: 400 }
      );
    }

    // Create scan record
    const scanId = uuidv4();
    const scan = dependencyScanDb.createScan({
      id: scanId,
      scan_name: scanName || `Scan ${new Date().toLocaleString()}`,
      project_ids: projectIds
    });

    // Perform the scan
    const analysis = await scanMultipleProjects(projectIds);

    // Store project dependencies
    const projectDeps = [];
    for (const result of analysis.scanResults) {
      for (const dep of result.dependencies) {
        projectDeps.push({
          id: uuidv4(),
          scan_id: scanId,
          project_id: result.projectId,
          dependency_name: dep.name,
          dependency_version: dep.version,
          dependency_type: dep.type,
          file_path: dep.files[0] || undefined,
          usage_count: dep.usageCount,
          is_dev_dependency: dep.isDevDependency
        });
      }
    }

    if (projectDeps.length > 0) {
      projectDependencyDb.createDependencies(projectDeps);
    }

    // Store shared dependencies
    const sharedDeps = analysis.sharedDependencies.map(dep => ({
      id: uuidv4(),
      scan_id: scanId,
      dependency_name: dep.name,
      dependency_type: dep.type,
      project_ids: dep.projects.map(p => p.id),
      version_conflicts: dep.versionConflicts ? dep.projects.reduce((acc, p) => ({
        ...acc,
        [p.id]: p.version
      }), {}) : undefined,
      usage_count: dep.projects.length,
      refactoring_opportunity: dep.refactoringOpportunity || undefined,
      priority: dep.priority
    }));

    if (sharedDeps.length > 0) {
      sharedDependencyDb.createSharedDependencies(sharedDeps);
    }

    // Store code duplicates
    const duplicates = analysis.codeDuplicates.map(dup => ({
      id: uuidv4(),
      scan_id: scanId,
      pattern_hash: dup.patternHash,
      pattern_type: dup.patternType,
      code_snippet: dup.codeSnippet,
      similarity_score: dup.similarityScore,
      occurrences: dup.occurrences.map(occ => ({
        project_id: occ.projectId,
        file_path: occ.filePath,
        line_start: occ.lineStart,
        line_end: occ.lineEnd
      })),
      refactoring_suggestion: dup.refactoringSuggestion,
      estimated_savings: dup.estimatedSavings
    }));

    if (duplicates.length > 0) {
      codeDuplicateDb.createDuplicates(duplicates);
    }

    // Store dependency relationships
    const relationships = [];
    for (const result of analysis.scanResults) {
      for (const imp of result.imports) {
        // Find if the import target matches another project
        const targetProject = analysis.scanResults.find(r =>
          r.projectId !== result.projectId &&
          imp.target.includes(r.projectName.toLowerCase())
        );

        if (targetProject) {
          relationships.push({
            id: uuidv4(),
            scan_id: scanId,
            source_project_id: result.projectId,
            target_project_id: targetProject.projectId,
            source_module: imp.source,
            target_module: imp.target,
            relationship_type: 'imports' as const,
            strength: imp.count
          });
        }
      }
    }

    if (relationships.length > 0) {
      dependencyRelationshipDb.createRelationships(relationships);
    }

    // Fetch registry versions for all packages
    const registryVersions = await fetchRegistryVersionsForScan(projectIds, projectDeps);

    // Update scan statistics
    dependencyScanDb.updateScanStats(scanId, {
      total_dependencies: analysis.summary.totalDependencies,
      shared_dependencies: analysis.summary.sharedDependencies,
      duplicate_code_instances: analysis.summary.codeDuplicates,
      registry_versions: registryVersions
    });

    return NextResponse.json({
      scanId,
      summary: analysis.summary,
      message: 'Dependency scan completed successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to scan dependencies', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Fetch registry versions for all packages in the scan
 */
async function fetchRegistryVersionsForScan(
  projectIds: string[],
  projectDeps: Array<{ dependency_name: string; dependency_type: string; project_id: string }>
): Promise<Record<string, string | null>> {
  try {
    // Get all unique package names
    const uniquePackages = new Set<string>();
    projectDeps.forEach(dep => {
      // Only fetch for npm/python packages (not local imports or shared modules)
      if (dep.dependency_type === 'npm' || dep.dependency_type === 'python') {
        uniquePackages.add(dep.dependency_name);
      }
    });

    if (uniquePackages.size === 0) {
      return {};
    }

    // Get project types to determine which registry to use
    // For simplicity, if any project is python/fastapi, use pypi; otherwise use npm
    const projects = projectDb.getAllProjects();
    const scannedProjects = projects.filter(p => projectIds.includes(p.id));
    const hasPython = scannedProjects.some(p => p.type === 'python' || p.type === 'fastapi');
    const hasNode = scannedProjects.some(p =>
      p.type === 'nextjs' || p.type === 'react' || p.type === 'nodejs' || p.type === 'other'
    );

    const allVersions: Record<string, string | null> = {};

    // Fetch npm packages
    if (hasNode) {
      const npmPackages = Array.from(uniquePackages).filter(pkg => {
        const dep = projectDeps.find(d => d.dependency_name === pkg);
        return dep?.dependency_type === 'npm';
      });

      if (npmPackages.length > 0) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/dependencies/registry-versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packages: npmPackages,
            projectType: 'nextjs'
          })
        });

        if (response.ok) {
          const data = await response.json();
          Object.assign(allVersions, data.versions);
        }
      }
    }

    // Fetch python packages
    if (hasPython) {
      const pythonPackages = Array.from(uniquePackages).filter(pkg => {
        const dep = projectDeps.find(d => d.dependency_name === pkg);
        return dep?.dependency_type === 'python';
      });

      if (pythonPackages.length > 0) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/dependencies/registry-versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packages: pythonPackages,
            projectType: 'python'
          })
        });

        if (response.ok) {
          const data = await response.json();
          Object.assign(allVersions, data.versions);
        }
      }
    }

    return allVersions;
  } catch (error) {
    return {};
  }
}
