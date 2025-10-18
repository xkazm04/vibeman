/**
 * LangGraph Prompts
 * Structured prompts for analysis, tool selection, and response generation
 */

import { ToolDefinition } from './langTypes';

/**
 * Creates the analysis prompt to determine user intent and required tools
 */
export function createAnalysisPrompt(
  message: string,
  projectId: string,
  tools: ToolDefinition[]
): string {
  // Group tools by category for better organization
  const toolsByCategory: Record<string, ToolDefinition[]> = {
    'Read-Only Operations': [],
    'Project Management': [],
    'Context & Documentation': [],
    'Task & Backlog Management': [],
    'Background Processing': [],
    'File Operations': [],
    'AI-Assisted Operations': [],
    'Monitoring': []
  };

  // Categorize tools based on their names and descriptions
  tools.forEach(tool => {
    if (tool.name.startsWith('get_') || tool.description.includes('Retrieves') || tool.description.includes('Lists')) {
      toolsByCategory['Read-Only Operations'].push(tool);
    } else if (tool.name.includes('project') && !tool.name.startsWith('get_')) {
      toolsByCategory['Project Management'].push(tool);
    } else if (tool.name.includes('context') || tool.name.includes('documentation')) {
      toolsByCategory['Context & Documentation'].push(tool);
    } else if (tool.name.includes('backlog') || tool.name.includes('task')) {
      toolsByCategory['Task & Backlog Management'].push(tool);
    } else if (tool.name.includes('background') || tool.name.includes('queue')) {
      toolsByCategory['Background Processing'].push(tool);
    } else if (tool.name.includes('file') || tool.name.includes('search') || tool.name.includes('read')) {
      toolsByCategory['File Operations'].push(tool);
    } else if (tool.name.includes('analyze') || tool.name.includes('generate') || tool.name.includes('suggest')) {
      toolsByCategory['AI-Assisted Operations'].push(tool);
    } else if (tool.name.includes('monitor') || tool.name.includes('evaluate') || tool.name.includes('pattern')) {
      toolsByCategory['Monitoring'].push(tool);
    }
  });

  // Build categorized tool descriptions
  let toolDescriptions = '';
  Object.entries(toolsByCategory).forEach(([category, categoryTools]) => {
    if (categoryTools.length > 0) {
      toolDescriptions += `\n**${category}:**\n`;
      categoryTools.forEach(tool => {
        const requiredParams = tool.parameters.required || [];
        const allParams = Object.keys(tool.parameters.properties || {});
        const optionalParams = allParams.filter(p => !requiredParams.includes(p));
        
        toolDescriptions += `- **${tool.name}**: ${tool.description}\n`;
        if (requiredParams.length > 0) {
          toolDescriptions += `  Required: ${requiredParams.join(', ')}\n`;
        }
        if (optionalParams.length > 0) {
          toolDescriptions += `  Optional: ${optionalParams.join(', ')}\n`;
        }
      });
    }
  });

  // Default task instructions (fallback if file not available)
  const defaultTask = `Analyze the user's message and determine:
1. What is the user's intent?
2. Does this require accessing the project knowledge base or performing actions?
3. Which tools (if any) should be used?
4. Is this a destructive operation that requires confirmation?
5. What is your confidence level?
6. Does this require user confirmation before proceeding?`;

  // Note: In production, this should load from data/prompts/analysis-task.txt
  // For now using default, but component can edit and save to file
  const taskInstructions = defaultTask;

  return `You are Annette, an AI assistant analyzing user requests for a project management and code intelligence system.

**CRITICAL KNOWLEDGE BASE ENFORCEMENT RULES:**
1. You can ONLY answer questions using data from the project's knowledge base via tools
2. DO NOT use your general training data or make assumptions
3. If the user asks something that requires knowledge base data, you MUST use the appropriate tools
4. If no tools can provide the answer, inform the user that the information is not in the knowledge base
5. NEVER mix general AI knowledge with project-specific data
6. For destructive operations (delete, remove), ALWAYS set needsConfirmation=true

**TOOL SELECTION STRATEGY:**
- **Read-Only First**: If user is asking a question, start with read-only tools
- **Action Tools**: If user wants to create, update, or delete, use appropriate action tools
- **Confirmation Required**: Any delete, remove, or destructive operation needs confirmation
- **Multi-Tool Queries**: You can use multiple tools if needed to answer complex questions
- **Tool Chaining**: Some operations may require multiple steps (e.g., get data first, then update)

**Your Task:**
${taskInstructions}

**User Message:** "${message}"
**Project ID:** ${projectId}

**Available Tools by Category:**
${toolDescriptions}

**Response Format (JSON):**
{
  "userIntent": "Clear description of what the user wants",
  "needsTools": true/false,
  "toolsToUse": [
    {
      "name": "tool_name",
      "parameters": { "projectId": "${projectId}", ... }
    }
  ],
  "reasoning": "Explanation of your analysis and why you chose these tools",
  "confidence": 0-100 (percentage),
  "needsConfirmation": true/false,
  "confirmationType": "yes_no" or "clarification",
  "confirmationQuestion": "Question to ask user if confirmation needed",
  "alternatives": ["Alternative interpretation 1", "Alternative 2"] (if confidence < 80%),
  "isDestructive": true/false (if operation modifies or deletes data)
}

**Important Rules:**
- If the question asks about project data, needsTools MUST be true
- If needsTools is true, you MUST specify which tools to use with correct parameters
- Set needsConfirmation=true for destructive operations (delete, remove, etc.)
- Set needsConfirmation=true if the request is ambiguous and needs clarification
- Confidence should reflect how well the message matches available tools
- Set isDestructive=true for any create, update, delete, or remove operations
- ALWAYS enforce knowledge base usage - reject questions that can't be answered with available tools
- Provide alternatives if confidence < 80% or if multiple interpretations are possible

**Examples:**

User: "Show me all projects"
→ Use get_all_projects (read-only, no confirmation needed)

User: "What's in the backlog for project X?"
→ Use get_project_backlog with projectId (read-only, no confirmation needed)

User: "Create a new project called MyApp"
→ Use create_project (action, needs confirmation for details)

User: "Delete project X"
→ Use delete_project (DESTRUCTIVE, REQUIRES confirmation, isDestructive=true)

User: "Analyze the code quality of these files"
→ Use analyze_code_quality (AI-assisted, may take time, inform user)

User: "What files are in the src folder?"
→ Use get_folder_structure with projectPath (read-only)

Return ONLY the JSON response, no additional text.`;
}

/**
 * Creates the system prompt for final response generation
 */
export function createResponsePrompt(
  message: string,
  projectMetadata: string,
  toolResults: string,
  userIntent: string
): string {
  // Default instructions (fallback if file not available)
  const defaultInstructions = `1. Answer the user's question using ONLY the data from tool results above
2. Be specific and reference actual data points from the results
3. If the tool results don't contain enough information, say so explicitly
4. Format your response clearly and professionally
5. If no tools were executed, inform the user that you need to access the knowledge base first`;

  // Default guidelines (fallback if file not available)
  const defaultGuidelines = `- Start directly with the answer (no preamble like "Based on the data...")
- Use bullet points or numbered lists for clarity when appropriate
- Cite specific numbers, names, and details from the tool results
- If data is missing, suggest which tools could provide it
- Keep responses concise but complete`;

  // Note: In production, these should load from:
  // - data/prompts/response-instructions.txt
  // - data/prompts/response-guidelines.txt
  // For now using defaults, but component can edit and save to files
  const instructions = defaultInstructions;
  const guidelines = defaultGuidelines;

  return `You are Annette, an AI assistant for project management.

**CRITICAL KNOWLEDGE BASE ENFORCEMENT:**
- You can ONLY use information from the tool results provided below
- DO NOT use your general training data or prior knowledge
- If tool results are empty or insufficient, clearly state that
- NEVER fabricate or assume information not present in the tool results
- Your responses must be 100% grounded in the provided data

**User's Original Question:** "${message}"
**User Intent:** ${userIntent}

**Project Context:**
${projectMetadata}

**Knowledge Base Query Results (Tool Executions):**
${toolResults}

**Instructions:**
${instructions}

**Response Guidelines:**
${guidelines}

Generate your response now:`;
}

/**
 * Creates prompt for tool result formatting
 */
export function formatToolResults(toolResults: Array<{name: string; description: string; parameters: Record<string, unknown>; result: unknown}>): string {
  if (!toolResults || toolResults.length === 0) {
    return 'No tool results available. The knowledge base was not queried.';
  }

  return toolResults.map((tool, index) => `
### Tool ${index + 1}: ${tool.name}
**Description:** ${tool.description}
**Parameters:** ${JSON.stringify(tool.parameters, null, 2)}
**Result:**
\`\`\`json
${JSON.stringify(tool.result, null, 2)}
\`\`\`
---
`).join('\n');
}

/**
 * Creates prompt for project metadata formatting
 */
export function formatProjectMetadata(projectContext: Record<string, unknown> | null): string {
  if (!projectContext) {
    return 'No project context provided.';
  }

  return `
**Project Information:**
- Project ID: ${projectContext.id || 'Unknown'}
- Project Name: ${projectContext.name || 'Unknown'}
- Description: ${projectContext.description || 'No description'}
- Status: ${projectContext.status || 'Unknown'}
- Created: ${projectContext.created_at || 'Unknown'}
`;
}
