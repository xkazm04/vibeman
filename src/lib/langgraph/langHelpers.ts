/**
 * LangGraph Helper Functions
 * Utility functions for the LangGraph pipeline
 */

import { LLMProvider, ToolCall, LangGraphState } from './langTypes';
import { OllamaClient } from '../llm/providers/ollama-client';
import { OpenAIClient } from '../llm/providers/openai-client';
import { AnthropicClient } from '../llm/providers/anthropic-client';
import { GeminiClient } from '../llm/providers/gemini-client';

/**
 * Gets the appropriate LLM client based on provider
 */
export function getLLMClient(provider: LLMProvider) {
  switch (provider) {
    case 'ollama':
      return new OllamaClient();
    case 'openai':
      return new OpenAIClient();
    case 'anthropic':
      return new AnthropicClient();
    case 'gemini':
      return new GeminiClient();
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Executes a tool by making API calls to internal endpoints
 */
export async function executeTool(
  toolName: string,
  parameters: Record<string, unknown>
): Promise<ToolCall> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    let endpoint = '';
    let method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET';
    let body: Record<string, unknown> | undefined;

    // ============= READ-ONLY OPERATIONS =============
    
    if (toolName === 'get_project_contexts') {
      endpoint = `${baseUrl}/api/contexts?projectId=${encodeURIComponent(parameters.projectId as string)}`;
    }
    else if (toolName === 'get_context_detail') {
      const queryParams = new URLSearchParams();
      if (parameters.contextId) queryParams.append('contextId', parameters.contextId as string);
      if (parameters.name) queryParams.append('name', parameters.name as string);
      if (parameters.projectId) queryParams.append('projectId', parameters.projectId as string);
      endpoint = `${baseUrl}/api/contexts/detail?${queryParams.toString()}`;
    }
    else if (toolName === 'get_all_projects') {
      endpoint = `${baseUrl}/api/projects`;
    }
    else if (toolName === 'get_project_backlog') {
      endpoint = `${baseUrl}/api/backlog?projectId=${encodeURIComponent(parameters.projectId as string)}`;
    }
    else if (toolName === 'get_folder_structure') {
      const projectPath = parameters.projectPath ? `?projectPath=${encodeURIComponent(parameters.projectPath as string)}` : '';
      endpoint = `${baseUrl}/api/kiro/folder-structure${projectPath}`;
    }
    else if (toolName === 'get_requirements_status') {
      endpoint = `${baseUrl}/api/requirements/status`;
    }
    else if (toolName === 'get_reviewer_pending_files') {
      endpoint = `${baseUrl}/api/reviewer/pending-files`;
    }

    // ============= PROJECT MANAGEMENT =============
    
    else if (toolName === 'create_project') {
      endpoint = `${baseUrl}/api/projects`;
      method = 'POST';
      body = parameters;
    }
    else if (toolName === 'update_project') {
      endpoint = `${baseUrl}/api/projects`;
      method = 'PUT';
      body = parameters;
    }
    else if (toolName === 'delete_project') {
      endpoint = `${baseUrl}/api/projects`;
      method = 'DELETE';
      body = { projectId: parameters.projectId };
    }

    // ============= CONTEXT & DOCUMENTATION =============
    
    else if (toolName === 'create_context') {
      endpoint = `${baseUrl}/api/contexts`;
      method = 'POST';
      body = parameters;
    }
    else if (toolName === 'update_context') {
      endpoint = `${baseUrl}/api/contexts`;
      method = 'PUT';
      body = parameters;
    }
    else if (toolName === 'delete_context') {
      endpoint = `${baseUrl}/api/contexts?contextId=${encodeURIComponent(parameters.contextId as string)}`;
      method = 'DELETE';
    }
    else if (toolName === 'generate_context') {
      endpoint = `${baseUrl}/api/kiro/generate-context`;
      method = 'POST';
      body = parameters;
    }

    // ============= TASK & BACKLOG MANAGEMENT =============
    
    else if (toolName === 'create_backlog_item') {
      endpoint = `${baseUrl}/api/backlog`;
      method = 'POST';
      body = parameters;
    }
    else if (toolName === 'update_backlog_item') {
      endpoint = `${baseUrl}/api/backlog`;
      method = 'PUT';
      body = parameters;
    }
    else if (toolName === 'delete_backlog_item') {
      endpoint = `${baseUrl}/api/backlog`;
      method = 'DELETE';
      body = { itemId: parameters.itemId };
    }

    // ============= FILE OPERATIONS =============
    
    else if (toolName === 'read_file_content') {
      endpoint = `${baseUrl}/api/kiro/file-content?filePath=${encodeURIComponent(parameters.filePath as string)}`;
    }
    else if (toolName === 'search_files') {
      const queryParams = new URLSearchParams({
        projectPath: parameters.projectPath as string,
        pattern: parameters.pattern as string
      });
      if (parameters.includeContent) queryParams.append('includeContent', String(parameters.includeContent));
      endpoint = `${baseUrl}/api/kiro/search-files?${queryParams.toString()}`;
    }

    // ============= AI-ASSISTED OPERATIONS =============
    
    else if (toolName === 'analyze_code_quality') {
      endpoint = `${baseUrl}/api/kiro/analyze-quality`;
      method = 'POST';
      body = parameters;
    }
    else if (toolName === 'generate_documentation') {
      endpoint = `${baseUrl}/api/kiro/generate-docs`;
      method = 'POST';
      body = parameters;
    }
    else if (toolName === 'suggest_improvements') {
      endpoint = `${baseUrl}/api/kiro/suggest-improvements`;
      method = 'POST';
      body = parameters;
    }

    // ============= MONITORING TOOLS =============
    
    else if (toolName === 'get_monitor_calls') {
      const queryParams = new URLSearchParams();
      if (parameters.status) queryParams.append('status', parameters.status as string);
      if (parameters.startDate) queryParams.append('startDate', parameters.startDate as string);
      if (parameters.endDate) queryParams.append('endDate', parameters.endDate as string);
      endpoint = `${baseUrl}/api/monitor/calls${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    }
    else if (toolName === 'get_monitor_statistics') {
      endpoint = `${baseUrl}/api/monitor/statistics`;
    }
    else if (toolName === 'evaluate_call_messages') {
      endpoint = `${baseUrl}/api/monitor/evaluate`;
      method = 'POST';
      body = { callId: parameters.callId };
    }
    else if (toolName === 'get_message_patterns') {
      endpoint = `${baseUrl}/api/monitor/patterns`;
    }
    
    else {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const fetchOptions: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    return {
      name: toolName,
      description: `Successfully executed ${toolName}`,
      parameters,
      result: data
    };
  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error);
    return {
      name: toolName,
      description: `Failed to execute ${toolName}`,
      parameters,
      result: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }
    };
  }
}

/**
 * Executes multiple tools in parallel
 */
export async function executeTools(
  toolsToUse: Array<{ name: string; parameters: Record<string, unknown> }>
): Promise<ToolCall[]> {
  const toolPromises = toolsToUse.map(tool => 
    executeTool(tool.name, tool.parameters)
  );
  
  return Promise.all(toolPromises);
}

/**
 * Parses JSON response from LLM with error handling
 */
export function parseJsonResponse(response: string): {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
} {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : response;
    
    // Clean up common issues
    const cleaned = jsonString
      .trim()
      .replace(/^[^{]*({)/,  '$1') // Remove text before first {
      .replace(/(})[^}]*$/, '$1'); // Remove text after last }
    
    const data = JSON.parse(cleaned);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
}

/**
 * Generates a response using the specified LLM provider
 */
export async function generateLLMResponse(
  provider: LLMProvider,
  model: string,
  prompt: string,
  taskType: string = 'general'
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    const client = getLLMClient(provider);
    
    const result = await client.generate({
      prompt,
      model,
      taskType
    });

    return {
      success: result.success,
      response: result.response,
      error: result.error
    };
  } catch (error) {
    console.error(`LLM generation error (${provider}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Creates initial LangGraph state
 */
export function createInitialState(
  message: string,
  projectId: string,
  provider: LLMProvider,
  model: string
): LangGraphState {
  return {
    message,
    projectId,
    provider,
    model,
    toolsUsed: [],
    response: '',
    step: 'analyze',
    needsConfirmation: false,
    confidence: 0
  };
}

/**
 * Validates LangGraph request
 */
export function validateRequest(request: Record<string, unknown>): {
  valid: boolean;
  error?: string;
} {
  if (!request.message || typeof request.message !== 'string') {
    return { valid: false, error: 'Message is required and must be a string' };
  }
  
  if (!request.projectId || typeof request.projectId !== 'string') {
    return { valid: false, error: 'Project ID is required and must be a string' };
  }
  
  if (!request.provider || typeof request.provider !== 'string' || !['ollama', 'openai', 'anthropic', 'gemini'].includes(request.provider)) {
    return { valid: false, error: 'Valid provider is required (ollama, openai, anthropic, or gemini)' };
  }
  
  if (!request.model || typeof request.model !== 'string') {
    return { valid: false, error: 'Model is required and must be a string' };
  }
  
  return { valid: true };
}
