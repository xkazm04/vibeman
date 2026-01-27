/**
 * Cross Task Prompt Builder
 * Generates prompts for Claude Code CLI to analyze requirements across multiple projects
 *
 * New Flow:
 * 1. Analyze current behavior related to the requirement
 * 2. Generate 3 implementation options to pick from
 */

import type { CrossTaskPromptConfig, CrossTaskContextData, CrossTaskArchitectureContext } from '@/app/db/models/cross-task.types';

/**
 * Build the cross-task analysis prompt for Claude Code CLI
 */
export function buildCrossTaskPrompt(config: CrossTaskPromptConfig): string {
  const { planId, requirement, projects, architecture, callbackUrl } = config;

  const projectSections = projects.map((project) => buildProjectSection(project)).join('\n\n');
  const architectureSection = architecture ? buildArchitectureSection(architecture) : '';

  return `# Cross-Project Requirement Analysis

## Your Task
Analyze the following requirement across ${projects.length} project${projects.length > 1 ? 's' : ''}.

You will:
1. **Analyze Current Behavior** - Deep dive into how the existing code currently works in relation to this requirement
2. **Generate 3 Implementation Options** - Provide 3 different approaches to implement the requirement

---

## The Requirement
\`\`\`
${requirement}
\`\`\`

---

## Project Context Maps

${projectSections}
${architectureSection}
---

## Step 1: Analyze Current Behavior

Explore the codebase thoroughly to understand:
- **Data Flow**: How data currently moves through the system related to this requirement
- **Existing Patterns**: What patterns/conventions are already in place
- **Integration Points**: How different parts of the code interact
- **Current Limitations**: What gaps exist that this requirement would fill
- **Related Code**: Files, functions, and modules that touch this area

Provide a comprehensive markdown analysis that would help someone understand the current state before implementing changes.

---

## Step 2: Generate 3 Implementation Options

Create 3 distinct implementation approaches:

### Option 1: Quick Win
- Minimal changes, fastest to implement
- May use existing patterns even if not ideal
- Focus on getting it working quickly
- Lower risk, potentially less elegant

### Option 2: Balanced Approach (Recommended)
- Good balance of effort vs quality
- Follows existing conventions while improving where sensible
- Production-ready implementation
- Standard approach most developers would choose

### Option 3: Future-Proof
- More comprehensive solution
- May introduce new patterns or abstractions
- Better long-term maintainability
- Higher initial effort but pays off over time

For each option, include:
- **Title** (2-5 words describing the approach)
- **Summary** (1-2 sentences)
- **Files to Change** (list with brief description of changes)
- **Key Code Changes** (show actual code snippets where helpful)
- **Trade-offs** (pros and cons of this approach)
- **Estimated Scope** (Small/Medium/Large)

---

## Step 3: Submit Results

After completing your analysis, submit the results:

\`\`\`bash
curl -X POST "${callbackUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "requirement_summary": "<One-line summary of what the requirement achieves>",
    "current_flow_analysis": "<FULL markdown analysis of current behavior - be thorough>",
    "plans": [
      {
        "number": 1,
        "title": "<Option 1 Title>",
        "content": "<Full markdown content for Option 1>"
      },
      {
        "number": 2,
        "title": "<Option 2 Title>",
        "content": "<Full markdown content for Option 2>"
      },
      {
        "number": 3,
        "title": "<Option 3 Title>",
        "content": "<Full markdown content for Option 3>"
      }
    ]
  }'
\`\`\`

**Important**:
- The "current_flow_analysis" should be a thorough analysis, not just a summary
- The "content" for each option should include code snippets showing key changes
- Use proper markdown formatting
- Escape JSON properly (use \\n for newlines in strings)

---
Plan ID: ${planId}
`;
}

/**
 * Build the project section with context information
 */
function buildProjectSection(project: CrossTaskContextData): string {
  const contextList = project.contexts
    .map((ctx) => {
      const parts: string[] = [`### ${ctx.name}`];

      if (ctx.businessFeature) {
        parts.push(`**Business Feature**: ${ctx.businessFeature}`);
      }

      if (ctx.category) {
        parts.push(`**Category**: ${ctx.category}`);
      }

      if (ctx.apiRoutes && ctx.apiRoutes.length > 0) {
        parts.push(`**API Routes**:`);
        ctx.apiRoutes.forEach((route) => {
          parts.push(`- \`${route}\``);
        });
      }

      if (ctx.filePaths.length > 0) {
        parts.push(`**Key Files**:`);
        // Limit to first 10 files to avoid overwhelming the prompt
        const displayFiles = ctx.filePaths.slice(0, 10);
        displayFiles.forEach((file) => {
          parts.push(`- \`${file}\``);
        });
        if (ctx.filePaths.length > 10) {
          parts.push(`- ... and ${ctx.filePaths.length - 10} more files`);
        }
      }

      if (ctx.contextFilePath) {
        parts.push(`**Context File**: \`${ctx.contextFilePath}\``);
      }

      return parts.join('\n');
    })
    .join('\n\n');

  return `## Project: ${project.projectName}
**Path**: \`${project.projectPath}\`

${contextList || '_No contexts defined for this project_'}`;
}

/**
 * Build the architecture section with relationships and patterns
 */
function buildArchitectureSection(architecture: CrossTaskArchitectureContext): string {
  const parts: string[] = ['\n---\n\n## Known Architecture (Pre-Analyzed)\n'];

  // Add narrative if available
  if (architecture.narrative) {
    parts.push(`### Architecture Overview\n${architecture.narrative}\n`);
  }

  // Add relationships
  if (architecture.relationships.length > 0) {
    parts.push('### Cross-Project Integrations\n');
    parts.push('These integrations have been discovered through prior analysis:\n');

    for (const rel of architecture.relationships) {
      const details: string[] = [];
      if (rel.protocol) details.push(`Protocol: \`${rel.protocol}\``);
      if (rel.dataFlow) details.push(`Data: ${rel.dataFlow}`);

      parts.push(`- **${rel.sourceProjectName}** → **${rel.targetProjectName}** (${rel.integrationType.toUpperCase()})`);
      parts.push(`  - ${rel.label}`);
      if (details.length > 0) {
        parts.push(`  - ${details.join(' | ')}`);
      }
    }
    parts.push('');
  }

  // Add patterns
  if (architecture.patterns.length > 0) {
    parts.push('### Detected Architectural Patterns\n');
    for (const pattern of architecture.patterns) {
      parts.push(`- **${pattern.name}**: ${pattern.description}`);
      if (pattern.projectsInvolved.length > 0) {
        parts.push(`  - Projects: ${pattern.projectsInvolved.join(', ')}`);
      }
    }
    parts.push('');
  }

  parts.push('**Use this architecture knowledge** when analyzing current behavior and proposing implementation options.\n');

  return parts.join('\n');
}

/**
 * Build a simplified prompt for quick analysis (without full context maps)
 */
export function buildQuickCrossTaskPrompt(config: {
  requirement: string;
  projects: Array<{ name: string; path: string }>;
  callbackUrl: string;
  planId: string;
}): string {
  const { requirement, projects, callbackUrl, planId } = config;

  return `# Quick Cross-Project Requirement Analysis

## Task
Analyze this requirement across ${projects.length} projects:
1. Analyze current behavior
2. Generate 3 implementation options (Quick Win, Balanced, Future-Proof)

## Projects
${projects.map((p) => `- **${p.name}**: \`${p.path}\``).join('\n')}

## Requirement
\`\`\`
${requirement}
\`\`\`

## Instructions
1. For each project, explore the codebase to understand current behavior
2. Write a thorough analysis of current data flow and patterns
3. Generate 3 implementation options with code snippets
4. Submit results via curl to the callback URL

## Submit Results
\`\`\`bash
curl -X POST "${callbackUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "requirement_summary": "...",
    "current_flow_analysis": "...",
    "plans": [
      { "number": 1, "title": "...", "content": "..." },
      { "number": 2, "title": "...", "content": "..." },
      { "number": 3, "title": "...", "content": "..." }
    ]
  }'
\`\`\`

Plan ID: ${planId}
`;
}
