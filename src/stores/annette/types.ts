import type { AnnetteNotification } from '@/lib/annette/notificationEngine';

export interface QuickOption {
  label: string;
  message: string;
}

export interface CLIExecutionInfo {
  showCLI: boolean;
  requirementName: string;
  projectPath: string;
  projectId: string;
  executionId?: string;
  autoStart: boolean;
}

export interface DecisionEvent {
  action: 'accepted' | 'dismissed' | 'snoozed' | 'arrived';
  notificationType: AnnetteNotification['type'];
  notificationTitle: string;
  notificationMessage: string;
  suggestedAction?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{ name: string; input: Record<string, unknown>; result?: string }>;
  tokensUsed?: { input: number; output: number; total: number };
  quickOptions?: QuickOption[];
  cliExecutions?: CLIExecutionInfo[];
  decisionEvent?: DecisionEvent;
  timestamp: string;
  isStreaming?: boolean;
}

export interface ConversationBranch {
  id: string;
  editedAtIndex: number;
  originalText: string;
  messages: ChatMessage[];
  timestamp: string;
}
