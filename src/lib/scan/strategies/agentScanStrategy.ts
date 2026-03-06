/**
 * Agent Scan Strategy
 *
 * Uses AI agents (19 personas) to analyze codebase and generate insights/ideas.
 * Integrates with existing LLM infrastructure and AGENT_REGISTRY in scanTypes.ts.
 */

import type { ScanConfig, ScanFinding, CodebaseFile, ScanRepository } from '../types';
import { BaseScanStrategy } from './baseScanStrategy';
import type { FileGatherer } from '../types';

/**
 * Agent Scan Strategy for idea generation.
 * Uses LLM agents (zen_architect, bug_hunter, etc.) to analyze code.
 */
export class AgentScanStrategy extends BaseScanStrategy {
  constructor(fileGatherer?: FileGatherer, repository?: ScanRepository) {
    super(fileGatherer, repository);
  }

  /**
   * Validate agent scan configuration.
   */
  protected validateConfig(config: ScanConfig): void {
    if (!config.scanType) {
      throw new Error('Agent scan requires scanType (e.g., "zen_architect", "bug_hunter")');
    }
    if (!config.provider && !process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) {
      throw new Error('No LLM provider configured for agent scanning');
    }
  }

  /**
   * Analyze codebase using AI agents.
   * Delegates to existing /api/ideas/generate endpoint which uses AGENT_REGISTRY.
   */
  protected async analyze(
    config: ScanConfig,
    files: CodebaseFile[]
  ): Promise<ScanFinding[]> {
    try {
      // Call existing ideas generation endpoint
      // This reuses the existing AGENT_REGISTRY and LLM infrastructure
      const response = await fetch('/api/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: config.projectId,
          projectName: config.projectName,
          projectPath: config.projectPath,
          scanType: config.scanType, // Agent persona name
          provider: config.provider,
          files: files.map(f => ({
            path: f.path,
            content: f.content,
            language: f.language,
          })),
          contextId: config.contextId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ideas generation failed: HTTP ${response.status}`);
      }

      const result = await response.json();
      const ideas = result.ideas || result.data || [];

      // Convert ideas to ScanFinding format for unified result
      return ideas.map((idea: any) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        severity: this.computeSeverity(idea.impact),
        impact: idea.impact || 'medium',
        effort: idea.effort || 'medium',
        suggestion: idea.implementation_notes || idea.suggestion,
        examples: idea.examples ? [idea.examples] : [],
      }));
    } catch (error) {
      throw new Error(
        `Agent scan analysis failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Compute severity level based on impact.
   */
  private computeSeverity(impact?: string): 'error' | 'warning' | 'info' {
    if (impact === 'high') return 'error';
    if (impact === 'medium') return 'warning';
    return 'info';
  }

  /**
   * Extended file extensions for code scanning (includes more languages).
   */
  protected getDefaultFileExtensions(): string[] {
    return [
      '.ts', '.tsx', '.js', '.jsx',           // TypeScript/JavaScript
      '.py', '.pyi',                           // Python
      '.java', '.scala', '.kt',                // JVM languages
      '.go', '.rs', '.c', '.cpp', '.h',       // Systems languages
      '.sql', '.graphql',                      // Database/API
      '.json', '.yaml', '.yml', '.toml',      // Config
      '.md', '.mdx',                           // Documentation
    ];
  }
}
