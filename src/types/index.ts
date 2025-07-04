export interface Project {
  id: string;
  name: string;
  path: string;
  port: number;
  description?: string;
  allowMultipleInstances?: boolean;
  basePort?: number;
  instanceOf?: string;
  git?: {
    repository: string; // e.g., "owner/repo" or full GitHub URL
    branch: string; // e.g., "main", "develop"
    autoSync?: boolean; // Auto-pull on start
  };
}

export interface ProcessInfo {
  pid: number;
  port: number;
  status: 'running' | 'stopped' | 'error';
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
}

export interface BacklogProposal {
  id: string;
  agent: 'developer' | 'mastermind' | 'tester' | 'artist';
  title: string;
  description: string;
  timestamp: Date;
}

export interface CustomBacklogItem {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  type: 'custom';
}

export interface EventLogEntry {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
}

export interface AppState {
  activeTab: string;
  activeAgents: Set<string>;
  selectedNodes: Set<string>;
  eventLog: EventLogEntry[];
  backlogProposals: BacklogProposal[];
  customBacklogItems: CustomBacklogItem[];
}

export interface AppStore extends AppState {
  setActiveTab: (tabId: string) => void;
  toggleAgent: (agentId: string) => void;
  toggleNode: (nodeId: string) => void;
  addEvent: (event: EventLogEntry) => void;
  acceptProposal: (proposalId: string) => void;
  rejectProposal: (proposalId: string) => void;
  addCustomBacklogItem: (item: CustomBacklogItem) => void;
}