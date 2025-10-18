import { DbGoal, DbContext } from '@/lib/database';
import * as fs from 'fs';
import * as path from 'path';

export interface GoalWithContext {
  goal: DbGoal;
  context?: DbContext;
  contextFiles?: Array<{ path: string; content: string }>;
  hasFileStructureMd?: boolean; // Whether context contains FILE_STRUCTURE.MD
}

/**
 * Build the system prompt for LLM-based requirement generation
 */
export function buildSystemPrompt(): string {
  return `You are a senior software architect and full-stack developer with expertise in TypeScript, React, Next.js, and modern web development patterns.

Your task is to analyze project goals, contexts, and codebase documentation to generate actionable Claude Code requirements that result in high-quality, production-ready code.

## Core Responsibilities

1. **Understand the Project Architecture**: Analyze provided documentation, file structures, and context to understand the project's patterns and conventions
2. **Generate Precise Requirements**: Create detailed, actionable requirements that Claude Code can execute autonomously
3. **Reference Actual Files**: Include specific file paths from the provided contexts
4. **Follow Project Conventions**: Adhere to the coding patterns, naming conventions, and architectural decisions evident in the codebase
5. **Break Down Complexity**: Split complex goals into multiple focused requirements

## Output Format

CRITICAL: You must respond with ONLY a valid JSON object, no markdown formatting, no explanations.

Response format:
{
  "requirements": [
    {
      "name": "descriptive-requirement-name",
      "description": "Detailed description of what needs to be done, including specific technical approach",
      "implementation_steps": [
        "Step 1 with specific file references",
        "Step 2 with technical details",
        "Step 3 with expected outcomes"
      ],
      "files_to_modify": [
        "path/to/file1.ts",
        "path/to/file2.tsx"
      ],
      "ui_innovation": "Optional: For UI components, suggest an innovative visual feature or UX experiment",
      "update_file_structure": true,
      "next_goal_recommendation": "Optional: Suggest the next logical goal/feature after this is complete"
    }
  ]
}

## Quality Standards

### Requirement Naming
- Use lowercase with hyphens (kebab-case)
- Be descriptive: "implement-user-authentication" not "auth-fix"
- Include the feature/component: "goals-timeline-add-labels"

### Descriptions
- Start with the "why" - business value or problem being solved
- Include technical approach and patterns to follow
- Reference existing similar patterns in the codebase when applicable
- Specify expected behavior and edge cases
- 2-4 sentences minimum

### Implementation Steps
- Be specific and actionable
- Reference actual file paths from contexts
- Include code location hints: "In \`src/components/Header.tsx\`, update the navigation logic..."
- Specify dependencies or prerequisites
- Include testing considerations
- 3-6 steps per requirement

### Files to Modify
- List ALL files that need changes
- Include new files that must be created
- Use full relative paths from project root
- Group by operation: modify existing, create new
- Order by dependency (modify foundational files first)

### File Structure for Next.js/React Projects

**Feature-Specific Files** (use \`app/features/<feature>\` structure):
- \`app/features/<feature>/components/\` - Feature-specific components and UI sections (e.g., \`UserProfileCard.tsx\`, \`DashboardHeader.tsx\`)
- \`app/features/<feature>/lib/\` - Feature-specific functions, utilities, and logical helpers (e.g., \`userValidation.ts\`, \`chartCalculations.ts\`)
- \`app/features/<feature>/\` - Main wrapper, index, or page file for the feature (e.g., \`index.tsx\`, \`UserProfile.tsx\`)

**Reusable UI Components** (use \`app/components/ui\` structure):
- \`app/components/ui/\` - Shared, reusable UI elements used across multiple features (e.g., \`Button.tsx\`, \`Modal.tsx\`, \`Input.tsx\`, \`Card.tsx\`)

**Examples**:
- Feature-specific: \`app/features/authentication/components/LoginForm.tsx\`
- Feature-specific helper: \`app/features/authentication/lib/validateCredentials.ts\`
- Feature main file: \`app/features/authentication/index.tsx\`
- Reusable UI: \`app/components/ui/Button.tsx\`

Always follow this structure when generating file paths in "files_to_modify" to maintain consistent project organization.

## Rules

1. Generate 1-3 requirements per goal (max 3)
2. Prioritize requirements by dependency order
3. Include proper TypeScript types and interfaces
4. Specify error handling requirements
5. Consider performance implications
6. Include accessibility requirements where applicable
7. Reference high-level documentation if provided
8. Maintain consistency with existing code patterns
9. Return ONLY the JSON, no extra text or markdown
10. Use specific technical terminology

## Special Instructions

### UI Innovation Experiments
When working with UI components (React components, pages, layouts):
- Always include a "ui_innovation" field with a creative, innovative visual feature or UX experiment
- Think beyond basic implementation - suggest next-gen UI patterns, micro-interactions, or unique visual treatments
- Examples: animated transitions, particle effects, parallax scrolling, hover states, skeleton loaders, glass morphism
- Be bold and creative while maintaining usability

### FILE_STRUCTURE.MD Updates
- Set "update_file_structure" to true for EVERY requirement where the goal's context contains a FILE_STRUCTURE.MD file
- This ensures documentation stays synchronized with code changes
- After implementation, the FILE_STRUCTURE.MD will be updated with latest changes AND include a "Next Steps" recommendation

### Next Goal Recommendations
- When completing a requirement, analyze the progress and suggest what feature or improvement should come next
- This helps maintain development momentum and strategic direction
- Consider user value, technical dependencies, and project maturity

## Example High-Quality Requirement

{
  "name": "implement-context-card-lazy-loading",
  "description": "Implement lazy loading for context cards in the horizontal context bar to improve initial page load performance, especially for projects with 20+ contexts. Follow the existing virtualization pattern used in BacklogTable.tsx and use React.lazy with Suspense.",
  "implementation_steps": [
    "Create LazyContextCards.tsx component in src/app/coder/Context/ContextGroups/ using React.lazy() for the ContextCards component",
    "Wrap LazyContextCards with Suspense boundary in HorizontalContextBar.tsx:42, add skeleton loader matching the existing card design",
    "Implement intersection observer in ContextSection.tsx to trigger lazy load when section is expanded",
    "Add loading state to contextStore (src/stores/contextStore.ts) to track which sections have loaded",
    "Test with 50+ contexts to verify performance improvement and smooth user experience",
    "Add error boundary to handle lazy load failures gracefully"
  ],
  "files_to_modify": [
    "src/app/coder/Context/ContextGroups/LazyContextCards.tsx",
    "src/app/coder/Context/HorizontalContextBar.tsx",
    "src/app/coder/Context/ContextGroups/ContextSection.tsx",
    "src/stores/contextStore.ts"
  ]
}`;
}

/**
 * Build the user prompt with goals, contexts, and high-level documentation
 */
export function buildUserPrompt(
  goalsWithContexts: GoalWithContext[],
  projectPath: string,
  highLevelDocs?: string
): string {
  let prompt = `# Project Requirements Generation

## Project Context

`;

  // Add high-level documentation if available
  if (highLevelDocs) {
    prompt += `### High-Level Documentation

The following documentation provides an overview of the project's architecture, patterns, and conventions. Use this to understand the project's direction and ensure generated requirements align with these standards:

\`\`\`markdown
${highLevelDocs}
\`\`\`

---

`;
  }

  prompt += `## Active Goals

Generate Claude Code requirements for the following project goals:

`;

  goalsWithContexts.forEach((item, index) => {
    const { goal, context, contextFiles, hasFileStructureMd } = item;

    prompt += `### Goal ${index + 1}: ${goal.title}\n\n`;
    prompt += `**Status**: ${goal.status}\n`;

    if (goal.description) {
      prompt += `**Description**: ${goal.description}\n`;
    }

    prompt += `\n`;

    // Add context information
    if (context) {
      prompt += `#### Associated Context: ${context.name}\n\n`;

      if (context.description) {
        prompt += `**Context Purpose**: ${context.description}\n\n`;
      }

      // Indicate if context has FILE_STRUCTURE.MD
      if (hasFileStructureMd) {
        prompt += `**📁 Context includes FILE_STRUCTURE.MD** - Set \`update_file_structure: true\` in your requirements to ensure documentation stays synchronized.\n\n`;
      }

      // Add context file details
      if (contextFiles && contextFiles.length > 0) {
        prompt += `**Relevant Code Files**:\n\n`;
        contextFiles.forEach((file) => {
          prompt += `**File**: \`${file.path}\`\n\`\`\`typescript\n${file.content}\n\`\`\`\n\n`;
        });
      } else {
        // Even if we couldn't load files, show the file paths from context
        try {
          const filePaths = JSON.parse(context.file_paths) as string[];
          if (filePaths.length > 0) {
            prompt += `**Files in Context** (content not loaded, but these files are relevant):\n`;
            filePaths.forEach((filePath) => {
              prompt += `- \`${filePath}\`\n`;
            });
            prompt += `\n`;
          }
        } catch {
          // Ignore parse errors
        }
      }
    } else {
      prompt += `*Note: This goal has no associated context. Generate requirements based on the goal description and general project knowledge.*\n\n`;
    }

    prompt += `---\n\n`;
  });

  prompt += `## Instructions

Based on the above goals, contexts, and project documentation:

1. Analyze each goal and its associated context
2. Understand the technical requirements and constraints
3. Generate 1-3 focused, actionable requirements per goal
4. Ensure requirements follow the project's architecture patterns
5. Include specific file references from the provided contexts
6. Make requirements executable by Claude Code with minimal ambiguity

Generate the requirements now.`;

  return prompt;
}

/**
 * Load high-level documentation from project if available
 */
export function loadHighLevelDocs(projectPath: string): string | undefined {
  try {
    const docsPath = path.join(projectPath, 'docs', 'high.md');
    if (fs.existsSync(docsPath)) {
      const content = fs.readFileSync(docsPath, 'utf-8');
      // Limit to 10000 characters to avoid token limits
      return content.substring(0, 10000);
    }
  } catch (error) {
    console.error('Error loading high-level docs:', error);
  }
  return undefined;
}

/**
 * Build requirement file content from generated requirement
 */
export interface GeneratedRequirement {
  name: string;
  description: string;
  implementation_steps: string[];
  files_to_modify: string[];
  ui_innovation?: string; // Optional: Innovative UI/UX experiment for UI components
  update_file_structure?: boolean; // Whether to update FILE_STRUCTURE.MD
  next_goal_recommendation?: string; // Optional: Recommendation for next goal/feature
}

export function buildRequirementContent(req: GeneratedRequirement): string {
  let content = `# ${req.name}\n\n`;
  content += `## Description\n\n${req.description}\n\n`;

  if (req.implementation_steps && req.implementation_steps.length > 0) {
    content += `## Implementation Steps\n\n`;
    req.implementation_steps.forEach((step, index) => {
      content += `${index + 1}. ${step}\n`;
    });
    content += `\n`;
  }

  if (req.files_to_modify && req.files_to_modify.length > 0) {
    content += `## Files to Modify\n\n`;
    req.files_to_modify.forEach((file) => {
      content += `- ${file}\n`;
    });
    content += `\n`;
  }

  // Add UI innovation section if present
  if (req.ui_innovation) {
    content += `## UI/UX Innovation Experiment\n\n${req.ui_innovation}\n\n`;
  }

  // Add FILE_STRUCTURE.MD update instruction if needed
  if (req.update_file_structure) {
    content += `## Update FILE_STRUCTURE.MD\n\n`;
    content += `IMPORTANT: After implementing the changes, update the FILE_STRUCTURE.MD file in the context directory to reflect the latest changes.\n\n`;
    content += `Include:\n`;
    content += `1. New files created or modified\n`;
    content += `2. Updated component relationships\n`;
    content += `3. New patterns or architectural decisions\n\n`;
    content += `At the end of FILE_STRUCTURE.MD, add a "## Next Steps" section with your recommendation for the next goal or feature to implement based on the current progress.\n\n`;
  }

  // Add next goal recommendation if present
  if (req.next_goal_recommendation) {
    content += `## Recommended Next Goal\n\n${req.next_goal_recommendation}\n\n`;
  }

  return content;
}
