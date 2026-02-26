import { Project, ProjectType } from '@/types';
import { projectDb, DbProject } from './project_database';

// Helper function to handle errors consistently
function handleError(context: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[ProjectServiceDb] ${context}: ${errorMessage}`);
}

// Map legacy 'other' type to 'generic'
function normalizeProjectType(type: string | null | undefined): ProjectType {
  if (!type || type === 'other') return 'generic';
  return type as ProjectType;
}

// Convert DbProject to Project type
function dbProjectToProject(dbProject: DbProject): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    path: dbProject.path,
    port: dbProject.port ?? undefined,
    workspaceId: dbProject.workspace_id || undefined,
    type: normalizeProjectType(dbProject.type),
    relatedProjectId: dbProject.related_project_id || undefined,
    allowMultipleInstances: dbProject.allow_multiple_instances === 1,
    basePort: dbProject.base_port || dbProject.port || undefined,
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
      handleError('Error getting all projects', error);
      return [];
    }
  }
  
  async getProject(projectId: string): Promise<Project | undefined> {
    try {
      const dbProject = projectDb.getProject(projectId);
      return dbProject ? dbProjectToProject(dbProject) : undefined;
    } catch (error) {
      handleError(`Error getting project ${projectId}`, error);
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

      // Port validation: only check if port is provided
      // Port uniqueness is now scoped to workspace
      if (project.port != null) {
        const isPortAvailable = projectDb.isPortAvailableInWorkspace(
          project.port,
          project.workspaceId || null
        );
        if (!isPortAvailable) {
          throw new Error(`Port ${project.port} is already in use by another project in this workspace`);
        }
      }

      // Create the project
      projectDb.createProject({
        id: project.id,
        name: project.name,
        path: project.path,
        port: project.port ?? null,
        workspace_id: project.workspaceId || null,
        type: project.type,
        related_project_id: project.relatedProjectId,
        git_repository: project.git?.repository,
        git_branch: project.git?.branch,
        run_script: project.runScript || 'npm run dev',
        allow_multiple_instances: project.allowMultipleInstances,
        base_port: project.basePort,
        instance_of: project.instanceOf
      });
    } catch (error) {
      handleError(`Error adding project ${project.name}`, error);
      throw error;
    }
  }
  
  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    try {
      // Get existing project to check workspace
      const existingProject = projectDb.getProject(projectId);
      if (!existingProject) {
        throw new Error('Project not found');
      }

      // Validate unique constraints if path is being updated
      if (updates.path) {
        const existingByPath = projectDb.getProjectByPath(updates.path);
        if (existingByPath && existingByPath.id !== projectId) {
          throw new Error(`A project with the same path already exists: ${existingByPath.name}`);
        }
      }

      // Port validation: only check if port is provided and different
      // Port uniqueness is now scoped to workspace
      if (updates.port !== undefined && updates.port !== existingProject.port) {
        if (updates.port != null) {
          const workspaceId = updates.workspaceId !== undefined
            ? updates.workspaceId
            : existingProject.workspace_id;
          const isPortAvailable = projectDb.isPortAvailableInWorkspace(
            updates.port,
            workspaceId || null,
            projectId
          );
          if (!isPortAvailable) {
            throw new Error(`Port ${updates.port} is already in use by another project in this workspace`);
          }
        }
      }

      // Prepare update data
      const updateData: {
        name?: string;
        path?: string;
        port?: number | null;
        workspace_id?: string | null;
        type?: string;
        related_project_id?: string;
        git_repository?: string;
        git_branch?: string;
        run_script?: string;
        allow_multiple_instances?: boolean;
        base_port?: number;
      } = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.path !== undefined) updateData.path = updates.path;
      if (updates.port !== undefined) updateData.port = updates.port;
      if (updates.workspaceId !== undefined) updateData.workspace_id = updates.workspaceId;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.relatedProjectId !== undefined && updates.relatedProjectId) updateData.related_project_id = updates.relatedProjectId;
      if (updates.runScript !== undefined) updateData.run_script = updates.runScript;
      if (updates.allowMultipleInstances !== undefined) updateData.allow_multiple_instances = updates.allowMultipleInstances;
      if (updates.basePort !== undefined) updateData.base_port = updates.basePort;
      if (updates.git !== undefined) {
        if (updates.git?.repository) updateData.git_repository = updates.git.repository;
        if (updates.git?.branch) updateData.git_branch = updates.git.branch;
      }

      const result = projectDb.updateProject(projectId, updateData);
      if (!result) {
        throw new Error('Project not found');
      }
    } catch (error) {
      handleError(`Error updating project ${projectId}`, error);
      throw error;
    }
  }
  
  async removeProject(projectId: string): Promise<void> {
    try {
      const success = projectDb.deleteProject(projectId);
      if (!success) {
        throw new Error('Project not found');
      }
    } catch (error) {
      handleError(`Error removing project ${projectId}`, error);
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
    } catch (error) {
      handleError('Error resetting to defaults', error);
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

      // Find next available port within the workspace
      const basePort = baseProject.basePort || baseProject.port || 3000;
      const port = customPort || projectDb.getNextAvailablePortInWorkspace(basePort, baseProject.workspaceId || null);

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
      handleError(`Error creating project instance for ${baseProjectId}`, error);
      return null;
    }
  }
  
  async getProjectInstances(baseProjectId: string): Promise<Project[]> {
    try {
      const dbProjects = projectDb.getProjectInstances(baseProjectId);
      return dbProjects.map(dbProjectToProject);
    } catch (error) {
      handleError(`Error getting project instances for ${baseProjectId}`, error);
      return [];
    }
  }
  
  async isPortAvailable(port: number, excludeProjectId?: string): Promise<boolean> {
    try {
      return projectDb.isPortAvailable(port, excludeProjectId);
    } catch (error) {
      handleError(`Error checking port availability for ${port}`, error);
      return false;
    }
  }

  async isPortAvailableInWorkspace(port: number, workspaceId: string | null, excludeProjectId?: string): Promise<boolean> {
    try {
      return projectDb.isPortAvailableInWorkspace(port, workspaceId, excludeProjectId);
    } catch (error) {
      handleError(`Error checking port availability for ${port} in workspace`, error);
      return false;
    }
  }

  async isPathAvailable(path: string, excludeProjectId?: string): Promise<boolean> {
    try {
      return projectDb.isPathAvailable(path, excludeProjectId);
    } catch (error) {
      handleError(`Error checking path availability for ${path}`, error);
      return false;
    }
  }

  async getNextAvailablePortInWorkspace(basePort: number, workspaceId: string | null): Promise<number> {
    try {
      return projectDb.getNextAvailablePortInWorkspace(basePort, workspaceId);
    } catch (error) {
      handleError(`Error getting next available port in workspace`, error);
      return basePort;
    }
  }

  async setProjectWorkspace(projectId: string, workspaceId: string | null): Promise<boolean> {
    try {
      return projectDb.setProjectWorkspace(projectId, workspaceId);
    } catch (error) {
      handleError(`Error setting workspace for project ${projectId}`, error);
      return false;
    }
  }
}

export const projectServiceDb = ProjectServiceDb.getInstance();