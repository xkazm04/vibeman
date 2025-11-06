/**
 * Context Store Type Definitions
 * Shared types for context and group management
 */

// Context Types
export interface ContextGroup {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Context {
  id: string;
  projectId: string;
  groupId: string | null; // Optional group assignment
  name: string;
  description?: string;
  filePaths: string[];
  createdAt: Date;
  updatedAt: Date;
  // Context file configuration
  hasContextFile?: boolean;
  contextFilePath?: string;
  // Preview image configuration
  preview?: string | null;
  // Testing configuration
  testScenario?: string | null;
  testUpdated?: string | null;
  // Additional fields from JOIN queries
  groupName?: string;
  groupColor?: string;
}

// Store State
export interface ContextState {
  contexts: Context[];
  groups: ContextGroup[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  selectedContextIds: Set<string>; // For backlog task generation
}

// Store Interface
export interface ContextStore extends ContextState {
  // Context operations
  addContext: (contextData: {
    projectId: string;
    groupId?: string | null;
    name: string;
    description?: string;
    filePaths: string[];
    hasContextFile?: boolean;
    contextFilePath?: string;
  }) => Promise<void>;
  removeContext: (contextId: string) => Promise<void>;
  updateContext: (contextId: string, updates: {
    name?: string;
    description?: string;
    filePaths?: string[];
    groupId?: string;
  }) => Promise<void>;
  moveContext: (contextId: string, newGroupId: string) => Promise<void>;

  // Group operations
  addGroup: (groupData: {
    projectId: string;
    name: string;
    color?: string;
  }) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  updateGroup: (groupId: string, updates: {
    name?: string;
    color?: string;
  }) => Promise<void>;

  // Context selection for backlog generation
  toggleContextSelection: (contextId: string) => void;
  setSelectedContext: (contextId: string) => void;
  clearContextSelection: () => void;
  selectAllContexts: () => void;

  // Data loading
  loadProjectData: (projectId: string) => Promise<void>;
  clearAllContexts: () => void;
  getContext: (contextId: string) => Context | undefined;
  getGroup: (groupId: string) => ContextGroup | undefined;
  getContextsByGroup: (groupId: string) => Context[];
}
