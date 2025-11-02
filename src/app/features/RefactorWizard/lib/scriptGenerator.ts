import { generateWithLLM } from '@/lib/llm';
import type { RefactorOpportunity, RefactorAction, RefactorScript } from '@/stores/refactorStore';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates executable refactor scripts from opportunities
 */
export async function generateRefactorScript(
  opportunities: RefactorOpportunity[],
  provider: string = 'gemini',
  model: string = 'gemini-2.0-flash-exp'
): Promise<RefactorScript> {
  const prompt = buildScriptGenerationPrompt(opportunities);

  try {
    const response = await generateWithLLM({
      prompt,
      provider: provider as any,
      model,
      temperature: 0.2,
      maxTokens: 8000,
    });

    const actions = parseScriptResponse(response.text);

    return {
      id: uuidv4(),
      title: `Refactor ${opportunities.length} opportunities`,
      description: `Automated refactoring for: ${opportunities.map(o => o.title).join(', ')}`,
      opportunities: opportunities.map(o => o.id),
      actions,
      status: 'pending',
      progress: 0,
    };
  } catch (error) {
    throw new Error(`Failed to generate script: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates script for a single opportunity
 */
export async function generateSingleOpportunityScript(
  opportunity: RefactorOpportunity,
  fileContents: Map<string, string>,
  provider: string = 'gemini',
  model: string = 'gemini-2.0-flash-exp'
): Promise<RefactorAction[]> {
  const prompt = buildSingleOpportunityPrompt(opportunity, fileContents);

  try {
    const response = await generateWithLLM({
      prompt,
      provider: provider as any,
      model,
      temperature: 0.1,
      maxTokens: 4000,
    });

    return parseScriptResponse(response.text);
  } catch (error) {
    console.error('Failed to generate script for opportunity:', error);
    return [];
  }
}

/**
 * Builds prompt for generating refactor script
 */
function buildScriptGenerationPrompt(opportunities: RefactorOpportunity[]): string {
  const opportunityDescriptions = opportunities.map((opp, index) =>
    `${index + 1}. ${opp.title}
   Category: ${opp.category}
   Severity: ${opp.severity}
   Files: ${opp.files.join(', ')}
   Description: ${opp.description}
   ${opp.suggestedFix ? `Suggested Fix: ${opp.suggestedFix}` : ''}`
  ).join('\n\n');

  return `Generate a detailed refactoring script for the following opportunities:

${opportunityDescriptions}

Create a series of refactoring actions that can be executed automatically. Each action should specify:
- type: "replace" | "insert" | "delete" | "rename" | "extract" | "move"
- file: the target file path
- oldContent: the code to replace (for replace actions)
- newContent: the new code (for replace/insert actions)
- lineStart, lineEnd: line numbers (optional)
- description: what this action does

Return ONLY a JSON array of actions:
[
  {
    "type": "replace",
    "file": "src/example.ts",
    "oldContent": "old code here",
    "newContent": "new code here",
    "description": "Replace console.log with proper logger"
  },
  {
    "type": "insert",
    "file": "src/example.ts",
    "newContent": "new code to insert",
    "lineStart": 10,
    "description": "Add missing type annotation"
  }
]

Make actions atomic, safe, and reversible. Prioritize high-severity issues.
Return ONLY valid JSON, no additional text.`;
}

/**
 * Builds prompt for a single opportunity
 */
function buildSingleOpportunityPrompt(
  opportunity: RefactorOpportunity,
  fileContents: Map<string, string>
): string {
  const fileSnippets = Array.from(fileContents.entries())
    .map(([path, content]) =>
      `File: ${path}\n\`\`\`\n${content}\n\`\`\``
    )
    .join('\n\n');

  return `Generate refactoring actions for this specific issue:

**Title**: ${opportunity.title}
**Category**: ${opportunity.category}
**Severity**: ${opportunity.severity}
**Description**: ${opportunity.description}
${opportunity.suggestedFix ? `**Suggested Fix**: ${opportunity.suggestedFix}` : ''}

**Files involved**:
${fileSnippets}

Generate precise refactoring actions as a JSON array:
[
  {
    "type": "replace",
    "file": "path/to/file",
    "oldContent": "exact code to replace",
    "newContent": "new code",
    "description": "what this does"
  }
]

Requirements:
- Use exact string matching for oldContent
- Ensure newContent is syntactically correct
- Include all necessary imports
- Preserve code style and formatting
- Make minimal changes to fix the issue

Return ONLY valid JSON, no additional text.`;
}

/**
 * Parses AI response into refactor actions
 */
function parseScriptResponse(response: string): RefactorAction[] {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON found in script response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed.map((item: any) => ({
      id: uuidv4(),
      type: item.type || 'replace',
      file: item.file || '',
      oldContent: item.oldContent,
      newContent: item.newContent,
      lineStart: item.lineStart,
      lineEnd: item.lineEnd,
      description: item.description || 'Refactor action',
    }));
  } catch (error) {
    console.error('Failed to parse script response:', error);
    return [];
  }
}

/**
 * Validates actions before execution
 */
export function validateActions(actions: RefactorAction[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  actions.forEach((action, index) => {
    if (!action.file) {
      errors.push(`Action ${index + 1}: Missing file path`);
    }

    if (action.type === 'replace' && (!action.oldContent || !action.newContent)) {
      errors.push(`Action ${index + 1}: Replace action requires both oldContent and newContent`);
    }

    if (action.type === 'insert' && !action.newContent) {
      errors.push(`Action ${index + 1}: Insert action requires newContent`);
    }

    if (['insert', 'delete'].includes(action.type) && !action.lineStart) {
      errors.push(`Action ${index + 1}: ${action.type} action requires lineStart`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Groups actions by file for efficient execution
 */
export function groupActionsByFile(actions: RefactorAction[]): Map<string, RefactorAction[]> {
  const grouped = new Map<string, RefactorAction[]>();

  actions.forEach(action => {
    const existing = grouped.get(action.file) || [];
    grouped.set(action.file, [...existing, action]);
  });

  return grouped;
}

/**
 * Estimates execution time based on actions
 */
export function estimateExecutionTime(actions: RefactorAction[]): string {
  const baseTime = 5; // seconds per action
  const totalSeconds = actions.length * baseTime;

  if (totalSeconds < 60) {
    return `${totalSeconds} seconds`;
  } else if (totalSeconds < 3600) {
    return `${Math.ceil(totalSeconds / 60)} minutes`;
  } else {
    return `${Math.ceil(totalSeconds / 3600)} hours`;
  }
}
