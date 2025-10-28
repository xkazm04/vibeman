# Standardized Prompt Templates System

This module provides a centralized, declarative system for managing all AI prompts across the application.

## Overview

Instead of scattered prompt definitions throughout the codebase, all AI prompts are now defined in a single location using a standardized configuration format. This ensures consistency, reduces duplication, and makes it easier to update prompts when underlying LLMs change.

## Architecture

```
src/lib/prompts/
├── types.ts       # TypeScript type definitions
├── templates.ts   # Declarative prompt configurations
├── builder.ts     # Utility functions for building prompts
├── index.ts       # Public exports
└── README.md      # This file
```

## Key Features

### 1. Declarative Syntax

Prompts are defined using a simple, declarative configuration:

```typescript
const HIGH_LEVEL_DOCS_PROMPT: PromptConfig = {
  id: 'high_level_docs_v1',
  name: 'High-Level Documentation Generator',
  taskType: 'high_level_docs',
  systemPrompt: 'You are a senior technical architect...',
  userPrompt: 'Generate documentation for {{PROJECT_NAME}}...',
  placeholders: [
    { key: 'PROJECT_NAME', required: true },
    { key: 'ANALYSIS_SECTION', defaultValue: '' },
  ],
  outputFormat: {
    type: 'markdown',
    description: 'Comprehensive markdown documentation',
  },
  llmConfig: {
    temperature: 0.7,
    maxTokens: 4000,
  },
};
```

### 2. Placeholder System

Use `{{PLACEHOLDER}}` syntax in prompts:

```typescript
const prompt = `
Generate documentation for {{PROJECT_NAME}}.

{{ANALYSIS_SECTION}}

{{USER_VISION_SECTION}}
`;
```

Placeholders are automatically replaced with provided values.

### 3. Section Builders

Reusable section builders for common patterns:

```typescript
import { SectionBuilders } from '@/lib/prompts';

// Build a code section
const codeSection = SectionBuilders.files('Code Files')(fileArray);

// Build existing items section
const ideasSection = SectionBuilders.existingItems(
  'Existing Ideas',
  formatIdea,
  'status'
)(ideas);
```

### 4. Validation

Automatic validation of required placeholders:

```typescript
const result = buildPrompt('high_level_docs', {
  values: {
    PROJECT_NAME: 'MyProject', // Required
    // Missing required placeholder will throw error
  },
});
```

### 5. LLM Configuration

Each template includes its own LLM config:

```typescript
llmConfig: {
  temperature: 0.7,
  maxTokens: 4000,
}
```

## Available Templates

### Documentation & Analysis

- **high_level_docs** - Strategic high-level documentation
- **context_description** - Context/feature group descriptions
- **context_documentation** - Comprehensive code documentation

### Goal & Idea Generation

- **strategic_goals** - Business and technical goals
- **idea_generation:overall** - Multi-dimensional project analysis
- **idea_generation:bug_hunter** - Bug and edge case detection
- **idea_generation:insight_synth** - Strategic insights

## Usage

### Basic Usage

```typescript
import { buildPrompt } from '@/lib/prompts';

const result = buildPrompt('high_level_docs', {
  values: {
    PROJECT_NAME: 'MyProject',
    ANALYSIS_SECTION: analysisData,
  },
});

// Use the built prompt
const llmResponse = await generateWithLLM(result.fullPrompt, {
  maxTokens: result.llmConfig.maxTokens,
  temperature: result.llmConfig.temperature,
});
```

### With Modes

Some task types support multiple modes:

```typescript
const result = buildPrompt(
  'idea_generation',
  {
    values: {
      CODE_SECTION: codeData,
      EXISTING_IDEAS_SECTION: existingIdeas,
    },
  },
  'bug_hunter' // Mode
);
```

### Using Wrapper Functions

For convenience, use the wrapper functions in `ProjectAI/lib/promptBuilder.ts`:

```typescript
import {
  buildHighLevelDocsPrompt,
  buildStrategicGoalsPrompt,
  buildIdeaGenerationPrompt,
} from '@/app/projects/ProjectAI/lib/promptBuilder';

// High-level docs
const docsPrompt = buildHighLevelDocsPrompt(
  projectName,
  analysis,
  userVision
);

// Strategic goals
const goalsPrompt = buildStrategicGoalsPrompt(
  projectName,
  analysis,
  existingGoals
);

// Idea generation
const ideasPrompt = buildIdeaGenerationPrompt('overall', {
  projectName,
  aiDocs,
  context,
  codeFiles,
  existingIdeas,
});
```

## Adding New Templates

1. Define your template in `templates.ts`:

```typescript
export const MY_NEW_PROMPT: PromptConfig = {
  id: 'my_new_prompt_v1',
  name: 'My New Prompt',
  taskType: 'my_task_type',
  userPrompt: `Your prompt template with {{PLACEHOLDERS}}`,
  placeholders: [{ key: 'PLACEHOLDER', required: true }],
  outputFormat: { type: 'json' },
  llmConfig: { temperature: 0.7, maxTokens: 2000 },
};
```

2. Add to the registry:

```typescript
export const PROMPT_REGISTRY: Record<string, PromptConfig> = {
  // ... existing templates
  my_task_type: MY_NEW_PROMPT,
};
```

3. Use it:

```typescript
const result = buildPrompt('my_task_type', {
  values: { PLACEHOLDER: 'value' },
});
```

## Section Builders

Common section builders are available in `builder.ts`:

### Text Section

```typescript
const section = SectionBuilders.text('Section Title')('content');
```

### List Section

```typescript
const section = SectionBuilders.list('Items', (item) => `- ${item.name}`)(
  items
);
```

### Code Section

```typescript
const section = SectionBuilders.code('Code Block', 'typescript')(code);
```

### Files Section

```typescript
const section = SectionBuilders.files('Files')(
  files.map((f) => ({ path: f.path, content: f.content }))
);
```

### Existing Items Section

```typescript
const section = SectionBuilders.existingItems(
  'Goals',
  formatGoal,
  'status'
)(goals);
```

## Format Helpers

Pre-built formatters for common types:

```typescript
import { formatIdea, formatGoal, formatFileContent } from '@/lib/prompts';

const ideaText = formatIdea(idea);
const goalText = formatGoal(goal);
const fileText = formatFileContent(file);
```

## Benefits

### Consistency

All prompts follow the same structure and conventions.

### Maintainability

Update prompts in one place instead of scattered throughout the codebase.

### Versioning

Template IDs include versions (e.g., `high_level_docs_v1`) for tracking changes.

### DRY Principle

Reusable section builders and format helpers eliminate duplication.

### Type Safety

Full TypeScript support with typed interfaces and validation.

### Easy Updates

When LLM providers change, update templates in one location.

## Migration Guide

### Before (Old Pattern)

```typescript
const prompt = `You are an expert. Analyze this project: ${projectName}...`;

await generateWithLLM(prompt, {
  maxTokens: 4000,
  temperature: 0.7,
});
```

### After (New Pattern)

```typescript
const result = buildPrompt('high_level_docs', {
  values: { PROJECT_NAME: projectName },
});

await generateWithLLM(result.fullPrompt, {
  maxTokens: result.llmConfig.maxTokens,
  temperature: result.llmConfig.temperature,
});
```

## Best Practices

1. **Always use templates** - Don't create ad-hoc prompts
2. **Validate inputs** - Required placeholders are enforced
3. **Use section builders** - Reuse common patterns
4. **Include examples** - Add examples to template definitions
5. **Version templates** - Include version in template ID
6. **Document changes** - Update changelog when modifying templates
7. **Test templates** - Verify output before deploying

## API Reference

### buildPrompt()

```typescript
function buildPrompt(
  taskType: PromptTaskType,
  input: PromptBuildInput,
  mode?: PromptMode
): PromptBuildResult;
```

### getPromptTemplate()

```typescript
function getPromptTemplate(
  taskType: PromptTaskType,
  mode?: PromptMode
): PromptConfig | undefined;
```

### listPromptTemplates()

```typescript
function listPromptTemplates(): Array<{
  id: string;
  name: string;
  taskType: PromptTaskType;
  mode?: PromptMode;
}>;
```

## Examples

See the integration in:

- `src/app/projects/ProjectAI/generateAIReview.ts`
- `src/app/projects/ProjectAI/ScanIdeas/generateIdeas.ts`
- `src/app/projects/ProjectAI/ScanGoals/generateGoals.ts`
- `src/app/api/contexts/generate-description/route.ts`

## Future Enhancements

Potential improvements:

- [ ] Template inheritance and composition
- [ ] Conditional sections based on context
- [ ] A/B testing support for prompt variants
- [ ] Metrics tracking per template
- [ ] Automatic prompt optimization suggestions
- [ ] Multi-language prompt support
- [ ] Visual prompt builder UI
