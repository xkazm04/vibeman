export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'user' | 'system' | 'tool' | 'llm';
  message: string;
  data?: any;
  audioUrl?: string;
  audioError?: string;
  audioLoading?: boolean;
}

export interface ConfirmationState {
  isWaiting: boolean;
  question: string;
  type: 'yes_no' | 'clarification';
  toolsToUse: any[];
  originalMessage: string;
  projectContext: any;
}

export interface LangGraphRequest {
  message: string;
  projectId: string;
  projectContext: any;
}

export interface LangGraphResponse {
  needsConfirmation?: boolean;
  confirmationQuestion?: string;
  confirmationType?: 'yes_no';
  toolsToUse?: any[];
  toolsUsed?: any[];
  response: string;
  confidence?: number;
  userIntent?: string;
  analysis?: string;
}

export interface ConfirmationRequest {
  confirmed: boolean;
  toolsToUse: any[];
  originalMessage: string;
  projectContext: any;
}