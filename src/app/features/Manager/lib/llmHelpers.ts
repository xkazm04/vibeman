/**
 * LLM Helper Functions
 * Handles LLM calls for advisors and analyst via API routes
 */

import { SupportedProvider } from '@/lib/llm/types';
import { AdvisorType, LLMPromptContext, EnrichedImplementationLog, NewTaskPromptContext } from './types';
import { buildAdvisorPrompt, buildAnalystPrompt, generateRequirementName, buildNewTaskAdvisorPrompt, buildNewTaskAnalystPrompt } from './promptTemplates';
import { wrapRequirementForExecution } from '@/lib/prompts/requirement_file';

/**
 * Call LLM via API route (server-side execution)
 */
async function callLLMApi(prompt: string, provider: SupportedProvider, maxTokens: number): Promise<string> {
  const response = await fetch('/api/llm/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      provider,
      maxTokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'LLM API call failed');
  }

  const data = await response.json();

  if (!data.success || !data.response) {
    throw new Error('LLM returned empty response');
  }

  return data.response;
}

/**
 * Get context description from API
 */
async function getContextDescription(contextId: string, projectId?: string): Promise<string | undefined> {
  try {
    const queryParams = new URLSearchParams({ contextId });
    if (projectId) {
      queryParams.append('projectId', projectId);
    }

    const response = await fetch(`/api/contexts/detail?${queryParams.toString()}`);
    if (response.ok) {
      const data = await response.json();
      return data.data?.description || undefined;
    }
  } catch (error) {
    console.error('Error fetching context:', error);
  }
  return undefined;
}

/**
 * Generate advisor suggestion using LLM
 */
export async function generateAdvisorSuggestion(
  log: EnrichedImplementationLog,
  advisorType: AdvisorType,
  userInput: string,
  provider: SupportedProvider
): Promise<string> {
  console.log('[Advisor] Starting generation with provider:', provider);

  // Fetch context description if available
  const contextDescription = log.context_id
    ? await getContextDescription(log.context_id, log.project_id)
    : undefined;

  // Build prompt context
  const promptContext: LLMPromptContext = {
    contextDescription,
    previousOverview: log.overview,
    previousBullets: log.overview_bullets || undefined,
    userInput: userInput || undefined,
  };

  // Build advisor prompt
  const prompt = buildAdvisorPrompt(advisorType, promptContext);
  console.log('[Advisor] Prompt built, calling LLM...');

  // Call LLM via API
  const response = await callLLMApi(prompt, provider, 300);

  console.log('[Advisor] LLM response:', response);

  return response;
}

/**
 * Generate implementation plan using analyst LLM
 */
export async function generateImplementationPlan(
  log: EnrichedImplementationLog,
  userInput: string,
  provider: SupportedProvider
): Promise<string> {
  console.log('[Analyst] Starting generation with provider:', provider);
  console.log('[Analyst] User input:', userInput);

  // Fetch context description if available
  const contextDescription = log.context_id
    ? await getContextDescription(log.context_id, log.project_id)
    : undefined;

  // Build prompt context
  const promptContext: LLMPromptContext = {
    contextDescription,
    previousOverview: log.overview,
    previousBullets: log.overview_bullets || undefined,
    userInput,
  };

  // Build analyst prompt
  const prompt = buildAnalystPrompt(promptContext);
  console.log('[Analyst] Prompt built, calling LLM...');

  // Call LLM via API with higher token limit for detailed plan
  const response = await callLLMApi(prompt, provider, 2000);

  console.log('[Analyst] LLM response:', response);

  return response;
}

/**
 * Create requirement file from LLM-generated plan
 */
export async function createRequirementFromPlan(
  log: EnrichedImplementationLog,
  plan: string,
  projectPath: string,
  advisorType?: AdvisorType
): Promise<{ success: boolean; requirementName?: string; error?: string }> {
  try {
    console.log('[CreateRequirement] Plan length:', plan?.length);
    console.log('[CreateRequirement] Plan preview:', plan?.substring(0, 100));

    // Validate plan
    if (!plan || plan.trim().length === 0) {
      throw new Error('Plan is empty or undefined');
    }

    // Generate requirement name
    const requirementName = generateRequirementName(log.title, advisorType);
    console.log('[CreateRequirement] Requirement name:', requirementName);

    // Wrap plan content with execution instructions
    const wrappedContent = wrapRequirementForExecution({
      requirementContent: plan,
      projectPath,
      projectId: log.project_id,
      contextId: log.context_id || undefined,
      // Note: projectPort and runScript would come from project config if needed
    });

    console.log('[CreateRequirement] Wrapped content length:', wrappedContent.length);

    // Create requirement using API
    const response = await fetch('/api/claude-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        action: 'create-requirement',
        requirementName,
        content: wrappedContent,
      }),
    });

    console.log('[CreateRequirement] API response status:', response.status);

    if (!response.ok) {
      const data = await response.json();
      console.log('[CreateRequirement] API error:', data);
      throw new Error(data.error || 'Failed to create requirement');
    }

    return { success: true, requirementName };
  } catch (error) {
    console.error('Error creating requirement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate advisor suggestion for new task using LLM
 */
export async function generateNewTaskAdvisorSuggestion(
  advisorType: AdvisorType,
  userInput: string,
  contextId: string | undefined,
  projectId: string | undefined,
  provider: SupportedProvider
): Promise<string> {
  console.log('[NewTaskAdvisor] Starting generation with provider:', provider);

  // Fetch context description if available
  const contextDescription = contextId
    ? await getContextDescription(contextId, projectId)
    : undefined;

  // Build prompt context
  const promptContext: NewTaskPromptContext = {
    contextDescription,
    userInput,
  };

  // Build advisor prompt
  const prompt = buildNewTaskAdvisorPrompt(advisorType, promptContext);
  console.log('[NewTaskAdvisor] Prompt built, calling LLM...');

  // Call LLM via API
  const response = await callLLMApi(prompt, provider, 300);

  console.log('[NewTaskAdvisor] LLM response:', response);

  return response;
}

/**
 * Generate implementation plan for new task using analyst LLM
 * Supports multiproject analysis (e.g., separated frontend/backend)
 */
export async function generateNewTaskImplementationPlan(
  userInput: string,
  contextId: string | undefined,
  projectId: string | undefined,
  provider: SupportedProvider,
  secondaryProjectId?: string,
  secondaryContextId?: string
): Promise<string> {
  console.log('[NewTaskAnalyst] Starting generation with provider:', provider);
  console.log('[NewTaskAnalyst] Multiproject mode:', !!secondaryProjectId);

  // Fetch primary context description if available
  const contextDescription = contextId
    ? await getContextDescription(contextId, projectId)
    : undefined;

  // Fetch secondary context description if multiproject mode
  const secondaryContextDescription = secondaryContextId
    ? await getContextDescription(secondaryContextId, secondaryProjectId)
    : undefined;

  // Build prompt context with multiproject support
  const promptContext: NewTaskPromptContext = {
    contextDescription,
    userInput,
    secondaryContextDescription,
    isMultiproject: !!secondaryProjectId,
  };

  // Build analyst prompt (will include both codebases if multiproject)
  const prompt = buildNewTaskAnalystPrompt(promptContext);
  console.log('[NewTaskAnalyst] Prompt built, calling LLM...');

  // Call LLM via API with higher token limit for detailed plan
  const response = await callLLMApi(prompt, provider, 2000);

  console.log('[NewTaskAnalyst] LLM response:', response);

  return response;
}
