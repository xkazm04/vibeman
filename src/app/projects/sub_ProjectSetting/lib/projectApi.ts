import { Project } from '@/types';
import { logger } from '@/lib/logger';

// Fetch projects directly from API
export const fetchProjectsDirectly = async (): Promise<Project[]> => {
  try {
    const response = await fetch('/api/projects');
    if (response.ok) {
      const data = await response.json();
      return data.projects || [];
    } else {
      logger.error('Failed to fetch projects', { status: response.status });
    }
  } catch (error) {
    logger.error('Failed to fetch projects', { error });
  }
  return [];
};

// Delete project via API
export const deleteProject = async (projectId: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/projects', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.success;
    } else {
      logger.error('Failed to delete project', { status: response.status, projectId });
      return false;
    }
  } catch (error) {
    logger.error('Failed to delete project', { error, projectId });
    return false;
  }
};

// Get related project from projects list
export const getRelatedProject = (projects: Project[], projectId?: string): Project | null => {
  if (!projectId) return null;
  return projects.find(p => p.id === projectId) || null;
};

// Get connected projects
export const getConnectedProjects = (projects: Project[], project: Project): Project[] => {
  return projects.filter(p =>
    p.relatedProjectId === project.id || project.relatedProjectId === p.id
  );
};