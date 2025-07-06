import { useMemo, useEffect } from 'react';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

export const useChargingLevel = () => {
  // Use Zustand selectors to subscribe to specific state slices
  const processes = useServerProjectStore((state) => state.processes);
  const projects = useProjectConfigStore((state) => state.projects);
  
  // Debug the raw data
  useEffect(() => {
    console.log('useChargingLevel: Raw data update', {
      processesCount: Object.keys(processes).length,
      processesKeys: Object.keys(processes),
      projectsCount: projects.length,
      projectsData: projects.map(p => ({ id: p.id, name: p.name, port: p.port }))
    });
  }, [processes, projects]);
  
  const chargingLevel = useMemo(() => {
    console.log('useChargingLevel: Calculating charging level...');
    
    // Maximum of 4 projects as specified
    const maxProjects = Math.min(projects.length, 4);
    
    if (maxProjects === 0) {
      console.log('useChargingLevel: No projects, returning 0');
      return 0;
    }
    
    // Count running servers
    const projectsToCheck = projects.slice(0, 4);
    const runningServers = projectsToCheck.filter(project => {
      const process = processes[project.id];
      const isRunning = process?.status === 'running';
      console.log(`useChargingLevel: Project ${project.id} (${project.name}) - Status: ${process?.status || 'not found'}, Running: ${isRunning}`);
      return isRunning;
    }).length;
    
    // Calculate percentage (25% per running server)
    const level = (runningServers / maxProjects) * 100;
    
    // Comprehensive debug logging
    console.log('useChargingLevel: Calculation complete', {
      totalProjects: projects.length,
      maxProjects,
      runningServers,
      level,
      processesInStore: Object.keys(processes),
      projectsConsidered: projectsToCheck.map(p => ({
        id: p.id,
        name: p.name,
        processStatus: processes[p.id]?.status || 'not found',
        isRunning: processes[p.id]?.status === 'running'
      }))
    });
    
    return level;
  }, [processes, projects]);
  
  // Debug effect to track changes
  useEffect(() => {
    console.log('useChargingLevel: Charging level changed to:', chargingLevel);
  }, [chargingLevel]);
  
  return chargingLevel;
}; 