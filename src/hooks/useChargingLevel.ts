import { useMemo, useEffect } from 'react';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

export const useChargingLevel = () => {
  // Use Zustand selectors to subscribe to specific state slices
  const processes = useServerProjectStore((state) => state.processes);
  const projects = useProjectConfigStore((state) => state.projects);

  const chargingLevel = useMemo(() => {
    // Maximum of 4 projects as specified
    const maxProjects = Math.min(projects.length, 4);

    if (maxProjects === 0) {
      return 0;
    }

    // Count running servers
    const projectsToCheck = projects.slice(0, 4);
    const runningServers = projectsToCheck.filter(project => {
      const process = processes[project.id];
      return process?.status === 'running';
    }).length;

    // Calculate percentage (25% per running server)
    return (runningServers / maxProjects) * 100;
  }, [processes, projects]);

  return chargingLevel;
}; 