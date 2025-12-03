# Blueprint Library Developer Guide

This guide explains how to create new Analyzers, Processors, and Executors for the Blueprint Library.

## Architecture Overview

The Blueprint Library uses a modular, composable architecture with three main component types:

1. **Analyzers** - Scan project files and identify issues or generate plans
2. **Processors** - Transform, filter, or aggregate data from analyzers
3. **Executors** - Perform actions like creating requirements or running tasks

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Analyzer   │ ──▶ │  Processor  │ ──▶ │  Executor   │
└─────────────┘     └─────────────┘     └─────────────┘
     │                    │                    │
     │                    │                    │
     ▼                    ▼                    ▼
 Issue[]            FilteredIssues      RequirementFiles
```

## Creating a New Analyzer

Analyzers scan project files and output arrays of issues or other data structures.

### Step 1: Create the Analyzer File

Create a new file in `src/lib/blueprint/components/analyzers/`:

```typescript
// MyCustomAnalyzer.ts
import { BaseAnalyzer, AnalyzerConfig } from '../base/BaseAnalyzer';
import { ExecutionContext, Issue, ValidationResult } from '../../types';

// 1. Define your configuration interface
interface MyCustomAnalyzerConfig extends AnalyzerConfig {
  customOption?: string;
  threshold?: number;
}

// 2. Create the analyzer class
export class MyCustomAnalyzer extends BaseAnalyzer<MyCustomAnalyzerConfig, Issue[]> {
  readonly id = 'analyzer.my-custom';
  readonly name = 'My Custom Analyzer';
  readonly description = 'Analyzes code for custom patterns';

  // 3. Implement the execute method
  async execute(input: void, context: ExecutionContext): Promise<Issue[]> {
    this.context = context;
    const issues: Issue[] = [];

    // Get project files (uses base class helper)
    const files = await this.getProjectFiles(context.projectPath);

    // Analyze files
    for (const file of files) {
      if (this.isCancelled()) break;

      const content = await this.readFile(file);
      // ... your analysis logic here
    }

    return issues;
  }

  // 4. Implement validation
  validateConfig(config: MyCustomAnalyzerConfig): ValidationResult {
    if (config.threshold !== undefined && config.threshold < 0) {
      return { valid: false, errors: ['threshold must be >= 0'] };
    }
    return { valid: true };
  }

  // 5. Define configuration schema (for UI generation)
  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        customOption: { type: 'string', description: 'A custom option' },
        threshold: { type: 'number', default: 10, description: 'Detection threshold' },
      },
    };
  }

  // 6. Define default configuration
  getDefaultConfig(): MyCustomAnalyzerConfig {
    return { threshold: 10 };
  }

  // 7. Define output types
  getOutputTypes(): string[] {
    return ['Issue[]'];
  }
}
```

### Step 2: Register the Analyzer

Add your analyzer to `src/lib/blueprint/components/analyzers/index.ts`:

```typescript
// Add export
export * from './MyCustomAnalyzer';

// Add import
import { MyCustomAnalyzer } from './MyCustomAnalyzer';

// Add to registry
export const ANALYZER_REGISTRY = {
  // ... existing analyzers
  'analyzer.my-custom': MyCustomAnalyzer,
} as const;
```

### LLM-Based Analyzers

For analyzers that use LLM (like the Implementation Plan Analyzer), extend `BaseComponent` instead:

```typescript
import { BaseComponent } from '../base/BaseComponent';

export class MyLLMAnalyzer extends BaseComponent<void, MyOutput, MyConfig> {
  readonly id = 'analyzer.my-llm';
  readonly name = 'My LLM Analyzer';
  readonly description = 'Uses LLM to analyze code';
  readonly type = 'analyzer' as const;

  async execute(input: void, context: ExecutionContext): Promise<MyOutput> {
    // Call LLM via API
    const response = await fetch('/api/llm/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: this.buildPrompt(),
        provider: this.config.provider,
        maxTokens: this.config.maxTokens,
      }),
    });
    // ... process response
  }
}
```

## Creating a New Processor

Processors transform data between pipeline stages.

### Step 1: Create the Processor File

```typescript
// MyCustomProcessor.ts
import { BaseProcessor, ProcessorConfig } from '../base/BaseProcessor';
import { ExecutionContext, Issue, ValidationResult } from '../../types';

interface MyCustomProcessorConfig extends ProcessorConfig {
  minSeverity?: 'low' | 'medium' | 'high' | 'critical';
}

export class MyCustomProcessor extends BaseProcessor<Issue[], Issue[], MyCustomProcessorConfig> {
  readonly id = 'processor.my-custom';
  readonly name = 'My Custom Processor';
  readonly description = 'Filters and transforms issues';

  async execute(input: Issue[], context: ExecutionContext): Promise<Issue[]> {
    this.context = context;

    // Filter, transform, or aggregate
    return input.filter(issue => {
      const severityOrder = ['low', 'medium', 'high', 'critical'];
      const minIndex = severityOrder.indexOf(this.config.minSeverity || 'low');
      const issueIndex = severityOrder.indexOf(issue.severity);
      return issueIndex >= minIndex;
    });
  }

  validateConfig(config: MyCustomProcessorConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        minSeverity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
        },
      },
    };
  }

  getDefaultConfig(): MyCustomProcessorConfig {
    return { minSeverity: 'medium' };
  }

  getInputTypes(): string[] {
    return ['Issue[]'];
  }

  getOutputTypes(): string[] {
    return ['Issue[]'];
  }
}
```

### Step 2: Register the Processor

Add to `src/lib/blueprint/components/processors/index.ts`:

```typescript
export * from './MyCustomProcessor';
import { MyCustomProcessor } from './MyCustomProcessor';

export const PROCESSOR_REGISTRY = {
  // ... existing processors
  'processor.my-custom': MyCustomProcessor,
} as const;
```

## Creating a New Executor

Executors perform actions like creating files or running commands.

### Step 1: Create the Executor File

```typescript
// MyCustomExecutor.ts
import { BaseExecutor, ExecutorConfig } from '../base/BaseExecutor';
import { ExecutionContext, ValidationResult } from '../../types';

interface MyCustomExecutorConfig extends ExecutorConfig {
  outputDir?: string;
}

interface MyOutput {
  files: string[];
  count: number;
}

export class MyCustomExecutor extends BaseExecutor<SomeInput[], MyOutput, MyCustomExecutorConfig> {
  readonly id = 'executor.my-custom';
  readonly name = 'My Custom Executor';
  readonly description = 'Executes custom actions';

  async execute(input: SomeInput[], context: ExecutionContext): Promise<MyOutput> {
    this.context = context;

    if (this.config.dryRun) {
      this.log('info', 'Dry run - not executing');
      return { files: [], count: 0 };
    }

    // ... your execution logic

    return { files: [], count: 0 };
  }

  validateConfig(config: MyCustomExecutorConfig): ValidationResult {
    return { valid: true };
  }

  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        outputDir: { type: 'string' },
        dryRun: { type: 'boolean', default: false },
      },
    };
  }

  getDefaultConfig(): MyCustomExecutorConfig {
    return { dryRun: false };
  }

  getInputTypes(): string[] {
    return ['SomeInput[]'];
  }

  getOutputTypes(): string[] {
    return ['MyOutput'];
  }
}
```

### Step 2: Register the Executor

Add to `src/lib/blueprint/components/executors/index.ts`:

```typescript
export * from './MyCustomExecutor';
import { MyCustomExecutor } from './MyCustomExecutor';

export const EXECUTOR_REGISTRY = {
  // ... existing executors
  'executor.my-custom': MyCustomExecutor,
} as const;
```

## Component Configuration UI

Components define their configuration schema for automatic UI generation:

```typescript
getConfigSchema(): Record<string, unknown> {
  return {
    type: 'object',
    required: ['requiredField'],
    properties: {
      requiredField: {
        type: 'string',
        description: 'This field is required',
      },
      optionalNumber: {
        type: 'number',
        default: 10,
        minimum: 1,
        maximum: 100,
        description: 'A number between 1 and 100',
      },
      enumField: {
        type: 'string',
        enum: ['option1', 'option2', 'option3'],
        default: 'option1',
        description: 'Select one option',
      },
      booleanField: {
        type: 'boolean',
        default: false,
        description: 'Enable or disable feature',
      },
      arrayField: {
        type: 'array',
        items: { type: 'string' },
        default: [],
        description: 'List of values',
      },
    },
  };
}
```

## Context Selection

For components that need context selection (like the Implementation Plan Analyzer):

```typescript
interface ContextSelection {
  primary: {
    projectId: string;
    projectPath: string;
    contextId?: string;
    contextName?: string;
    contextDescription?: string;
  };
  secondary?: {
    projectId: string;
    projectPath: string;
    contextId?: string;
    contextName?: string;
    contextDescription?: string;
  };
}

// Helper function to create context selection
export function createContextSelection(
  primaryProject: { projectId: string; projectPath: string; contextId?: string },
  secondaryProject?: { projectId: string; projectPath: string; contextId?: string }
): ContextSelection {
  return {
    primary: primaryProject,
    secondary: secondaryProject,
  };
}
```

## Special Processors

### Filepath Selector Processor

The `FilepathSelectorProcessor` limits analyzer scope to specific directories:

```typescript
import { FilepathSelectorProcessor, createConfigFromFolderSelection } from '@/lib/blueprint';

// Create from folder selection UI
const config = createConfigFromFolderSelection(
  ['src/components', 'src/lib'],
  { fileTypes: ['ts', 'tsx'], excludeFolders: ['__tests__'] }
);

const processor = new FilepathSelectorProcessor();
await processor.initialize(config);

// Get preview before running analyzers
const summary = await processor.getScanSummary(context);
console.log(`Will scan ${summary.totalFiles} files`);

// Use in pipeline to filter issues by path
const filteredIssues = await processor.execute(allIssues, context);
```

### Decision Gate Processor

The `DecisionGateProcessor` pauses execution for user approval:

```typescript
import { DecisionGateProcessor, createPreExecutionGate } from '@/lib/blueprint';

// Create a pre-execution decision gate
const gate = new DecisionGateProcessor();
await gate.initialize(createPreExecutionGate({
  title: 'Review Before Execution',
  description: 'Review the 23 issues that will be fixed',
}));

// This pauses until user accepts
// If rejected, throws DecisionRejectedError
const result = await gate.execute(issues, context);
```

**Decision Flow:**
1. Analyzer runs → finds issues
2. DecisionGate pauses → shows summary to user
3. User accepts → pipeline continues to executor
4. User rejects → pipeline aborts with `DecisionRejectedError`

**Integration with UI:**
- Toast notification when decision is pending
- GlobalTaskBar shows compact decision UI with Accept/Reject buttons
- `BlueprintProgressExpanded` component for full decision panel

```typescript
// Listen for decisions in components
import { useIsDecisionPending, usePendingDecision } from '@/stores/blueprintExecutionStore';

function MyComponent() {
  const isPending = useIsDecisionPending();
  const decision = usePendingDecision();

  if (isPending && decision) {
    return <DecisionUI decision={decision} />;
  }
}
```

## Using the Pipeline Executor

Components can be chained together using the Pipeline Executor:

```typescript
import { PipelineExecutor } from '@/lib/blueprint';

const pipeline = new PipelineExecutor({
  projectPath: '/path/to/project',
  projectType: 'nextjs',
});

// Add components to the pipeline
await pipeline.addComponent('analyzer.console');
await pipeline.addComponent('processor.filter', { minSeverity: 'medium' });
await pipeline.addComponent('executor.requirement', { batchSize: 10 });

// Execute the pipeline
const result = await pipeline.execute();
```

## Best Practices

1. **Always validate config** - Use `validateConfig` to check configuration before execution
2. **Support cancellation** - Check `this.isCancelled()` in long-running loops
3. **Report progress** - Use `this.reportProgress(percentage, message)` for long operations
4. **Log appropriately** - Use `this.log(level, message)` for debugging
5. **Handle errors gracefully** - Catch and wrap errors with meaningful messages
6. **Use dry run** - Support `dryRun` option for testing without side effects
7. **Type safety** - Define clear input/output types for pipeline compatibility

## Testing Components

```typescript
import { MyCustomAnalyzer } from './MyCustomAnalyzer';

describe('MyCustomAnalyzer', () => {
  it('should analyze files correctly', async () => {
    const analyzer = new MyCustomAnalyzer();
    await analyzer.initialize({ threshold: 5 });

    const context = {
      projectPath: '/test/project',
      projectType: 'nextjs',
    };

    const result = await analyzer.execute(undefined, context);

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
  });
});
```

## Project Type Filtering

Analyzers support project type metadata for filtering based on the target project:

```typescript
import {
  getAnalyzersForProjectType,
  getAnalyzersByCategory,
  getFilteredAnalyzers,
  getAnalyzersByTag
} from '@/lib/blueprint';

// Get analyzers for a specific project type
const nextjsAnalyzers = getAnalyzersForProjectType('nextjs');
const fastapiAnalyzers = getAnalyzersForProjectType('fastapi');

// Get analyzers by category
const technicalAnalyzers = getAnalyzersByCategory('technical');
const businessAnalyzers = getAnalyzersByCategory('business');

// Combined filtering
const nextjsTechnical = getFilteredAnalyzers('nextjs', 'technical');

// Get analyzers by tag
const codeQualityAnalyzers = getAnalyzersByTag('code-quality');
const reactAnalyzers = getAnalyzersByTag('react');
```

### Project Types
- `nextjs` - Next.js applications (TypeScript/JavaScript)
- `fastapi` - FastAPI applications (Python)
- `express` - Express.js applications (TypeScript/JavaScript)
- `react-native` - React Native applications
- `other` - Other project types

### Analyzer Categories
- `technical` - File-scanning analyzers (code quality, patterns)
- `business` - LLM-based analyzers (implementation plans, ideas)

### Adding Project Type Support

When creating a new analyzer, add the `projectMetadata` property:

```typescript
readonly projectMetadata: AnalyzerProjectMetadata = {
  supportedProjectTypes: ['nextjs', 'express', 'react-native'], // or 'all'
  category: 'technical', // or 'business'
  filePatterns: ['**/*.ts', '**/*.tsx'], // optional: override default patterns
  excludePatterns: ['**/test_*.py'], // optional: additional excludes
  tags: ['code-quality', 'debugging'], // for filtering
};
```

## Existing Components Reference

### JavaScript/TypeScript Analyzers
- `analyzer.console` - Detects console statements (nextjs, express, react-native)
- `analyzer.any-types` - Detects `any` type usage (nextjs, express, react-native)
- `analyzer.unused-imports` - Detects unused imports (nextjs, express, react-native)
- `analyzer.large-files` - Detects oversized files (all types)
- `analyzer.long-functions` - Detects long functions (nextjs, express, react-native)
- `analyzer.complexity` - Detects high cyclomatic complexity (nextjs, express, react-native)
- `analyzer.duplication` - Detects code duplication (nextjs, express, react-native)
- `analyzer.magic-numbers` - Detects magic numbers (nextjs, express, react-native)
- `analyzer.react-hooks` - Detects React hooks issues (nextjs, react-native)

### FastAPI/Python Analyzers
- `analyzer.print-statements` - Detects print() statements (fastapi)
- `analyzer.python-type-annotations` - Detects missing type annotations (fastapi)
- `analyzer.python-unused-imports` - Detects unused Python imports (fastapi)
- `analyzer.pydantic-models` - Detects dict params needing Pydantic (fastapi)
- `analyzer.async-endpoints` - Suggests async endpoints (fastapi)
- `analyzer.dependency-injection` - Suggests Depends() usage (fastapi)
- `analyzer.fastapi-error-handling` - Detects missing error handling (fastapi)
- `analyzer.cors-configuration` - Detects CORS issues (fastapi)

### Business Analyzers (LLM-based)
- `analyzer.implementation-plan` - LLM-based implementation plan generation (all)
- `analyzer.idea-generator` - LLM-based idea generation (all)

### Processors
- `processor.filter` - Filters issues by severity/category
- `processor.group` - Groups issues by file/category
- `processor.priority` - Sorts issues by priority
- `processor.batch` - Batches issues for processing
- `processor.merge` - Merges multiple issue streams
- `processor.filepath-selector` - **NEW** Filters analyzer scope to specific directories
- `processor.decision-gate` - **NEW** Pauses execution for user approval

### Executors
- `executor.requirement` - Generates Claude Code requirement files
- `executor.claude-code` - Executes requirements through Claude Code with batch support

### Scans
For scan components, see the `/components/scans` directory:
- `VisionScan` - Playwright-based visual testing
- `PhotoScan` - Screenshot comparison
- `TestScan` - Test scenario generation
- `BuildScan` - Build error detection
- `UnusedScan` - Unused code detection
- And more...
