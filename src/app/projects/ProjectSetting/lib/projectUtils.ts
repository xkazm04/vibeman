import { Code, Server, FolderOpen } from 'lucide-react';
import { Project } from '@/types';

export const getProjectTypeIcon = (type?: string) => {
  switch (type) {
    case 'nextjs':
      return { icon: Code, color: 'text-blue-400', label: 'Next.js' };
    case 'fastapi':
      return { icon: Server, color: 'text-green-400', label: 'FastAPI' };
    default:
      return { icon: FolderOpen, color: 'text-gray-400', label: 'Project' };
  }
};

export const getProjectTypeLabel = (type?: string) => {
  switch (type) {
    case 'nextjs':
      return 'Next.js';
    case 'fastapi':
      return 'FastAPI';
    default:
      return 'Other';
  }
};

export const getProjectTypeConfig = (type?: string) => {
  switch (type) {
    case 'nextjs':
      return { icon: Code, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' };
    case 'fastapi':
      return { icon: Server, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' };
    default:
      return { icon: FolderOpen, color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30' };
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