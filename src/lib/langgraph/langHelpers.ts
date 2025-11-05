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

type EndpointConfig = {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>
};

/**
 * Creates endpoint with query parameters
 */
function buildGetEndpoint(baseUrl: string, path: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) {
    return `${baseUrl}${path}`;
  }

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${baseUrl}${path}?${queryString}` : `${baseUrl}${path}`;
}

/**
 * Creates POST/PUT/DELETE endpoint configuration
 */
function buildMutationEndpoint(
  baseUrl: string,
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, unknown>,
  queryParams?: Record<string, unknown>
): EndpointConfig {
  const endpoint = buildGetEndpoint(baseUrl, path, queryParams);
  return { endpoint, method, body };
}

/**
 * Build endpoint configuration for a given tool
 */
function buildEndpointConfig(
  toolName: string,
  parameters: Record<string, unknown>,
  baseUrl: string
): EndpointConfig {
  // READ-ONLY OPERATIONS
  const readOnlyEndpoints: Record<string, () => EndpointConfig> = {
    'get_project_contexts': () => ({
      endpoint: buildGetEndpoint(baseUrl, '/api/contexts', { projectId: parameters.projectId }),
      method: 'GET'
    }),
    'get_context_detail': () => ({
      endpoint: buildGetEndpoint(baseUrl, '/api/contexts/detail', {
        contextId: parameters.contextId,
        name: parameters.name,
        projectId: parameters.projectId
      }),
      method: 'GET'
    }),
    'get_all_projects': () => ({
      endpoint: buildGetEndpoint(baseUrl, '/api/projects'),
      method: 'GET'
    }),
    'get_project_backlog': () => ({
      endpoint: buildGetEndpoint(baseUrl, '/api/backlog', { projectId: parameters.projectId }),
      method: 'GET'
    }),
    'get_folder_structure': () => ({
      endpoint: buildGetEndpoint(baseUrl, '/api/kiro/folder-structure',
        parameters.projectPath ? { projectPath: parameters.projectPath } : undefined
      ),
      method: 'GET'
    }),
    'get_requirements_status': () => ({
      endpoint: buildGetEndpoint(baseUrl, '/api/requirements/status'),
      method: 'GET'
    }),
    'get_reviewer_pending_files': () => ({
      endpoint: buildGetEndpoint(baseUrl, '/api/reviewer/pending-files'),
      method: 'GET'
    }),
    'read_file_content': () => ({
      endpoint: buildGetEndpoint(baseUrl, '/api/kiro/file-content', { filePath: parameters.filePath }),
      method: 'GET'
    }),
    'search_files': () => ({
      endpoint: buildGetEndpoint(baseUrl, '/api/kiro/search-files', {
        projectPath: parameters.projectPath,
        pattern: parameters.pattern,
        includeContent: parameters.includeContent
      }),
      method: 'GET'
    }),
    'get_monitor_calls': () => ({
      endpoint: buildGetEndpoint(baseUrl, '/api/monitor/calls', {
        status: parameters.status,
        startDate: parameters.startDate,
        endDate: parameters.endDate
      }),
      method: 'GET'
    }),
    'get_monitor_statistics': () => ({
      endpoint: buildGetEndpoint(baseUrl, '/api/monitor/statistics'),
      method: 'GET'
    }),
    'get_message_patterns': () => ({
      endpoint: buildGetEndpoint(baseUrl, '/api/monitor/patterns'),
      method: 'GET'
    })
  };

  // MUTATION OPERATIONS (CREATE/UPDATE/DELETE)
  const mutationEndpoints: Record<string, () => EndpointConfig> = {
    'create_project': () => buildMutationEndpoint(baseUrl, '/api/projects', 'POST', parameters),
    'update_project': () => buildMutationEndpoint(baseUrl, '/api/projects', 'PUT', parameters),
    'delete_project': () => buildMutationEndpoint(baseUrl, '/api/projects', 'DELETE', { projectId: parameters.projectId }),
    'create_context': () => buildMutationEndpoint(baseUrl, '/api/contexts', 'POST', parameters),
    'update_context': () => buildMutationEndpoint(baseUrl, '/api/contexts', 'PUT', parameters),
    'delete_context': () => buildMutationEndpoint(baseUrl, '/api/contexts', 'DELETE', undefined, { contextId: parameters.contextId }),
    'generate_context': () => buildMutationEndpoint(baseUrl, '/api/kiro/generate-context', 'POST', parameters),
    'create_backlog_item': () => buildMutationEndpoint(baseUrl, '/api/backlog', 'POST', parameters),
    'update_backlog_item': () => buildMutationEndpoint(baseUrl, '/api/backlog', 'PUT', parameters),
    'delete_backlog_item': () => buildMutationEndpoint(baseUrl, '/api/backlog', 'DELETE', { itemId: parameters.itemId }),
    'analyze_code_quality': () => buildMutationEndpoint(baseUrl, '/api/kiro/analyze-quality', 'POST', parameters),
    'generate_documentation': () => buildMutationEndpoint(baseUrl, '/api/kiro/generate-docs', 'POST', parameters),
    'suggest_improvements': () => buildMutationEndpoint(baseUrl, '/api/kiro/suggest-improvements', 'POST', parameters),
    'evaluate_call_messages': () => buildMutationEndpoint(baseUrl, '/api/monitor/evaluate', 'POST', { callId: parameters.callId })
  };

  // Look up endpoint configuration
  const endpointBuilder = readOnlyEndpoints[toolName] || mutationEndpoints[toolName];

  if (!endpointBuilder) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return endpointBuilder();
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
    const { endpoint, method, body } = buildEndpointConfig(toolName, parameters, baseUrl);

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
