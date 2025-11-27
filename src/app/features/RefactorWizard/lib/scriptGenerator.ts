import { generateWithLLM } from '@/lib/llm';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { v4 as uuidv4 } from 'uuid';

type LLMProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama';

// Local types for script generation (not exported from store)
interface RefactorAction {
  type: 'replace' | 'insert' | 'delete';
  file: string;
  oldContent?: string;
  newContent?: string;
  lineStart?: number;
  lineEnd?: number;
  description?: string;
}

interface RefactorScript {
  id: string;
  opportunityId: string;
  actions: RefactorAction[];
  generatedAt: string;
  status: 'generated' | 'executed' | 'failed';
}

interface ParsedAction {
  type?: string;
  file?: string;
  oldContent?: string;
  newContent?: string;
  lineStart?: number;
  lineEnd?: number;
  description?: string;
}

/**
 * Call LLM with typed provider
 */
async function callLLM(prompt: string, provider: string, model: string, temperature: number, maxTokens: number) {
  return generateWithLLM(prompt, {
    provider: provider as LLMProvider,
    model,
    temperature,
    maxTokens,
  });
}

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
    const response = await callLLM(prompt, provider, model, 0.2, 8000);

    const actions = parseScriptResponse(response.response || '');

    return {
      id: uuidv4(),
      opportunityId: opportunities[0]?.id || '',
      actions,
      generatedAt: new Date().toISOString(),
      status: 'generated',
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
    const response = await callLLM(prompt, provider, model, 0.1, 4000);

    return parseScriptResponse(response.response || '');
  } catch (error) {
    return [];
  }
}

/**
 * Helper: Format opportunity description
 */
function formatOpportunityDescription(opp: RefactorOpportunity, index: number): string {
  return `${index + 1}. ${opp.title}
   Category: ${opp.category}
   Severity: ${opp.severity}
   Files: ${opp.files.join(', ')}
   Description: ${opp.description}
   ${opp.suggestedFix ? `Suggested Fix: ${opp.suggestedFix}` : ''}`;
}

/**
 * Builds prompt for generating refactor script
 */
function buildScriptGenerationPrompt(opportunities: RefactorOpportunity[]): string {
  const opportunityDescriptions = opportunities
    .map((opp, index) => formatOpportunityDescription(opp, index))
    .join('\n\n');

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
 * Helper: Format file snippets
 */
function formatFileSnippets(fileContents: Map<string, string>): string {
  return Array.from(fileContents.entries())
    .map(([path, content]) => `File: ${path}\n\`\`\`\n${content}\n\`\`\``)
    .join('\n\n');
}

/**
 * Builds prompt for a single opportunity
 */
function buildSingleOpportunityPrompt(
  opportunity: RefactorOpportunity,
  fileContents: Map<string, string>
): string {
  const fileSnippets = formatFileSnippets(fileContents);

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
      return [];
    }

    const parsed: ParsedAction[] = JSON.parse(jsonMatch[0]);

    return parsed.map((item): RefactorAction => ({
      type: (item.type as RefactorAction['type']) || 'replace',
      file: item.file || '',
      oldContent: item.oldContent,
      newContent: item.newContent,
      lineStart: item.lineStart,
      lineEnd: item.lineEnd,
      description: item.description,
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Helper: Validate a single action
 */
function validateSingleAction(action: RefactorAction, index: number): string[] {
  const errors: string[] = [];

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

  return errors;
}

/**
 * Validates actions before execution
 */
export function validateActions(actions: RefactorAction[]): { valid: boolean; errors: string[] } {
  const errors = actions.flatMap((action, index) => validateSingleAction(action, index));

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
