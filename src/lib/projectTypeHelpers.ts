/**
 * Client-safe Project Type Helpers
 *
 * These utilities work on both client and server side.
 * They don't use Node.js 'fs' module - just type checking.
 * For server-side detection, use projectTypeDetector.ts instead.
 */

import type { ProjectType } from '@/types';

/**
 * Check if a project type is a frontend type (React/NextJS).
 * Client-safe version - doesn't use fs.
 */
export function isFrontendType(type: ProjectType | undefined | null): boolean {
  if (!type) return false;
  return type === 'nextjs' || type === 'react';
}

/**
 * Check if a project type is a backend type.
 * Client-safe version - doesn't use fs.
 */
export function isBackendType(type: ProjectType | undefined | null): boolean {
  if (!type) return false;
  return ['express', 'fastapi', 'django', 'rails'].includes(type);
}

/**
 * Check if a project type is combined (full-stack).
 * Client-safe version - doesn't use fs.
 */
export function isCombinedType(type: ProjectType | undefined | null): boolean {
  return type === 'combined';
}

/**
 * Returns human-readable label for project type.
 * Client-safe version.
 */
export function getProjectTypeLabel(type: ProjectType | undefined | null): string {
  if (!type) return 'Unknown';

  const labels: Record<ProjectType, string> = {
    nextjs: 'Next.js',
    react: 'React',
    express: 'Express.js',
    fastapi: 'FastAPI',
    django: 'Django',
    rails: 'Ruby on Rails',
    generic: 'Generic',
    combined: 'Full-Stack',
  };
  return labels[type] || 'Unknown';
}

/**
 * Returns icon name (Lucide) for project type.
 * Client-safe version.
 */
export function getProjectTypeIcon(type: ProjectType | undefined | null): string {
  if (!type) return 'Folder';

  const icons: Record<ProjectType, string> = {
    nextjs: 'Triangle',
    react: 'Atom',
    express: 'Server',
    fastapi: 'Zap',
    django: 'Database',
    rails: 'Train',
    generic: 'Folder',
    combined: 'Layers',
  };
  return icons[type] || 'Folder';
}

/**
 * Returns theme color for project type badge.
 * Client-safe version.
 */
export function getProjectTypeColor(type: ProjectType | undefined | null): string {
  if (!type) return '#6B7280';

  const colors: Record<ProjectType, string> = {
    nextjs: '#000000',
    react: '#61DAFB',
    express: '#68A063',
    fastapi: '#009688',
    django: '#092E20',
    rails: '#CC0000',
    generic: '#6B7280',
    combined: '#8B5CF6',
  };
  return colors[type] || '#6B7280';
}
