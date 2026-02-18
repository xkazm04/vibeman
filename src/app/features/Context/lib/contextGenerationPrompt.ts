/**
 * Context Generation Prompt Builder
 *
 * Builds the prompt for Claude CLI to analyze a codebase
 * and generate context groups and contexts.
 * Supports both single-codebase and multi-codebase projects.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { detectSubProjects, type ProjectStructure, type SubProject } from './detectSubProjects';

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
 * Build a prompt section describing the multi-codebase structure.
 * Returns empty string for single-codebase projects.
 */
function buildMultiCodebaseSection(structure: ProjectStructure): string {
  if (!structure.isMultiCodebase) return '';

  const subProjectDescriptions = structure.subProjects.map((sp: SubProject) => {
    return `#### ${sp.name} (\`${sp.relativePath}/\`)
- **Framework**: ${sp.framework}
- **Tech Stack**: ${sp.techStack.join(', ') || 'unknown'}
- **Independent Git**: ${sp.hasOwnGit ? 'Yes' : 'No'}
- **Estimated Size**: ${sp.estimatedSize}
- **Key Files**: ${sp.entryFiles.join(', ')}`;
  }).join('\n\n');

  return `
## MULTI-CODEBASE PROJECT STRUCTURE

This project contains **${structure.subProjects.length} independent sub-projects** (codebases) under one root directory.
${structure.rootHasSourceCode ? 'The root directory also contains source code.' : 'The root directory has NO source code — it is a container for the sub-projects below.'}

### Sub-Projects Detected:

${subProjectDescriptions}

### Multi-Codebase Grouping Rules:

1. **Each sub-project gets its own groups**: Analyze each sub-project independently and create 2-6 groups per sub-project depending on size.
2. **Cross-codebase groups**: If a business domain spans multiple sub-projects (e.g., "Authentication" across web + desktop + cloud, or "Shared Data Models"), create cross-cutting groups that contain contexts from MULTIPLE sub-projects.
3. **File paths MUST be root-relative**: All file paths in contexts must start with the sub-project directory name (e.g., \`${structure.subProjects[0]?.relativePath || 'subproject'}/src/...\`), NOT relative to the sub-project root.
4. **Group naming**: Prefix group names with the sub-project name when the group is specific to one codebase (e.g., "Desktop: Core Engine", "Web: Marketing Pages"). Omit the prefix for cross-cutting groups (e.g., "Shared: Authentication").
5. **Cross-project relationships**: Create relationships between groups in different sub-projects where they share data, APIs, types, or business logic.
6. **Different tech stacks are normal**: Each sub-project may use completely different technologies. Analyze each according to its own stack.

### Analysis Strategy:
1. Explore EACH sub-project directory independently
2. For each, identify feature folders, API routes, data models, state management
3. Create groups and contexts per sub-project
4. Then identify shared business domains that span multiple sub-projects
5. Create cross-cutting groups for shared domains
6. Create relationships between all related groups (within and across sub-projects)

`;
}

/**
 * Build the full context generation prompt
 */
export function buildContextGenerationPrompt(params: ContextGenerationPromptParams): string {
  const { projectId, projectName, projectPath, projectType } = params;

  const skillPrompt = loadSkillPrompt();

  // Detect multi-codebase project structure
  const projectStructure = detectSubProjects(projectPath);
  const multiCodebaseSection = buildMultiCodebaseSection(projectStructure);
  const structureLabel = projectStructure.isMultiCodebase
    ? `Multi-codebase (${projectStructure.subProjects.length} sub-projects)`
    : 'Single codebase';

  // Add project-specific header
  const header = `# Context Generation for ${projectName}

## Project Information
- **Project ID**: ${projectId}
- **Project Name**: ${projectName}
- **Project Path**: ${projectPath}
- **Structure**: ${structureLabel}
${projectType ? `- **Project Type**: ${projectType}` : ''}

## Your Task
Analyze this codebase and create context groups and contexts. Follow the guidelines in the skill documentation below.

**IMPORTANT**:
1. Use the Project ID "${projectId}" for all API calls
2. Create groups first, then contexts within those groups
3. Wait for each group creation response and use the RETURNED group ID for contexts
4. Create relationships between groups after all groups are created
5. Verify your work by listing the created entities at the end
6. Do NOT delete any existing data - old data will be cleaned up automatically after you finish
7. If a creation fails, skip it and continue - do NOT retry by deleting and recreating
8. Complete the task in ONE pass - do NOT loop or start over
${multiCodebaseSection}
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
