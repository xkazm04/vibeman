/**
 * LangGraph Type Definitions
 * Centralized types for the LangGraph pipeline system
 */

export type LLMProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini';

export interface ToolCall {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  result: unknown;
}

export interface LangGraphState {
  message: string;
  projectId: string;
  provider: LLMProvider;
  model: string;
  toolsUsed: ToolCall[];
  response: string;
  step: 'analyze' | 'tool_selection' | 'tool_execution' | 'response_generation' | 'complete' | 'awaiting_confirmation';
  needsConfirmation: boolean;
  confirmationType?: 'yes_no' | 'clarification';
  confirmationQuestion?: string;
  confidence: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      items?: { type: string };
    }>;
    required: string[];
  };
}

export interface AnalysisResult {
  userIntent: string;
  needsTools: boolean;
  toolsToUse?: Array<{
    name: string;
    parameters: Record<string, unknown>;
  }>;
  reasoning: string;
  confidence: number;
  needsConfirmation: boolean;
  confirmationType?: 'yes_no' | 'clarification';
  confirmationQuestion?: string;
  alternatives?: string[];
  isDestructive?: boolean;
}

export interface LangGraphRequest {
  message: string;
  projectId: string;
  projectContext?: Record<string, unknown>;
  provider: LLMProvider;
  model: string;
  userConfirmation?: boolean;
}

export interface LangGraphResponse {
  success: boolean;
  response: string;
  toolsUsed: ToolCall[];
  analysis?: string;
  userIntent?: string;
  confidence: number;
  needsConfirmation: boolean;
  confirmationType?: 'yes_no' | 'clarification';
  confirmationQuestion?: string;
  toolsToUse?: Array<{name: string; parameters: Record<string, unknown>}>;
  reasoning?: string;
  alternatives?: string[];
  steps?: string[];
  error?: string;
  isDestructive?: boolean;
}

export interface ConfirmationState {
  isWaiting: boolean;
  question: string;
  type: 'yes_no' | 'clarification';
  toolsToUse: Array<{name: string; parameters: Record<string, unknown>}>;
  originalMessage: string;
  projectContext: Record<string, unknown>;
}
