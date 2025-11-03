import { Project } from '@/types';
import { projectDb, DbProject } from './project_database';

// Helper function to handle errors consistently
function handleError(context: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  // In production, this could integrate with a logging service
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ProjectServiceDb] ${context}:`, error);
  }
}

// Convert DbProject to Project type
function dbProjectToProject(dbProject: DbProject): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    path: dbProject.path,
    port: dbProject.port,
    type: (dbProject.type as 'nextjs' | 'fastapi' | 'other') || 'other',
    relatedProjectId: dbProject.related_project_id || undefined,
    allowMultipleInstances: dbProject.allow_multiple_instances === 1,
    basePort: dbProject.base_port || dbProject.port,
    instanceOf: dbProject.instance_of || undefined,
    runScript: dbProject.run_script,
    git: dbProject.git_repository ? {
      repository: dbProject.git_repository,
      branch: dbProject.git_branch,
      autoSync: false // No longer stored in DB
    } : undefined
  };
}

// SQLite-based project configuration service
class ProjectServiceDb {
  private static instance: ProjectServiceDb;
  
  private constructor() {}
  
  static getInstance(): ProjectServiceDb {
    if (!ProjectServiceDb.instance) {
      ProjectServiceDb.instance = new ProjectServiceDb();
    }
    return ProjectServiceDb.instance;
  }
  
  async getAllProjects(): Promise<Project[]> {
    try {
      const dbProjects = projectDb.getAllProjects();
      return dbProjects.map(dbProjectToProject);
    } catch (error) {
      console.error('ProjectServiceDb: Error getting all projects:', error);
      return [];
    }
  }
  
  async getProject(projectId: string): Promise<Project | undefined> {
    try {
      const dbProject = projectDb.getProject(projectId);
      return dbProject ? dbProjectToProject(dbProject) : undefined;
    } catch (error) {
      console.error(`ProjectServiceDb: Error getting project ${projectId}:`, error);
      return undefined;
    }
  }
  
  async addProject(project: Project): Promise<void> {
    try {
      // Validate unique constraints
      const existingByPath = projectDb.getProjectByPath(project.path);
      if (existingByPath) {
        throw new Error(`A project with the same path already exists: ${existingByPath.name}`);
      }
      
      const existingByPort = projectDb.getProjectByPort(project.port);
      if (existingByPort) {
        throw new Error(`Port ${project.port} is already in use by: ${existingByPort.name}`);
      }
      
      // Create the project
      projectDb.createProject({
        id: project.id,
        name: project.name,
        path: project.path,
        port: project.port,
        type: project.type,
        related_project_id: project.relatedProjectId,
        git_repository: project.git?.repository,
        git_branch: project.git?.branch,
        run_script: project.runScript || 'npm run dev',
        allow_multiple_instances: project.allowMultipleInstances,
        base_port: project.basePort,
        instance_of: project.instanceOf
      });
      
      console.log(`ProjectServiceDb: Added project ${project.name} (${project.id})`);
    } catch (error) {
      console.error(`ProjectServiceDb: Error adding project ${project.name}:`, error);
      throw error;
    }
  }
  
  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    try {
      // Validate unique constraints if path or port are being updated
      if (updates.path) {
        const existingByPath = projectDb.getProjectByPath(updates.path);
        if (existingByPath && existingByPath.id !== projectId) {
          throw new Error(`A project with the same path already exists: ${existingByPath.name}`);
        }
      }
      
      if (updates.port) {
        const existingByPort = projectDb.getProjectByPort(updates.port);
        if (existingByPort && existingByPort.id !== projectId) {
          throw new Error(`Port ${updates.port} is already in use by: ${existingByPort.name}`);
        }
      }
      
      // Prepare update data
      const updateData: Partial<DbProject> = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.path !== undefined) updateData.path = updates.path;
      if (updates.port !== undefined) updateData.port = updates.port;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.relatedProjectId !== undefined) updateData.related_project_id = updates.relatedProjectId;
      if (updates.runScript !== undefined) updateData.run_script = updates.runScript;
      if (updates.allowMultipleInstances !== undefined) updateData.allow_multiple_instances = updates.allowMultipleInstances ? 1 : 0;
      if (updates.basePort !== undefined) updateData.base_port = updates.basePort;
      if (updates.git !== undefined) {
        updateData.git_repository = updates.git?.repository || null;
        updateData.git_branch = updates.git?.branch || null;
      }
      
      const result = projectDb.updateProject(projectId, updateData);
      if (!result) {
        throw new Error('Project not found');
      }
      
      console.log(`ProjectServiceDb: Updated project ${projectId}`);
    } catch (error) {
      console.error(`ProjectServiceDb: Error updating project ${projectId}:`, error);
      throw error;
    }
  }
  
  async removeProject(projectId: string): Promise<void> {
    try {
      const success = projectDb.deleteProject(projectId);
      if (!success) {
        throw new Error('Project not found');
      }
      
      console.log(`ProjectServiceDb: Removed project ${projectId}`);
    } catch (error) {
      console.error(`ProjectServiceDb: Error removing project ${projectId}:`, error);
      throw error;
    }
  }
  
  async resetToDefaults(): Promise<void> {
    try {
      // Get all projects and delete them
      const projects = projectDb.getAllProjects();
      for (const project of projects) {
        projectDb.deleteProject(project.id);
      }
      
      console.log('ProjectServiceDb: Reset to defaults (empty database)');
    } catch (error) {
      console.error('ProjectServiceDb: Error resetting to defaults:', error);
      throw error;
    }
  }
  
  // Helper methods for project instances
  async createProjectInstance(baseProjectId: string, customPort?: number): Promise<Project | null> {
    try {
      const baseProject = await this.getProject(baseProjectId);
      if (!baseProject || !baseProject.allowMultipleInstances) {
        return null;
      }
      
      // Find next available port
      const port = customPort || projectDb.getNextAvailablePort(baseProject.basePort || baseProject.port);
      
      const instanceId = `${baseProject.id}-instance-${Date.now()}`;
      const newInstance: Project = {
        ...baseProject,
        id: instanceId,
        name: `${baseProject.name} (Port ${port})`,
        port: port,
        instanceOf: baseProject.id
      };
      
      await this.addProject(newInstance);
      return newInstance;
    } catch (error) {
      console.error(`ProjectServiceDb: Error creating project instance for ${baseProjectId}:`, error);
      return null;
    }
  }
  
  async getProjectInstances(baseProjectId: string): Promise<Project[]> {
    try {
      const dbProjects = projectDb.getProjectInstances(baseProjectId);
      return dbProjects.map(dbProjectToProject);
    } catch (error) {
      console.error(`ProjectServiceDb: Error getting project instances for ${baseProjectId}:`, error);
      return [];
    }
  }
  
  async isPortAvailable(port: number, excludeProjectId?: string): Promise<boolean> {
    try {
      return projectDb.isPortAvailable(port, excludeProjectId);
    } catch (error) {
      console.error(`ProjectServiceDb: Error checking port availability for ${port}:`, error);
      return false;
    }
  }
  
  async isPathAvailable(path: string, excludeProjectId?: string): Promise<boolean> {
    try {
      return projectDb.isPathAvailable(path, excludeProjectId);
    } catch (error) {
      console.error(`ProjectServiceDb: Error checking path availability for ${path}:`, error);
      return false;
    }
  }
}

export const projectServiceDb = ProjectServiceDb.getInstance();