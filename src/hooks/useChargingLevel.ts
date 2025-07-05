import { useMemo } from 'react';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

export const useChargingLevel = () => {
  const { getAllProcesses } = useServerProjectStore();
  const { getAllProjects } = useProjectConfigStore();
  
  const chargingLevel = useMemo(() => {
    const projects = getAllProjects();
    const processes = getAllProcesses();
    
    // Maximum of 4 projects as specified
    const maxProjects = Math.min(projects.length, 4);
    
    if (maxProjects === 0) return 0;
    
    // Count running servers
    const runningServers = projects
      .slice(0, 4) // Only consider first 4 projects
      .filter(project => {
        const process = processes[project.id];
        return process?.status === 'running';
      }).length;
    
    // Calculate percentage (25% per running server)
    return (runningServers / maxProjects) * 100;
  }, [getAllProcesses, getAllProjects]);
  
  return chargingLevel;
}; 