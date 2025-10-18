'use client';
import { useState, useCallback } from 'react';

/**
 * Custom hook for managing hover state
 */
export const useHover = () => {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  const handleProjectHover = useCallback((projectId: string | null) => {
    setHoveredProject(projectId);
  }, []);

  return {
    hoveredProject,
    handleProjectHover
  };
};