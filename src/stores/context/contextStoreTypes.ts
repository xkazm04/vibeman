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
  accentColor?: string; // Optional accent color for gradient transitions
  position: number;
  type?: 'pages' | 'client' | 'server' | 'external' | null; // Architecture layer type
  icon?: string | null; // Icon name for visual representation
  healthScore?: number | null; // Code health score (0-100) from last scan
  lastScanAt?: Date | null; // Timestamp of last health scan
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
  // Target / Goal
  target?: string | null;
  target_fulfillment?: string | null;
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
    groupId?: string | null;
    target?: string | null;
    target_fulfillment?: string | null;
  }) => Promise<void>;
  moveContext: (contextId: string, newGroupId: string | null) => Promise<void>;
  flushPendingMoves: () => Promise<void>;

  // Group operations
  addGroup: (groupData: {
    projectId: string;
    name: string;
    color?: string;
    icon?: string;
  }) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  updateGroup: (groupId: string, updates: {
    name?: string;
    color?: string;
    type?: 'pages' | 'client' | 'server' | 'external' | null;
    icon?: string;
  }) => Promise<void>;

  // Context selection for backlog generation
  toggleContextSelection: (contextId: string) => void;
  setSelectedContext: (contextId: string) => void;
  clearContextSelection: () => void;
  selectAllContexts: () => void;

  // Data loading
  loadProjectData: (projectId: string, signal?: AbortSignal) => Promise<void>;
  clearAllContexts: () => void;
  getContext: (contextId: string) => Context | undefined;
  getGroup: (groupId: string) => ContextGroup | undefined;
  getContextsByGroup: (groupId: string) => Context[];
}
