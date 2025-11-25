/**
 * Prompt Templates for LLM Advisors and Analyst
 * Generates prompts for improvement suggestions and requirement generation
 */

import { AdvisorType, LLMPromptContext, NewTaskPromptContext } from './types';

/**
 * Advisor-specific instructions
 */
const ADVISOR_INSTRUCTIONS: Record<AdvisorType, string> = {
  improve: `You are a code quality expert. Focus on:
- Improving error handling and edge case coverage
- Adding validation and type safety
- Enhancing code readability and maintainability
- Following clean code principles

Generate a concise 2-3 sentence improvement suggestion focusing on code quality enhancements.`,

  optimize: `You are a performance optimization expert. Focus on:
- Reducing bundle size and improving load times
- Optimizing render performance and re-renders
- Implementing efficient data structures and algorithms
- Reducing memory footprint and improving caching

Generate a concise 2-3 sentence improvement suggestion focusing on performance optimizations.`,

  refactor: `You are a software architecture expert. Focus on:
- Applying design patterns and architectural best practices
- Improving code organization and modularity
- Reducing technical debt and code smells
- Enhancing separation of concerns

Generate a concise 2-3 sentence improvement suggestion focusing on refactoring opportunities.`,

  enhance: `You are a product enhancement expert. Focus on:
- Adding user experience improvements
- Implementing accessibility features
- Enhancing visual design and interactions
- Adding helpful features and functionality

Generate a concise 2-3 sentence improvement suggestion focusing on feature enhancements.`,
};

/**
 * Build advisor prompt for improvement suggestions
 */
export function buildAdvisorPrompt(
  advisorType: AdvisorType,
  context: LLMPromptContext
): string {
  const instruction = ADVISOR_INSTRUCTIONS[advisorType];

  let prompt = `${instruction}\n\n`;

  // Add context description if available
  if (context.contextDescription) {
    prompt += `## Context Reference\n\n${context.contextDescription}\n\n`;
  }

  // Add previous implementation overview
  prompt += `## Previous Implementation\n\n${context.previousOverview}\n\n`;

  // Add bullets if available
  if (context.previousBullets) {
    prompt += `### Key Changes:\n${context.previousBullets.split('\n').map(b => `- ${b}`).join('\n')}\n\n`;
  }

  // Add user input if provided
  if (context.userInput?.trim()) {
    prompt += `## User Intent\n\n${context.userInput}\n\n`;
  }

  prompt += `Based on the above information, suggest a specific ${advisorType} improvement in 2-3 sentences. Be concrete and actionable.`;

  return prompt;
}

/**
 * Build analyst prompt for requirement generation
 */
export function buildAnalystPrompt(context: LLMPromptContext): string {
  let prompt = `You are a software development analyst. Your task is to generate a detailed implementation plan for Claude Code execution based on improvement suggestions.

The implementation plan should be comprehensive and include:
1. Clear objective and goals
2. Step-by-step implementation instructions
3. Files to be created or modified
4. Technical specifications and requirements
5. Testing considerations
6. Expected outcomes

`;

  // Add context description if available
  if (context.contextDescription) {
    prompt += `## Context Reference\n\n${context.contextDescription}\n\n`;
  }

  // Add previous implementation overview
  prompt += `## Previous Implementation\n\n${context.previousOverview}\n\n`;

  // Add bullets if available
  if (context.previousBullets) {
    prompt += `### Previous Key Changes:\n${context.previousBullets.split('\n').map(b => `- ${b}`).join('\n')}\n\n`;
  }

  // Add user input (required for analyst)
  prompt += `## Improvement Request\n\n${context.userInput || 'No specific improvement request provided.'}\n\n`;

  prompt += `---

Generate a comprehensive Claude Code requirement document for implementing the requested improvements. The document should be clear, actionable, and ready for autonomous execution.

Format the response as a markdown document with the following structure:

# [Title]

## Objective
[Clear statement of what needs to be accomplished]

## Implementation Steps
1. [Step 1]
2. [Step 2]
...

## Files to Modify/Create
- \`path/to/file1.ts\` - [Description]
- \`path/to/file2.tsx\` - [Description]

## Technical Specifications
[Detailed technical requirements]

## Testing
[Testing approach and scenarios]

## Expected Outcomes
[What should be achieved after implementation]`;

  return prompt;
}

/**
 * Helper to extract requirement name from improvement request
 */
export function generateRequirementName(
  logTitle: string,
  advisorType?: AdvisorType
): string {
  // Sanitize title to create a valid filename
  const sanitized = logTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  const prefix = advisorType ? `${advisorType}-` : 'improve-';
  const timestamp = Date.now();

  return `${prefix}${sanitized}-${timestamp}`;
}

/**
 * Build advisor prompt for new task suggestions
 */
export function buildNewTaskAdvisorPrompt(
  advisorType: AdvisorType,
  context: NewTaskPromptContext
): string {
  const instruction = ADVISOR_INSTRUCTIONS[advisorType];

  let prompt = `${instruction}\n\n`;

  // Add context description if available
  if (context.contextDescription) {
    prompt += `## Context Reference\n\n${context.contextDescription}\n\n`;
  }

  // Add user input
  prompt += `## User Idea\n\n${context.userInput}\n\n`;

  prompt += `Based on the above idea, suggest a specific ${advisorType} improvement or consideration in 2-3 sentences. Be concrete and actionable.`;

  return prompt;
}

/**
 * Build analyst prompt for new task requirement generation
 * Supports multiproject analysis (e.g., separated frontend/backend)
 */
export function buildNewTaskAnalystPrompt(context: NewTaskPromptContext): string {
  const isMultiproject = context.isMultiproject && context.secondaryContextDescription;

  let prompt = `You are a software development analyst. Your task is to generate a detailed implementation plan for Claude Code execution based on a new feature idea.

${isMultiproject ? '**IMPORTANT:** This is a MULTIPROJECT request involving TWO separate codebases (e.g., frontend + backend). Your implementation plan must cover BOTH projects and coordinate changes across them.\n\n' : ''}The implementation plan should be comprehensive and include:
1. Clear objective and goals
2. ${isMultiproject ? 'Coordination strategy between projects' : 'Step-by-step implementation instructions'}
3. ${isMultiproject ? 'Step-by-step implementation instructions for BOTH projects' : 'Files to be created or modified'}
4. ${isMultiproject ? 'Files to be created or modified in BOTH projects' : 'Technical specifications and requirements'}
5. Technical specifications and requirements${isMultiproject ? ' for BOTH projects' : ''}
6. Testing considerations${isMultiproject ? ' (integration tests between projects)' : ''}
7. Expected outcomes

`;

  // Add primary context description if available
  if (context.contextDescription) {
    prompt += `## Primary Project Context\n\n${context.contextDescription}\n\n`;
  }

  // Add secondary context description for multiproject mode
  if (isMultiproject) {
    prompt += `## Secondary Project Context\n\n${context.secondaryContextDescription}\n\n`;
    prompt += `**Note:** These are TWO separate codebases that need to work together. Consider API contracts, data flow, and integration points between them.\n\n`;
  }

  // Add user input
  prompt += `## Feature Idea\n\n${context.userInput}\n\n`;

  prompt += `---

Generate a comprehensive Claude Code requirement document for implementing the requested feature${isMultiproject ? ' across BOTH projects' : ''}. The document should be clear, actionable, and ready for autonomous execution.

Format the response as a markdown document with the following structure:

# [Title]

## Objective
[Clear statement of what needs to be accomplished${isMultiproject ? ' across both projects' : ''}]

${isMultiproject ? `## Cross-Project Coordination
[How the two projects will interact: API endpoints, data contracts, shared types, etc.]

` : ''}## Implementation Steps${isMultiproject ? ' - Primary Project' : ''}
1. [Step 1]
2. [Step 2]
...

${isMultiproject ? `## Implementation Steps - Secondary Project
1. [Step 1]
2. [Step 2]
...

` : ''}## Files to Modify/Create${isMultiproject ? ' - Primary Project' : ''}
- \`path/to/file1.ts\` - [Description]
- \`path/to/file2.tsx\` - [Description]

${isMultiproject ? `## Files to Modify/Create - Secondary Project
- \`path/to/file1.ts\` - [Description]
- \`path/to/file2.tsx\` - [Description]

` : ''}## Technical Specifications
[Detailed technical requirements${isMultiproject ? ' for both projects' : ''}]

## Testing
[Testing approach and scenarios${isMultiproject ? ', including integration tests between projects' : ''}]

## Expected Outcomes
[What should be achieved after implementation${isMultiproject ? ' with both projects working together' : ''}]`;

  return prompt;
}
