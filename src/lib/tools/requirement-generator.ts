/**
 * Requirement Generator Tool
 *
 * Reusable tool for generating Claude Code requirement files from implementation plans.
 * Can be used in Manager, Annette, or any other feature that needs to create requirements.
 *
 * Usage:
 * ```typescript
 * import { generateRequirementFile } from '@/lib/tools/requirement-generator';
 *
 * const result = await generateRequirementFile({
 *   contextId: 'ctx-123',
 *   projectId: 'proj-456',
 *   projectPath: '/path/to/project',
 *   description: 'User input describing what to implement',
 *   provider: 'gemini',
 *   title: 'Optional title',
 * });
 * ```
 */

import { SupportedProvider } from '@/lib/llm/types';

/**
 * Input parameters for requirement generation
 */
export interface RequirementGeneratorInput {
  /** Context ID to fetch context description */
  contextId?: string;
  /** Project ID for context lookup */
  projectId?: string;
  /** Path to the project for requirement file creation */
  projectPath: string;
  /** User description of what to implement */
  description: string;
  /** LLM provider to use */
  provider: SupportedProvider;
  /** Optional title for the task (used in requirement filename) */
  title?: string;
  /** Optional advisor type (improve, optimize, refactor, enhance) */
  advisorType?: 'improve' | 'optimize' | 'refactor' | 'enhance';
  /** Optional previous overview (for iterative improvements) */
  previousOverview?: string;
  /** Optional previous bullets (for iterative improvements) */
  previousBullets?: string;
}

/**
 * Result of requirement generation
 */
export interface RequirementGeneratorResult {
  success: boolean;
  requirementName?: string;
  plan?: string;
  error?: string;
}

/**
 * Fetch context description from API
 */
async function fetchContextDescription(
  contextId: string,
  projectId?: string
): Promise<string | undefined> {
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
    console.error('[RequirementGenerator] Error fetching context:', error);
  }
  return undefined;
}

/**
 * Build implementation plan prompt
 */
function buildImplementationPlanPrompt(
  userInput: string,
  contextDescription?: string,
  previousOverview?: string,
  previousBullets?: string
): string {
  let prompt = `You are an expert software analyst helping create a detailed implementation plan.

**Context Description:**
${contextDescription || 'No context provided'}

`;

  if (previousOverview) {
    prompt += `**Previous Overview:**
${previousOverview}

`;
  }

  if (previousBullets) {
    prompt += `**Previous Implementation Points:**
${previousBullets}

`;
  }

  prompt += `**User Request:**
${userInput}

**Your Task:**
Generate a clear, actionable implementation plan for Claude Code to execute. The plan should:

1. **Be Specific**: Include exact file paths, function names, and code locations
2. **Be Structured**: Use clear sections and bullet points
3. **Be Complete**: Cover all necessary changes and considerations
4. **Include Context**: Reference relevant code patterns and architecture
5. **Be Executable**: Claude Code should understand exactly what to do

**Format your response as a structured implementation plan with:**
- Overview section
- Step-by-step implementation details
- Technical considerations
- Testing approach

Do not include any preamble or meta-commentary. Start directly with the implementation plan.`;

  return prompt;
}

/**
 * Call LLM via API to generate implementation plan
 */
async function generatePlanWithLLM(
  prompt: string,
  provider: SupportedProvider
): Promise<string> {
  const response = await fetch('/api/llm/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      provider,
      maxTokens: 2000,
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
 * Generate requirement filename
 */
function generateRequirementName(
  title?: string,
  advisorType?: 'improve' | 'optimize' | 'refactor' | 'enhance'
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const prefix = advisorType ? `${advisorType}-` : '';
  const sanitizedTitle = title
    ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)
    : 'task';

  return `${prefix}${sanitizedTitle}-${timestamp}.md`;
}

/**
 * Create requirement file via API
 */
async function createRequirementFile(
  plan: string,
  projectPath: string,
  requirementName: string
): Promise<void> {
  const response = await fetch('/api/claude-code/requirement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      requirementName,
      content: plan,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to create requirement');
  }
}

/**
 * Generate requirement file from user description
 *
 * This is the main function that:
 * 1. Fetches context description if contextId provided
 * 2. Generates LLM-based implementation plan
 * 3. Creates Claude Code requirement file
 *
 * @param input - Configuration for requirement generation
 * @returns Result with success status and created requirement name
 */
export async function generateRequirementFile(
  input: RequirementGeneratorInput
): Promise<RequirementGeneratorResult> {
  try {
    console.log('[RequirementGenerator] Starting generation');
    console.log('[RequirementGenerator] Provider:', input.provider);
    console.log('[RequirementGenerator] Description length:', input.description?.length);

    // Validate inputs
    if (!input.description || input.description.trim().length === 0) {
      throw new Error('Description is required');
    }

    if (!input.projectPath) {
      throw new Error('Project path is required');
    }

    // Fetch context description if contextId provided
    let contextDescription: string | undefined;
    if (input.contextId) {
      contextDescription = await fetchContextDescription(input.contextId, input.projectId);
      console.log('[RequirementGenerator] Context description fetched:', !!contextDescription);
    }

    // Build prompt and generate plan
    const prompt = buildImplementationPlanPrompt(
      input.description,
      contextDescription,
      input.previousOverview,
      input.previousBullets
    );
    console.log('[RequirementGenerator] Calling LLM...');

    const plan = await generatePlanWithLLM(prompt, input.provider);
    console.log('[RequirementGenerator] Plan generated, length:', plan.length);

    // Validate plan
    if (!plan || plan.trim().length === 0) {
      throw new Error('Generated plan is empty');
    }

    // Generate requirement name
    const requirementName = generateRequirementName(input.title, input.advisorType);
    console.log('[RequirementGenerator] Requirement name:', requirementName);

    // Create requirement file
    await createRequirementFile(plan, input.projectPath, requirementName);
    console.log('[RequirementGenerator] Requirement file created successfully');

    return {
      success: true,
      requirementName,
      plan,
    };
  } catch (error) {
    console.error('[RequirementGenerator] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate implementation plan only (without creating requirement file)
 * Useful when you just want the plan text for preview or manual processing
 */
export async function generateImplementationPlan(
  description: string,
  provider: SupportedProvider,
  options?: {
    contextId?: string;
    projectId?: string;
    previousOverview?: string;
    previousBullets?: string;
  }
): Promise<string> {
  console.log('[RequirementGenerator] Generating plan only');

  // Fetch context description if contextId provided
  let contextDescription: string | undefined;
  if (options?.contextId) {
    contextDescription = await fetchContextDescription(
      options.contextId,
      options.projectId
    );
  }

  // Build prompt and generate plan
  const prompt = buildImplementationPlanPrompt(
    description,
    contextDescription,
    options?.previousOverview,
    options?.previousBullets
  );

  return await generatePlanWithLLM(prompt, provider);
}
