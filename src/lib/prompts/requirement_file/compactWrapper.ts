/**
 * Compact Execution Wrapper for MCP-enabled execution
 *
 * This wrapper produces minimal prompts (~115 tokens) that assume MCP tools are available:
 * - log_implementation: Log implementation details to Vibeman database
 * - check_test_scenario: Check if context has test scenario
 * - capture_screenshot: Capture UI screenshots
 *
 * For CLI execution without MCP (Directions via CompactTerminal), use wrapRequirementForExecution instead.
 *
 * @example
 * // Usage in Ideas accept route
 * const wrapped = wrapRequirementForMCP({
 *   requirementContent: ideaContent,
 *   projectId: idea.project_id,
 *   contextId: idea.context_id,
 * });
 */

export interface CompactWrapperConfig {
  /** The original requirement content (from buildRequirementFromIdea or similar) */
  requirementContent: string;
  /** Project ID for logging */
  projectId?: string;
  /** Context ID for screenshots and context-aware operations */
  contextId?: string;
  /** Whether git operations are enabled */
  gitEnabled?: boolean;
  /** Git commit message template */
  gitCommitMessage?: string;
}

/**
 * Result of compact wrapping
 */
export interface CompactWrapResult {
  /** The wrapped prompt content */
  content: string;
  /** Token estimate (approximate) */
  estimatedTokens: number;
  /** Wrapper mode used */
  mode: 'mcp';
}

/**
 * Wrap requirement content with minimal execution instructions for MCP execution
 *
 * This produces a compact prompt that:
 * 1. Includes the original requirement content
 * 2. References MCP tools instead of embedding curl commands
 * 3. Adds minimal verification steps
 *
 * Token savings: ~93% reduction compared to full wrapper (~115 vs ~1780 tokens)
 */
export function wrapRequirementForMCP(config: CompactWrapperConfig): string {
  const result = wrapRequirementForMCPWithMetadata(config);
  return result.content;
}

/**
 * Wrap requirement and return metadata including token estimate
 */
export function wrapRequirementForMCPWithMetadata(config: CompactWrapperConfig): CompactWrapResult {
  const { requirementContent, projectId, contextId, gitEnabled, gitCommitMessage } = config;

  const sections: string[] = [
    'Execute this requirement immediately without asking questions.',
    '',
    '## REQUIREMENT',
    '',
    requirementContent,
    '',
    '## AFTER IMPLEMENTATION',
    '',
  ];

  // MCP tool instructions (compact references)
  if (projectId) {
    sections.push(
      `1. Log your implementation using the \`log_implementation\` MCP tool with:`,
      `   - requirementName: the requirement filename (without .md)`,
      `   - title: 2-6 word summary`,
      `   - overview: 1-2 paragraphs describing what was done`,
      ''
    );
  }

  if (contextId) {
    sections.push(
      `2. Check for test scenario using \`check_test_scenario\` MCP tool`,
      `   - If hasScenario is true, call \`capture_screenshot\` tool`,
      `   - If hasScenario is false, skip screenshot`,
      ''
    );
  }

  // Git instructions (if enabled)
  if (gitEnabled) {
    const gitStep = contextId ? '3' : '2';
    const message = gitCommitMessage || 'Auto-commit: implementation complete';
    sections.push(`${gitStep}. Git: \`git add . && git commit -m "${message}" && git push\``, '');
  }

  // Minimal verification
  const verifyStep = gitEnabled ? (contextId ? '4' : '3') : contextId ? '3' : '2';
  sections.push(`${verifyStep}. Verify: \`npx tsc --noEmit\` (fix any type errors)`, '');

  sections.push('Begin implementation now.');

  const content = sections.join('\n');

  // Rough token estimate: ~4 chars per token for English text
  const estimatedTokens = Math.ceil(content.length / 4);

  return {
    content,
    estimatedTokens,
    mode: 'mcp',
  };
}
