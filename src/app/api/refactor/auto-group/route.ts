/**
 * Refactor Auto-Group API
 * Automatically groups issues into logical refactoring packages
 */

import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';

interface Issue {
  id: string;
  file: string;
  type: string;
  severity: string;
  message: string;
  score: number;
  category: string;
}

interface Package {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  issues: Issue[];
  files: string[];
  estimatedEffort: 'small' | 'medium' | 'large';
  impact: 'high' | 'medium' | 'low';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, issues } = body;

    if (!projectPath || !issues) {
      return NextResponse.json(
        { error: 'projectPath and issues are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(issues) || issues.length === 0) {
      return NextResponse.json({
        success: true,
        packages: [],
        packageCount: 0,
      });
    }

    // Group issues using multiple strategies
    const packages = groupIssues(issues, projectPath);

    return NextResponse.json({
      success: true,
      packages,
      packageCount: packages.length,
      totalIssues: issues.length,
      summary: {
        highPriority: packages.filter(p => p.priority === 'high').length,
        mediumPriority: packages.filter(p => p.priority === 'medium').length,
        lowPriority: packages.filter(p => p.priority === 'low').length,
      },
    });
  } catch (error) {
    console.error('[Refactor Auto-Group] Error:', error);
    return NextResponse.json(
      { error: 'Auto-grouping failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function groupIssues(issues: Issue[], projectPath: string): Package[] {
  const packages: Package[] = [];
  const usedIssues = new Set<string>();

  // Strategy 1: Group by directory/module
  const directoryGroups = groupByDirectory(issues);
  for (const [dir, dirIssues] of Object.entries(directoryGroups)) {
    if (dirIssues.length >= 3) {
      const unusedIssues = dirIssues.filter(i => !usedIssues.has(i.id));
      if (unusedIssues.length >= 2) {
        const pkg = createPackage(
          `refactor-${dir.replace(/[\/\\]/g, '-')}`,
          `Refactor ${dir}`,
          `Address ${unusedIssues.length} issues in the ${dir} module`,
          unusedIssues
        );
        packages.push(pkg);
        unusedIssues.forEach(i => usedIssues.add(i.id));
      }
    }
  }

  // Strategy 2: Group by issue type
  const typeGroups = groupByType(issues);
  for (const [type, typeIssues] of Object.entries(typeGroups)) {
    const unusedIssues = typeIssues.filter(i => !usedIssues.has(i.id));
    if (unusedIssues.length >= 2) {
      const pkg = createPackage(
        `fix-${type}`,
        `Fix ${formatTypeName(type)} Issues`,
        `Address ${unusedIssues.length} ${formatTypeName(type).toLowerCase()} issues across the codebase`,
        unusedIssues
      );
      packages.push(pkg);
      unusedIssues.forEach(i => usedIssues.add(i.id));
    }
  }

  // Strategy 3: Group critical issues together
  const criticalIssues = issues.filter(i =>
    i.severity === 'critical' && !usedIssues.has(i.id)
  );
  if (criticalIssues.length >= 1) {
    const pkg = createPackage(
      'critical-fixes',
      'Critical Fixes',
      `Address ${criticalIssues.length} critical issues that need immediate attention`,
      criticalIssues
    );
    pkg.priority = 'high';
    packages.push(pkg);
    criticalIssues.forEach(i => usedIssues.add(i.id));
  }

  // Strategy 4: Group remaining issues by category
  const remainingIssues = issues.filter(i => !usedIssues.has(i.id));
  const categoryGroups = groupByCategory(remainingIssues);
  for (const [category, catIssues] of Object.entries(categoryGroups)) {
    if (catIssues.length >= 1) {
      const pkg = createPackage(
        `improve-${category.toLowerCase()}`,
        `Improve ${category}`,
        `Address ${catIssues.length} ${category.toLowerCase()} improvements`,
        catIssues
      );
      packages.push(pkg);
      catIssues.forEach(i => usedIssues.add(i.id));
    }
  }

  // Sort packages by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  packages.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return packages;
}

function groupByDirectory(issues: Issue[]): Record<string, Issue[]> {
  const groups: Record<string, Issue[]> = {};

  for (const issue of issues) {
    // Get top-level directory
    const parts = issue.file.split(/[\/\\]/);
    const dir = parts.length > 1 ? parts.slice(0, 2).join('/') : parts[0];

    if (!groups[dir]) {
      groups[dir] = [];
    }
    groups[dir].push(issue);
  }

  return groups;
}

function groupByType(issues: Issue[]): Record<string, Issue[]> {
  const groups: Record<string, Issue[]> = {};

  for (const issue of issues) {
    if (!groups[issue.type]) {
      groups[issue.type] = [];
    }
    groups[issue.type].push(issue);
  }

  return groups;
}

function groupByCategory(issues: Issue[]): Record<string, Issue[]> {
  const groups: Record<string, Issue[]> = {};

  for (const issue of issues) {
    const category = issue.category || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(issue);
  }

  return groups;
}

function createPackage(id: string, name: string, description: string, issues: Issue[]): Package {
  // Calculate priority based on issue severities
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;

  let priority: 'high' | 'medium' | 'low';
  if (criticalCount > 0 || highCount >= 3) {
    priority = 'high';
  } else if (highCount > 0 || issues.length >= 5) {
    priority = 'medium';
  } else {
    priority = 'low';
  }

  // Calculate estimated effort
  let effort: 'small' | 'medium' | 'large';
  const fileCount = new Set(issues.map(i => i.file)).size;
  if (fileCount <= 2 && issues.length <= 3) {
    effort = 'small';
  } else if (fileCount <= 5 && issues.length <= 8) {
    effort = 'medium';
  } else {
    effort = 'large';
  }

  // Calculate impact
  let impact: 'high' | 'medium' | 'low';
  const avgScore = issues.reduce((sum, i) => sum + i.score, 0) / issues.length;
  if (avgScore <= 40) {
    impact = 'high';
  } else if (avgScore <= 60) {
    impact = 'medium';
  } else {
    impact = 'low';
  }

  return {
    id,
    name,
    description,
    priority,
    issues,
    files: Array.from(new Set(issues.map(i => i.file))),
    estimatedEffort: effort,
    impact,
  };
}

function formatTypeName(type: string): string {
  const names: Record<string, string> = {
    'complexity': 'Complexity',
    'duplication': 'Duplication',
    'code-quality': 'Code Quality',
    'churn': 'Stability',
    'risk': 'Risk',
  };
  return names[type] || type.charAt(0).toUpperCase() + type.slice(1);
}
