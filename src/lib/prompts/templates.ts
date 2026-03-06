/**
 * Centralized Prompt Templates Configuration
 *
 * This file contains all standardized AI prompt templates used across the application.
 * Each template follows a declarative syntax for consistency and maintainability.
 */

import {
  PromptConfig,
  PromptTaskType,
  PromptMode,
} from './types';

/**
 * High-Level Documentation Prompt
 */
export const HIGH_LEVEL_DOCS_PROMPT: PromptConfig = {
  id: 'high_level_docs_v1',
  name: 'High-Level Documentation Generator',
  taskType: 'high_level_docs',
  systemPrompt: `You are a senior technical architect and documentation specialist. Your role is to create strategic, high-level documentation that focuses on the "why" and "what" rather than implementation details.`,
  userPrompt: `# Generate High-Level Documentation

## Project Information
**Project Name:** {{PROJECT_NAME}}

{{AI_DOCS_SECTION}}

{{ANALYSIS_SECTION}}

{{USER_VISION_SECTION}}

## Instructions

Generate comprehensive high-level documentation for this project. Focus on:

### 1. Strategic Overview (Why this project exists)
- Problem statement and market opportunity
- Target users and their needs
- Unique value proposition
- Success metrics

### 2. Architecture Vision (How it's structured conceptually)
- Core architectural patterns and principles
- System boundaries and responsibilities
- Key design decisions and trade-offs
- Integration points and dependencies

### 3. Capabilities (What it does)
- Major features and functionality
- User workflows and experiences
- Technical capabilities
- Current limitations

### 4. Innovation & Future Direction
- Innovative approaches or differentiators
- Potential enhancements
- Scalability considerations
- Technology evolution path

## Output Format

Return a comprehensive markdown document with clear sections, subsections, and professional formatting. Use diagrams (PlantUML) where helpful for architecture visualization.

Focus on strategic value, not implementation code. This documentation should help stakeholders, new developers, and decision-makers understand the project's purpose, design, and direction.`,
  placeholders: [
    { key: 'PROJECT_NAME', required: true },
    { key: 'AI_DOCS_SECTION', defaultValue: '' },
    { key: 'ANALYSIS_SECTION', defaultValue: '' },
    { key: 'USER_VISION_SECTION', defaultValue: '' },
  ],
  outputFormat: {
    type: 'markdown',
    description: 'Comprehensive markdown documentation with sections for overview, architecture, capabilities, and innovation',
  },
  llmConfig: {
    temperature: 0.7,
    maxTokens: 4000,
  },
  instructions: [
    'Focus on strategic value over implementation details',
    'Use clear section hierarchy',
    'Include PlantUML diagrams where helpful',
    'Write for both technical and non-technical stakeholders',
  ],
};

/**
 * Strategic Goals Generation Prompt
 */
export const STRATEGIC_GOALS_PROMPT: PromptConfig = {
  id: 'strategic_goals_v1',
  name: 'Strategic Goals Generator',
  taskType: 'strategic_goals',
  systemPrompt: `You are a product strategist and business analyst. Generate strategic goals that align technical implementation with business value and user needs.`,
  userPrompt: `# Generate Strategic Goals

## Project Information
**Project Name:** {{PROJECT_NAME}}

{{AI_DOCS_SECTION}}

{{ANALYSIS_SECTION}}

{{EXISTING_GOALS_SECTION}}

## Instructions

Generate 5-8 strategic goals for this project. Each goal should align technical work with business value.

### Focus Areas
1. **Market Opportunity**: What market needs can this project address?
2. **User Value**: How does this benefit end users?
3. **Differentiation**: What makes this unique or better?
4. **Scalability**: How can this grow and adapt?
5. **Monetization**: What business model or revenue potential exists?

### Goal Quality Standards
- **Specific**: Clear and well-defined
- **Measurable**: Include success metrics
- **Achievable**: Realistic given current state
- **Relevant**: Aligned with project vision
- **Strategic**: Focus on outcomes, not tasks

### Avoid
- Duplicate existing goals
- Generic or vague statements
- Pure technical tasks without business context
- Goals that are too similar to rejected ones

## Output Format

Return a JSON array with this structure:

\`\`\`json
[
  {
    "title": "Clear, action-oriented goal title",
    "description": [
      "First point explaining the goal",
      "Second point with details",
      "Third point with success criteria"
    ],
    "type": "Business" | "Technical",
    "reason": "Why this goal matters and the value it creates"
  }
]
\`\`\`

Return ONLY the JSON array, no additional text.`,
  placeholders: [
    { key: 'PROJECT_NAME', required: true },
    { key: 'AI_DOCS_SECTION', defaultValue: '' },
    { key: 'ANALYSIS_SECTION', defaultValue: '' },
    { key: 'EXISTING_GOALS_SECTION', defaultValue: '' },
  ],
  outputFormat: {
    type: 'json',
    description: 'Array of goal objects with title, description array, type, and reason',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'array', items: { type: 'string' } },
          type: { type: 'string', enum: ['Business', 'Technical'] },
          reason: { type: 'string' },
        },
        required: ['title', 'description', 'type', 'reason'],
      },
    },
  },
  llmConfig: {
    temperature: 0.8,
    maxTokens: 20000,
  },
};

/**
 * Context Description Generation Prompt
 */
export const CONTEXT_DESCRIPTION_PROMPT: PromptConfig = {
  id: 'context_description_v1',
  name: 'Context Description Generator',
  taskType: 'context_description',
  systemPrompt: `You are a technical documentation specialist. Generate clear, comprehensive descriptions of code contexts (feature groups) based on file analysis.`,
  userPrompt: `# Generate Context Description

Analyze the following files and generate a comprehensive description.

## Context Information
**Name:** {{CONTEXT_NAME}}
**Initial Description:** {{INITIAL_DESCRIPTION}}

## Files in Context
{{FILE_LIST}}

## Instructions

Generate a description that includes:

### 1. Overview
- What is this context/feature?
- What problem does it solve?
- Who uses it?

### 2. Architecture
- How is it structured?
- What are the key components?
- What patterns does it use?

### 3. File Structure
- Main files and their purposes
- How files relate to each other
- Entry points and exports

## Output Format

Return JSON with this structure:

\`\`\`json
{
  "description": "Comprehensive markdown description with sections for Overview, Architecture, and File Structure",
  "fileStructure": "Optional: Visual representation of file relationships"
}
\`\`\`

Write in markdown format with clear sections. Be thorough - this will be used by developers to understand the feature.

Return ONLY the JSON object, no additional text.`,
  placeholders: [
    { key: 'CONTEXT_NAME', required: true },
    { key: 'INITIAL_DESCRIPTION', defaultValue: '' },
    { key: 'FILE_LIST', required: true },
  ],
  outputFormat: {
    type: 'json',
    description: 'JSON with description (markdown) and optional fileStructure',
    schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        fileStructure: { type: 'string' },
      },
      required: ['description'],
    },
  },
  llmConfig: {
    temperature: 0.7,
    maxTokens: 4000,
  },
};

/**
 * Context Documentation Generation Prompt
 */
export const CONTEXT_DOCUMENTATION_PROMPT: PromptConfig = {
  id: 'context_documentation_v1',
  name: 'Context Documentation Generator',
  taskType: 'context_documentation',
  systemPrompt: `You are a senior software engineer creating comprehensive technical documentation. Write detailed documentation that helps developers understand, use, and modify the code.`,
  userPrompt: `# Generate Context Documentation

Create comprehensive documentation for this code context.

## Context Information
**Name:** {{CONTEXT_NAME}}
**Description:** {{DESCRIPTION}}

## File Contents
{{FILE_CONTENTS}}

## Documentation Sections

Generate documentation covering:

### 1. Overview
- Purpose and functionality
- Use cases
- Key concepts

### 2. Key Components
- Main classes/functions/components
- Responsibilities of each
- Public APIs

### 3. Patterns & Conventions
- Design patterns used
- Code conventions
- Architectural decisions

### 4. Data Flow
- How data moves through the system
- State management
- Side effects

### 5. Implementation Details
- Important algorithms
- Performance considerations
- Edge cases and limitations

### 6. Usage Examples
- How to use this code
- Common scenarios
- Integration points

## Output Format

Return comprehensive markdown documentation with clear sections, code examples, and diagrams where helpful.

Focus on clarity and completeness. This will be the primary reference for developers working with this code.`,
  placeholders: [
    { key: 'CONTEXT_NAME', required: true },
    { key: 'DESCRIPTION', defaultValue: '' },
    { key: 'FILE_CONTENTS', required: true },
  ],
  outputFormat: {
    type: 'markdown',
    description: 'Comprehensive markdown documentation',
  },
  llmConfig: {
    temperature: 0.7,
    maxTokens: 8000,
  },
};

/**
 * Prompt Registry
 * Maps task types and modes to their corresponding templates
 */
export const PROMPT_REGISTRY: Record<string, PromptConfig> = {
  high_level_docs: HIGH_LEVEL_DOCS_PROMPT,
  strategic_goals: STRATEGIC_GOALS_PROMPT,
  context_description: CONTEXT_DESCRIPTION_PROMPT,
  context_documentation: CONTEXT_DOCUMENTATION_PROMPT,
};

/**
 * Get a prompt template by task type and optional mode
 */
export function getPromptTemplate(
  taskType: PromptTaskType,
  mode?: PromptMode
): PromptConfig | undefined {
  const key = mode ? `${taskType}:${mode}` : taskType;
  return PROMPT_REGISTRY[key];
}

/**
 * List all available templates
 */
export function listPromptTemplates(): Array<{
  id: string;
  name: string;
  taskType: PromptTaskType;
  mode?: PromptMode;
}> {
  return Object.values(PROMPT_REGISTRY).map((template) => ({
    id: template.id,
    name: template.name,
    taskType: template.taskType,
    mode: template.mode,
  }));
}
