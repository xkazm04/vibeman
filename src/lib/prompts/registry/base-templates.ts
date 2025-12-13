/**
 * Base Templates for Prompt Composition
 *
 * These templates provide the foundation for agent-specific prompts.
 * They define common sections and variables that agents build upon.
 */

import { BaseTemplate } from './types';

/**
 * Base template for idea generation prompts
 * Used by all agent-based scan types
 */
export const IDEA_GENERATION_BASE: BaseTemplate = {
  id: 'idea_generation_base',
  name: 'Idea Generation Base Template',
  description: 'Foundation template for all idea generation agents',
  userPromptTemplate: `## Project Documentation
{{AI_DOCS_SECTION}}

## Context Information
{{CONTEXT_SECTION}}

## Existing Ideas (Avoid Duplicates)
{{EXISTING_IDEAS_SECTION}}

## Code to Analyze
{{CODE_SECTION}}

---

## CRITICAL: JSON Output Format

**You MUST respond with ONLY a valid JSON array. Follow these rules EXACTLY:**

1. ❌ NO markdown code blocks (no \`\`\`json or \`\`\`)
2. ❌ NO explanatory text before or after the JSON
3. ❌ NO comments in the JSON
4. ✅ ONLY pure JSON array starting with [ and ending with ]

**Expected JSON structure:**

[
  {
    "category": "functionality",
    "title": "Short, descriptive title (max 60 characters)",
    "description": "Detailed explanation (2-4 sentences). Be specific about implementation.",
    "reasoning": "Why this is valuable. What problem does it solve? (2-3 sentences).",
    "effort": 2,
    "impact": 3
  }
]

### Effort and Impact Ratings:

**Effort** (Implementation difficulty):
- **1** = Low effort (Quick fix, 1-2 hours)
- **2** = Medium effort (Moderate change, 1-2 days)
- **3** = High effort (Major change, 1+ weeks)

**Impact** (Value to project):
- **1** = Low impact (Nice to have)
- **2** = Medium impact (Noticeable improvement)
- **3** = High impact (Game changer)

---

## ⚠️ FINAL REMINDER

Your response must be ONLY a JSON array. No markdown blocks, no explanations.

Generate high-quality, actionable ideas that will genuinely improve this project.`,
  variables: [
    {
      name: 'PROJECT_NAME',
      description: 'Name of the project being analyzed',
      required: false,
      defaultValue: 'the project',
    },
    {
      name: 'AI_DOCS_SECTION',
      description: 'AI-generated documentation about the project',
      required: false,
      defaultValue: '',
    },
    {
      name: 'CONTEXT_SECTION',
      description: 'Context/feature information being analyzed',
      required: false,
      defaultValue: '',
    },
    {
      name: 'EXISTING_IDEAS_SECTION',
      description: 'List of existing ideas to avoid duplicating',
      required: false,
      defaultValue: 'No existing ideas.',
    },
    {
      name: 'CODE_SECTION',
      description: 'Code snippets to analyze',
      required: false,
      defaultValue: '',
    },
    {
      name: 'HAS_CONTEXT',
      description: 'Whether analyzing a specific context',
      required: false,
      defaultValue: 'false',
    },
  ],
  outputFormat: {
    type: 'json',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          title: { type: 'string', maxLength: 60 },
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
 * Base template for context analysis prompts
 */
export const CONTEXT_ANALYSIS_BASE: BaseTemplate = {
  id: 'context_analysis_base',
  name: 'Context Analysis Base Template',
  description: 'Foundation template for context/feature documentation',
  userPromptTemplate: `## Context Information
**Name:** {{CONTEXT_NAME}}
**Description:** {{INITIAL_DESCRIPTION}}

## Files in Context
{{FILE_LIST}}

## File Contents
{{FILE_CONTENTS}}

---

Analyze the context and provide comprehensive documentation.`,
  variables: [
    {
      name: 'CONTEXT_NAME',
      description: 'Name of the context/feature',
      required: true,
    },
    {
      name: 'INITIAL_DESCRIPTION',
      description: 'Initial description if available',
      required: false,
      defaultValue: '',
    },
    {
      name: 'FILE_LIST',
      description: 'List of files in the context',
      required: true,
    },
    {
      name: 'FILE_CONTENTS',
      description: 'Contents of the files',
      required: false,
      defaultValue: '',
    },
  ],
  outputFormat: {
    type: 'markdown',
    description: 'Comprehensive documentation in markdown format',
  },
  llmConfig: {
    temperature: 0.7,
    maxTokens: 4000,
  },
};

/**
 * Base template for assistant prompts
 */
export const ASSISTANT_BASE: BaseTemplate = {
  id: 'assistant_base',
  name: 'Assistant Base Template',
  description: 'Foundation template for chat/voice assistants',
  userPromptTemplate: `## Project Context
{{PROJECT_METADATA}}

## Available Tools
{{TOOL_DEFINITIONS}}

## Tool Results
{{TOOL_RESULTS}}

## User Question
"{{USER_MESSAGE}}"

Provide a direct answer based on the tool results. Be factual and concise.`,
  variables: [
    {
      name: 'PROJECT_METADATA',
      description: 'Project metadata and context',
      required: false,
      defaultValue: '',
    },
    {
      name: 'TOOL_DEFINITIONS',
      description: 'Available tool definitions',
      required: false,
      defaultValue: '',
    },
    {
      name: 'TOOL_RESULTS',
      description: 'Results from tool calls',
      required: false,
      defaultValue: '',
    },
    {
      name: 'USER_MESSAGE',
      description: 'User question or message',
      required: true,
    },
  ],
  outputFormat: {
    type: 'text',
    description: 'Concise, factual response',
  },
  llmConfig: {
    temperature: 0.5,
    maxTokens: 2000,
  },
};

/**
 * Base template for requirement generation
 */
export const REQUIREMENT_BASE: BaseTemplate = {
  id: 'requirement_base',
  name: 'Requirement Base Template',
  description: 'Foundation template for Claude Code requirements',
  userPromptTemplate: `# Code Improvement Tasks

## Project Information
- **Project**: {{PROJECT_PATH}}
- **Type**: {{PROJECT_TYPE}}
- **Total Issues**: {{ISSUE_COUNT}}

## Instructions
1. Address each issue carefully
2. Maintain existing code style
3. Ensure type safety
4. Do not introduce new bugs
5. Test changes where possible

{{ADDITIONAL_INSTRUCTIONS}}

## Tasks

{{TASK_CONTENT}}`,
  variables: [
    {
      name: 'PROJECT_PATH',
      description: 'Path to the project',
      required: true,
    },
    {
      name: 'PROJECT_TYPE',
      description: 'Type of project (Next.js, React, etc.)',
      required: false,
      defaultValue: 'TypeScript',
    },
    {
      name: 'ISSUE_COUNT',
      description: 'Total number of issues',
      required: false,
      defaultValue: '0',
    },
    {
      name: 'ADDITIONAL_INSTRUCTIONS',
      description: 'Any additional instructions',
      required: false,
      defaultValue: '',
    },
    {
      name: 'TASK_CONTENT',
      description: 'The actual task content',
      required: true,
    },
  ],
  outputFormat: {
    type: 'markdown',
    description: 'Formatted requirement document',
  },
  llmConfig: {
    temperature: 0.3,
    maxTokens: 4000,
  },
};

/**
 * All base templates for registration
 */
export const BASE_TEMPLATES: BaseTemplate[] = [
  IDEA_GENERATION_BASE,
  CONTEXT_ANALYSIS_BASE,
  ASSISTANT_BASE,
  REQUIREMENT_BASE,
];
