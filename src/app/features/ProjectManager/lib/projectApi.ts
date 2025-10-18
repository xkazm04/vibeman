import { ProjectOverviewItem } from '../types';

/**
 * Fetch all projects from the API
 */
export const fetchProjects = async (): Promise<ProjectOverviewItem[]> => {
  try {
    const response = await fetch('/api/projects');
    if (response.ok) {
      const data = await response.json();
      return data.projects || [];
    }
    throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    throw error;
  }
};

/**
 * Get project type color classes
 */
export const getProjectTypeColor = (type: string): string => {
  switch (type) {
    case 'nextjs':
      return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
    case 'fastapi':
      return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
    default:
      return 'from-blue-500/20 to-red-500/20 border-blue-500/30';
  }
};

/**
 * Calculate server uptime in seconds
 */
export const calculateUptime = (startTime: string): number => {
  return Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
};