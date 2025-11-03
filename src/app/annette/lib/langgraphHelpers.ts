import { LogEntry, ConfirmationState, LangGraphResponse } from './typesAnnette';

export interface ProjectContext {
  name?: string;
  path?: string;
  [key: string]: unknown;
}

export interface ToolUsage {
  name: string;
  [key: string]: unknown;
}

/**
 * Sends a message to the LangGraph orchestrator API
 */
export async function sendToLangGraph(
  message: string,
  projectId: string,
  projectContext: ProjectContext
): Promise<LangGraphResponse> {
  const response = await fetch('/api/annette/langgraph', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      projectId,
      projectContext
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Processes the LangGraph response and extracts relevant information
 */
export function processLangGraphResponse(
  result: LangGraphResponse,
  addLog: (type: LogEntry['type'], message: string, data?: unknown) => void
): void {
  if (result.userIntent) {
    addLog('system', `User Intent: ${result.userIntent}`);
  }
  if (result.confidence) {
    addLog('system', `Confidence: ${result.confidence}%`);
  }
  if (result.analysis) {
    addLog('system', `Analysis: ${result.analysis}`);
  }
  if (result.toolsUsed && result.toolsUsed.length > 0) {
    result.toolsUsed.forEach((tool: ToolUsage) => {
      addLog('tool', `Tool used: ${tool.name}`, tool);
    });
  }
}

/**
 * Creates a confirmation state from LangGraph response
 */
export function createConfirmationState(
  result: LangGraphResponse,
  originalMessage: string,
  projectContext: ProjectContext
): ConfirmationState {
  return {
    isWaiting: true,
    question: result.confirmationQuestion || '',
    type: result.confirmationType || 'yes_no',
    toolsToUse: result.toolsToUse || [],
    originalMessage,
    projectContext
  };
}

/**
 * Resets confirmation state to default
 */
export function resetConfirmationState(): ConfirmationState {
  return {
    isWaiting: false,
    question: '',
    type: 'yes_no',
    toolsToUse: [],
    originalMessage: '',
    projectContext: null
  };
}
