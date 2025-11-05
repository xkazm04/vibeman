# Modular Scan Adapter Framework

## Overview

The **Modular Scan Adapter Framework** is a lightweight plugin architecture that enables multi-framework support in Vibeman's onboarding and scanning system. It decouples framework-specific logic from core business logic, making it easy to add support for new technology stacks.

## Key Benefits

- **Multi-Tech Support**: Easily add support for FastAPI, Express, React Native, C++, or any framework
- **Plugin Architecture**: Contributors can write adapters without modifying core logic
- **Separation of Concerns**: Framework logic stays in adapters, core logic stays clean
- **Community-Friendly**: Open for public contributions and ecosystem growth
- **Type-Safe**: Full TypeScript support with well-defined interfaces
- **Testable**: Each adapter can be tested independently

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Core System                        │
│  (Blueprint Layout, Decision Queue, Stores)         │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│              ScanRegistry (Singleton)               │
│  • Adapter Discovery                                │
│  • Priority-Based Selection                         │
│  • Usage Tracking                                   │
└───────────────────┬─────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌────────┐
   │NextJS  │  │FastAPI │  │Express │
   │Adapter │  │Adapter │  │Adapter │
   └────────┘  └────────┘  └────────┘
```

## Core Components

### 1. **ScanAdapter Interface**

The core interface that all adapters must implement:

```typescript
export interface ScanAdapter<TData = any> {
  // Identification
  readonly id: string;              // Unique ID (e.g., 'nextjs-build')
  readonly name: string;            // Human-readable name
  readonly description: string;     // What this adapter does

  // Matching
  readonly supportedTypes: string[]; // ['nextjs'] or ['*'] for all
  readonly category: ScanCategory;   // build, structure, contexts, etc.
  readonly priority?: number;        // Higher = preferred (default: 50)

  // Core Methods
  canHandle(project: Project): boolean;
  execute(context: ScanContext): Promise<ScanResult<TData>>;
  buildDecision(result: ScanResult<TData>, project: Project): DecisionData | null;

  // Optional
  validate?(): Promise<{ valid: boolean; errors?: string[] }>;
}
```

### 2. **ScanRegistry**

Central registry that manages all adapters:

```typescript
const registry = getScanRegistry();

// Register adapters
registry.register(new NextJSBuildAdapter());
registry.register(new FastAPIBuildAdapter());

// Find best adapter for a project
const adapter = registry.getBestAdapter(project, 'build');

// Execute scan
const result = await registry.executeScan(project, 'build', options);
```

### 3. **BaseAdapter**

Abstract base class that provides common functionality:

```typescript
export abstract class BaseAdapter<TData = any> implements ScanAdapter<TData> {
  // Abstract properties (must implement)
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly supportedTypes: string[];
  public abstract readonly category: ScanCategory;

  // Abstract methods (must implement)
  public abstract execute(context: ScanContext): Promise<ScanResult<TData>>;
  public abstract buildDecision(result: ScanResult<TData>, project: Project): DecisionData | null;

  // Helper methods (provided)
  protected async fetchApi<T>(url: string, options?: RequestInit): Promise<...>
  protected log(message: string, ...args: any[]): void
  protected error(message: string, error?: any): void
  protected createDecision(...): DecisionData
  protected createResult<T>(...): ScanResult<T>
  protected async withTimeout<T>(...): Promise<T>
}
```

## Scan Categories

Adapters can belong to these categories:

- `build` - Build errors, test failures, compilation issues
- `structure` - Project structure, folder organization, naming conventions
- `contexts` - AI-generated documentation for code contexts
- `dependencies` - Dependency analysis, security vulnerabilities, updates
- `vision` - Vision/goal analysis, project direction
- `photo` - Screenshot/visual analysis
- `ideas` - Idea generation and scanning
- `prototype` - Prototyping and experimentation
- `contribute` - Contribution readiness, open-source prep
- `fix` - Automated fixes and refactoring
- `custom` - Custom scan types

## Creating a New Adapter

### Step 1: Create Adapter Class

Create a new file: `src/app/features/Onboarding/sub_Blueprint/lib/adapters/express/ExpressBuildAdapter.ts`

```typescript
import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface ExpressBuildData {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errors: Array<{ file: string; message: string }>;
}

export class ExpressBuildAdapter extends BaseAdapter<ExpressBuildData> {
  // 1. Define adapter metadata
  public readonly id = 'express-build';
  public readonly name = 'Express Build Scanner';
  public readonly description = 'Runs tests and checks for build errors in Express projects';
  public readonly supportedTypes = ['express'];
  public readonly category = 'build';
  public readonly priority = 100;

  // 2. Implement execute() - run the scan
  public async execute(context: ScanContext): Promise<ScanResult<ExpressBuildData>> {
    const { project, options } = context;

    this.log('Running Express build scan...', project.path);

    try {
      // Make API call or run scan logic
      const response = await this.fetchApi('/api/express-scan/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.path,
          scanOnly: options?.scanOnly ?? true,
        }),
      });

      if (!response.success) {
        return this.createResult(false, undefined, response.error);
      }

      const data: ExpressBuildData = {
        totalTests: response.data.totalTests || 0,
        passedTests: response.data.passedTests || 0,
        failedTests: response.data.failedTests || 0,
        errors: response.data.errors || [],
      };

      return this.createResult(true, data);
    } catch (error) {
      this.error('Express build scan failed:', error);
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // 3. Implement buildDecision() - create user decision
  public buildDecision(
    result: ScanResult<ExpressBuildData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data) {
      return null;
    }

    const { failedTests, errors } = result.data;

    // No issues = no decision needed
    if (failedTests === 0 && errors.length === 0) {
      return null;
    }

    const description = `Found ${failedTests} failing tests and ${errors.length} errors in Express project.`;

    return this.createDecision(
      {
        type: 'express-build-scan',
        title: 'Express Build Issues',
        description,
        count: failedTests + errors.length,
        severity: failedTests > 5 ? 'error' : 'warning',
        data: result.data,

        // User accepts - take action
        onAccept: async () => {
          this.log('Creating requirement files...');
          // Implementation
        },

        // User rejects - log it
        onReject: async () => {
          this.log('User rejected build scan');
        },
      },
      project
    );
  }
}
```

### Step 2: Create Index File

Create `src/app/features/Onboarding/sub_Blueprint/lib/adapters/express/index.ts`:

```typescript
export { ExpressBuildAdapter } from './ExpressBuildAdapter';
export { ExpressStructureAdapter } from './ExpressStructureAdapter';

import { ExpressBuildAdapter } from './ExpressBuildAdapter';
import { ExpressStructureAdapter } from './ExpressStructureAdapter';
import { ScanAdapter } from '../types';

export function getAllExpressAdapters(): ScanAdapter[] {
  return [
    new ExpressBuildAdapter(),
    new ExpressStructureAdapter(),
  ];
}
```

### Step 3: Register Adapters

Update `src/app/features/Onboarding/sub_Blueprint/lib/adapters/initialize.ts`:

```typescript
import { getAllExpressAdapters } from './express';

export function initializeAdapters(debug = false): ScanRegistry {
  // ... existing code ...

  // Register Express adapters
  const expressAdapters = getAllExpressAdapters();
  registry.registerMany(expressAdapters);

  // ... rest of code ...
}
```

### Step 4: Export from Main Index

Update `src/app/features/Onboarding/sub_Blueprint/lib/adapters/index.ts`:

```typescript
// Express adapters
export {
  ExpressBuildAdapter,
  ExpressStructureAdapter,
  getAllExpressAdapters,
} from './express';
```

## Usage Examples

### Execute a Scan

```typescript
import { getInitializedRegistry } from '@/app/features/Onboarding/sub_Blueprint/lib/adapters';

const registry = getInitializedRegistry();
const project = useActiveProjectStore.getState().activeProject;

// Execute build scan
const result = await registry.executeScan(project, 'build', {
  scanOnly: true,
  timeout: 30000,
});

if (result.success) {
  console.log('Scan completed:', result.data);

  // Build decision
  const adapter = registry.getBestAdapter(project, 'build');
  const decision = adapter?.buildDecision(result, project);

  if (decision) {
    // Add to decision queue
    decisionQueueStore.getState().addDecision(decision);
  }
}
```

### Find Available Adapters

```typescript
// Get all adapters for a project
const adapters = registry.findAdapters(project);

// Get adapters by category
const buildAdapters = registry.getAdaptersByCategory('build');

// Get best adapter
const bestAdapter = registry.getBestAdapter(project, 'build');
```

### Registry Statistics

```typescript
const stats = registry.getStats();
console.log('Registry statistics:', {
  totalAdapters: stats.totalAdapters,
  byCategory: stats.adaptersByCategory,
  byType: stats.adaptersByType,
  mostUsed: stats.mostUsed,
});
```

## Advanced Features

### Custom Project Type Detection

Override `canHandle()` for custom logic:

```typescript
export class CustomAdapter extends BaseAdapter {
  public canHandle(project: Project): boolean {
    // Check for specific files
    const hasPackageJson = fs.existsSync(path.join(project.path, 'package.json'));
    const hasExpressInDeps = // ... check dependencies

    return hasPackageJson && hasExpressInDeps;
  }
}
```

### Cancellable Scans

Use the `signal` from context:

```typescript
public async execute(context: ScanContext): Promise<ScanResult> {
  const { signal } = context;

  return await this.withTimeout(
    this.performScan(signal),
    60000,
    'Scan timed out'
  );
}

private async performScan(signal?: AbortSignal): Promise<ScanResult> {
  if (signal?.aborted) {
    throw new Error('Scan cancelled');
  }
  // ... scan logic
}
```

### Wildcard Support

Support all project types:

```typescript
export class UniversalAdapter extends BaseAdapter {
  public readonly supportedTypes = ['*']; // Matches all types
  public readonly priority = 10; // Low priority - fallback only
}
```

### Validation

Implement optional validation:

```typescript
public async validate(): Promise<{ valid: boolean; errors?: string[] }> {
  const errors: string[] = [];

  // Check if required tools are installed
  if (!await this.checkToolInstalled('pytest')) {
    errors.push('pytest is not installed');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
```

## Testing Adapters

### Unit Test Example

```typescript
import { ExpressBuildAdapter } from './ExpressBuildAdapter';

describe('ExpressBuildAdapter', () => {
  let adapter: ExpressBuildAdapter;

  beforeEach(() => {
    adapter = new ExpressBuildAdapter();
  });

  it('should handle express projects', () => {
    const project = { id: '1', type: 'express', path: '/test' };
    expect(adapter.canHandle(project)).toBe(true);
  });

  it('should not handle non-express projects', () => {
    const project = { id: '1', type: 'nextjs', path: '/test' };
    expect(adapter.canHandle(project)).toBe(false);
  });

  it('should execute scan and return results', async () => {
    const context = {
      project: { id: '1', type: 'express', path: '/test' },
      options: { scanOnly: true },
    };

    const result = await adapter.execute(context);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## Best Practices

### 1. **Clear Naming Convention**

Use format: `{Framework}{ScanType}Adapter`
- ✅ `NextJSBuildAdapter`
- ✅ `FastAPIStructureAdapter`
- ❌ `BuildScannerForNextJS`

### 2. **Priority Guidelines**

- `100` - Framework-specific adapters (highest priority)
- `50` - Generic adapters (default)
- `10` - Fallback adapters (lowest priority)

### 3. **Error Handling**

Always wrap in try-catch and return proper error results:

```typescript
try {
  // scan logic
  return this.createResult(true, data);
} catch (error) {
  this.error('Scan failed:', error);
  return this.createResult(false, undefined, error.message);
}
```

### 4. **Logging**

Use provided helper methods:

```typescript
this.log('Starting scan...', project.path);
this.error('Scan failed:', error);
```

### 5. **Type Safety**

Define data interfaces:

```typescript
interface MyAdapterData {
  field1: string;
  field2: number;
}

export class MyAdapter extends BaseAdapter<MyAdapterData> {
  // TypeScript will enforce the type throughout
}
```

### 6. **Idempotency**

Scans should be repeatable without side effects:
- ✅ Read-only operations
- ✅ Scan and report
- ❌ Modify files during scan
- ❌ Create requirements automatically

### 7. **Decision Data**

Only return decision if action is needed:

```typescript
if (noIssuesFound) {
  return null; // No decision needed
}

return this.createDecision({ ... }); // Issues found
```

## Framework Examples

### React Native Adapter

```typescript
export class ReactNativeBuildAdapter extends BaseAdapter {
  public readonly id = 'react-native-build';
  public readonly supportedTypes = ['react-native'];
  public readonly category = 'build';

  public async execute(context: ScanContext) {
    // Run react-native build
    // Check for iOS/Android errors
  }
}
```

### C++ Adapter

```typescript
export class CPPBuildAdapter extends BaseAdapter {
  public readonly id = 'cpp-build';
  public readonly supportedTypes = ['cpp', 'c++'];
  public readonly category = 'build';

  public async execute(context: ScanContext) {
    // Run CMake build
    // Check for compiler errors
  }
}
```

### Django Adapter

```typescript
export class DjangoBuildAdapter extends BaseAdapter {
  public readonly id = 'django-build';
  public readonly supportedTypes = ['django'];
  public readonly category = 'build';

  public async execute(context: ScanContext) {
    // Run Django tests
    // Check migrations
  }
}
```

## Contributing

To contribute a new adapter:

1. Fork the repository
2. Create your adapter following this guide
3. Add tests for your adapter
4. Update this documentation with your framework example
5. Submit a pull request

## File Structure

```
src/app/features/Onboarding/sub_Blueprint/lib/adapters/
├── index.ts                    # Main exports
├── types.ts                    # Type definitions
├── BaseAdapter.ts              # Base class
├── ScanRegistry.ts             # Registry implementation
├── initialize.ts               # Initialization logic
├── nextjs/                     # NextJS adapters
│   ├── index.ts
│   ├── NextJSBuildAdapter.ts
│   ├── NextJSStructureAdapter.ts
│   └── NextJSContextsAdapter.ts
├── fastapi/                    # FastAPI adapters
│   ├── index.ts
│   ├── FastAPIBuildAdapter.ts
│   └── FastAPIStructureAdapter.ts
├── express/                    # Express adapters (future)
│   ├── index.ts
│   ├── ExpressBuildAdapter.ts
│   └── ExpressStructureAdapter.ts
└── react-native/              # React Native adapters (future)
    └── ...
```

## API Reference

### Types

See `types.ts` for complete type definitions:
- `ScanAdapter` - Core adapter interface
- `ScanResult` - Scan execution result
- `DecisionData` - User decision structure
- `ScanContext` - Execution context
- `ScanCategory` - Available categories
- `AdapterMetadata` - Registry metadata

### Registry Methods

- `register(adapter)` - Register single adapter
- `registerMany(adapters)` - Register multiple adapters
- `unregister(id)` - Remove adapter
- `getAdapter(id)` - Get adapter by ID
- `findAdapters(project, category?)` - Find matching adapters
- `getBestAdapter(project, category)` - Get highest priority adapter
- `executeScan(project, category, options?)` - Execute scan
- `executeAdapter(adapter, project, options?)` - Execute specific adapter
- `buildDecision(adapterId, result, project)` - Build decision from result
- `getStats()` - Get registry statistics
- `clear()` - Clear all adapters

## FAQ

**Q: Can I register multiple adapters for the same category?**
A: Yes! The registry will use priority to select the best one.

**Q: What happens if no adapter matches?**
A: The scan returns an error result with "No adapter found" message.

**Q: Can adapters share code?**
A: Yes! Create shared utilities in a `shared/` directory.

**Q: How do I test my adapter locally?**
A: Use the registry's debug mode: `initializeAdapters(true)`

**Q: Can adapters call other adapters?**
A: Yes, but be careful of circular dependencies. Use the registry to execute other scans.

**Q: How do I handle long-running scans?**
A: Use the `withTimeout()` helper or check `context.signal` for cancellation.

## Roadmap

- [ ] Express adapters
- [ ] React Native adapters
- [ ] Django adapters
- [ ] C++ adapters
- [ ] Rust adapters
- [ ] Go adapters
- [ ] Flutter adapters
- [ ] Vue.js adapters
- [ ] Angular adapters
- [ ] Plugin marketplace
- [ ] Adapter hot-reloading
- [ ] Adapter versioning

---

**Version**: 1.0.0
**Last Updated**: 2025-01-05
**Maintainer**: Vibeman Team
