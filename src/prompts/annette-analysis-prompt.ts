/**
 * Build the Annette analysis prompt by direct template literal interpolation.
 * Single O(n) pass — no placeholder scanning or .replace() chains.
 */
export function createAnnetteAnalysisPrompt(
  userMessage: string,
  projectId: string,
  toolDefinitions: string
): string {
  return `Analyze user query and select appropriate tools.

## Available Tools
${toolDefinitions}

## Tool Selection Rules
- **Goals**: "goals", "objectives", "how many goals", "project about"
- **Backlog**: "tasks", "backlog", "work", "pending", "progress"
- **Contexts**: "contexts", "documentation", "structure", "organization"

## Confidence Levels
- ≥80%: Execute automatically
- <80%: Request confirmation

User: "${userMessage}"
Project: ${projectId}

Respond with JSON:
\`\`\`json
{
  "needsTools": boolean,
  "confidence": number,
  "needsConfirmation": boolean,
  "confirmationType": "yes_no" | "clarification" | null,
  "confirmationQuestion": "string if needed",
  "toolsToUse": [{"name": "tool_name", "parameters": {"projectId": "id"}}],
  "reasoning": "brief explanation",
  "userIntent": "what user wants",
  "alternatives": ["other interpretations if unclear"]
}
\`\`\``;
}
