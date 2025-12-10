/**
 * Parliament Feature Module
 * Multi-Agent Debate System for Superior Decision Making
 *
 * This module extends the existing 12+ idea-generation agents into a full
 * multi-agent parliament where specialized agents debate, challenge, and
 * refine each other's proposals.
 */

// Types
export * from './lib/types';

// Debate Engine
export {
  runParliamentDebate,
  runQuickDebate,
  selectDebateAgents,
} from './lib/debateEngine';

// Prompts
export {
  AGENT_PERSONAS,
  buildDebateSystemPrompt,
  buildDebateTurnPrompt,
  buildVotingPrompt,
  buildConsensusPrompt,
} from './lib/debatePrompts';

// Database
export {
  reputationDb,
  debateSessionDb,
  ensureParliamentTables,
} from './lib/reputationRepository';

// Components
export { default as DebateVisualization } from './components/DebateVisualization';
export { default as AgentReputationDashboard } from './components/AgentReputationDashboard';
