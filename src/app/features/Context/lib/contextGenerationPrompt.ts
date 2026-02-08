/**
 * Context Generation Prompt Builder
 *
 * Builds the prompt for Claude CLI to analyze a codebase
 * and generate context groups and contexts.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface ContextGenerationPromptParams {
  projectId: string;
  projectName: string;
  projectPath: string;
  projectType?: string;
}

/**
 * Load the context map generator skill markdown
 */
function loadSkillPrompt(): string {
  try {
    const skillPath = join(process.cwd(), 'src/lib/blueprint/prompts/templates/context-map-generator.md');
    return readFileSync(skillPath, 'utf-8');
  } catch (error) {
    console.error('[ContextGeneration] Failed to load skill prompt:', error);
    // Return a minimal fallback prompt
    return getMinimalPrompt();
  }
}

/**
 * Minimal fallback prompt if skill file cannot be loaded
 */
function getMinimalPrompt(): string {
  return `# Context Map Generator

Analyze this codebase and create context groups and contexts by business feature.

## Key Principles
- Group by BUSINESS DOMAIN, not architecture layer
- Each context represents a USER CAPABILITY as a full-stack vertical slice (UI + API + DB + store)
- Target 10-25 files per context (ideal ~20), 2-4 contexts per group
- Merge sub-features that share the same DB table or API namespace into ONE context

## API Endpoints
- Create group: POST http://localhost:3000/api/context-groups
- Create context: POST http://localhost:3000/api/contexts
  Include AI navigation fields: entry_points, db_tables, keywords, api_surface, cross_refs, tech_stack
- Create relationship: POST http://localhost:3000/api/context-group-relationships
`;
}

/**
 * Build the full context generation prompt
 */
export function buildContextGenerationPrompt(params: ContextGenerationPromptParams): string {
  const { projectId, projectName, projectPath, projectType } = params;

  const skillPrompt = loadSkillPrompt();

  // Add project-specific header
  const header = `# Context Generation for ${projectName}

## Project Information
- **Project ID**: ${projectId}
- **Project Name**: ${projectName}
- **Project Path**: ${projectPath}
${projectType ? `- **Project Type**: ${projectType}` : ''}

## Your Task
Analyze this codebase and create context groups and contexts. Follow the guidelines in the skill documentation below.

**IMPORTANT**:
1. Use the Project ID "${projectId}" for all API calls
2. Create groups first, then contexts within those groups
3. Create relationships between groups after all groups are created
4. Verify your work by listing the created entities at the end

---

`;

  // Add suffix with verification steps
  const suffix = `

---

## Execution Checklist

After completing the context generation:

1. **Verify Groups**: \`curl -s "http://localhost:3000/api/context-groups?projectId=${projectId}"\`
2. **Verify Contexts**: \`curl -s "http://localhost:3000/api/contexts?projectId=${projectId}"\`
3. **Verify Relationships**: \`curl -s "http://localhost:3000/api/context-group-relationships?projectId=${projectId}"\`

**IMPORTANT**: After verification, output the final counts as a JSON block with this EXACT format:

\`\`\`json:context-generation-summary
{
  "groupsCreated": <number>,
  "contextsCreated": <number>,
  "relationshipsCreated": <number>,
  "filesAnalyzed": <number>
}
\`\`\`

This JSON block is parsed programmatically - do not deviate from this exact format.

**Begin analysis now.**
`;

  return header + skillPrompt + suffix;
}
