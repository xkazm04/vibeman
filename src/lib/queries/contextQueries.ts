import { contextDb, contextGroupDb, DbContext, DbContextGroup } from '@/app/db'
import { CONTEXT_GROUP_COLORS } from '@/lib/constants/contextColors'

// Context Group Types
export interface ContextGroup {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

// Context Types
export interface Context {
  id: string;
  projectId: string;
  groupId: string | null; // Allow null for ungrouped contexts
  name: string;
  description?: string;
  filePaths: string[];
  createdAt: Date;
  updatedAt: Date;
  // Context file configuration
  hasContextFile?: boolean;
  contextFilePath?: string;
  // Preview and testing configuration
  preview?: string;
  testScenario?: string;
  testUpdated?: string;
  // Additional fields from JOIN queries
  groupName?: string;
  groupColor?: string;
}

/**
 * Logger for context operations
 */
const logger = {
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ContextQueries] ${message}`, ...args);
  }
};

/**
 * Safe error wrapper for async operations
 */
async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(errorMessage, error);
    throw new Error(errorMessage);
  }
}

// Helper function to convert DB context group to app context group
function dbContextGroupToContextGroup(dbGroup: DbContextGroup): ContextGroup {
  return {
    id: dbGroup.id,
    projectId: dbGroup.project_id,
    name: dbGroup.name,
    color: dbGroup.color,
    position: dbGroup.position,
    createdAt: new Date(dbGroup.created_at),
    updatedAt: new Date(dbGroup.updated_at),
  };
}

// Helper function to convert DB context to app context
function dbContextToContext(dbContext: DbContext & { group_name?: string; group_color?: string }): Context {
  return {
    id: dbContext.id,
    projectId: dbContext.project_id,
    groupId: dbContext.group_id,
    name: dbContext.name,
    description: dbContext.description || undefined,
    filePaths: JSON.parse(dbContext.file_paths),
    hasContextFile: Boolean(dbContext.has_context_file),
    contextFilePath: dbContext.context_file_path || undefined,
    preview: dbContext.preview || undefined,
    testScenario: dbContext.test_scenario || undefined,
    testUpdated: dbContext.test_updated || undefined,
    createdAt: new Date(dbContext.created_at),
    updatedAt: new Date(dbContext.updated_at),
    groupName: dbContext.group_name,
    groupColor: dbContext.group_color,
  };
}

// Context Group Queries
export const contextGroupQueries = {
  // Get all context groups for a project
  getGroupsByProject: async (projectId: string): Promise<ContextGroup[]> => {
    return handleAsyncOperation(
      async () => {
        const dbGroups = contextGroupDb.getGroupsByProject(projectId);
        return dbGroups.map(dbContextGroupToContextGroup);
      },
      'Failed to fetch context groups'
    );
  },

  // Create a new context group
  createGroup: async (data: {
    projectId: string;
    name: string;
    color?: string;
  }): Promise<ContextGroup> => {
    try {
      // Check if we've reached the maximum number of groups (9)
      const groupCount = contextGroupDb.getGroupCount(data.projectId);
      if (groupCount >= 9) {
        throw new Error('Maximum of 9 context groups allowed');
      }

      // Get the next position
      const maxPosition = contextGroupDb.getMaxPosition(data.projectId);

      // Auto-assign color if not provided
      const color = data.color || CONTEXT_GROUP_COLORS[groupCount % CONTEXT_GROUP_COLORS.length];

      const groupData = {
        id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        project_id: data.projectId,
        name: data.name,
        color,
        position: maxPosition + 1,
      };

      const dbGroup = contextGroupDb.createGroup(groupData);
      return dbContextGroupToContextGroup(dbGroup);
    } catch (error) {
      logger.error('Failed to create context group:', error);
      throw error;
    }
  },

  // Update a context group
  updateGroup: async (groupId: string, updates: {
    name?: string;
    color?: string;
    position?: number;
  }): Promise<ContextGroup | null> => {
    return handleAsyncOperation(
      async () => {
        const dbGroup = contextGroupDb.updateGroup(groupId, updates);
        return dbGroup ? dbContextGroupToContextGroup(dbGroup) : null;
      },
      'Failed to update context group'
    );
  },

  // Delete a context group
  deleteGroup: async (groupId: string): Promise<boolean> => {
    return handleAsyncOperation(
      async () => contextGroupDb.deleteGroup(groupId),
      'Failed to delete context group'
    );
  },

  // Get group count for a project
  getGroupCount: async (projectId: string): Promise<number> => {
    try {
      return contextGroupDb.getGroupCount(projectId);
    } catch (error) {
      logger.error('Failed to get group count:', error);
      return 0;
    }
  },
};

// Context Queries
export const contextQueries = {
  // Get all contexts for a project
  getContextsByProject: async (projectId: string): Promise<Context[]> => {
    return handleAsyncOperation(
      async () => {
        const dbContexts = contextDb.getContextsByProject(projectId);
        return dbContexts.map(dbContextToContext);
      },
      'Failed to fetch contexts'
    );
  },

  // Get contexts by group
  getContextsByGroup: async (groupId: string): Promise<Context[]> => {
    return handleAsyncOperation(
      async () => {
        const dbContexts = contextDb.getContextsByGroup(groupId);
        return dbContexts.map(dbContextToContext);
      },
      'Failed to fetch contexts'
    );
  },

  // Create a new context
  createContext: async (data: {
    projectId: string;
    groupId: string | null;
    name: string;
    description?: string;
    filePaths: string[];
  }): Promise<Context> => {
    return handleAsyncOperation(
      async () => {
        const contextData = {
          id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          project_id: data.projectId,
          group_id: data.groupId,
          name: data.name,
          description: data.description,
          file_paths: data.filePaths,
        };

        const dbContext = contextDb.createContext(contextData);
        return dbContextToContext(dbContext);
      },
      'Failed to create context'
    );
  },

  // Update a context
  updateContext: async (contextId: string, updates: {
    name?: string;
    description?: string;
    filePaths?: string[];
    groupId?: string;
  }): Promise<Context | null> => {
    return handleAsyncOperation(
      async () => {
        const updateData = {
          name: updates.name,
          description: updates.description,
          file_paths: updates.filePaths,
          group_id: updates.groupId,
        };

        const dbContext = contextDb.updateContext(contextId, updateData);
        return dbContext ? dbContextToContext(dbContext) : null;
      },
      'Failed to update context'
    );
  },

  // Delete a context
  deleteContext: async (contextId: string): Promise<boolean> => {
    return handleAsyncOperation(
      async () => contextDb.deleteContext(contextId),
      'Failed to delete context'
    );
  },

  // Move context to different group
  moveContextToGroup: async (contextId: string, newGroupId: string): Promise<Context | null> => {
    return handleAsyncOperation(
      async () => {
        const dbContext = contextDb.moveContextToGroup(contextId, newGroupId);
        return dbContext ? dbContextToContext(dbContext) : null;
      },
      'Failed to move context'
    );
  },

  // Get context count for a group
  getContextCountByGroup: async (groupId: string): Promise<number> => {
    try {
      return contextDb.getContextCountByGroup(groupId);
    } catch (error) {
      logger.error('Failed to get context count:', error);
      return 0;
    }
  },
};

// Combined queries for convenience
export const contextOperations = {
  // Get all data for a project (groups and contexts)
  getProjectContextData: async (projectId: string): Promise<{
    groups: ContextGroup[];
    contexts: Context[];
  }> => {
    return handleAsyncOperation(
      async () => {
        const [groups, contexts] = await Promise.all([
          contextGroupQueries.getGroupsByProject(projectId),
          contextQueries.getContextsByProject(projectId),
        ]);

        return { groups, contexts };
      },
      'Failed to fetch project context data'
    );
  },

  // Create a context with automatic group creation if needed
  createContextWithGroup: async (data: {
    projectId: string;
    groupName?: string;
    contextName: string;
    description?: string;
    filePaths: string[];
  }): Promise<{ group: ContextGroup; context: Context }> => {
    try {
      let group: ContextGroup;

      if (data.groupName) {
        // Try to find existing group or create new one
        const existingGroups = await contextGroupQueries.getGroupsByProject(data.projectId);
        const existingGroup = existingGroups.find(g => g.name === data.groupName);

        if (existingGroup) {
          group = existingGroup;
        } else {
          group = await contextGroupQueries.createGroup({
            projectId: data.projectId,
            name: data.groupName,
          });
        }
      } else {
        // Create a default group if none exists
        const existingGroups = await contextGroupQueries.getGroupsByProject(data.projectId);
        if (existingGroups.length === 0) {
          group = await contextGroupQueries.createGroup({
            projectId: data.projectId,
            name: 'Default',
          });
        } else {
          group = existingGroups[0]; // Use first available group
        }
      }

      const context = await contextQueries.createContext({
        projectId: data.projectId,
        groupId: group.id,
        name: data.contextName,
        description: data.description,
        filePaths: data.filePaths,
      });

      return { group, context };
    } catch (error) {
      logger.error('Failed to create context with group:', error);
      throw error;
    }
  },
};