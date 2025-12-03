/**
 * Decision Gate Processor
 *
 * Pauses blueprint execution to request user decision before proceeding.
 * Used before executors to give users a chance to review and approve.
 *
 * Features:
 * - Pauses pipeline execution until user accepts/rejects
 * - Generates summary of work to be done
 * - Integrates with BlueprintExecutionStore for state management
 * - Supports both technical (file counts) and business (prompt preview) summaries
 * - Toast notification when decision is pending
 * - GlobalTaskBar integration for in-place decisions
 *
 * @example
 * ```typescript
 * import { DecisionGateProcessor } from '@/lib/blueprint';
 *
 * const gate = new DecisionGateProcessor();
 * await gate.initialize({
 *   title: 'Review Changes',
 *   description: 'Review the proposed changes before execution',
 *   decisionType: 'pre-execution',
 *   summaryType: 'technical',
 * });
 *
 * // This will pause until user accepts or rejects
 * const result = await gate.execute(issues, context);
 * // If user rejects, throws DecisionRejectedError
 * ```
 */

import { BaseProcessor, ProcessorConfig } from '../base/BaseProcessor';
import { Issue, ExecutionContext, ValidationResult } from '../../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Type of decision summary to generate
 */
export type SummaryType = 'technical' | 'business' | 'custom';

/**
 * Decision type for different pipeline stages
 */
export type DecisionType = 'pre-analyzer' | 'post-analyzer' | 'pre-execution' | 'custom';

/**
 * Configuration for the Decision Gate Processor
 */
export interface DecisionGateConfig extends ProcessorConfig {
  /** Title for the decision dialog */
  title: string;

  /** Description of what the user is deciding on */
  description?: string;

  /** Type of decision point */
  decisionType: DecisionType;

  /** Type of summary to generate */
  summaryType: SummaryType;

  /** Custom summary generator function name (for summaryType: 'custom') */
  customSummaryKey?: string;

  /** Whether to show toast notification */
  showToast?: boolean;

  /** Whether to auto-expand GlobalTaskBar */
  autoExpandTaskBar?: boolean;

  /** Timeout in milliseconds (0 = no timeout) */
  timeout?: number;

  /** Default action if timeout expires ('accept' | 'reject') */
  timeoutAction?: 'accept' | 'reject';
}

/**
 * Technical summary for file-based analyzers
 */
export interface TechnicalSummary {
  filesScanned: number;
  foldersScanned: number;
  issuesFound: number;
  issuesByCategory: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  estimatedExecutionTime: number;
}

/**
 * Business summary for LLM-based analyzers
 */
export interface BusinessSummary {
  promptPreview: string;
  contextName: string;
  contextDescription: string;
  estimatedTokens: number;
  provider: string;
}

/**
 * Decision result
 */
export interface DecisionResult {
  accepted: boolean;
  decidedAt: number;
  decidedBy: 'user' | 'timeout';
  summary: TechnicalSummary | BusinessSummary;
}

/**
 * Error thrown when user rejects decision
 */
export class DecisionRejectedError extends Error {
  constructor(message: string = 'User rejected the decision') {
    super(message);
    this.name = 'DecisionRejectedError';
  }
}

// ============================================================================
// Processor Implementation
// ============================================================================

/**
 * Decision Gate Processor
 *
 * Pauses execution to request user decision.
 */
export class DecisionGateProcessor extends BaseProcessor<
  Issue[],
  Issue[],
  DecisionGateConfig
> {
  readonly id = 'processor.decision-gate';
  readonly name = 'Decision Gate';
  readonly description = 'Pauses execution to request user approval before proceeding';

  private decisionResolver: ((accepted: boolean) => void) | null = null;

  /**
   * Execute the processor - pauses for user decision
   */
  async execute(input: Issue[], context: ExecutionContext): Promise<Issue[]> {
    this.context = context;

    // Generate summary based on input
    const summary = this.generateSummary(input, context);

    this.log('info', `Requesting user decision: ${this.config.title}`);

    // Request decision and wait for response
    const accepted = await this.requestDecision(summary);

    if (!accepted) {
      this.log('warn', 'User rejected the decision');
      throw new DecisionRejectedError(this.config.title);
    }

    this.log('info', 'User accepted the decision, continuing...');

    // Pass through input unchanged
    return input;
  }

  /**
   * Generate summary based on input type
   */
  private generateSummary(input: Issue[], context: ExecutionContext): TechnicalSummary | BusinessSummary {
    if (this.config.summaryType === 'technical') {
      return this.generateTechnicalSummary(input);
    } else if (this.config.summaryType === 'business') {
      return this.generateBusinessSummary(context);
    } else {
      // Custom - use technical as fallback
      return this.generateTechnicalSummary(input);
    }
  }

  /**
   * Generate technical summary from issues
   */
  private generateTechnicalSummary(issues: Issue[]): TechnicalSummary {
    const files = new Set(issues.map(i => i.file));
    const folders = new Set(issues.map(i => {
      const parts = i.file.split(/[\\/]/);
      return parts.slice(0, -1).join('/');
    }));

    const issuesByCategory: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};

    for (const issue of issues) {
      issuesByCategory[issue.category] = (issuesByCategory[issue.category] || 0) + 1;
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
    }

    // Estimate execution time (rough: 1 minute per 10 issues)
    const estimatedExecutionTime = Math.max(60000, issues.length * 6000);

    return {
      filesScanned: files.size,
      foldersScanned: folders.size,
      issuesFound: issues.length,
      issuesByCategory,
      issuesBySeverity,
      estimatedExecutionTime,
    };
  }

  /**
   * Generate business summary from context
   */
  private generateBusinessSummary(context: ExecutionContext): BusinessSummary {
    // Get context info from metadata
    const metadata = context.metadata || {};

    return {
      promptPreview: (metadata.promptPreview as string) || 'Implementation plan will be generated',
      contextName: (metadata.contextName as string) || 'Unknown context',
      contextDescription: (metadata.contextDescription as string) || '',
      estimatedTokens: (metadata.estimatedTokens as number) || 2000,
      provider: (metadata.provider as string) || 'anthropic',
    };
  }

  /**
   * Request decision from user
   */
  private async requestDecision(summary: TechnicalSummary | BusinessSummary): Promise<boolean> {
    // Check if running in browser with store access
    if (typeof window !== 'undefined') {
      return this.requestDecisionViaStore(summary);
    }

    // Server-side or no store - auto-accept for now
    this.log('warn', 'No UI available for decision, auto-accepting');
    return true;
  }

  /**
   * Request decision via BlueprintExecutionStore
   */
  private async requestDecisionViaStore(summary: TechnicalSummary | BusinessSummary): Promise<boolean> {
    return new Promise((resolve) => {
      // Import store dynamically to avoid SSR issues
      import('../../../../stores/blueprintExecutionStore').then(({ useBlueprintExecutionStore }) => {
        const store = useBlueprintExecutionStore.getState();

        // Request decision through store
        store.requestDecision({
          type: this.config.decisionType,
          title: this.config.title,
          description: this.config.description,
          summary,
        }).then(resolve);

        // Handle timeout if configured
        if (this.config.timeout && this.config.timeout > 0) {
          const timeoutAction = this.config.timeoutAction || 'reject';
          setTimeout(() => {
            const currentState = useBlueprintExecutionStore.getState();
            if (currentState.currentExecution?.status === 'paused-for-decision') {
              if (timeoutAction === 'accept') {
                currentState.resumeExecution();
              } else {
                currentState.abortExecution('Decision timeout');
              }
            }
          }, this.config.timeout);
        }

        // Show toast notification if enabled
        if (this.config.showToast !== false) {
          this.showDecisionToast(summary);
        }
      }).catch(() => {
        // Store not available, auto-accept
        resolve(true);
      });
    });
  }

  /**
   * Show toast notification for pending decision
   */
  private showDecisionToast(summary: TechnicalSummary | BusinessSummary): void {
    // Import toast dynamically
    import('sonner').then(({ toast }) => {
      const isTechnical = 'filesScanned' in summary;

      toast.info(this.config.title, {
        description: isTechnical
          ? `${summary.filesScanned} files, ${(summary as TechnicalSummary).issuesFound} issues`
          : `Review: ${(summary as BusinessSummary).contextName}`,
        duration: 0, // Don't auto-dismiss
        action: {
          label: 'Review',
          onClick: () => {
            // Navigate to blueprint or expand taskbar
            window.dispatchEvent(new CustomEvent('blueprint:show-decision'));
          },
        },
      });
    }).catch(() => {
      // Toast not available
    });
  }

  /**
   * Accept the pending decision (for external use)
   */
  accept(): void {
    if (this.decisionResolver) {
      this.decisionResolver(true);
      this.decisionResolver = null;
    }
  }

  /**
   * Reject the pending decision (for external use)
   */
  reject(): void {
    if (this.decisionResolver) {
      this.decisionResolver(false);
      this.decisionResolver = null;
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(config: DecisionGateConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.title) {
      errors.push('title is required');
    }

    if (!config.decisionType) {
      errors.push('decisionType is required');
    }

    if (!config.summaryType) {
      errors.push('summaryType is required');
    }

    if (config.timeout !== undefined && config.timeout < 0) {
      errors.push('timeout must be >= 0');
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
      required: ['title', 'decisionType', 'summaryType'],
      properties: {
        title: {
          type: 'string',
          description: 'Title for the decision dialog',
        },
        description: {
          type: 'string',
          description: 'Detailed description of what user is deciding on',
        },
        decisionType: {
          type: 'string',
          enum: ['pre-analyzer', 'post-analyzer', 'pre-execution', 'custom'],
          description: 'Type of decision point in pipeline',
        },
        summaryType: {
          type: 'string',
          enum: ['technical', 'business', 'custom'],
          description: 'Type of summary to generate',
        },
        customSummaryKey: {
          type: 'string',
          description: 'Key for custom summary generator',
        },
        showToast: {
          type: 'boolean',
          default: true,
          description: 'Show toast notification when decision is pending',
        },
        autoExpandTaskBar: {
          type: 'boolean',
          default: true,
          description: 'Auto-expand GlobalTaskBar when decision is pending',
        },
        timeout: {
          type: 'number',
          default: 0,
          description: 'Timeout in milliseconds (0 = no timeout)',
        },
        timeoutAction: {
          type: 'string',
          enum: ['accept', 'reject'],
          default: 'reject',
          description: 'Action to take when timeout expires',
        },
      },
    };
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): DecisionGateConfig {
    return {
      title: 'Review Before Proceeding',
      decisionType: 'pre-execution',
      summaryType: 'technical',
      showToast: true,
      autoExpandTaskBar: true,
      timeout: 0,
      timeoutAction: 'reject',
    };
  }

  /**
   * Get input types
   */
  getInputTypes(): string[] {
    return ['Issue[]'];
  }

  /**
   * Get output types
   */
  getOutputTypes(): string[] {
    return ['Issue[]'];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format technical summary for display
 */
export function formatTechnicalSummary(summary: TechnicalSummary): string {
  const lines: string[] = [];

  lines.push(`📁 ${summary.filesScanned} files in ${summary.foldersScanned} folders`);
  lines.push(`⚠️ ${summary.issuesFound} issues found`);

  // Top categories
  const topCategories = Object.entries(summary.issuesByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(', ');

  if (topCategories) {
    lines.push(`📋 Categories: ${topCategories}`);
  }

  // Severity breakdown
  const severities = ['critical', 'high', 'medium', 'low'];
  const severityParts = severities
    .filter(s => summary.issuesBySeverity[s])
    .map(s => `${s}: ${summary.issuesBySeverity[s]}`);

  if (severityParts.length > 0) {
    lines.push(`🎯 Severity: ${severityParts.join(', ')}`);
  }

  // Estimated time
  const minutes = Math.ceil(summary.estimatedExecutionTime / 60000);
  lines.push(`⏱️ Est. time: ${minutes} min`);

  return lines.join('\n');
}

/**
 * Format business summary for display
 */
export function formatBusinessSummary(summary: BusinessSummary): string {
  const lines: string[] = [];

  lines.push(`📋 Context: ${summary.contextName}`);

  if (summary.contextDescription) {
    const preview = summary.contextDescription.slice(0, 80);
    lines.push(`📝 ${preview}${summary.contextDescription.length > 80 ? '...' : ''}`);
  }

  lines.push(`🔢 ~${summary.estimatedTokens} tokens`);
  lines.push(`🤖 Provider: ${summary.provider}`);

  return lines.join('\n');
}

/**
 * Create pre-execution decision gate config
 */
export function createPreExecutionGate(options?: {
  title?: string;
  description?: string;
  timeout?: number;
}): DecisionGateConfig {
  return {
    title: options?.title || 'Review Before Execution',
    description: options?.description || 'Review the changes before Claude Code executes them',
    decisionType: 'pre-execution',
    summaryType: 'technical',
    showToast: true,
    autoExpandTaskBar: true,
    timeout: options?.timeout,
  };
}

/**
 * Create post-analysis decision gate config
 */
export function createPostAnalysisGate(options?: {
  title?: string;
  description?: string;
}): DecisionGateConfig {
  return {
    title: options?.title || 'Review Analysis Results',
    description: options?.description || 'Review the issues found by analyzers',
    decisionType: 'post-analyzer',
    summaryType: 'technical',
    showToast: true,
    autoExpandTaskBar: true,
  };
}
