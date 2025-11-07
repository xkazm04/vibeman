/**
 * Shared utilities for dependencies API routes
 */

import { NextResponse } from 'next/server';
import { projectDb } from '@/lib/project_database';

/**
 * Create error response
 */
export function createErrorResponse(message: string, details?: string, status = 500): NextResponse {
  return NextResponse.json(
    { error: message, details },
    { status }
  );
}

/**
 * Get project color based on project type
 */
export function getProjectColor(projectType: string): string {
  const colors: Record<string, string> = {
    nextjs: '#0070f3',
    fastapi: '#009688',
    react: '#61dafb',
    python: '#3776ab',
    nodejs: '#68a063',
    other: '#6c757d'
  };
  return colors[projectType] || colors.other;
}

/**
 * Get dependency color based on priority and conflicts
 */
export function getDependencyColor(priority: string | null, hasConflicts: boolean): string {
  if (hasConflicts) return '#ff6b6b';

  const colors: Record<string, string> = {
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#ffc107',
    low: '#28a745'
  };

  return colors[priority || 'low'] || '#888';
}

/**
 * Extract project summaries from project IDs
 */
export function extractProjectSummaries(projectIds: string[]) {
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
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

/**
 * Parse version conflicts from JSON string
 */
export function parseVersionConflicts(versionConflictsJson: string | null): Record<string, string> | null {
  if (!versionConflictsJson) return null;
  try {
    return JSON.parse(versionConflictsJson);
  } catch {
    return null;
  }
}
