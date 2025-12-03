/**
 * Implementation Plan Analyzer (IT Analyst)
 *
 * An LLM-based analyzer that generates detailed implementation plans
 * from user input. Unlike other analyzers that scan files for issues,
 * this analyzer uses AI to create actionable development plans.
 *
 * Features:
 * - Accepts custom user input describing what needs to be done
 * - Context-aware plan generation using project context descriptions
 * - Multiproject support for frontend/backend coordination
 * - LLM provider selection (OpenAI, Anthropic, Gemini, Ollama)
 * - Generates Claude Code-ready requirement documents
 *
 * @example
 * ```typescript
 * import { ImplementationPlanAnalyzer } from '@/lib/blueprint';
 *
 * const analyzer = new ImplementationPlanAnalyzer();
 * await analyzer.initialize({
 *   userInput: 'Add a dark mode toggle to the settings page',
 *   contextId: 'context-123',
 *   projectId: 'proj-456',
 *   provider: 'anthropic',
 * });
 *
 * const result = await analyzer.execute(undefined, context);
 * // result contains the implementation plan as markdown
 * ```
 */

import { BaseComponent } from '../base/BaseComponent';
import { ExecutionContext, ValidationResult, AnalyzerProjectMetadata } from '../../types';

/**
 * Supported LLM providers
 */
export type SupportedProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'groq' | 'internal';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the Implementation Plan Analyzer
 */
export interface ImplementationPlanAnalyzerConfig {
  /** User's description of what needs to be implemented */
  userInput: string;

  /** Context ID for fetching project context description */
  contextId?: string;

  /** Project ID for the primary project */
  projectId?: string;

  /** LLM provider to use for generation */
  provider: SupportedProvider;

  /** Secondary project ID for multiproject mode */
  secondaryProjectId?: string;

  /** Secondary context ID for multiproject mode */
  secondaryContextId?: string;

  /** Maximum tokens for LLM response (default: 2000) */
  maxTokens?: number;

  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Output from the Implementation Plan Analyzer
 */
export interface ImplementationPlanOutput {
  /** The generated implementation plan in markdown format */
  plan: string;

  /** Whether multiproject mode was used */
  isMultiproject: boolean;

  /** Token usage information */
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
}

/**
 * Context selection interface for UI integration
 */
export interface ContextSelection {
  /** Primary context for the plan */
  primary: {
    projectId: string;
    projectPath: string;
    contextId?: string;
    contextName?: string;
    contextDescription?: string;
  };

  /** Optional secondary context for multiproject mode */
  secondary?: {
    projectId: string;
    projectPath: string;
    contextId?: string;
    contextName?: string;
    contextDescription?: string;
  };
}

// ============================================================================
// Prompt Templates
// ============================================================================

const SINGLE_PROJECT_PROMPT = `You are a software development analyst. Your task is to generate a detailed implementation plan for Claude Code execution based on a new feature idea.

The implementation plan should be comprehensive and include:
1. Clear objective and goals
2. Step-by-step implementation instructions
3. Files to be created or modified
4. Technical specifications and requirements
5. Testing considerations
6. Expected outcomes

{{#if contextDescription}}
## Context Reference

{{contextDescription}}

{{/if}}
## Feature Idea

{{userInput}}

---

Generate a comprehensive Claude Code requirement document for implementing the requested feature. The document should be clear, actionable, and ready for autonomous execution.

Format the response as a markdown document with the following structure:

# [Title]

## Objective
[Clear statement of what needs to be accomplished]

## Implementation Steps
1. [Step 1]
2. [Step 2]
...

## Files to Modify/Create
- \`path/to/file1.ts\` - [Description]
- \`path/to/file2.tsx\` - [Description]

## Technical Specifications
[Detailed technical requirements]

## Testing
[Testing approach and scenarios]

## Expected Outcomes
[What should be achieved after implementation]`;

const MULTIPROJECT_PROMPT = `You are a software development analyst. Your task is to generate a detailed implementation plan for Claude Code execution based on a new feature idea.

**IMPORTANT:** This is a MULTIPROJECT request involving TWO separate codebases (e.g., frontend + backend). Your implementation plan must cover BOTH projects and coordinate changes across them.

The implementation plan should be comprehensive and include:
1. Clear objective and goals
2. Coordination strategy between projects
3. Step-by-step implementation instructions for BOTH projects
4. Files to be created or modified in BOTH projects
5. Technical specifications and requirements for BOTH projects
6. Testing considerations (integration tests between projects)
7. Expected outcomes

{{#if primaryContextDescription}}
## Primary Project Context

{{primaryContextDescription}}

{{/if}}
{{#if secondaryContextDescription}}
## Secondary Project Context

{{secondaryContextDescription}}

**Note:** These are TWO separate codebases that need to work together. Consider API contracts, data flow, and integration points between them.

{{/if}}
## Feature Idea

{{userInput}}

---

Generate a comprehensive Claude Code requirement document for implementing the requested feature across BOTH projects. The document should be clear, actionable, and ready for autonomous execution.

Format the response as a markdown document with the following structure:

# [Title]

## Objective
[Clear statement of what needs to be accomplished across both projects]

## Cross-Project Coordination
[How the two projects will interact: API endpoints, data contracts, shared types, etc.]

## Implementation Steps - Primary Project
1. [Step 1]
2. [Step 2]
...

## Implementation Steps - Secondary Project
1. [Step 1]
2. [Step 2]
...

## Files to Modify/Create - Primary Project
- \`path/to/file1.ts\` - [Description]
- \`path/to/file2.tsx\` - [Description]

## Files to Modify/Create - Secondary Project
- \`path/to/file1.ts\` - [Description]
- \`path/to/file2.tsx\` - [Description]

## Technical Specifications
[Detailed technical requirements for both projects]

## Testing
[Testing approach and scenarios, including integration tests between projects]

## Expected Outcomes
[What should be achieved after implementation with both projects working together]`;

// ============================================================================
// Analyzer Implementation
// ============================================================================

/**
 * Implementation Plan Analyzer (IT Analyst)
 *
 * Generates comprehensive implementation plans from user input using LLM.
 * Supports both single and multiproject modes.
 */
export class ImplementationPlanAnalyzer extends BaseComponent<
  void,
  ImplementationPlanOutput,
  ImplementationPlanAnalyzerConfig
> {
  readonly id = 'analyzer.implementation-plan';
  readonly name = 'Implementation Plan Analyzer';
  readonly description = 'Generates detailed implementation plans from user input using LLM (IT Analyst)';
  readonly type = 'analyzer' as const;

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: 'all',
    category: 'business',
    tags: ['llm', 'planning', 'requirements'],
  };

  /**
   * Execute the analyzer to generate an implementation plan
   */
  async execute(
    _input: void,
    context: ExecutionContext
  ): Promise<ImplementationPlanOutput> {
    this.context = context;

    const { userInput, provider, maxTokens = 2000, verbose = false } = this.config;

    if (!userInput || userInput.trim().length === 0) {
      throw new Error('userInput is required');
    }

    const isMultiproject = !!this.config.secondaryProjectId;

    if (verbose) {
      this.log('info', `Starting implementation plan generation (multiproject: ${isMultiproject})`);
    }

    // Fetch context descriptions
    const primaryContextDescription = this.config.contextId
      ? await this.getContextDescription(this.config.contextId, this.config.projectId)
      : undefined;

    const secondaryContextDescription =
      isMultiproject && this.config.secondaryContextId
        ? await this.getContextDescription(this.config.secondaryContextId, this.config.secondaryProjectId)
        : undefined;

    // Build prompt
    const prompt = this.buildPrompt({
      userInput,
      isMultiproject,
      primaryContextDescription,
      secondaryContextDescription,
    });

    if (verbose) {
      this.log('info', `Prompt built (${prompt.length} chars), calling LLM...`);
    }

    // Call LLM
    const result = await this.callLLM(prompt, provider, maxTokens);

    if (verbose) {
      this.log('info', `LLM response received (${result.response.length} chars)`);
    }

    return {
      plan: result.response,
      isMultiproject,
      tokenUsage: result.tokenUsage,
    };
  }

  /**
   * Build the prompt for the LLM
   */
  private buildPrompt(params: {
    userInput: string;
    isMultiproject: boolean;
    primaryContextDescription?: string;
    secondaryContextDescription?: string;
  }): string {
    const template = params.isMultiproject ? MULTIPROJECT_PROMPT : SINGLE_PROJECT_PROMPT;

    // Simple template substitution
    let prompt = template;

    // Handle conditionals
    if (params.primaryContextDescription || params.secondaryContextDescription) {
      prompt = prompt.replace(
        /\{\{#if contextDescription\}\}([\s\S]*?)\{\{\/if\}\}/g,
        params.primaryContextDescription ? '$1' : ''
      );
      prompt = prompt.replace(
        /\{\{#if primaryContextDescription\}\}([\s\S]*?)\{\{\/if\}\}/g,
        params.primaryContextDescription ? '$1' : ''
      );
      prompt = prompt.replace(
        /\{\{#if secondaryContextDescription\}\}([\s\S]*?)\{\{\/if\}\}/g,
        params.secondaryContextDescription ? '$1' : ''
      );
    } else {
      // Remove conditional blocks
      prompt = prompt.replace(/\{\{#if \w+\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    }

    // Replace variables
    prompt = prompt.replace(/\{\{userInput\}\}/g, params.userInput);
    prompt = prompt.replace(/\{\{contextDescription\}\}/g, params.primaryContextDescription || '');
    prompt = prompt.replace(/\{\{primaryContextDescription\}\}/g, params.primaryContextDescription || '');
    prompt = prompt.replace(/\{\{secondaryContextDescription\}\}/g, params.secondaryContextDescription || '');

    return prompt;
  }

  /**
   * Fetch context description from API
   */
  private async getContextDescription(
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
      this.log('warn', `Failed to fetch context description: ${error}`);
    }
    return undefined;
  }

  /**
   * Call LLM API
   */
  private async callLLM(
    prompt: string,
    provider: SupportedProvider,
    maxTokens: number
  ): Promise<{ response: string; tokenUsage?: { input: number; output: number; total: number } }> {
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

    return {
      response: data.response,
      tokenUsage: data.tokenUsage,
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config: ImplementationPlanAnalyzerConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.userInput || config.userInput.trim().length === 0) {
      errors.push('userInput is required');
    }

    if (!config.provider) {
      errors.push('provider is required');
    }

    if (config.maxTokens !== undefined && config.maxTokens < 100) {
      errors.push('maxTokens must be at least 100');
    }

    return errors.length > 0
      ? { valid: false, errors }
      : { valid: true };
  }

  /**
   * Get configuration schema
   */
  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      required: ['userInput', 'provider'],
      properties: {
        userInput: {
          type: 'string',
          description: 'User description of what needs to be implemented',
        },
        contextId: {
          type: 'string',
          description: 'Context ID for fetching project context description',
        },
        projectId: {
          type: 'string',
          description: 'Project ID for the primary project',
        },
        provider: {
          type: 'string',
          enum: ['openai', 'anthropic', 'gemini', 'ollama', 'internal'],
          description: 'LLM provider to use for generation',
        },
        secondaryProjectId: {
          type: 'string',
          description: 'Secondary project ID for multiproject mode',
        },
        secondaryContextId: {
          type: 'string',
          description: 'Secondary context ID for multiproject mode',
        },
        maxTokens: {
          type: 'number',
          default: 2000,
          description: 'Maximum tokens for LLM response',
        },
        verbose: {
          type: 'boolean',
          default: false,
          description: 'Enable verbose logging',
        },
      },
    };
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): ImplementationPlanAnalyzerConfig {
    return {
      userInput: '',
      provider: 'anthropic',
      maxTokens: 2000,
      verbose: false,
    };
  }

  /**
   * Get input types
   */
  getInputTypes(): string[] {
    return []; // Analyzers take void input
  }

  /**
   * Get output types
   */
  getOutputTypes(): string[] {
    return ['ImplementationPlanOutput'];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a context selection helper for UI integration
 */
export function createContextSelection(
  primaryProject: {
    projectId: string;
    projectPath: string;
    contextId?: string;
    contextName?: string;
    contextDescription?: string;
  },
  secondaryProject?: {
    projectId: string;
    projectPath: string;
    contextId?: string;
    contextName?: string;
    contextDescription?: string;
  }
): ContextSelection {
  return {
    primary: primaryProject,
    secondary: secondaryProject,
  };
}

/**
 * Build analyzer config from context selection
 */
export function buildConfigFromSelection(
  userInput: string,
  provider: SupportedProvider,
  selection: ContextSelection,
  options?: { maxTokens?: number; verbose?: boolean }
): ImplementationPlanAnalyzerConfig {
  return {
    userInput,
    provider,
    projectId: selection.primary.projectId,
    contextId: selection.primary.contextId,
    secondaryProjectId: selection.secondary?.projectId,
    secondaryContextId: selection.secondary?.contextId,
    maxTokens: options?.maxTokens,
    verbose: options?.verbose,
  };
}
