/**
 * Proposal Adapter
 *
 * Transforms EnrichedImplementationLog data from the Manager module
 * into Proposal format for use with the Proposals module.
 *
 * This adapter enables loose coupling between the two modules while
 * allowing proposals to be generated from implementation logs.
 */

import { v4 as uuidv4 } from 'uuid';
import type { EnrichedImplementationLog } from './types';
import type { Proposal } from '@/app/features/Proposals';

/**
 * Proposal types that can be generated from implementation logs
 */
type ProposalType = 'test' | 'documentation' | 'optimization' | 'refactor';

/**
 * Configuration for each proposal type
 */
const PROPOSAL_TYPE_CONFIG: Record<ProposalType, { titlePrefix: string; rationaleTemplate: string }> = {
  test: {
    titlePrefix: 'Add comprehensive tests for',
    rationaleTemplate: 'This implementation lacks test coverage. Adding tests would ensure reliability and prevent regressions.',
  },
  documentation: {
    titlePrefix: 'Document',
    rationaleTemplate: 'Adding documentation would improve maintainability and help other developers understand the implementation.',
  },
  optimization: {
    titlePrefix: 'Optimize performance of',
    rationaleTemplate: 'There are opportunities to improve the performance of this implementation.',
  },
  refactor: {
    titlePrefix: 'Refactor',
    rationaleTemplate: 'This implementation could benefit from refactoring to improve code quality and maintainability.',
  },
};

/**
 * Manager action types for proposal handling
 */
export type ManagerAction =
  | { type: 'create_requirement'; proposalId: string; content: string }
  | { type: 'trigger_claude_code'; proposalId: string; content: string }
  | { type: 'record_decline'; proposalId: string };


/**
 * Generate a rationale string from implementation log content.
 *
 * @param log - The implementation log to extract content from
 * @param proposalType - The type of proposal being generated
 * @returns A rationale string derived from the log content
 */
function generateRationale(log: EnrichedImplementationLog, proposalType: ProposalType): string {
  const baseRationale = PROPOSAL_TYPE_CONFIG[proposalType].rationaleTemplate;
  const parts: string[] = [baseRationale];

  // Include overview content if available
  if (log.overview && log.overview.trim()) {
    parts.push(`\n\nBased on the implementation: ${log.overview}`);
  }

  // Include bullet points if available
  if (log.overview_bullets && log.overview_bullets.trim()) {
    const bullets = log.overview_bullets
      .split('\n')
      .filter((b) => b.trim())
      .slice(0, 3) // Limit to first 3 bullets
      .map((b) => `• ${b.trim()}`)
      .join('\n');
    if (bullets) {
      parts.push(`\n\nKey changes to consider:\n${bullets}`);
    }
  }

  return parts.join('');
}

/**
 * Determine which proposal types are relevant for a given log.
 *
 * @param log - The implementation log to analyze
 * @returns Array of relevant proposal types
 */
function determineProposalTypes(log: EnrichedImplementationLog): ProposalType[] {
  const types: ProposalType[] = [];

  // Always suggest tests for untested implementations
  if (log.tested === 0) {
    types.push('test');
  }

  // Suggest documentation for implementations with substantial content
  if (log.overview && log.overview.length > 100) {
    types.push('documentation');
  }

  // Suggest optimization and refactor as general improvements
  types.push('optimization');
  types.push('refactor');

  return types;
}

/**
 * Generate proposals from an implementation log.
 *
 * Creates contextual improvement proposals based on the implementation's
 * overview, bullets, and context. Each proposal contains text derived
 * from the log content.
 *
 * @param log - The implementation log to generate proposals from
 * @param contextDescription - Optional additional context for proposal generation
 * @returns Array of generated proposals
 */
export function generateProposalsFromLog(
  log: EnrichedImplementationLog,
  contextDescription?: string
): Proposal[] {
  const proposalTypes = determineProposalTypes(log);

  return proposalTypes.map((proposalType) => {
    const config = PROPOSAL_TYPE_CONFIG[proposalType];
    let rationale = generateRationale(log, proposalType);

    // Include context description if provided
    if (contextDescription && contextDescription.trim()) {
      rationale += `\n\nAdditional context: ${contextDescription}`;
    }

    return {
      id: uuidv4(),
      title: `${config.titlePrefix} ${log.title}`,
      rationale,
      timestamp: new Date(),
      status: 'pending' as const,
    };
  });
}

/**
 * Create requirement content from an accepted proposal.
 *
 * Generates a requirement file content string that includes the proposal
 * details and implementation log context.
 *
 * @param proposal - The accepted proposal
 * @param log - The implementation log associated with the proposal
 * @returns Formatted requirement content string
 */
export function createRequirementFromProposal(
  proposal: Proposal,
  log: EnrichedImplementationLog
): string {
  const lines: string[] = [
    `# ${proposal.title}`,
    '',
    '## Overview',
    '',
    proposal.rationale,
    '',
    '## Context',
    '',
    `- **Project**: ${log.project_name || 'Unknown'}`,
    `- **Original Implementation**: ${log.title}`,
    `- **Requirement**: ${log.requirement_name}`,
    '',
  ];

  // Include original overview if available
  if (log.overview) {
    lines.push('## Original Implementation Overview', '', log.overview, '');
  }

  // Include key changes if available
  if (log.overview_bullets) {
    lines.push('## Key Changes', '');
    const bullets = log.overview_bullets.split('\n').filter((b) => b.trim());
    bullets.forEach((bullet) => {
      lines.push(`- ${bullet.trim()}`);
    });
    lines.push('');
  }

  lines.push('## Acceptance Criteria', '', '- [ ] Implementation complete', '- [ ] Tests passing', '');

  return lines.join('\n');
}

/**
 * Map a proposal action to a Manager operation.
 *
 * Converts proposal actions (accept, acceptWithCode, decline) into
 * structured Manager actions for handling.
 *
 * @param action - The action type ('accept', 'acceptWithCode', or 'decline')
 * @param proposal - The proposal being acted upon
 * @param log - Optional implementation log for content generation
 * @returns A ManagerAction object describing the operation
 */
export function mapProposalAction(
  action: 'accept' | 'acceptWithCode' | 'decline',
  proposal: Proposal,
  log?: EnrichedImplementationLog
): ManagerAction {
  switch (action) {
    case 'accept':
      return {
        type: 'create_requirement',
        proposalId: proposal.id,
        content: log ? createRequirementFromProposal(proposal, log) : proposal.rationale,
      };

    case 'acceptWithCode':
      return {
        type: 'trigger_claude_code',
        proposalId: proposal.id,
        content: log ? createRequirementFromProposal(proposal, log) : proposal.rationale,
      };

    case 'decline':
      return {
        type: 'record_decline',
        proposalId: proposal.id,
      };
  }
}

/**
 * Update a proposal's status.
 *
 * Creates a new proposal object with the updated status.
 * Does not mutate the original proposal.
 *
 * @param proposal - The proposal to update
 * @param newStatus - The new status to set
 * @returns A new proposal with the updated status
 */
export function updateProposalStatus(
  proposal: Proposal,
  newStatus: Proposal['status']
): Proposal {
  return {
    ...proposal,
    status: newStatus,
  };
}

/**
 * Advance the queue index for a proposal queue.
 *
 * Returns the next index, or -1 if at the end of the queue.
 *
 * @param currentIndex - The current index in the queue
 * @param queueLength - The total length of the queue
 * @returns The next index, or -1 if at the end
 */
export function advanceQueueIndex(currentIndex: number, queueLength: number): number {
  if (currentIndex < queueLength - 1) {
    return currentIndex + 1;
  }
  return -1; // Indicates end of queue
}

/**
 * Format carousel progress indicator.
 *
 * @param currentIndex - The current index (0-based)
 * @param totalCount - The total number of items
 * @returns Formatted progress string "(current+1) / total"
 */
export function formatCarouselProgress(currentIndex: number, totalCount: number): string {
  return `${currentIndex + 1} / ${totalCount}`;
}
