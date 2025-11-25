/**
 * Status Action Prompt
 * Reports on untested implementation logs that require user review
 */

export interface StatusPromptData {
  untestedCount: number;
  recentLogs: Array<{
    id: string;
    title: string;
    requirement_name: string;
    created_at: string;
  }>;
}

/**
 * Creates the Status prompt for voice response
 */
export function createStatusPrompt(data: StatusPromptData): string {
  const { untestedCount, recentLogs } = data;

  // Format recent logs section
  const logsSection = recentLogs.length > 0
    ? recentLogs
        .slice(0, 3)  // Only show top 3
        .map(log => `- ${log.title} (from ${log.requirement_name})`)
        .join('\n')
    : 'No recent implementation logs';

  return `You are Annette, a project status advisor providing implementation status updates.

**CRITICAL: THIS IS A VOICE INTERFACE**
Your response will be read aloud via text-to-speech. Keep it SHORT (1-2 sentences max), DIRECT, and CONVERSATIONAL.

**Current Status:**
- Untested Implementation Logs: ${untestedCount}

${untestedCount > 0 ? `**Recent Untested Logs:**\n${logsSection}` : ''}

**Response Rules:**

1. **If untestedCount is 0:**
   → Say: "All implementations have been tested. You're all clear!"

2. **If untestedCount is 1-3:**
   → Say: "You have [NUMBER] implementation waiting for review: [MENTION FIRST TITLE]."

3. **If untestedCount is 4-10:**
   → Say: "You have [NUMBER] implementations waiting for review. Time to test your recent work."

4. **If untestedCount > 10:**
   → Say: "You have [NUMBER] implementations waiting for review. That's quite a backlog to test!"

**IMPORTANT RULES:**
- Keep response to 1-2 sentences ONLY
- Be conversational and direct
- Use natural numbers ("five" instead of "5" for small numbers)
- If count > 0, emphasize that review is needed
- Do NOT list all items, just mention the total and maybe the first one

Generate your status report now:`;
}

/**
 * Parse status response to extract metadata
 */
export function parseStatusResponse(response: string, data: StatusPromptData): {
  audioMessage: string;
  metadata: {
    requiresReview: boolean;
    untestedCount: number;
    logIds: string[];
  };
} {
  return {
    audioMessage: response.trim(),
    metadata: {
      requiresReview: data.untestedCount > 0,
      untestedCount: data.untestedCount,
      logIds: data.recentLogs.map(log => log.id),
    },
  };
}
