/**
 * Next Step Recommendation Prompt
 *
 * Guides the LLM to recommend the next scan type based on project statistics
 * and current state of contexts, ideas, and recent scan history.
 */

export interface NextStepPromptData {
  // Project statistics
  ideasAccepted: number;
  ideasPending: number;
  ideasTotal: number;
  contextsCount: number;

  // Recent scan history (from events DB)
  recentScans: Array<{
    title: string;
    description: string;
    timestamp: string;
  }>;

  // Available scan capabilities
  scanCapabilities: Array<{
    category: string;
    description: string;
    eventTitle: string;
  }>;
}

/**
 * Scan capability descriptions from ScanBuilder
 */
export const SCAN_CAPABILITIES = [
  {
    category: 'vision',
    description: 'Analyze project overall and create a high-level overview documentation with vision.',
    eventTitle: 'Vision Scan Completed',
  },
  {
    category: 'contexts',
    description: 'Analyze project files and suggest grouping into features (contexts) for better organization and understanding of modules.',
    eventTitle: 'Contexts Scan Completed',
  },
  {
    category: 'structure',
    description: 'Analyze code structure with static analysis and provides refactoring suggestions to improve modularity and maintainability.',
    eventTitle: 'Structure Scan Completed',
  },
  {
    category: 'build',
    description: 'Batch code execution of prepared Claude Code requirement files (accepted ideas)',
    eventTitle: 'Build Scan Completed',
  },
  {
    category: 'dependencies',
    description: 'Analyze project dependencies and suggest updates, removals, or additions to improve security and performance.',
    eventTitle: 'Dependencies Scan Completed',
  },
  {
    category: 'ideas',
    description: 'Generate new ideas for project features, improvements, or enhancements using AI analysis of the codebase and context.',
    eventTitle: 'Ideas Generated',
  },
];

/**
 * Creates the Next Step recommendation prompt
 */
export function createNextStepPrompt(data: NextStepPromptData): string {
  const {
    ideasAccepted,
    ideasPending,
    ideasTotal,
    contextsCount,
    recentScans,
  } = data;

  // Format recent scans section
  const recentScansSection = recentScans.length > 0
    ? recentScans
        .map(scan => `- ${scan.title} (${new Date(scan.timestamp).toLocaleDateString()})`)
        .join('\n')
    : 'No recent scans completed';

  // Format scan capabilities
  const scanCapabilitiesSection = SCAN_CAPABILITIES
    .map(scan => `- **${scan.category}**: ${scan.description}`)
    .join('\n');

  return `You are Annette, a project workflow advisor helping users prioritize their next development action.

**CRITICAL: THIS IS A VOICE INTERFACE**
Your response will be read aloud via text-to-speech. Keep it SHORT (1-2 sentences max), DIRECT, and CONVERSATIONAL.

**Current Project Statistics:**
- Total Ideas: ${ideasTotal}
  - Accepted: ${ideasAccepted}
  - Pending: ${ideasPending}
- Contexts (main features): ${contextsCount}

**Recent Scan History:**
${recentScansSection}

**Available Scan Capabilities:**
${scanCapabilitiesSection}

**Evaluation Criteria:**
You must recommend ONE scan type based on these rules:

1. **Very Low Ideas** (< 5 total):
   → Recommend "ideas" scan to generate new feature suggestions

2. **Low Ideas** (< 20 total):
   → Recommend "ideas" scan to build up the backlog

3. **Low Contexts** (< 10) AND Low Ideas (< 20):
   → Recommend "contexts" scan to organize the codebase into feature groups first

4. **Many Contexts** (≥ 10) AND Low Ideas (< 20):
   → Recommend "structure" scan for refactoring suggestions

5. **Moderate Contexts** (≥ 10) AND Moderate Ideas (≥ 20):
   → Recommend "structure" scan for code quality improvements

6. **High Accepted Ideas** (≥ 10 accepted) AND Low Recent Build Scans:
   → Recommend "build" scan to implement accepted ideas

**Response Format:**
You MUST respond in this exact format:
"Your next step is [SCAN_TYPE]. [ONE SENTENCE REASON]."

**Examples:**
- Current: 3 ideas, 5 contexts → "Your next step is ideas. You need more feature suggestions to build your backlog."
- Current: 25 ideas, 8 contexts → "Your next step is contexts. Let's organize your codebase into feature groups first."
- Current: 30 ideas, 15 contexts → "Your next step is structure. Time to analyze your code for refactoring opportunities."
- Current: 45 ideas (15 accepted), 12 contexts → "Your next step is build. You have accepted ideas ready to implement."

**IMPORTANT RULES:**
- Choose EXACTLY ONE scan type from the available capabilities
- Keep the reason to ONE SENTENCE ONLY
- Be specific and direct - no preambles or explanations
- Focus on the most critical bottleneck in the workflow
- Mention specific numbers from the statistics when relevant

Generate your recommendation now:`;
}

/**
 * Parse LLM response to extract recommended scan type
 */
export function parseNextStepResponse(response: string): {
  scanType: string | null;
  reason: string;
  fullResponse: string;
} {
  const fullResponse = response.trim();

  // Try to extract scan type from "Your next step is [SCAN_TYPE]" pattern
  const match = fullResponse.match(/your next step is (\w+)/i);
  const scanType = match ? match[1].toLowerCase() : null;

  // Extract the reason (everything after the scan type)
  const reasonMatch = fullResponse.match(/your next step is \w+\.?\s*(.+)/i);
  const reason = reasonMatch ? reasonMatch[1].trim() : fullResponse;

  return {
    scanType,
    reason,
    fullResponse,
  };
}
