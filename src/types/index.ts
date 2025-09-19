export interface Project {
  id: string;
  name: string;
  path: string;
  port: number;
  description?: string;
  type?: 'nextjs' | 'fastapi' | 'other';
  relatedProjectId?: string; // For FastAPI projects connected to NextJS
  allowMultipleInstances?: boolean;
  basePort?: number;
  instanceOf?: string;
  git?: {
    repository: string; // e.g., "owner/repo" or full GitHub URL
    branch: string; // e.g., "main", "develop"
    autoSync?: boolean; // Auto-pull on start
  };
  runScript?: string;
}

export interface ProcessInfo {
  pid: number;
  port: number;
  status: 'running' | 'stopped' | 'error' | 'stopping';
  startTime?: Date;
  logs: string[];
}

export interface ProjectInstance {
  project: Project;
  status: ProcessInfo | null;
}

export interface GitStatus {
  hasChanges: boolean;
  ahead: number;
  behind: number;
  currentBranch: string;
  lastFetch?: Date;
  error?: string;
}

// AI Agentic UI Types
export interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  description: string;
  detailedDescription: string;
  children?: TreeNode[];
  path?: string; // Optional path property for compatibility
}

export interface ImpactedFile {
  filepath: string;
  type: 'update' | 'create' | 'delete';
}

export interface BacklogProposal {
  id: string;
  agent: 'developer' | 'mastermind' | 'tester' | 'artist';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'pending' | 'accepted' | 'rejected' | 'in_progress';
  steps?: string[]; // Array of implementation steps
  impactedFiles?: ImpactedFile[]; // Array of file objects with filepath and type
}

export interface CustomBacklogItem {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  type: 'custom';
  steps?: string[]; // Array of implementation steps
  impactedFiles?: ImpactedFile[]; // Array of file objects with filepath and type
}

export interface EventLogEntry {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
  timestamp: Date;
  agent?: string;
  message?: string;
  rawMessage?: string; // For modal display of full event data
}

export interface AppState {
  activeTab: string;
  activeAgents: Set<string>;
  selectedNodes: Set<string>;
  highlightedNodes: Set<string>; // New: nodes highlighted by backlog items
  eventLog: EventLogEntry[];
  backlogProposals: BacklogProposal[];
  inProgressProposals: BacklogProposal[]; // New: accepted proposals in progress
  customBacklogItems: CustomBacklogItem[];
}

export interface Goal {
  id: string;
  projectId: string;
  order: number;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  // Database fields (optional for compatibility)
  created_at?: string;
  updated_at?: string;
}

export interface AppStore extends AppState {
  setActiveTab: (tabId: string) => void;
  toggleAgent: (agentId: string) => void;
  toggleNode: (nodeId: string) => void;
  highlightNodes: (nodeIds: string[]) => void; // New: highlight specific nodes
  clearHighlights: () => void; // New: clear all highlights
  clearSelection: () => void; // New: clear all selected nodes
  selectFilesByPaths: (filePaths: string[], fileStructure: TreeNode | null) => void; // New: select files by paths
  addEvent: (event: EventLogEntry) => void;
  acceptProposal: (proposalId: string) => void;
  rejectProposal: (proposalId: string) => void;
  addCustomBacklogItem: (item: CustomBacklogItem) => void;
  moveToInProgress: (proposalId: string) => void; // New: move accepted proposals to in-progress
  getSelectedFilePaths: (fileStructure: TreeNode | null, activeProjectId: string | null) => string[]; // New: get selected file paths
}

// Database-related types
export interface DatabaseGoal {
  id: string;
  project_id: string;
  order_index: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  created_at: string;
  updated_at: string;
}

export interface DatabaseBacklogItem {
  id: string;
  project_id: string;
  goal_id: string | null;
  agent: 'developer' | 'mastermind' | 'tester' | 'artist' | 'custom';
  title: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress';
  type: 'proposal' | 'custom';
  impacted_files: ImpactedFile[] | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
}