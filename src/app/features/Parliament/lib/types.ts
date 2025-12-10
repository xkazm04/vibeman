/**
 * Multi-Agent Parliament Type Definitions
 * Types for the debate system where specialized agents debate, challenge,
 * and refine each other's proposals before final recommendation.
 */

import type { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import type { DbIdea } from '@/app/db/models/types';

/**
 * Agent Role in a debate round
 */
export type DebateRole = 'proposer' | 'challenger' | 'mediator' | 'voter';

/**
 * Debate status lifecycle
 */
export type DebateStatus =
  | 'pending'      // Debate not yet started
  | 'proposing'    // Initial proposal phase
  | 'challenging'  // Agents challenging the proposal
  | 'mediating'    // Mediation between conflicting views
  | 'voting'       // Parliamentary voting phase
  | 'consensus'    // Reached consensus
  | 'deadlock'     // Could not reach consensus after max rounds
  | 'completed';   // Debate finished with outcome

/**
 * Vote types in parliamentary voting
 */
export type VoteType = 'support' | 'oppose' | 'abstain';

/**
 * Individual agent state during a debate
 */
export interface AgentDebateState {
  agentType: ScanType;
  role: DebateRole;
  position: string;           // Current stance on the proposal
  confidence: number;         // 0-100 confidence in their position
  arguments: string[];        // Arguments made during debate
  votes: VoteRecord[];        // Voting history
  challenged: boolean;        // Whether this agent was challenged
  changedPosition: boolean;   // Whether position changed during debate
}

/**
 * Vote record for tracking votes
 */
export interface VoteRecord {
  ideaId: string;
  vote: VoteType;
  reasoning: string;
  round: number;
}

/**
 * A single turn in the debate
 */
export interface DebateTurn {
  id: string;
  round: number;
  agentType: ScanType;
  role: DebateRole;
  action: 'propose' | 'challenge' | 'defend' | 'mediate' | 'concede' | 'vote';
  content: string;
  targetAgent?: ScanType;     // If challenging/responding to another agent
  confidence: number;
  timestamp: string;
}

/**
 * Debate round summary
 */
export interface DebateRound {
  roundNumber: number;
  proposer: ScanType;
  challengers: ScanType[];
  mediator?: ScanType;
  turns: DebateTurn[];
  outcome: 'ongoing' | 'consensus' | 'escalate' | 'vote_required';
  summary: string;
}

/**
 * Parliamentary vote result
 */
export interface ParliamentaryVote {
  ideaId: string;
  votes: {
    agentType: ScanType;
    vote: VoteType;
    reasoning: string;
    weight: number;           // Based on agent reputation
  }[];
  supportCount: number;
  opposeCount: number;
  abstainCount: number;
  weightedSupport: number;    // Reputation-weighted support
  passed: boolean;
  margin: number;             // Vote margin (support - oppose)
}

/**
 * Main debate session
 */
export interface DebateSession {
  id: string;
  projectId: string;
  ideaIds: string[];          // Ideas being debated
  status: DebateStatus;
  rounds: DebateRound[];
  agentStates: Map<ScanType, AgentDebateState>;
  currentRound: number;
  maxRounds: number;
  consensusThreshold: number; // % agreement needed (e.g., 0.7 = 70%)
  qualityThreshold: number;   // Min quality score to pass (0-100)
  selectedIdeaId: string | null;
  votes: ParliamentaryVote[];
  tradeOffs: TradeOffAnalysis[];
  startedAt: string;
  completedAt: string | null;
  totalTokensUsed: number;
}

/**
 * Trade-off identified during debate
 */
export interface TradeOffAnalysis {
  id: string;
  ideaId: string;
  dimension: string;          // e.g., 'performance', 'security', 'maintainability'
  proAgent: ScanType;         // Agent supporting
  conAgent: ScanType;         // Agent opposing
  proArgument: string;
  conArgument: string;
  resolution?: string;        // How the trade-off was resolved
  importance: 'critical' | 'significant' | 'minor';
}

/**
 * Agent reputation for weighted voting
 */
export interface AgentReputation {
  agentType: ScanType;
  projectId: string;
  totalCritiques: number;
  validatedCritiques: number; // Critiques confirmed by developers
  rejectedCritiques: number;  // Critiques dismissed by developers
  accuracyRate: number;       // validatedCritiques / totalCritiques
  reputationScore: number;    // 0-100 based on historical performance
  lastUpdated: string;
}

/**
 * Critique validation by developer
 */
export interface CritiqueValidation {
  id: string;
  debateSessionId: string;
  critiqueId: string;         // Reference to the debate turn
  agentType: ScanType;
  validated: boolean;
  feedback?: string;
  validatedAt: string;
}

/**
 * Debate configuration
 */
export interface DebateConfig {
  maxRounds: number;          // Maximum debate rounds (default: 3)
  consensusThreshold: number; // % needed for consensus (default: 0.7)
  qualityThreshold: number;   // Min quality score (default: 70)
  minAgents: number;          // Minimum agents to participate (default: 3)
  maxAgents: number;          // Maximum agents (default: 6)
  enableReputation: boolean;  // Use reputation-weighted voting
  autoSelectAgents: boolean;  // Auto-select relevant agents
  timeoutMs: number;          // Timeout per round (default: 60000)
}

/**
 * Default debate configuration
 */
export const DEFAULT_DEBATE_CONFIG: DebateConfig = {
  maxRounds: 3,
  consensusThreshold: 0.7,
  qualityThreshold: 70,
  minAgents: 3,
  maxAgents: 6,
  enableReputation: true,
  autoSelectAgents: true,
  timeoutMs: 60000,
};

/**
 * Agent role assignments based on their specialization
 */
export const AGENT_ROLE_PREFERENCES: Record<ScanType, DebateRole[]> = {
  // Technical agents often challenge
  zen_architect: ['proposer', 'mediator'],
  bug_hunter: ['challenger', 'voter'],
  perf_optimizer: ['challenger', 'voter'],
  security_protector: ['challenger', 'voter'],
  insight_synth: ['mediator', 'proposer'],
  ambiguity_guardian: ['mediator', 'challenger'],
  data_flow_optimizer: ['challenger', 'voter'],
  dev_experience_engineer: ['proposer', 'voter'],
  code_refactor: ['challenger', 'voter'],

  // User-focused agents balance perspectives
  ui_perfectionist: ['proposer', 'voter'],
  onboarding_optimizer: ['proposer', 'voter'],
  delight_designer: ['proposer', 'voter'],
  user_empathy_champion: ['mediator', 'proposer'],
  accessibility_advocate: ['challenger', 'voter'],

  // Business agents often propose
  business_visionary: ['proposer', 'mediator'],
  feature_scout: ['proposer', 'voter'],
  ai_integration_scout: ['proposer', 'voter'],

  // Mastermind agents mediate high-level
  paradigm_shifter: ['mediator', 'proposer'],
  moonshot_architect: ['proposer', 'mediator'],

  // Special
  refactor_analysis: ['challenger', 'voter'],
};

/**
 * Agent debate prompt parameters
 */
export interface AgentDebatePromptParams {
  agentType: ScanType;
  role: DebateRole;
  idea: DbIdea;
  previousTurns: DebateTurn[];
  otherAgentPositions: AgentDebateState[];
  round: number;
  projectContext: string;
}

/**
 * Debate result for the evaluation pipeline
 */
export interface DebateResult {
  sessionId: string;
  selectedIdeaId: string | null;
  reasoning: string;
  consensusReached: boolean;
  consensusLevel: number;     // 0-1 representing agreement level
  tradeOffs: TradeOffAnalysis[];
  agentVotes: ParliamentaryVote | null;
  tokensUsed: number;
  debateRounds: number;
  duration: number;           // Duration in ms
}
