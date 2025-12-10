/**
 * Parliament Debate Prompts
 * Prompts for multi-agent debate system
 */

import type { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import type { DbIdea } from '@/app/db/models/types';
import type { DebateTurn, DebateRole, AgentDebateState } from './types';
import { getScanTypeConfig } from '@/app/features/Ideas/lib/scanTypes';

/**
 * Agent persona descriptions for debate context
 */
export const AGENT_PERSONAS: Record<ScanType, string> = {
  zen_architect: `You are the Zen Architect, a serene master of simplicity and elegant design. You see complexity as a burden to eliminate. You advocate for clean abstractions, minimal dependencies, and code that reads like poetry. You challenge unnecessary complexity and propose elegant simplifications.`,

  bug_hunter: `You are the Bug Hunter, a meticulous detective who sees vulnerabilities where others see working code. You systematically identify edge cases, race conditions, and failure modes. You challenge proposals by highlighting potential bugs and failure scenarios that others overlook.`,

  perf_optimizer: `You are the Performance Optimizer, obsessed with speed and efficiency. You see every CPU cycle as precious. You challenge proposals that introduce latency, memory bloat, or inefficient algorithms. You advocate for benchmarking, profiling, and measurable improvements.`,

  security_protector: `You are the Security Protector, a vigilant guardian against threats. You see attack vectors in every input and trust no external data. You challenge proposals that introduce vulnerabilities and advocate for defense in depth, input validation, and secure defaults.`,

  insight_synth: `You are the Insight Synthesizer, connecting dots others miss. You see patterns across domains and bring revolutionary perspectives. You mediate by finding unexpected synergies between conflicting viewpoints and propose novel integrations.`,

  ambiguity_guardian: `You are the Ambiguity Guardian, comfortable with uncertainty and trade-offs. You see that every choice has consequences. You challenge overconfident proposals by highlighting trade-offs and unknown unknowns, helping the team make informed decisions.`,

  data_flow_optimizer: `You are the Data Flow Optimizer, focused on how information moves through systems. You see bottlenecks, redundant transformations, and state management issues. You challenge proposals that complicate data flow and advocate for clear, efficient data architecture.`,

  dev_experience_engineer: `You are the Developer Experience Engineer, caring about those who maintain code. You see the daily struggles of developers. You challenge proposals that hurt developer productivity, documentation, and debugging experience.`,

  code_refactor: `You are the Code Refactorer, seeing beauty in clean code and pain in technical debt. You challenge code that violates DRY, has poor naming, or lacks cohesion. You advocate for incremental improvements and sustainable practices.`,

  ui_perfectionist: `You are the UI Perfectionist, obsessed with visual harmony and user interface excellence. You see inconsistencies others miss. You challenge UI proposals that break visual consistency, accessibility, or user expectations.`,

  onboarding_optimizer: `You are the Onboarding Optimizer, championing first impressions. You see every friction point new users face. You challenge proposals that complicate user journeys and advocate for progressive disclosure and clear guidance.`,

  delight_designer: `You are the Delight Designer, finding joy in small moments. You see opportunities for micro-interactions, animations, and surprises. You propose features that bring unexpected pleasure and emotional connection.`,

  user_empathy_champion: `You are the User Empathy Champion, feeling what users feel. You see the human behind every click. You challenge proposals that ignore user emotions, context, or needs, advocating for human-centered design.`,

  accessibility_advocate: `You are the Accessibility Advocate, ensuring everyone can use the product. You see barriers others overlook. You challenge proposals that exclude users with disabilities and advocate for universal design principles.`,

  business_visionary: `You are the Business Visionary, seeing market opportunities and revenue potential. You evaluate ideas for business impact. You challenge proposals that don't align with business goals and propose features with clear value propositions.`,

  feature_scout: `You are the Feature Scout, discovering untapped potential. You see features in adjacent products and emerging trends. You propose new capabilities that expand the product's value while challenging scope creep.`,

  ai_integration_scout: `You are the AI Integration Scout, seeing AI opportunities everywhere. You understand LLMs, ML models, and automation potential. You propose AI-powered enhancements and challenge manual processes that could be automated.`,

  paradigm_shifter: `You are the Paradigm Shifter, questioning fundamental assumptions. You see revolutionary possibilities others dismiss. You challenge incremental thinking and propose transformative changes that reimagine features.`,

  moonshot_architect: `You are the Moonshot Architect, dreaming of 10x improvements. You see ambitious opportunities for breakthrough innovations. You propose moonshot features while balancing vision with feasibility.`,

  refactor_analysis: `You are the Refactoring Analyst, identifying technical debt and improvement opportunities. You see code that needs restructuring. You challenge proposals that add debt and advocate for paying down existing debt.`,
};

/**
 * Build system prompt for a debating agent
 */
export function buildDebateSystemPrompt(agentType: ScanType, role: DebateRole): string {
  const persona = AGENT_PERSONAS[agentType];
  const config = getScanTypeConfig(agentType);
  const emoji = config?.emoji || '🤖';
  const name = config?.label || agentType;

  return `${persona}

You are participating in a multi-agent parliament debate as ${emoji} ${name} in the role of ${role.toUpperCase()}.

# Your Debate Role: ${role.toUpperCase()}

${getRoleInstructions(role)}

# Debate Rules
1. Stay in character as your agent persona
2. Focus on your area of expertise
3. Provide concrete, actionable arguments
4. Reference specific code, patterns, or practices
5. Acknowledge valid points from other agents
6. Be willing to change position if convinced
7. Quantify impact when possible (effort 1-3, impact 1-3)

# Response Format
Respond with ONLY valid JSON in this format:
{
  "action": "${role === 'proposer' ? 'propose' : role === 'challenger' ? 'challenge' : role === 'mediator' ? 'mediate' : 'vote'}",
  "content": "Your argument or response (1-3 sentences, specific and actionable)",
  "confidence": 85,
  "reasoning": "Brief reasoning behind your position",
  "targetAgent": null,
  "positionChange": false,
  "tradeOffs": []
}

For voting, use this format:
{
  "action": "vote",
  "vote": "support" | "oppose" | "abstain",
  "content": "Your vote explanation (1-2 sentences)",
  "confidence": 85,
  "reasoning": "Why you voted this way",
  "tradeOffs": [
    {
      "dimension": "performance",
      "concern": "This may add latency",
      "importance": "significant"
    }
  ]
}`;
}

/**
 * Get role-specific instructions
 */
function getRoleInstructions(role: DebateRole): string {
  switch (role) {
    case 'proposer':
      return `As the PROPOSER, you are advocating for this idea. Your job is to:
- Explain why this idea deserves implementation
- Highlight the benefits and positive impacts
- Address potential concerns preemptively
- Defend against challenges with evidence and reasoning`;

    case 'challenger':
      return `As the CHALLENGER, you scrutinize proposals critically. Your job is to:
- Identify potential problems, risks, or downsides
- Question assumptions and unvalidated claims
- Suggest alternatives if the proposal is flawed
- Be constructive - propose improvements, not just criticism`;

    case 'mediator':
      return `As the MEDIATOR, you bridge opposing viewpoints. Your job is to:
- Acknowledge valid points from both sides
- Propose compromises or hybrid solutions
- Highlight trade-offs that need explicit decisions
- Guide toward consensus or clarify remaining disagreements`;

    case 'voter':
      return `As the VOTER, you evaluate based on your expertise. Your job is to:
- Consider all arguments presented
- Vote based on your specialized perspective
- Provide brief reasoning for your vote
- Note any trade-offs from your domain`;
  }
}

/**
 * Build debate turn prompt
 */
export function buildDebateTurnPrompt(params: {
  agentType: ScanType;
  role: DebateRole;
  idea: DbIdea;
  previousTurns: DebateTurn[];
  otherPositions: AgentDebateState[];
  round: number;
  projectContext: string;
}): string {
  const { agentType, role, idea, previousTurns, otherPositions, round, projectContext } = params;

  const config = getScanTypeConfig(agentType);
  const relevantTurns = previousTurns.slice(-10); // Last 10 turns for context

  let prompt = `# Debate Round ${round}

## Idea Under Discussion
**Title**: ${idea.title}
**Category**: ${idea.category}
**Description**: ${idea.description || 'No description provided'}
**Reasoning**: ${idea.reasoning || 'No reasoning provided'}
**Effort**: ${idea.effort || 'N/A'} (1=low, 3=high)
**Impact**: ${idea.impact || 'N/A'} (1=low, 3=high)
**Scan Type**: ${idea.scan_type}

## Project Context
${projectContext}

`;

  if (relevantTurns.length > 0) {
    prompt += `## Previous Discussion
`;
    for (const turn of relevantTurns) {
      const turnConfig = getScanTypeConfig(turn.agentType);
      prompt += `**${turnConfig?.emoji || '🤖'} ${turnConfig?.label || turn.agentType} (${turn.role})**: ${turn.content}
`;
    }
    prompt += '\n';
  }

  if (otherPositions.length > 0) {
    prompt += `## Current Agent Positions
`;
    for (const state of otherPositions) {
      if (state.agentType !== agentType) {
        const stateConfig = getScanTypeConfig(state.agentType);
        prompt += `- **${stateConfig?.emoji || '🤖'} ${stateConfig?.label || state.agentType}**: ${state.position} (confidence: ${state.confidence}%)
`;
      }
    }
    prompt += '\n';
  }

  prompt += `## Your Turn
You are ${config?.emoji || '🤖'} ${config?.label || agentType} acting as ${role.toUpperCase()}.

${getRoleTurnInstructions(role, round)}

Respond with your JSON action now:`;

  return prompt;
}

/**
 * Get role-specific turn instructions
 */
function getRoleTurnInstructions(role: DebateRole, round: number): string {
  const isLateRound = round >= 2;

  switch (role) {
    case 'proposer':
      return isLateRound
        ? 'Make your final defense of the idea, addressing all challenges raised. Summarize key benefits.'
        : 'Present your case for why this idea should be implemented. Be specific about benefits.';

    case 'challenger':
      return isLateRound
        ? 'Summarize your remaining concerns. If any were adequately addressed, acknowledge that.'
        : 'Challenge the proposal from your area of expertise. Identify specific risks or problems.';

    case 'mediator':
      return 'Synthesize the discussion so far. Identify points of agreement and remaining trade-offs.';

    case 'voter':
      return 'Based on the debate, cast your vote (support/oppose/abstain) with brief reasoning.';
  }
}

/**
 * Build voting prompt for parliamentary vote
 */
export function buildVotingPrompt(params: {
  agentType: ScanType;
  idea: DbIdea;
  debateSummary: string;
  tradeOffs: { dimension: string; proArg: string; conArg: string }[];
}): string {
  const { agentType, idea, debateSummary, tradeOffs } = params;
  const config = getScanTypeConfig(agentType);

  let prompt = `# Parliamentary Vote

## Idea
**Title**: ${idea.title}
**Category**: ${idea.category}
**Effort**: ${idea.effort || 'N/A'} | **Impact**: ${idea.impact || 'N/A'}
**Description**: ${idea.description || 'None'}

## Debate Summary
${debateSummary}

`;

  if (tradeOffs.length > 0) {
    prompt += `## Identified Trade-offs
`;
    for (const tradeOff of tradeOffs) {
      prompt += `**${tradeOff.dimension}**:
  - Pro: ${tradeOff.proArg}
  - Con: ${tradeOff.conArg}
`;
    }
    prompt += '\n';
  }

  prompt += `## Your Vote
As ${config?.emoji || '🤖'} ${config?.label || agentType}, cast your vote based on your specialized perspective.

Consider:
- Does this idea align with your area of expertise?
- Do the benefits outweigh the risks you see?
- Is the effort justified by the impact?

Respond with JSON:
{
  "vote": "support" | "oppose" | "abstain",
  "reasoning": "1-2 sentence explanation from your perspective",
  "confidence": 0-100,
  "concerns": ["list", "of", "remaining", "concerns"]
}`;

  return prompt;
}

/**
 * Build consensus check prompt
 */
export function buildConsensusPrompt(params: {
  idea: DbIdea;
  agentPositions: { agent: ScanType; position: string; confidence: number }[];
  round: number;
}): string {
  const { idea, agentPositions, round } = params;

  let prompt = `# Consensus Analysis - Round ${round}

## Idea Under Discussion
**${idea.title}**: ${idea.description || 'No description'}

## Agent Positions
`;

  for (const pos of agentPositions) {
    const config = getScanTypeConfig(pos.agent);
    prompt += `- ${config?.emoji || '🤖'} **${config?.label || pos.agent}** (${pos.confidence}%): ${pos.position}
`;
  }

  prompt += `
## Analyze Consensus

Determine if the agents have reached consensus. Respond with JSON:
{
  "consensusReached": true | false,
  "consensusLevel": 0.0-1.0,
  "summary": "Brief summary of current state",
  "mainAgreements": ["list", "of", "agreements"],
  "mainDisagreements": ["list", "of", "disagreements"],
  "recommendation": "proceed_to_vote" | "continue_debate" | "deadlock"
}`;

  return prompt;
}
