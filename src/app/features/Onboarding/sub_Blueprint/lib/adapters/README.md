# Modular Scan Adapter Framework

## Overview

The **Modular Scan Adapter Framework** is a lightweight plugin architecture that enables multi-technology support in the Blueprint onboarding system. It provides a standardized interface for implementing project-specific scan modules across different frameworks and tech stacks.

## Core Concepts

### What is an Adapter?

An adapter is a self-contained module that performs a specific type of scan (build, structure, contexts, etc.) for a particular technology stack (NextJS, FastAPI, Express, React Native, etc.).

### Key Benefits

- **Decoupled Architecture**: Core logic separated from framework-specific implementations
- **Multi-Tech Support**: Easy to add new frameworks without modifying existing code
- **Plugin System**: Contributors can create adapters for any tech stack
- **Type Safety**: Full TypeScript support with strong typing
- **Testable**: Each adapter is independently testable
- **Priority System**: Multiple adapters can coexist with automatic selection

## Architecture

### Core Components

```
adapters/
├── types.ts                    # Core type definitions
├── BaseAdapter.ts              # Abstract base class
├── ScanRegistry.ts             # Central adapter registry
├── initialize.ts               # Adapter initialization
├── index.ts                    # Main exports
├── TEMPLATE_ADAPTER.ts         # Template for new adapters
├── nextjs/                     # NextJS adapters
│   ├── NextJSBuildAdapter.ts
│   ├── NextJSStructureAdapter.ts
│   ├── NextJSContextsAdapter.ts
│   └── index.ts
└── fastapi/                    # FastAPI adapters
    ├── FastAPIBuildAdapter.ts
    ├── FastAPIStructureAdapter.ts
    └── index.ts
```

### Type Hierarchy

```typescript
// Core interfaces
ScanAdapter<TData>              // Main adapter interface
  ↓
BaseAdapter<TData>              // Abstract base with helpers
  ↓
NextJSBuildAdapter              // Concrete implementation
FastAPIBuildAdapter
...
```

## Quick Start

### Using Existing Adapters

```typescript
import { getInitializedRegistry } from './adapters';

// Execute a scan
const registry = getInitializedRegistry();
const project = { id: '1', type: 'nextjs', path: '/path/to/project' };

const result = await registry.executeScan(project, 'build', {
  scanOnly: true
});

// Build decision from result
if (result.success) {
  const adapter = registry.getBestAdapter(project, 'build');
  const decision = adapter?.buildDecision(result, project);

  if (decision) {
    // Add to decision queue
    decisionQueueStore.getState().addDecision(decision);
  }
}
```

### Creating a New Adapter

1. **Copy the template**:
   ```bash
   cp TEMPLATE_ADAPTER.ts yourframework/YourFrameworkBuildAdapter.ts
   ```

2. **Replace placeholders**:
   - `TEMPLATE_ID` → `'yourframework-build'`
   - `TEMPLATE_NAME` → `'Your Framework Build Scanner'`
   - `TEMPLATE_TYPE` → `'yourframework'`
   - `TEMPLATE_CATEGORY` → `'build'`

3. **Implement methods**:
   ```typescript
   export class YourFrameworkBuildAdapter extends BaseAdapter<YourData> {
     public readonly id = 'yourframework-build';
     public readonly name = 'Your Framework Build Scanner';
     public readonly description = 'Scans for build errors';
     public readonly supportedTypes = ['yourframework'];
     public readonly category = 'build';
     public readonly priority = 100;

     public async execute(context: ScanContext): Promise<ScanResult<YourData>> {
       // Implement scan logic
     }

     public buildDecision(result: ScanResult<YourData>, project: Project): DecisionData | null {
       // Implement decision logic
     }
   }
   ```

4. **Register the adapter**:
   ```typescript
   // In initialize.ts
   import { getAllYourFrameworkAdapters } from './yourframework';

   export function initializeAdapters(debug = false): ScanRegistry {
     const registry = getScanRegistry({ debug });

     // ... existing registrations ...

     const yourAdapters = getAllYourFrameworkAdapters();
     registry.registerMany(yourAdapters);

     // ...
   }
   ```

## API Reference

### ScanAdapter Interface

```typescript
interface ScanAdapter<TData = any> {
  readonly id: string;                    // Unique identifier
  readonly name: string;                  // Display name
  readonly description: string;           // What it does
  readonly supportedTypes: string[];      // ['nextjs'], ['*'], etc.
  readonly category: ScanCategory;        // build, structure, etc.
  readonly priority?: number;             // Higher = preferred

  canHandle(project: Project): boolean;
  execute(context: ScanContext): Promise<ScanResult<TData>>;
  buildDecision(result: ScanResult<TData>, project: Project): DecisionData | null;
  validate?(): Promise<{ valid: boolean; errors?: string[] }>;
}
```

### BaseAdapter Methods

The `BaseAdapter` class provides helpful utilities:

| Method | Description |
|--------|-------------|
| `fetchApi<T>(url, options)` | Make API requests with error handling |
| `log(message, ...args)` | Log debug messages |
| `error(message, error)` | Log errors |
| `createDecision(params, project)` | Create decision data |
| `createResult(success, data, error, warnings)` | Create scan result |
| `withTimeout(promise, ms, message)` | Wrap promise with timeout |

### ScanRegistry Methods

| Method | Description |
|--------|-------------|
| `register(adapter)` | Register single adapter |
| `registerMany(adapters)` | Register multiple adapters |
| `unregister(adapterId)` | Remove an adapter |
| `getAdapter(adapterId)` | Get adapter by ID |
| `findAdapters(project, category?)` | Find matching adapters |
| `getBestAdapter(project, category)` | Get highest-priority adapter |
| `executeScan(project, category, options?)` | Execute scan with best adapter |
| `executeAdapter(adapter, project, options?)` | Execute specific adapter |
| `getAllAdapters()` | Get all registered adapters |
| `getStats()` | Get registry statistics |

## Scan Categories

Available scan categories:

- `'build'` - Build errors and warnings
- `'structure'` - Project structure analysis
- `'contexts'` - Code context generation
- `'dependencies'` - Dependency analysis
- `'vision'` - Vision/goals analysis
- `'photo'` - Photo/asset analysis
- `'ideas'` - Idea generation
- `'prototype'` - Prototype creation
- `'contribute'` - Contribution suggestions
- `'fix'` - Bug fixes
- `'custom'` - Custom scans

## Examples

### NextJS Build Adapter

```typescript
export class NextJSBuildAdapter extends BaseAdapter<BuildScanData> {
  public readonly id = 'nextjs-build';
  public readonly supportedTypes = ['nextjs'];
  public readonly category = 'build';
  public readonly priority = 100;

  public async execute(context: ScanContext): Promise<ScanResult<BuildScanData>> {
    const result = await this.fetchApi('/api/build-fixer?scanOnly=true', {
      method: 'POST',
      body: JSON.stringify({ projectPath: context.project.path }),
    });

    if (!result.success) {
      return this.createResult(false, undefined, result.error);
    }

    return this.createResult(true, {
      totalErrors: result.data.totalErrors,
      totalWarnings: result.data.totalWarnings,
      errorGroups: result.data.errorGroups,
      buildCommand: 'npm run build',
    });
  }

  public buildDecision(result: ScanResult<BuildScanData>, project: Project): DecisionData | null {
    if (!result.success || result.data.totalErrors === 0) {
      return null;
    }

    return this.createDecision({
      type: 'build-scan',
      title: 'Build Errors Detected',
      description: `Found ${result.data.totalErrors} errors`,
      severity: 'error',
      onAccept: async () => {
        // Create requirement files
      },
      onReject: async () => {
        // Log rejection
      },
    }, project);
  }
}
```

### Express Structure Adapter (Example)

```typescript
export class ExpressStructureAdapter extends BaseAdapter<StructureData> {
  public readonly id = 'express-structure';
  public readonly supportedTypes = ['express', 'node'];
  public readonly category = 'structure';
  public readonly priority = 100;

  public async execute(context: ScanContext): Promise<ScanResult<StructureData>> {
    // Scan Express project structure
    const violations = await this.scanExpressStructure(context.project.path);

    return this.createResult(true, {
      violations,
      totalViolations: violations.length,
    });
  }

  public buildDecision(result: ScanResult<StructureData>, project: Project): DecisionData | null {
    if (!result.success || result.data.violations.length === 0) {
      return null;
    }

    return this.createDecision({
      type: 'structure-scan',
      title: 'Structure Violations',
      description: `Found ${result.data.violations.length} structure issues`,
      severity: 'warning',
      onAccept: async () => {
        // Fix structure issues
      },
      onReject: async () => {},
    }, project);
  }

  private async scanExpressStructure(projectPath: string) {
    // Implementation
    return [];
  }
}
```

## Testing

### Unit Testing an Adapter

```typescript
import { YourAdapter } from './YourAdapter';

describe('YourAdapter', () => {
  let adapter: YourAdapter;

  beforeEach(() => {
    adapter = new YourAdapter();
  });

  it('should handle correct project types', () => {
    const project = { id: '1', type: 'yourtype', path: '/test' };
    expect(adapter.canHandle(project)).toBe(true);
  });

  it('should execute scan successfully', async () => {
    const context = {
      project: { id: '1', type: 'yourtype', path: '/test' },
      options: {},
    };

    const result = await adapter.execute(context);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should return null decision when no issues', () => {
    const result = {
      success: true,
      data: { issues: [] },
    };

    const project = { id: '1', type: 'yourtype', path: '/test' };
    const decision = adapter.buildDecision(result, project);

    expect(decision).toBeNull();
  });
});
```

### Integration Testing

```typescript
import { ScanRegistry } from './ScanRegistry';
import { YourAdapter } from './YourAdapter';

describe('ScanRegistry Integration', () => {
  let registry: ScanRegistry;

  beforeEach(() => {
    ScanRegistry.reset();
    registry = ScanRegistry.getInstance();
  });

  it('should register and execute adapter', async () => {
    const adapter = new YourAdapter();
    const result = registry.register(adapter);

    expect(result.success).toBe(true);

    const project = { id: '1', type: 'yourtype', path: '/test' };
    const scanResult = await registry.executeScan(project, 'build');

    expect(scanResult.success).toBe(true);
  });
});
```

## Best Practices

### Adapter Design

1. **Single Responsibility**: Each adapter should handle one scan type for one framework
2. **Error Handling**: Always use try-catch and return proper error messages
3. **Logging**: Use `this.log()` and `this.error()` for consistent logging
4. **Type Safety**: Define specific data interfaces for your scan results
5. **Priority**: Set appropriate priority (100 for framework-specific, 50 for generic, 10 for fallback)

### Performance

1. **Timeouts**: Use `this.withTimeout()` for long-running operations
2. **Cancellation**: Support `AbortSignal` in context for cancellable scans
3. **Caching**: Cache expensive operations when possible
4. **Lazy Loading**: Load heavy dependencies only when needed

### Decision Building

1. **User-Friendly**: Write clear, actionable descriptions
2. **Null Safety**: Return `null` if no decision is needed
3. **Severity**: Use appropriate severity levels (info, warning, error)
4. **Actions**: Implement both `onAccept` and `onReject` handlers

## Contributing

### Adding Support for New Frameworks

1. Create a new directory: `adapters/{framework}/`
2. Implement adapters for each scan type
3. Create index file to export all adapters
4. Register in `initialize.ts`
5. Add tests
6. Update documentation

### Guidelines

- Follow TypeScript best practices
- Add comprehensive JSDoc comments
- Include usage examples in comments
- Write unit tests for all adapters
- Update this README with new examples

## Troubleshooting

### Adapter Not Found

**Problem**: `No adapter found for project type 'X' and category 'Y'`

**Solution**:
1. Check if adapter is registered in `initialize.ts`
2. Verify `supportedTypes` includes the project type
3. Check `canHandle()` logic
4. Enable debug mode: `getInitializedRegistry(true)`

### Scan Fails

**Problem**: Scan returns `success: false`

**Solution**:
1. Check error message in result
2. Verify API endpoints are accessible
3. Check project path is correct
4. Enable debug logging in adapter

### Multiple Adapters Conflict

**Problem**: Wrong adapter is selected

**Solution**:
1. Check priority values (higher = preferred)
2. Verify `canHandle()` logic
3. Use `registry.findAdapters()` to see all matches
4. Adjust priorities or make `canHandle()` more specific

## Roadmap

### Planned Adapters

- [ ] Express.js (build, structure, contexts)
- [ ] React Native (build, structure)
- [ ] C++ (build, structure)
- [ ] Python Django (build, structure)
- [ ] Ruby on Rails (build, structure)
- [ ] Go (build, structure)

### Future Enhancements

- [ ] Async adapter loading
- [ ] Adapter versioning
- [ ] Adapter marketplace/registry
- [ ] Hot-reload adapters
- [ ] Adapter configuration UI
- [ ] Performance metrics dashboard

## Support

For questions or issues:
1. Check this README
2. Review `TEMPLATE_ADAPTER.ts` for examples
3. Examine existing adapters (NextJS, FastAPI)
4. Open an issue on GitHub

## License

Part of the Vibeman project - see main LICENSE file.
