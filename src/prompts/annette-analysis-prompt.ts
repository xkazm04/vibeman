export const ANNETTE_ANALYSIS_PROMPT = `Analyze user query and select appropriate tools.

## Available Tools
{{TOOL_DEFINITIONS}}

## Tool Selection Rules
- **Goals**: "goals", "objectives", "how many goals", "project about"
- **Backlog**: "tasks", "backlog", "work", "pending", "progress"  
- **Contexts**: "contexts", "documentation", "structure", "organization"

## Confidence Levels
- ≥80%: Execute automatically
- <80%: Request confirmation

User: "{{USER_MESSAGE}}"
Project: {{PROJECT_ID}}

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

export function createAnnetteAnalysisPrompt(
  userMessage: string,
  projectId: string,
  toolDefinitions: string
): string {
  return ANNETTE_ANALYSIS_PROMPT
    .replace('{{USER_MESSAGE}}', userMessage)
    .replace('{{PROJECT_ID}}', projectId)
    .replace('{{TOOL_DEFINITIONS}}', toolDefinitions);
}