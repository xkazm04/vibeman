# Blueprint Library

A modular, composable architecture for code analysis and refactoring.

## Overview

The Blueprint Library provides reusable components for building custom scan pipelines. Instead of monolithic scan implementations, you can compose analyzers, processors, and executors to create tailored workflows.

## Architecture

```
src/lib/blueprint/
├── components/
│   ├── base/           # Base classes (BaseComponent, BaseAnalyzer, etc.)
│   ├── analyzers/      # Code analysis components
│   ├── processors/     # Data transformation components
│   └── executors/      # Action execution components
├── prompts/
│   ├── templates/      # Markdown prompt templates
│   └── builders/       # Prompt generation utilities
├── types/              # Type definitions
└── index.ts           # Main exports
```

## Quick Start

```typescript
import {
  createAnalyzer,
  createProcessor,
  createExecutor,
  ExecutionContext
} from '@/lib/blueprint';

// Create execution context
const context: ExecutionContext = {
  executionId: 'exec-123',
  projectId: 'proj-456',
  projectPath: '/path/to/project',
  projectType: 'nextjs',
  reportProgress: (progress, message) => console.log(`${progress}%: ${message}`),
  log: (level, message) => console.log(`[${level}] ${message}`),
  isCancelled: () => false,
  onCancel: (cb) => {},
  getNodeOutput: (nodeId) => undefined,
};

// 1. Analyze code for issues
const consoleAnalyzer = createAnalyzer('analyzer.console');
await consoleAnalyzer.initialize({ includeDebug: true });
const consoleIssues = await consoleAnalyzer.execute(undefined, context);

const anyTypeAnalyzer = createAnalyzer('analyzer.any-types');
await anyTypeAnalyzer.initialize({});
const anyTypeIssues = await anyTypeAnalyzer.execute(undefined, context);

// 2. Merge and filter results
const merger = createProcessor('processor.merge');
await merger.initialize({ deduplicateByLine: true });
const allIssues = await merger.execute([consoleIssues, anyTypeIssues], context);

const filter = createProcessor('processor.filter');
await filter.initialize({ minSeverity: 'medium' });
const filteredIssues = await filter.execute(allIssues, context);

// 3. Generate requirements
const executor = createExecutor('executor.requirement');
await executor.initialize({ batchSize: 10, includeGitCommands: true });
const result = await executor.execute(filteredIssues, context);

console.log(`Created ${result.requirementFiles.length} requirement files`);
```

## Available Components

### Analyzers

| ID | Name | Description |
|----|------|-------------|
| `analyzer.console` | Console Statements | Detect console.log, console.warn, etc. |
| `analyzer.any-types` | Any Types | Detect usage of "any" type |
| `analyzer.unused-imports` | Unused Imports | Detect unused import statements |
| `analyzer.large-files` | Large Files | Detect files exceeding line threshold |
| `analyzer.long-functions` | Long Functions | Detect functions exceeding line threshold |
| `analyzer.complexity` | Cyclomatic Complexity | Detect high complexity functions |
| `analyzer.duplication` | Code Duplication | Detect duplicated code blocks |
| `analyzer.magic-numbers` | Magic Numbers | Detect hardcoded numeric literals |
| `analyzer.react-hooks` | React Hooks | Detect hook dependency issues |

### Processors

| ID | Name | Description |
|----|------|-------------|
| `processor.filter` | Issue Filter | Filter issues by severity, category, etc. |
| `processor.group` | Issue Grouper | Group issues by file, category, or severity |
| `processor.priority` | Issue Prioritizer | Sort issues by impact/effort ratio |
| `processor.batch` | Issue Batcher | Create execution batches |
| `processor.merge` | Issue Merger | Combine multiple issue arrays |

### Executors

| ID | Name | Description |
|----|------|-------------|
| `executor.requirement` | Requirement Generator | Generate Claude Code requirement files |

## Component Configuration

Each component has a configuration schema. Use `getConfigSchema()` and `getDefaultConfig()`:

```typescript
const analyzer = createAnalyzer('analyzer.console');

// Get configuration options
console.log(analyzer.getConfigSchema());
// {
//   includeDebug: { type: 'boolean', default: true },
//   includeInfo: { type: 'boolean', default: true },
//   minCount: { type: 'number', default: 1 },
//   excludePatterns: { type: 'array', items: { type: 'string' } }
// }

// Initialize with custom config
await analyzer.initialize({
  includeDebug: false,
  excludePatterns: ['**/legacy/**']
});
```

## Creating Custom Components

### Custom Analyzer

```typescript
import { BaseAnalyzer, AnalyzerConfig } from '@/lib/blueprint/components/base';
import { ExecutionContext, Issue } from '@/lib/blueprint/types';

interface MyAnalyzerConfig extends AnalyzerConfig {
  myOption: boolean;
}

export class MyAnalyzer extends BaseAnalyzer<MyAnalyzerConfig, Issue[]> {
  readonly id = 'analyzer.my-analyzer';
  readonly name = 'My Analyzer';
  readonly description = 'Detect my custom issues';

  async execute(_: void, context: ExecutionContext): Promise<Issue[]> {
    this.context = context;
    const issues: Issue[] = [];

    const files = await this.getProjectFiles(context.projectPath);

    for (const file of files) {
      const content = await this.readFile(file);
      // Your analysis logic here
    }

    return issues;
  }

  validateConfig(config: MyAnalyzerConfig) {
    return { valid: true };
  }

  getConfigSchema() {
    return {
      type: 'object',
      properties: {
        myOption: { type: 'boolean', default: true }
      }
    };
  }

  getDefaultConfig(): MyAnalyzerConfig {
    return { myOption: true };
  }

  getOutputTypes() {
    return ['Issue[]'];
  }
}
```

### Custom Processor

```typescript
import { BaseProcessor, ProcessorConfig } from '@/lib/blueprint/components/base';
import { ExecutionContext, Issue } from '@/lib/blueprint/types';

interface MyProcessorConfig extends ProcessorConfig {
  threshold: number;
}

export class MyProcessor extends BaseProcessor<Issue[], Issue[], MyProcessorConfig> {
  readonly id = 'processor.my-processor';
  readonly name = 'My Processor';
  readonly description = 'Transform issues my way';

  async execute(input: Issue[], context: ExecutionContext): Promise<Issue[]> {
    // Your transformation logic
    return input.filter(issue => /* condition */);
  }

  // ... other methods
}
```

## Prompt Templates

Templates use mustache-style placeholders:

```markdown
## Fix {{category}} Issues

Found {{issueCount}} issue(s) in the following files:

{{fileList}}

### Issues to Address

{{issueDetails}}
```

Use `PromptBuilder` to generate prompts:

```typescript
import { PromptBuilder } from '@/lib/blueprint/prompts';

const builder = new PromptBuilder();
const prompt = await builder.buildRequirement(issues, {
  projectPath: '/path/to/project',
  projectType: 'nextjs',
  issues,
});
```

## Database Integration

Blueprint configurations are stored in the database:

```typescript
import {
  createBlueprintConfig,
  getBlueprintConfigsByProject,
  createBlueprintExecution,
} from '@/app/db/repositories/blueprint.repository';

// Save a blueprint configuration
const config = createBlueprintConfig({
  project_id: 'proj-123',
  name: 'Code Quality Scan',
  description: 'Full code quality analysis',
  is_template: 0,
  config: JSON.stringify({
    nodes: [
      { id: 'console', componentId: 'analyzer.console', config: {} },
      { id: 'any', componentId: 'analyzer.any-types', config: {} },
      { id: 'filter', componentId: 'processor.filter', config: { minSeverity: 'medium' } },
    ],
    edges: [
      { id: 'e1', source: 'console', target: 'filter' },
      { id: 'e2', source: 'any', target: 'filter' },
    ]
  })
});

// Track execution
const execution = createBlueprintExecution({
  blueprint_id: config.id,
  project_id: 'proj-123',
});
```

## Best Practices

1. **Compose Small Components**: Build pipelines from focused components rather than monolithic analyzers.

2. **Use Processors for Transformation**: Keep analyzers focused on detection, use processors for filtering/grouping.

3. **Leverage Templates**: Use prompt templates for consistent requirement generation.

4. **Track Executions**: Store execution history for debugging and analytics.

5. **Configure via Schema**: Always use the config schema for type-safe configuration.
