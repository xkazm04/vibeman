/**
 * Parliament Debate Engine
 * Orchestrates multi-turn debates between specialized agents
 */

import { v4 as uuidv4 } from 'uuid';
import { generateWithLLM, parseJsonWithLLM } from '@/lib/llm/llm-manager';
import type { SupportedProvider } from '@/lib/llm/types';
import type { DbIdea } from '@/app/db/models/types';
import type { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { getScanTypeConfig, SCAN_TYPE_CONFIGS } from '@/app/features/Ideas/lib/scanTypes';
import {
  type DebateSession,
  type DebateRound,
  type DebateTurn,
  type DebateRole,
  type AgentDebateState,
  type ParliamentaryVote,
  type TradeOffAnalysis,
  type DebateConfig,
  type DebateResult,
  type VoteType,
  DEFAULT_DEBATE_CONFIG,
  AGENT_ROLE_PREFERENCES,
} from './types';
import {
  buildDebateSystemPrompt,
  buildDebateTurnPrompt,
  buildVotingPrompt,
  buildConsensusPrompt,
} from './debatePrompts';
import { reputationDb } from './reputationRepository';

/**
 * Select relevant agents for a debate based on idea category and scan type
 */
export function selectDebateAgents(
  idea: DbIdea,
  config: DebateConfig
): { agents: ScanType[]; roles: Map<ScanType, DebateRole> } {
  const allAgents = SCAN_TYPE_CONFIGS.map(c => c.value);
  const selectedAgents: ScanType[] = [];
  const roleAssignments = new Map<ScanType, DebateRole>();

  // Always include the original agent that generated the idea
  if (idea.scan_type && isValidScanType(idea.scan_type)) {
    selectedAgents.push(idea.scan_type as ScanType);
    roleAssignments.set(idea.scan_type as ScanType, 'proposer');
  }

  // Select relevant challengers based on idea category
  const challengerCandidates = selectChallengers(idea, allAgents, selectedAgents);
  const numChallengers = Math.min(2, config.maxAgents - selectedAgents.length);

  for (let i = 0; i < numChallengers && i < challengerCandidates.length; i++) {
    selectedAgents.push(challengerCandidates[i]);
    roleAssignments.set(challengerCandidates[i], 'challenger');
  }

  // Select a mediator
  const mediatorCandidates = selectMediators(allAgents, selectedAgents);
  if (mediatorCandidates.length > 0 && selectedAgents.length < config.maxAgents) {
    const mediator = mediatorCandidates[0];
    selectedAgents.push(mediator);
    roleAssignments.set(mediator, 'mediator');
  }

  // Fill remaining slots with voters
  const voterCandidates = allAgents.filter(a => !selectedAgents.includes(a));
  const numVoters = Math.min(
    config.maxAgents - selectedAgents.length,
    voterCandidates.length
  );

  for (let i = 0; i < numVoters; i++) {
    selectedAgents.push(voterCandidates[i]);
    roleAssignments.set(voterCandidates[i], 'voter');
  }

  // Ensure minimum agents
  while (selectedAgents.length < config.minAgents && voterCandidates.length > selectedAgents.length) {
    const nextVoter = voterCandidates[selectedAgents.length - 1];
    if (nextVoter && !selectedAgents.includes(nextVoter)) {
      selectedAgents.push(nextVoter);
      roleAssignments.set(nextVoter, 'voter');
    } else {
      break;
    }
  }

  return { agents: selectedAgents, roles: roleAssignments };
}

function isValidScanType(value: string): value is ScanType {
  return SCAN_TYPE_CONFIGS.some(c => c.value === value);
}

/**
 * Select appropriate challengers based on idea characteristics
 */
function selectChallengers(idea: DbIdea, allAgents: ScanType[], excluded: ScanType[]): ScanType[] {
  const category = idea.category?.toLowerCase() || '';
  const scanType = idea.scan_type || '';

  // Map categories to relevant challengers
  const categoryChallengers: Record<string, ScanType[]> = {
    performance: ['perf_optimizer', 'data_flow_optimizer'],
    security: ['security_protector', 'bug_hunter'],
    ui: ['ui_perfectionist', 'accessibility_advocate', 'user_empathy_champion'],
    ux: ['user_empathy_champion', 'onboarding_optimizer', 'delight_designer'],
    architecture: ['zen_architect', 'code_refactor', 'data_flow_optimizer'],
    refactoring: ['code_refactor', 'zen_architect', 'dev_experience_engineer'],
    feature: ['feature_scout', 'business_visionary', 'bug_hunter'],
    business: ['business_visionary', 'perf_optimizer', 'security_protector'],
    accessibility: ['accessibility_advocate', 'user_empathy_champion'],
    testing: ['bug_hunter', 'security_protector'],
  };

  // Find matching challengers
  const relevantChallengers: ScanType[] = [];

  for (const [key, agents] of Object.entries(categoryChallengers)) {
    if (category.includes(key) || scanType.includes(key)) {
      for (const agent of agents) {
        if (!excluded.includes(agent) && !relevantChallengers.includes(agent)) {
          relevantChallengers.push(agent);
        }
      }
    }
  }

  // Default challengers if no specific match
  if (relevantChallengers.length === 0) {
    const defaults: ScanType[] = ['bug_hunter', 'security_protector', 'perf_optimizer'];
    return defaults.filter(a => !excluded.includes(a));
  }

  return relevantChallengers;
}

/**
 * Select appropriate mediators
 */
function selectMediators(allAgents: ScanType[], excluded: ScanType[]): ScanType[] {
  const mediatorPreference: ScanType[] = [
    'insight_synth',
    'ambiguity_guardian',
    'user_empathy_champion',
    'zen_architect',
    'paradigm_shifter',
  ];

  return mediatorPreference.filter(a => !excluded.includes(a));
}

/**
 * Initialize agent states for a debate
 */
function initializeAgentStates(
  agents: ScanType[],
  roles: Map<ScanType, DebateRole>
): Map<ScanType, AgentDebateState> {
  const states = new Map<ScanType, AgentDebateState>();

  for (const agent of agents) {
    states.set(agent, {
      agentType: agent,
      role: roles.get(agent) || 'voter',
      position: '',
      confidence: 50,
      arguments: [],
      votes: [],
      challenged: false,
      changedPosition: false,
    });
  }

  return states;
}

/**
 * Execute a single agent's turn in the debate
 */
async function executeAgentTurn(params: {
  agentType: ScanType;
  role: DebateRole;
  idea: DbIdea;
  previousTurns: DebateTurn[];
  agentStates: Map<ScanType, AgentDebateState>;
  round: number;
  projectContext: string;
  provider?: SupportedProvider;
}): Promise<{ turn: DebateTurn; tokensUsed: number }> {
  const { agentType, role, idea, previousTurns, agentStates, round, projectContext, provider } = params;

  const otherPositions = Array.from(agentStates.values()).filter(
    s => s.agentType !== agentType && s.position
  );

  const systemPrompt = buildDebateSystemPrompt(agentType, role);
  const userPrompt = buildDebateTurnPrompt({
    agentType,
    role,
    idea,
    previousTurns,
    otherPositions,
    round,
    projectContext,
  });

  const response = await generateWithLLM(userPrompt, {
    provider: provider || 'ollama',
    systemPrompt,
    temperature: 0.7,
    maxTokens: 1000,
  });

  let turnData = {
    action: role === 'proposer' ? 'propose' : role === 'challenger' ? 'challenge' : 'mediate',
    content: 'No response generated',
    confidence: 50,
    reasoning: '',
    targetAgent: null as ScanType | null,
    positionChange: false,
  };

  if (response.success && response.response) {
    try {
      const parsed = await parseJsonWithLLM(response.response);
      if (parsed.success && parsed.data) {
        turnData = { ...turnData, ...parsed.data };
      }
    } catch {
      // Use defaults if parsing fails
      turnData.content = response.response.substring(0, 500);
    }
  }

  const turn: DebateTurn = {
    id: uuidv4(),
    round,
    agentType,
    role,
    action: turnData.action as DebateTurn['action'],
    content: turnData.content,
    targetAgent: turnData.targetAgent ?? undefined,
    confidence: turnData.confidence,
    timestamp: new Date().toISOString(),
  };

  // Update agent state
  const state = agentStates.get(agentType);
  if (state) {
    state.position = turnData.content;
    state.confidence = turnData.confidence;
    state.arguments.push(turnData.content);
    if (turnData.positionChange) {
      state.changedPosition = true;
    }
    agentStates.set(agentType, state);
  }

  return {
    turn,
    tokensUsed: (response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0),
  };
}

/**
 * Execute parliamentary voting
 */
async function executeVoting(params: {
  idea: DbIdea;
  agents: ScanType[];
  agentStates: Map<ScanType, AgentDebateState>;
  debateSummary: string;
  tradeOffs: TradeOffAnalysis[];
  projectId: string;
  provider?: SupportedProvider;
}): Promise<{ vote: ParliamentaryVote; tokensUsed: number }> {
  const { idea, agents, agentStates, debateSummary, tradeOffs, projectId, provider } = params;

  const votes: ParliamentaryVote['votes'] = [];
  let totalTokens = 0;

  for (const agentType of agents) {
    const systemPrompt = buildDebateSystemPrompt(agentType, 'voter');
    const userPrompt = buildVotingPrompt({
      agentType,
      idea,
      debateSummary,
      tradeOffs: tradeOffs.map(t => ({
        dimension: t.dimension,
        proArg: t.proArgument,
        conArg: t.conArgument,
      })),
    });

    const response = await generateWithLLM(userPrompt, {
      provider: provider || 'ollama',
      systemPrompt,
      temperature: 0.3,
      maxTokens: 500,
    });

    let voteData = {
      vote: 'abstain' as VoteType,
      reasoning: 'No vote cast',
      confidence: 50,
    };

    if (response.success && response.response) {
      try {
        const parsed = await parseJsonWithLLM(response.response);
        if (parsed.success && parsed.data) {
          voteData = { ...voteData, ...parsed.data };
        }
      } catch {
        // Use defaults
      }
    }

    // Get agent reputation for weight
    let weight = 1.0;
    try {
      const reputation = reputationDb.getAgentReputation(agentType, projectId);
      if (reputation) {
        weight = 0.5 + (reputation.reputationScore / 200); // 0.5 to 1.0 based on reputation
      }
    } catch {
      // Use default weight
    }

    votes.push({
      agentType,
      vote: voteData.vote,
      reasoning: voteData.reasoning,
      weight,
    });

    totalTokens += (response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0);
  }

  const supportCount = votes.filter(v => v.vote === 'support').length;
  const opposeCount = votes.filter(v => v.vote === 'oppose').length;
  const abstainCount = votes.filter(v => v.vote === 'abstain').length;

  const weightedSupport = votes
    .filter(v => v.vote === 'support')
    .reduce((sum, v) => sum + v.weight, 0);
  const weightedOppose = votes
    .filter(v => v.vote === 'oppose')
    .reduce((sum, v) => sum + v.weight, 0);

  const parliamentaryVote: ParliamentaryVote = {
    ideaId: idea.id,
    votes,
    supportCount,
    opposeCount,
    abstainCount,
    weightedSupport,
    passed: weightedSupport > weightedOppose,
    margin: weightedSupport - weightedOppose,
  };

  return { vote: parliamentaryVote, tokensUsed: totalTokens };
}

/**
 * Check for consensus among agents
 */
async function checkConsensus(params: {
  idea: DbIdea;
  agentStates: Map<ScanType, AgentDebateState>;
  round: number;
  provider?: SupportedProvider;
}): Promise<{ reached: boolean; level: number; recommendation: string }> {
  const { idea, agentStates, round, provider } = params;

  const positions = Array.from(agentStates.values())
    .filter(s => s.position)
    .map(s => ({
      agent: s.agentType,
      position: s.position,
      confidence: s.confidence,
    }));

  if (positions.length < 2) {
    return { reached: true, level: 1.0, recommendation: 'proceed_to_vote' };
  }

  const prompt = buildConsensusPrompt({ idea, agentPositions: positions, round });

  const response = await generateWithLLM(prompt, {
    provider: provider || 'ollama',
    temperature: 0.3,
    maxTokens: 500,
  });

  if (response.success && response.response) {
    try {
      const parsed = await parseJsonWithLLM(response.response);
      if (parsed.success && parsed.data) {
        return {
          reached: parsed.data.consensusReached ?? false,
          level: parsed.data.consensusLevel ?? 0.5,
          recommendation: parsed.data.recommendation ?? 'continue_debate',
        };
      }
    } catch {
      // Default to continue
    }
  }

  return { reached: false, level: 0.5, recommendation: 'continue_debate' };
}

/**
 * Extract trade-offs from debate turns
 */
function extractTradeOffs(
  turns: DebateTurn[],
  ideaId: string
): TradeOffAnalysis[] {
  const tradeOffs: TradeOffAnalysis[] = [];
  const dimensions = ['performance', 'security', 'maintainability', 'usability', 'accessibility', 'complexity'];

  // Find opposing arguments on same dimensions
  for (const dimension of dimensions) {
    const dimensionKeywords = getDimensionKeywords(dimension);
    const relatedTurns = turns.filter(t =>
      dimensionKeywords.some(kw => t.content.toLowerCase().includes(kw))
    );

    if (relatedTurns.length >= 2) {
      const proposerTurn = relatedTurns.find(t => t.role === 'proposer');
      const challengerTurn = relatedTurns.find(t => t.role === 'challenger');

      if (proposerTurn && challengerTurn) {
        tradeOffs.push({
          id: uuidv4(),
          ideaId,
          dimension,
          proAgent: proposerTurn.agentType,
          conAgent: challengerTurn.agentType,
          proArgument: proposerTurn.content,
          conArgument: challengerTurn.content,
          importance: determineImportance(proposerTurn.confidence, challengerTurn.confidence),
        });
      }
    }
  }

  return tradeOffs;
}

function getDimensionKeywords(dimension: string): string[] {
  const keywordMap: Record<string, string[]> = {
    performance: ['speed', 'latency', 'performance', 'fast', 'slow', 'efficient', 'cpu', 'memory'],
    security: ['security', 'vulnerability', 'attack', 'injection', 'auth', 'encrypt', 'secure'],
    maintainability: ['maintain', 'readable', 'clean', 'debt', 'refactor', 'complex', 'simple'],
    usability: ['user', 'experience', 'ux', 'intuitive', 'confusing', 'easy', 'hard'],
    accessibility: ['accessible', 'a11y', 'screen reader', 'keyboard', 'wcag', 'aria'],
    complexity: ['complex', 'simple', 'abstraction', 'coupling', 'dependency'],
  };
  return keywordMap[dimension] || [dimension];
}

function determineImportance(
  proConfidence: number,
  conConfidence: number
): 'critical' | 'significant' | 'minor' {
  const avgConfidence = (proConfidence + conConfidence) / 2;
  if (avgConfidence >= 80) return 'critical';
  if (avgConfidence >= 60) return 'significant';
  return 'minor';
}

/**
 * Generate debate summary
 */
function generateDebateSummary(rounds: DebateRound[], agentStates: Map<ScanType, AgentDebateState>): string {
  const summaries: string[] = [];

  for (const round of rounds) {
    summaries.push(`Round ${round.roundNumber}: ${round.summary || 'Discussion continued.'}`);
  }

  const finalPositions = Array.from(agentStates.values())
    .filter(s => s.position)
    .map(s => {
      const config = getScanTypeConfig(s.agentType);
      return `${config?.emoji || '🤖'} ${config?.label || s.agentType}: ${s.position.substring(0, 100)}...`;
    });

  return summaries.join(' ') + '\n\nFinal Positions:\n' + finalPositions.join('\n');
}

/**
 * Main function to run a parliament debate
 */
export async function runParliamentDebate(params: {
  idea: DbIdea;
  projectId: string;
  projectContext: string;
  config?: Partial<DebateConfig>;
  provider?: SupportedProvider;
}): Promise<DebateResult> {
  const { idea, projectId, projectContext, provider } = params;
  const config = { ...DEFAULT_DEBATE_CONFIG, ...params.config };

  const startTime = Date.now();
  let totalTokensUsed = 0;

  // Select agents and assign roles
  const { agents, roles } = selectDebateAgents(idea, config);
  const agentStates = initializeAgentStates(agents, roles);

  const session: DebateSession = {
    id: uuidv4(),
    projectId,
    ideaIds: [idea.id],
    status: 'proposing',
    rounds: [],
    agentStates,
    currentRound: 1,
    maxRounds: config.maxRounds,
    consensusThreshold: config.consensusThreshold,
    qualityThreshold: config.qualityThreshold,
    selectedIdeaId: null,
    votes: [],
    tradeOffs: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    totalTokensUsed: 0,
  };

  // Run debate rounds
  for (let roundNum = 1; roundNum <= config.maxRounds; roundNum++) {
    const round: DebateRound = {
      roundNumber: roundNum,
      proposer: agents.find(a => roles.get(a) === 'proposer') || agents[0],
      challengers: agents.filter(a => roles.get(a) === 'challenger'),
      mediator: agents.find(a => roles.get(a) === 'mediator'),
      turns: [],
      outcome: 'ongoing',
      summary: '',
    };

    session.currentRound = roundNum;
    session.status = roundNum === 1 ? 'proposing' : 'challenging';

    // Execute turns for each agent
    for (const agent of agents) {
      const role = roles.get(agent) || 'voter';

      // Skip voters until final round
      if (role === 'voter' && roundNum < config.maxRounds) continue;

      const { turn, tokensUsed } = await executeAgentTurn({
        agentType: agent,
        role,
        idea,
        previousTurns: round.turns,
        agentStates,
        round: roundNum,
        projectContext,
        provider,
      });

      round.turns.push(turn);
      totalTokensUsed += tokensUsed;

      // Mark challenged agents
      if (turn.targetAgent) {
        const targetState = agentStates.get(turn.targetAgent);
        if (targetState) {
          targetState.challenged = true;
          agentStates.set(turn.targetAgent, targetState);
        }
      }
    }

    // Check for consensus after each round
    const consensus = await checkConsensus({
      idea,
      agentStates,
      round: roundNum,
      provider,
    });

    if (consensus.reached || roundNum === config.maxRounds || consensus.recommendation === 'proceed_to_vote') {
      round.outcome = consensus.reached ? 'consensus' : 'vote_required';
      round.summary = `${consensus.reached ? 'Consensus reached' : 'Moving to vote'} with ${(consensus.level * 100).toFixed(0)}% agreement.`;
      session.rounds.push(round);
      break;
    }

    round.outcome = 'ongoing';
    round.summary = `Round ${roundNum} completed. Debate continues.`;
    session.rounds.push(round);
  }

  // Extract trade-offs from debate
  const allTurns = session.rounds.flatMap(r => r.turns);
  const tradeOffs = extractTradeOffs(allTurns, idea.id);
  session.tradeOffs = tradeOffs;

  // Conduct parliamentary voting
  session.status = 'voting';
  const debateSummary = generateDebateSummary(session.rounds, agentStates);

  const { vote, tokensUsed: voteTokens } = await executeVoting({
    idea,
    agents,
    agentStates,
    debateSummary,
    tradeOffs,
    projectId,
    provider,
  });

  session.votes.push(vote);
  totalTokensUsed += voteTokens;

  // Determine final outcome
  const consensusLevel = vote.supportCount / agents.length;
  const consensusReached = consensusLevel >= config.consensusThreshold;

  session.status = consensusReached ? 'consensus' : 'completed';
  session.selectedIdeaId = vote.passed ? idea.id : null;
  session.completedAt = new Date().toISOString();
  session.totalTokensUsed = totalTokensUsed;

  const result: DebateResult = {
    sessionId: session.id,
    selectedIdeaId: session.selectedIdeaId,
    reasoning: generateDebateSummary(session.rounds, agentStates),
    consensusReached,
    consensusLevel,
    tradeOffs,
    agentVotes: vote,
    tokensUsed: totalTokensUsed,
    debateRounds: session.rounds.length,
    duration: Date.now() - startTime,
  };

  return result;
}

/**
 * Run a quick debate for idea comparison
 */
export async function runQuickDebate(params: {
  ideas: DbIdea[];
  projectId: string;
  projectContext: string;
  provider?: SupportedProvider;
}): Promise<{ selectedIdeaId: string | null; results: DebateResult[] }> {
  const { ideas, projectId, projectContext, provider } = params;

  if (ideas.length === 0) {
    return { selectedIdeaId: null, results: [] };
  }

  if (ideas.length === 1) {
    const result = await runParliamentDebate({
      idea: ideas[0],
      projectId,
      projectContext,
      config: { maxRounds: 2 },
      provider,
    });
    return { selectedIdeaId: result.selectedIdeaId, results: [result] };
  }

  // Debate each idea and compare
  const results: DebateResult[] = [];

  for (const idea of ideas.slice(0, 5)) { // Limit to top 5
    const result = await runParliamentDebate({
      idea,
      projectId,
      projectContext,
      config: { maxRounds: 2, maxAgents: 4 },
      provider,
    });
    results.push(result);
  }

  // Select the idea with highest consensus
  const passedResults = results.filter(r => r.selectedIdeaId !== null);

  if (passedResults.length === 0) {
    return { selectedIdeaId: null, results };
  }

  const best = passedResults.reduce((prev, curr) =>
    curr.consensusLevel > prev.consensusLevel ? curr : prev
  );

  return { selectedIdeaId: best.selectedIdeaId, results };
}
