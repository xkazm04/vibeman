import { NextRequest, NextResponse } from 'next/server';
import {
  dependencyScanDb,
  projectDependencyDb,
  sharedDependencyDb,
  codeDuplicateDb,
  dependencyRelationshipDb
} from '@/lib/dependency_database';
import { projectDb } from '@/lib/project_database';

interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  type: string;
}

interface ExportData {
  scan: {
    id: string;
    scan_name: string;
    scan_date: string;
    total_dependencies: number;
    shared_dependencies: number;
    duplicate_code_instances: number;
    project_ids: string[];
  };
  projects: ProjectSummary[];
  projectDependencies: ReturnType<typeof projectDependencyDb.getDependenciesByScan>;
  sharedDependencies: Array<{
    dependency_name: string;
    dependency_type: string;
    priority: string | null;
    refactoring_opportunity: string | null;
    project_ids: string[];
    version_conflicts: Record<string, string> | null;
  }>;
  codeDuplicates: Array<{
    pattern_type: string;
    code_snippet: string;
    estimated_savings: string | null;
    refactoring_suggestion: string | null;
    occurrences: Array<{
      project_id: string;
      file_path: string;
      line_start: number;
      line_end: number;
    }>;
  }>;
  relationships: ReturnType<typeof dependencyRelationshipDb.getRelationshipsByScan>;
}

/**
 * Extract project summaries from project IDs
 */
function extractProjectSummaries(projectIds: string[]): ProjectSummary[] {
  const allProjects = projectDb.getAllProjects();
  return projectIds
    .map((id: string) => {
      const project = allProjects.find(p => p.id === id);
      return project ? {
        id: project.id,
        name: project.name,
        path: project.path,
        type: project.type
      } : null;
    })
    .filter((p): p is ProjectSummary => p !== null);
}

/**
 * Gather all scan data for export
 */
function gatherScanData(scanId: string, scan: ReturnType<typeof dependencyScanDb.getScanById>): ExportData {
  if (!scan) {
    throw new Error('Scan not found');
  }

  const projectIds = JSON.parse(scan.project_ids) as string[];
  const projects = extractProjectSummaries(projectIds);

  const projectDependencies = projectDependencyDb.getDependenciesByScan(scanId);
  const sharedDependencies = sharedDependencyDb.getSharedDependenciesByScan(scanId);
  const codeDuplicates = codeDuplicateDb.getDuplicatesByScan(scanId);
  const relationships = dependencyRelationshipDb.getRelationshipsByScan(scanId);

  return {
    scan: {
      ...scan,
      project_ids: projectIds
    },
    projects,
    projectDependencies,
    sharedDependencies: sharedDependencies.map(dep => ({
      ...dep,
      project_ids: JSON.parse(dep.project_ids),
      version_conflicts: dep.version_conflicts ? JSON.parse(dep.version_conflicts) : null
    })),
    codeDuplicates: codeDuplicates.map(dup => ({
      ...dup,
      occurrences: JSON.parse(dup.occurrences)
    })),
    relationships
  };
}

/**
 * GET /api/dependencies/[scanId]/export
 * Export dependency scan data in various formats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Get scan info
    const scan = dependencyScanDb.getScanById(scanId);
    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Gather all scan data
    const data = gatherScanData(scanId, scan);

    if (format === 'csv') {
      // Export as CSV
      const csv = generateCSV(data);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="dependency-scan-${scanId}.csv"`
        }
      });
    } else if (format === 'markdown') {
      // Export as Markdown
      const markdown = generateMarkdown(data);
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="dependency-scan-${scanId}.md"`
        }
      });
    } else {
      // Export as JSON (default)
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="dependency-scan-${scanId}.json"`
        }
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to export scan', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Generate CSV export
 */
function generateCSV(data: ExportData): string {
  const lines: string[] = [];

  // Scan summary
  lines.push('Scan Summary');
  lines.push('Name,Date,Total Dependencies,Shared Dependencies,Code Duplicates');
  lines.push(`"${data.scan.scan_name}","${data.scan.scan_date}",${data.scan.total_dependencies},${data.scan.shared_dependencies},${data.scan.duplicate_code_instances}`);
  lines.push('');

  // Projects
  lines.push('Projects');
  lines.push('ID,Name,Type,Path');
  for (const project of data.projects) {
    lines.push(`"${project.id}","${project.name}","${project.type}","${project.path}"`);
  }
  lines.push('');

  // Shared dependencies
  lines.push('Shared Dependencies');
  lines.push('Name,Type,Project Count,Priority,Refactoring Opportunity');
  for (const dep of data.sharedDependencies) {
    lines.push(`"${dep.dependency_name}","${dep.dependency_type}",${dep.project_ids.length},"${dep.priority || 'N/A'}","${dep.refactoring_opportunity || 'N/A'}"`);
  }
  lines.push('');

  // Code duplicates
  lines.push('Code Duplicates');
  lines.push('Type,Occurrences,Estimated Savings,Refactoring Suggestion');
  for (const dup of data.codeDuplicates) {
    lines.push(`"${dup.pattern_type}",${dup.occurrences.length},"${dup.estimated_savings || 'N/A'}","${dup.refactoring_suggestion || 'N/A'}"`);
  }

  return lines.join('\n');
}

/**
 * Generate Markdown export
 */
function generateMarkdown(data: ExportData): string {
  const lines: string[] = [];

  // Title
  lines.push(`# Dependency Scan Report: ${data.scan.scan_name}`);
  lines.push('');
  lines.push(`**Date:** ${new Date(data.scan.scan_date).toLocaleString()}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Projects:** ${data.projects.length}`);
  lines.push(`- **Total Dependencies:** ${data.scan.total_dependencies}`);
  lines.push(`- **Shared Dependencies:** ${data.scan.shared_dependencies}`);
  lines.push(`- **Code Duplicates:** ${data.scan.duplicate_code_instances}`);
  lines.push('');

  // Projects
  lines.push('## Scanned Projects');
  lines.push('');
  lines.push('| Project | Type | Path |');
  lines.push('|---------|------|------|');
  for (const project of data.projects) {
    lines.push(`| ${project.name} | ${project.type} | ${project.path} |`);
  }
  lines.push('');

  // Shared dependencies
  if (data.sharedDependencies.length > 0) {
    lines.push('## Shared Dependencies');
    lines.push('');
    lines.push('Dependencies used across multiple projects:');
    lines.push('');
    lines.push('| Dependency | Type | Projects | Priority | Refactoring Opportunity |');
    lines.push('|------------|------|----------|----------|------------------------|');
    for (const dep of data.sharedDependencies) {
      const projectCount = dep.project_ids.length;
      const priority = dep.priority || 'low';
      const opportunity = (dep.refactoring_opportunity || 'None').replace(/\|/g, '\\|');
      lines.push(`| ${dep.dependency_name} | ${dep.dependency_type} | ${projectCount} | ${priority} | ${opportunity} |`);
    }
    lines.push('');
  }

  // Code duplicates
  if (data.codeDuplicates.length > 0) {
    lines.push('## Code Duplicates');
    lines.push('');
    lines.push('Duplicated code patterns detected:');
    lines.push('');
    lines.push('| Type | Occurrences | Estimated Savings | Refactoring Suggestion |');
    lines.push('|------|-------------|-------------------|----------------------|');
    for (const dup of data.codeDuplicates) {
      const suggestion = (dup.refactoring_suggestion || 'N/A').replace(/\|/g, '\\|');
      lines.push(`| ${dup.pattern_type} | ${dup.occurrences.length} | ${dup.estimated_savings || 'N/A'} | ${suggestion} |`);
    }
    lines.push('');

    // Detail top duplicates
    lines.push('### Top Code Duplicates (Details)');
    lines.push('');
    const topDuplicates = data.codeDuplicates.slice(0, 5);
    for (let i = 0; i < topDuplicates.length; i++) {
      const dup = topDuplicates[i];
      lines.push(`#### ${i + 1}. ${dup.pattern_type} (${dup.occurrences.length} occurrences)`);
      lines.push('');
      lines.push('**Locations:**');
      for (const occ of dup.occurrences) {
        const project = data.projects.find((p: ProjectSummary) => p.id === occ.project_id);
        lines.push(`- ${project?.name || occ.project_id}: \`${occ.file_path}\` (lines ${occ.line_start}-${occ.line_end})`);
      }
      lines.push('');
      lines.push('**Code Snippet:**');
      lines.push('```');
      lines.push(dup.code_snippet.substring(0, 500));
      if (dup.code_snippet.length > 500) {
        lines.push('... (truncated)');
      }
      lines.push('```');
      lines.push('');
    }
  }

  // Recommendations
  lines.push('## Recommendations');
  lines.push('');

  const criticalShared = data.sharedDependencies.filter(d => d.priority === 'critical');
  const highShared = data.sharedDependencies.filter(d => d.priority === 'high');

  if (criticalShared.length > 0 || highShared.length > 0) {
    lines.push('### High Priority');
    lines.push('');
    for (const dep of [...criticalShared, ...highShared]) {
      lines.push(`- **${dep.dependency_name}**: ${dep.refactoring_opportunity}`);
    }
    lines.push('');
  }

  if (data.codeDuplicates.length > 0) {
    lines.push('### Code Refactoring');
    lines.push('');
    const topThree = data.codeDuplicates.slice(0, 3);
    for (const dup of topThree) {
      lines.push(`- ${dup.refactoring_suggestion}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`*Generated by Vibeman Dependency Visualizer on ${new Date().toLocaleString()}*`);

  return lines.join('\n');
}
