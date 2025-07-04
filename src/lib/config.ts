import { Project } from '@/types';

// Base projects that can be instantiated multiple times
export const baseProjects: Project[] = [
  {
    id: 'vibeman-app',
    name: 'Vibeman App',
    path: 'C:\\Users\\kazda\\mk\\vibeman',
    port: 3001,
    description: 'Main Vibeman application',
    allowMultipleInstances: true,
    basePort: 3001,
    git: {
      repository: 'https://github.com/yourusername/vibeman.git',
      branch: 'main',
      autoSync: true
    }
  },
  {
    id: 'first-app',
    name: 'First App',
    path: 'C:\\Users\\kazda\\mk\\first',
    port: 3002,
    description: 'First test application',
    allowMultipleInstances: true,
    basePort: 3002,
    git: {
      repository: 'https://github.com/yourusername/first-app.git',
      branch: 'develop',
      autoSync: false
    }
  },
  {
    id: 'test-project',
    name: 'Test Project',
    path: 'C:\\Users\\kazda\\mk\\test-project',
    port: 3003,
    description: 'Additional test project',
    allowMultipleInstances: false,
    basePort: 3003
    // No git config - not all projects need to be git-enabled
  }
];

// This app's neighbor project
export const neighborProject: Project = {
  id: 'app-manager-neighbor',
  name: 'App Manager (Secondary)',
  path: process.cwd(), // Current directory - where this app manager is running
  port: 3100,
  description: 'Secondary instance of App Manager',
  allowMultipleInstances: true,
  basePort: 3100
};

// Dynamic project instances storage
let projectInstances: Map<string, Project> = new Map();

// Initialize with base projects
baseProjects.forEach(project => {
  projectInstances.set(project.id, project);
});

// Add neighbor project
projectInstances.set(neighborProject.id, neighborProject);

export const getProjectById = (id: string): Project | undefined => {
  return projectInstances.get(id);
};

export const getAllProjects = (): Project[] => {
  return Array.from(projectInstances.values());
};

export const createProjectInstance = (baseProjectId: string, customPort?: number): Project | null => {
  const baseProject = baseProjects.find(p => p.id === baseProjectId) || 
                     (baseProjectId === neighborProject.id ? neighborProject : null);
  
  if (!baseProject || !baseProject.allowMultipleInstances) {
    return null;
  }

  // Find next available port
  const usedPorts = new Set(
    Array.from(projectInstances.values()).map(p => p.port)
  );
  
  let newPort = customPort || baseProject.basePort || baseProject.port;
  while (usedPorts.has(newPort)) {
    newPort++;
  }

  const instanceId = `${baseProject.id}-instance-${Date.now()}`;
  const newInstance: Project = {
    ...baseProject,
    id: instanceId,
    name: `${baseProject.name} (Port ${newPort})`,
    port: newPort,
    instanceOf: baseProject.id
  };

  projectInstances.set(instanceId, newInstance);
  return newInstance;
};

export const removeProjectInstance = (instanceId: string): boolean => {
  const project = projectInstances.get(instanceId);
  if (project && project.instanceOf) {
    return projectInstances.delete(instanceId);
  }
  return false;
};

// Get all instances of a base project
export const getProjectInstances = (baseProjectId: string): Project[] => {
  return Array.from(projectInstances.values()).filter(
    p => p.id === baseProjectId || p.instanceOf === baseProjectId
  );
};

// Check if a port is available
export const isPortAvailable = (port: number): boolean => {
  const usedPorts = Array.from(projectInstances.values()).map(p => p.port);
  return !usedPorts.includes(port);
};