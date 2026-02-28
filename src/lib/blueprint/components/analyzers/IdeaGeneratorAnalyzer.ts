/**
 * Idea Generator Analyzer
 * Business analyzer that generates improvement ideas using AI prompts
 * Integrates with the existing ScanIdeas prompt system
 *
 * The analyzer builds context and prepares prompt data for LLM execution.
 * Actual LLM calls are handled separately by the execution layer.
 */

import { BaseAnalyzer, AnalyzerConfig } from '../base/BaseAnalyzer';
import { ExecutionContext, ValidationResult, BaseIssue, AnalyzerProjectMetadata } from '../../types';

// Define a new issue type for ideas
export interface IdeaIssue extends BaseIssue {
  category: 'idea';
  promptId: string;
  promptName: string;
  ideaType: 'feature' | 'improvement' | 'refactor' | 'optimization';
  confidence: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  rawContent?: string;
}

export interface IdeaGeneratorConfig extends AnalyzerConfig {
  promptId: string;
  promptName?: string;
  maxIdeas?: number;
  minConfidence?: number;
  includeContext?: boolean;
  contextSection?: string;
  existingIdeasSection?: string;
}

// Map prompt IDs to their display names
export const PROMPT_DISPLAY_NAMES: Record<string, string> = {
  zen_architect: 'Zen Architect',
  bug_hunter: 'Bug Hunter',
  perf_optimizer: 'Performance Optimizer',
  security_protector: 'Security Protector',
  insight_synth: 'Insight Synthesizer',
  ambiguity_guardian: 'Ambiguity Guardian',
  business_visionary: 'Business Visionary',
  ui_perfectionist: 'UI Perfectionist',
  feature_scout: 'Feature Scout',
  tech_innovator: 'Tony Stark',
  ai_integration_scout: 'AI Integration Scout',
  delight_designer: 'Delight Designer',
  user_empathy_champion: 'User Empathy Champion',
  accessibility_advocate: 'Accessibility Advocate',
  paradigm_shifter: 'Paradigm Shifter',
  moonshot_architect: 'Moonshot Architect',
  dev_experience_engineer: 'Dev Experience Engineer',
  data_flow_optimizer: 'Data Flow Optimizer',
  code_refactor: 'Code Refactor',
};

// Map of idea types based on prompt categories
const PROMPT_TO_IDEA_TYPE: Record<string, IdeaIssue['ideaType']> = {
  code_refactor: 'refactor',
  perf_optimizer: 'optimization',
  data_flow_optimizer: 'optimization',
  bug_hunter: 'improvement',
  security_protector: 'improvement',
  feature_scout: 'feature',
  moonshot_architect: 'feature',
  paradigm_shifter: 'feature',
  ai_integration_scout: 'feature',
  tech_innovator: 'optimization',
};

// Prompt options structure for integration with existing prompt system
export interface PromptBuildOptions {
  projectName: string;
  aiDocsSection: string;
  contextSection: string;
  existingIdeasSection: string;
  codeSection: string;
  hasContext: boolean;
}

export class IdeaGeneratorAnalyzer extends BaseAnalyzer<IdeaGeneratorConfig, IdeaIssue[]> {
  readonly id = 'analyzer.idea-generator';
  readonly name = 'Idea Generator';
  readonly description = 'Generate improvement ideas using AI prompts';

  readonly projectMetadata: AnalyzerProjectMetadata = {
    supportedProjectTypes: 'all',
    category: 'business',
    tags: ['llm', 'ideas', 'feature-generation'],
  };

  async execute(_: void, context: ExecutionContext): Promise<IdeaIssue[]> {
    this.context = context;
    const issues: IdeaIssue[] = [];

    const promptName = this.config.promptName || PROMPT_DISPLAY_NAMES[this.config.promptId] || this.config.promptId;
    this.reportProgress(10, `Initializing ${promptName} prompt`);

    // Get project files for context
    const files = await this.getProjectFiles(context.projectPath);
    const totalFiles = files.length;

    this.reportProgress(20, `Gathering context from ${totalFiles} files`);

    // Build context section from files
    const contextSection = this.config.contextSection || this.buildContextFromFiles(files);

    this.reportProgress(40, 'Preparing prompt options');

    // Build the prompt options for the existing prompt system
    const promptOptions: PromptBuildOptions = {
      projectName: context.projectName || 'Project',
      aiDocsSection: '',
      contextSection,
      existingIdeasSection: this.config.existingIdeasSection || '',
      codeSection: '',
      hasContext: !!contextSection,
    };

    this.reportProgress(50, 'Prompt ready for LLM');

    // Log the configuration for debugging
    this.log('info', `Idea generation configured for: ${this.config.promptId}`);
    this.log('info', `Context includes ${totalFiles} files`);

    // Store the prompt configuration for the executor to use
    // The actual LLM call happens via the existing generateIdeas flow
    if (context.metadata) {
      context.metadata.promptOptions = promptOptions;
      context.metadata.promptId = this.config.promptId;
      context.metadata.promptName = promptName;
      context.metadata.llmConfig = {
        maxTokens: 30000,
        temperature: 0.7,
      };
      context.metadata.maxIdeas = this.config.maxIdeas || 10;
      context.metadata.minConfidence = this.config.minConfidence || 0.7;
    }

    this.reportProgress(100, 'Analysis complete - ready for execution');

    return issues;
  }

  /**
   * Build context section from file paths
   */
  private buildContextFromFiles(files: string[]): string {
    if (files.length === 0) return '';

    const maxFiles = 50; // Limit to prevent prompt overflow
    const relevantFiles = files.slice(0, maxFiles);

    const fileList = relevantFiles.map(f => `- ${f}`).join('\n');

    return `## Project Files
The project contains ${files.length} files. Key files include:

${fileList}
${files.length > maxFiles ? `\n... and ${files.length - maxFiles} more files` : ''}
`;
  }

  /**
   * Get the prompt configuration for use with the LLM
   */
  getPromptConfig(): { promptId: string; promptName?: string } {
    return {
      promptId: this.config.promptId,
      promptName: this.config.promptName,
    };
  }

  /**
   * Get the idea type based on prompt ID
   */
  getIdeaType(): IdeaIssue['ideaType'] {
    return PROMPT_TO_IDEA_TYPE[this.config.promptId] || 'improvement';
  }

  validateConfig(config: IdeaGeneratorConfig): ValidationResult {
    if (!config.promptId) {
      return { valid: false, errors: ['promptId is required'] };
    }
    if (config.maxIdeas !== undefined && config.maxIdeas < 1) {
      return { valid: false, errors: ['maxIdeas must be at least 1'] };
    }
    if (config.minConfidence !== undefined && (config.minConfidence < 0 || config.minConfidence > 1)) {
      return { valid: false, errors: ['minConfidence must be between 0 and 1'] };
    }
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        promptId: {
          type: 'string',
          description: 'ID of the prompt persona to use',
          enum: [
            'zen_architect',
            'bug_hunter',
            'perf_optimizer',
            'security_protector',
            'insight_synth',
            'ambiguity_guardian',
            'business_visionary',
            'ui_perfectionist',
            'feature_scout',
            'tech_innovator',
            'ai_integration_scout',
            'delight_designer',
            'user_empathy_champion',
            'accessibility_advocate',
            'paradigm_shifter',
            'moonshot_architect',
            'dev_experience_engineer',
            'data_flow_optimizer',
            'code_refactor',
          ],
        },
        promptName: {
          type: 'string',
          description: 'Human-readable name of the prompt',
        },
        maxIdeas: {
          type: 'number',
          default: 10,
          minimum: 1,
          maximum: 50,
          description: 'Maximum number of ideas to generate',
        },
        minConfidence: {
          type: 'number',
          default: 0.7,
          minimum: 0,
          maximum: 1,
          description: 'Minimum confidence threshold for ideas',
        },
        includeContext: {
          type: 'boolean',
          default: true,
          description: 'Include project context in the prompt',
        },
        excludePatterns: {
          type: 'array',
          items: { type: 'string' },
          default: [],
          description: 'File patterns to exclude from analysis',
        },
      },
      required: ['promptId'],
    };
  }

  getDefaultConfig(): IdeaGeneratorConfig {
    return {
      promptId: 'zen_architect',
      maxIdeas: 10,
      minConfidence: 0.7,
      includeContext: true,
      excludePatterns: [],
    };
  }

  getOutputTypes(): string[] {
    return ['IdeaIssue[]'];
  }
}
