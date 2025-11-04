export interface ToolInfo {
  name: string;
  args?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProjectContext {
  id?: string;
  name?: string;
  path?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'user' | 'system' | 'tool' | 'llm';
  message: string;
  data?: Record<string, unknown>;
  audioUrl?: string;
  audioError?: string;
  audioLoading?: boolean;
}

export interface ConfirmationState {
  isWaiting: boolean;
  question: string;
  type: 'yes_no' | 'clarification';
  toolsToUse: ToolInfo[];
  originalMessage: string;
  projectContext: ProjectContext;
}

export interface LangGraphRequest {
  message: string;
  projectId: string;
  projectContext: ProjectContext;
}

export interface LangGraphResponse {
  needsConfirmation?: boolean;
  confirmationQuestion?: string;
  confirmationType?: 'yes_no';
  toolsToUse?: ToolInfo[];
  toolsUsed?: ToolInfo[];
  response: string;
  confidence?: number;
  userIntent?: string;
  analysis?: string;
  [key: string]: unknown;
}

export interface ConfirmationRequest {
  confirmed: boolean;
  toolsToUse: ToolInfo[];
  originalMessage: string;
  projectContext: ProjectContext;
}