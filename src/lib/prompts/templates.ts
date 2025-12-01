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
  IdeaCategory,
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
 * Idea Generation - Overall Analysis
 */
export const IDEA_OVERALL_PROMPT: PromptConfig = {
  id: 'idea_overall_v1',
  name: 'Overall Project Ideas Generator',
  taskType: 'idea_generation',
  // Note: 'overall' mode not in ScanType - using as standalone prompt
  systemPrompt: `You are a senior product designer and engineering consultant conducting a comprehensive multi-dimensional analysis. Evaluate the project across UX, security, architecture, performance, features, and business value.`,
  userPrompt: `# Comprehensive Project Analysis

Analyze this project across 6 key dimensions and generate actionable improvement ideas.

{{AI_DOCS_SECTION}}

{{CONTEXT_SECTION}}

{{CODE_SECTION}}

{{EXISTING_IDEAS_SECTION}}

## Analysis Dimensions

### 1. UX & Design
- Visual design quality and consistency
- User flow optimization
- Accessibility (WCAG, keyboard nav, screen readers)
- Micro-interactions and animations
- Mobile responsiveness

### 2. Security & Reliability
- Authentication and authorization
- Input validation and sanitization
- Error handling and edge cases
- Data protection and privacy
- Dependency vulnerabilities

### 3. Architecture & Maintainability
- Code organization and modularity
- Design patterns and best practices
- Type safety and documentation
- Technical debt reduction
- Testability

### 4. Performance Optimization
- Load time and bundle size
- Runtime performance
- Database query optimization
- Caching strategies
- Resource utilization

### 5. Feature Enhancement
- Missing key features
- User-requested capabilities
- Workflow improvements
- Integration opportunities

### 6. User Value & Business Impact
- User pain points to address
- Competitive advantages
- Monetization opportunities
- Market differentiation

## Quality Standards

Each idea should be:
- **Specific**: Target a concrete improvement
- **Actionable**: Clear what needs to be done
- **Impactful**: Explain the value created
- **Scoped**: Effort estimate (1-3 scale)

### Effort Scale
- **1**: Quick fix (< 1 day) - Small changes, config updates, minor tweaks
- **2**: Moderate effort (1-3 days) - New components, refactoring, integration work
- **3**: Major refactoring (> 3 days) - Large features, architecture changes, complex systems

### Impact Scale
- **1**: Nice to have - Minor improvement, small quality boost
- **2**: Noticeable improvement - Clear benefit, better UX or performance
- **3**: Game changer - Significant value, competitive advantage, major enhancement

## Output Format

Return a JSON array of ideas:

\`\`\`json
[
  {
    "category": "ux_design" | "code_quality" | "performance" | "security" | "feature" | "architecture" | "accessibility" | "testing" | "documentation" | "user_value",
    "title": "Short, descriptive title",
    "description": "Detailed explanation of the improvement and how to implement it",
    "reasoning": "Why this matters and what value it creates",
    "effort": 1 | 2 | 3,
    "impact": 1 | 2 | 3
  }
]
\`\`\`

### Critical Rules
- DO NOT suggest ideas similar to rejected ones
- DO NOT duplicate pending or accepted ideas
- DO focus on the most impactful improvements
- DO provide specific, actionable recommendations
- DO learn from what has been rejected

Return ONLY the JSON array, no additional text.`,
  placeholders: [
    { key: 'AI_DOCS_SECTION', defaultValue: '' },
    { key: 'CONTEXT_SECTION', defaultValue: '' },
    { key: 'CODE_SECTION', defaultValue: '' },
    { key: 'EXISTING_IDEAS_SECTION', defaultValue: '' },
  ],
  outputFormat: {
    type: 'json',
    description: 'Array of idea objects with category, title, description, reasoning, effort, and impact',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: [
              'ux_design',
              'code_quality',
              'performance',
              'security',
              'feature',
              'architecture',
              'accessibility',
              'testing',
              'documentation',
              'user_value',
            ],
          },
          title: { type: 'string' },
          description: { type: 'string' },
          reasoning: { type: 'string' },
          effort: { type: 'number', enum: [1, 2, 3] },
          impact: { type: 'number', enum: [1, 2, 3] },
        },
        required: ['category', 'title', 'description', 'reasoning', 'effort', 'impact'],
      },
    },
  },
  llmConfig: {
    temperature: 0.7,
    maxTokens: 8000,
  },
};

/**
 * Idea Generation - Bug Hunter
 */
export const IDEA_BUG_HUNTER_PROMPT: PromptConfig = {
  id: 'idea_bug_hunter_v1',
  name: 'Bug Hunter Ideas Generator',
  taskType: 'idea_generation',
  mode: 'bug_hunter',
  systemPrompt: `You are a meticulous debugging expert and quality assurance specialist. Your mission is to identify potential bugs, edge cases, error handling gaps, and defensive programming opportunities.`,
  userPrompt: `# Bug Hunter Analysis

Hunt for bugs, edge cases, and reliability issues in this project.

{{AI_DOCS_SECTION}}

{{CONTEXT_SECTION}}

{{CODE_SECTION}}

{{EXISTING_IDEAS_SECTION}}

## Focus Areas

### Potential Bugs
- Logic errors and incorrect assumptions
- Race conditions and timing issues
- Memory leaks and resource management
- Null/undefined handling
- Type coercion problems

### Error Handling
- Missing try-catch blocks
- Unhandled promise rejections
- Silent failures
- Poor error messages
- Recovery mechanisms

### Edge Cases
- Empty arrays/objects
- Boundary values (0, -1, max int)
- Concurrent operations
- Network failures
- Invalid user input

### Defensive Programming
- Input validation gaps
- Assertion opportunities
- Guard clauses
- Fail-fast patterns
- Graceful degradation

## Analysis Guidelines

For each issue:
1. Identify the failure scenario
2. Assess the risk/impact
3. Suggest the fix
4. Estimate effort

### Risk Assessment
- **Critical**: Data loss, security breach, crashes
- **High**: Feature breaks, poor UX, data inconsistency
- **Medium**: Edge case failures, minor bugs
- **Low**: Unlikely scenarios, minimal impact

## Output Format

Return a JSON array of ideas:

\`\`\`json
[
  {
    "category": "code_quality" | "security" | "performance",
    "title": "Specific bug or issue title",
    "description": "Detailed explanation of the bug/issue, how it occurs, and how to fix it",
    "reasoning": "Why this is a problem and the risk/impact of not fixing it",
    "effort": 1 | 2 | 3,
    "impact": 1 | 2 | 3
  }
]
\`\`\`

Focus on real, concrete issues you can identify in the code. Avoid generic suggestions.

Return ONLY the JSON array, no additional text.`,
  placeholders: [
    { key: 'AI_DOCS_SECTION', defaultValue: '' },
    { key: 'CONTEXT_SECTION', defaultValue: '' },
    { key: 'CODE_SECTION', defaultValue: '' },
    { key: 'EXISTING_IDEAS_SECTION', defaultValue: '' },
  ],
  outputFormat: {
    type: 'json',
    description: 'Array of bug/issue ideas',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          reasoning: { type: 'string' },
          effort: { type: 'number', enum: [1, 2, 3] },
          impact: { type: 'number', enum: [1, 2, 3] },
        },
        required: ['category', 'title', 'description', 'reasoning', 'effort', 'impact'],
      },
    },
  },
  llmConfig: {
    temperature: 0.6,
    maxTokens: 8000,
  },
};

/**
 * Idea Generation - Insight Synthesis
 */
export const IDEA_INSIGHT_SYNTH_PROMPT: PromptConfig = {
  id: 'idea_insight_synth_v1',
  name: 'Insight Synthesis Ideas Generator',
  taskType: 'idea_generation',
  mode: 'insight_synth',
  systemPrompt: `You are a strategic product analyst. Synthesize high-level insights from the project's current state and identify strategic improvements that create user value and competitive advantage.`,
  userPrompt: `# Strategic Insight Synthesis

Analyze the project holistically and identify strategic improvements.

{{AI_DOCS_SECTION}}

{{CONTEXT_SECTION}}

{{CODE_SECTION}}

{{EXISTING_IDEAS_SECTION}}

## Analysis Focus

### Strategic Insights
- What patterns emerge from the codebase?
- What is the project really good at?
- Where are the biggest opportunities?
- What user needs are underserved?

### Value Creation
- How can we increase user value?
- What would delight users?
- Where can we differentiate?
- What creates competitive advantage?

### Quality & Polish
- Where does the project feel unfinished?
- What would make it feel professional?
- What small touches would elevate the experience?
- What creates trust and confidence?

### Innovation Opportunities
- What emerging patterns could we adopt?
- How can we leverage existing strengths?
- What would make this project stand out?
- What would users not expect but love?

## Output Guidelines

Generate 5-10 strategic, high-impact ideas that:
- Create clear user value
- Align with project strengths
- Have strong reasoning
- Are specific and actionable

Prioritize:
- High impact over low effort
- User value over technical elegance
- Strategic wins over tactical fixes
- Innovation over incrementalism

## Output Format

Return a JSON array of ideas:

\`\`\`json
[
  {
    "category": "feature" | "user_value" | "ux_design" | "architecture",
    "title": "Strategic improvement title",
    "description": "Detailed explanation of the improvement and implementation approach",
    "reasoning": "Why this creates value, what makes it strategic, and the expected impact",
    "effort": 1 | 2 | 3,
    "impact": 1 | 2 | 3
  }
]
\`\`\`

Return ONLY the JSON array, no additional text.`,
  placeholders: [
    { key: 'AI_DOCS_SECTION', defaultValue: '' },
    { key: 'CONTEXT_SECTION', defaultValue: '' },
    { key: 'CODE_SECTION', defaultValue: '' },
    { key: 'EXISTING_IDEAS_SECTION', defaultValue: '' },
  ],
  outputFormat: {
    type: 'json',
    description: 'Array of strategic insight ideas',
  },
  llmConfig: {
    temperature: 0.8,
    maxTokens: 8000,
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
  'idea_generation:overall': IDEA_OVERALL_PROMPT,
  'idea_generation:bug_hunter': IDEA_BUG_HUNTER_PROMPT,
  'idea_generation:insight_synth': IDEA_INSIGHT_SYNTH_PROMPT,
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
