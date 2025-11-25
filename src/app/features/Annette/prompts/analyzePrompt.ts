/**
 * Analyze Action Prompt
 * Analyzes project context and proposes next steps (Refactoring, Fix, Improve)
 */

export interface AnalyzePromptData {
  contextId: string;
  contextName: string;
  contextDescription: string;
  filesCount: number;
  recentChanges?: string[];
  untestedLogsForContext?: number;
}

export type AnalyzeActionType = 'refactor' | 'fix' | 'improve' | 'test' | 'document';

/**
 * Creates the Analyze prompt for context analysis
 */
export function createAnalyzePrompt(data: AnalyzePromptData): string {
  const {
    contextName,
    contextDescription,
    filesCount,
    recentChanges,
    untestedLogsForContext,
  } = data;

  const changesSection = recentChanges && recentChanges.length > 0
    ? `\n**Recent Changes:**\n${recentChanges.slice(0, 3).map(c => `- ${c}`).join('\n')}`
    : '';

  const untestedSection = untestedLogsForContext && untestedLogsForContext > 0
    ? `\n**Untested Implementations:** ${untestedLogsForContext} logs need review`
    : '';

  return `You are Annette, a code analysis advisor helping users understand their project context and determine next actions.

**CRITICAL: THIS IS A VOICE INTERFACE**
Your response will be read aloud via text-to-speech. Keep it SHORT (2-3 sentences max), DIRECT, and CONVERSATIONAL.

**Context Information:**
- Name: "${contextName}"
- Description: ${contextDescription}
- Files: ${filesCount} files in this context
${changesSection}
${untestedSection}

**Your Task:**
Analyze this context and recommend ONE of these actions:
1. **refactor** - Code needs restructuring for better maintainability
2. **fix** - There are bugs or issues that need fixing
3. **improve** - Code works but could be enhanced (performance, features)
4. **test** - Implementations need testing and review
5. **document** - Code needs better documentation

**Response Format:**
You MUST respond with:
1. A brief analysis (1 sentence)
2. Recommended action type
3. Why this action is important (1 sentence)

**Example Responses:**
- "The ${contextName} context has ${filesCount} files with untested implementations. I recommend test action to review and validate recent work before moving forward."
- "Looking at ${contextName}, the code structure could be more modular. I recommend refactor action to improve maintainability and reduce complexity."
- "The ${contextName} context is stable with ${filesCount} files. I recommend improve action to add new features or optimize performance."

**IMPORTANT RULES:**
- Keep total response to 2-3 sentences MAX
- Be specific about what needs attention
- Mention context name and key metrics
- Choose the MOST CRITICAL action based on the data
- If untested logs > 0, strongly consider recommending "test" action

Generate your analysis now:`;
}

/**
 * Parse analyze response to extract recommended action and metadata
 */
export function parseAnalyzeResponse(
  response: string,
  data: AnalyzePromptData
): {
  audioMessage: string;
  metadata: {
    recommendedAction: AnalyzeActionType;
    contextId: string;
    contextName: string;
    requiresFollowUp: boolean;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
} {
  const lowerResponse = response.toLowerCase();

  // Detect recommended action from response
  let recommendedAction: AnalyzeActionType = 'improve';  // Default

  if (lowerResponse.includes('refactor')) {
    recommendedAction = 'refactor';
  } else if (lowerResponse.includes('fix')) {
    recommendedAction = 'fix';
  } else if (lowerResponse.includes('test')) {
    recommendedAction = 'test';
  } else if (lowerResponse.includes('document')) {
    recommendedAction = 'document';
  }

  // Determine priority based on action and context
  let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  if (data.untestedLogsForContext && data.untestedLogsForContext > 5) {
    priority = 'high';
  } else if (recommendedAction === 'fix') {
    priority = 'high';
  } else if (recommendedAction === 'test' && data.untestedLogsForContext && data.untestedLogsForContext > 0) {
    priority = 'high';
  } else if (recommendedAction === 'refactor') {
    priority = 'medium';
  } else {
    priority = 'low';
  }

  return {
    audioMessage: response.trim(),
    metadata: {
      recommendedAction,
      contextId: data.contextId,
      contextName: data.contextName,
      requiresFollowUp: true,  // Always true - we need to ask about requirement generation
      priority,
    },
  };
}
