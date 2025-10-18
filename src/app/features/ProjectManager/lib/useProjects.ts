'use client';
import { useState, useEffect, useCallback } from 'react';
import { ProjectOverviewItem } from '../types';
import { fetchProjects } from './projectApi';

/**
 * Custom hook for managing projects
 */
export const useProjects = () => {
  const [projects, setProjects] = useState<ProjectOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectOverviewItem | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectData = await fetchProjects();
        setProjects(projectData);
        
        // Auto-select first project if available
        if (projectData.length > 0) {
          setSelectedProject(projectData[0]);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  const handleProjectSelect = useCallback((project: ProjectOverviewItem) => {
    setSelectedProject(project);
  }, []);

  return {
    projects,
    loading,
    selectedProject,
    handleProjectSelect
  };
};