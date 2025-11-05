# Scan Adapter Framework - Usage Guide

## For Users

### Running Scans

Scans are automatically executed when you navigate through the Blueprint onboarding wizard. The system will:

1. Detect your project type (NextJS, FastAPI, etc.)
2. Select the appropriate adapter
3. Run the scan
4. Present decisions if issues are found

### Understanding Decisions

When a scan finds issues, you'll see a decision panel with:

- **Title**: Brief description of what was found
- **Description**: Detailed explanation and actions
- **Count**: Number of items/issues
- **Severity**: Info (blue), Warning (yellow), or Error (red)

### Actions

- **Accept**: Take the suggested action (create requirements, fix issues)
- **Reject**: Skip this decision (nothing will be changed)

### Scan Types

| Scan | Purpose | When It Runs |
|------|---------|--------------|
| **Build** | Find compile/build errors | After structure scan |
| **Structure** | Analyze project organization | During initial setup |
| **Contexts** | Generate code documentation | After structure is valid |
| **Dependencies** | Check package versions | During initial setup |
| **Vision** | Analyze project goals | Optional |
| **Photo** | Scan for assets | Optional |

## For Developers

### Adding a New Framework Adapter

**Scenario**: You want to add support for Express.js projects.

#### Step 1: Create Directory Structure

```bash
cd src/app/features/Onboarding/sub_Blueprint/lib/adapters
mkdir express
cd express
```

#### Step 2: Copy Template

```bash
cp ../TEMPLATE_ADAPTER.ts ExpressBuildAdapter.ts
```

#### Step 3: Implement Build Adapter

```typescript
// express/ExpressBuildAdapter.ts
import { Project } from '@/types';
import { BaseAdapter } from '../BaseAdapter';
import { ScanContext, ScanResult, DecisionData } from '../types';

interface ExpressBuildData {
  totalErrors: number;
  errorDetails: Array<{
    file: string;
    line: number;
    message: string;
  }>;
}

export class ExpressBuildAdapter extends BaseAdapter<ExpressBuildData> {
  public readonly id = 'express-build';
  public readonly name = 'Express Build Scanner';
  public readonly description = 'Scans Express projects for build errors';
  public readonly supportedTypes = ['express', 'node'];
  public readonly category = 'build';
  public readonly priority = 100;

  public async execute(context: ScanContext): Promise<ScanResult<ExpressBuildData>> {
    const { project } = context;

    this.log('Starting Express build scan...');

    try {
      // Run ESLint or TypeScript compiler
      const result = await this.fetchApi('/api/express-build-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: project.path }),
      });

      if (!result.success) {
        return this.createResult(false, undefined, result.error);
      }

      const data: ExpressBuildData = {
        totalErrors: result.data.errors.length,
        errorDetails: result.data.errors,
      };

      this.log(`Found ${data.totalErrors} build errors`);

      return this.createResult(true, data);
    } catch (error) {
      this.error('Build scan failed', error);
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  public buildDecision(
    result: ScanResult<ExpressBuildData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || !result.data || result.data.totalErrors === 0) {
      return null;
    }

    const { totalErrors, errorDetails } = result.data;

    const description = `
Found ${totalErrors} build error${totalErrors > 1 ? 's' : ''} in your Express project:

${errorDetails.slice(0, 5).map(e => `- ${e.file}:${e.line} - ${e.message}`).join('\n')}
${totalErrors > 5 ? `\n... and ${totalErrors - 5} more` : ''}

Would you like to create requirement files to fix these issues?
    `.trim();

    return this.createDecision(
      {
        type: 'express-build-scan',
        title: 'Express Build Errors',
        description,
        count: totalErrors,
        severity: totalErrors > 10 ? 'error' : 'warning',
        data: result.data,

        onAccept: async () => {
          this.log('Creating requirement files...');

          const response = await fetch('/api/express-create-requirements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.id,
              errors: errorDetails,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create requirements');
          }

          const result = await response.json();
          this.log(`Created ${result.count} requirement files`);
        },

        onReject: async () => {
          this.log('User rejected Express build scan');
        },
      },
      project
    );
  }
}
```

#### Step 4: Create Structure Adapter

```typescript
// express/ExpressStructureAdapter.ts
export class ExpressStructureAdapter extends BaseAdapter<StructureData> {
  public readonly id = 'express-structure';
  public readonly name = 'Express Structure Scanner';
  public readonly description = 'Analyzes Express project structure';
  public readonly supportedTypes = ['express', 'node'];
  public readonly category = 'structure';
  public readonly priority = 100;

  public async execute(context: ScanContext): Promise<ScanResult<StructureData>> {
    // Check for common Express patterns
    const violations = await this.checkExpressStructure(context.project.path);

    return this.createResult(true, {
      violations,
      totalViolations: violations.length,
    });
  }

  public buildDecision(
    result: ScanResult<StructureData>,
    project: Project
  ): DecisionData | null {
    if (!result.success || result.data.violations.length === 0) {
      return null;
    }

    // Similar to above...
  }

  private async checkExpressStructure(projectPath: string) {
    // Implementation
    return [];
  }
}
```

#### Step 5: Create Index File

```typescript
// express/index.ts
import { ExpressBuildAdapter } from './ExpressBuildAdapter';
import { ExpressStructureAdapter } from './ExpressStructureAdapter';
import { ScanAdapter } from '../types';

export { ExpressBuildAdapter } from './ExpressBuildAdapter';
export { ExpressStructureAdapter } from './ExpressStructureAdapter';

/**
 * Get all Express adapters for registration
 */
export function getAllExpressAdapters(): ScanAdapter[] {
  return [
    new ExpressBuildAdapter(),
    new ExpressStructureAdapter(),
  ];
}
```

#### Step 6: Register in Initialize

```typescript
// initialize.ts
import { getAllExpressAdapters } from './express';

export function initializeAdapters(debug = false): ScanRegistry {
  const registry = getScanRegistry({ debug });

  // ... existing registrations ...

  // Register Express adapters
  const expressAdapters = getAllExpressAdapters();
  results = [...results, ...registry.registerMany(expressAdapters)];

  // ...
}
```

#### Step 7: Update Main Exports

```typescript
// index.ts
export {
  ExpressBuildAdapter,
  ExpressStructureAdapter,
  getAllExpressAdapters,
} from './express';
```

#### Step 8: Test Your Adapter

```typescript
// express/__tests__/ExpressBuildAdapter.test.ts
import { ExpressBuildAdapter } from '../ExpressBuildAdapter';

describe('ExpressBuildAdapter', () => {
  let adapter: ExpressBuildAdapter;

  beforeEach(() => {
    adapter = new ExpressBuildAdapter();
  });

  it('should handle Express projects', () => {
    const project = { id: '1', type: 'express', path: '/test' };
    expect(adapter.canHandle(project)).toBe(true);
  });

  it('should handle Node projects', () => {
    const project = { id: '1', type: 'node', path: '/test' };
    expect(adapter.canHandle(project)).toBe(true);
  });

  it('should not handle other project types', () => {
    const project = { id: '1', type: 'nextjs', path: '/test' };
    expect(adapter.canHandle(project)).toBe(false);
  });

  it('should execute scan successfully', async () => {
    const context = {
      project: { id: '1', type: 'express', path: '/test' },
      options: {},
    };

    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          errors: [
            { file: 'app.js', line: 10, message: 'Missing semicolon' }
          ],
        }),
      })
    ) as jest.Mock;

    const result = await adapter.execute(context);

    expect(result.success).toBe(true);
    expect(result.data?.totalErrors).toBe(1);
  });
});
```

### Advanced: Custom Project Detection

Sometimes you need more complex logic than just checking `project.type`:

```typescript
export class ExpressAdvancedAdapter extends BaseAdapter<any> {
  // ... other properties ...

  public canHandle(project: Project): boolean {
    // First check type
    if (!super.canHandle(project)) {
      return false;
    }

    // Additional checks
    const hasExpressConfig = this.fileExists(
      path.join(project.path, 'express.config.js')
    );

    const hasAppFile = this.fileExists(
      path.join(project.path, 'app.js')
    );

    return hasExpressConfig || hasAppFile;
  }

  private fileExists(path: string): boolean {
    try {
      return fs.existsSync(path);
    } catch {
      return false;
    }
  }
}
```

### Advanced: Adapter Validation

Validate that required tools are available:

```typescript
export class ExpressBuildAdapter extends BaseAdapter<any> {
  // ... other properties ...

  public async validate(): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Check if Node.js is available
    try {
      const result = await this.runCommand('node --version');
      if (!result.success) {
        errors.push('Node.js is not installed or not in PATH');
      }
    } catch {
      errors.push('Failed to verify Node.js installation');
    }

    // Check if ESLint is available (optional)
    try {
      const result = await this.runCommand('npx eslint --version');
      if (!result.success) {
        console.warn('[ExpressBuild] ESLint not available, some features may be limited');
      }
    } catch {
      // ESLint is optional, don't add error
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async runCommand(cmd: string): Promise<{ success: boolean; output?: string }> {
    // Implementation using child_process
    return { success: true };
  }
}
```

### Advanced: Timeout Handling

For long-running scans:

```typescript
public async execute(context: ScanContext): Promise<ScanResult<any>> {
  try {
    // Wrap with timeout (2 minutes)
    const scanPromise = this.performLongScan(context.project.path);
    const result = await this.withTimeout(
      scanPromise,
      120000,
      'Scan timed out after 2 minutes'
    );

    return this.createResult(true, result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      return this.createResult(false, undefined, 'Scan timed out');
    }

    return this.createResult(false, undefined, error.message);
  }
}

private async performLongScan(projectPath: string) {
  // Long-running operation
}
```

### Advanced: Progress Reporting

Report progress during scan execution:

```typescript
public async execute(context: ScanContext): Promise<ScanResult<any>> {
  const { project } = context;

  // Get files to scan
  const files = await this.getFilesToScan(project.path);
  const total = files.length;

  const errors: any[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Report progress (if supported)
    this.reportProgress((i / total) * 100);

    // Scan file
    const fileErrors = await this.scanFile(file);
    errors.push(...fileErrors);
  }

  return this.createResult(true, {
    totalErrors: errors.length,
    errors,
  });
}

private reportProgress(percent: number) {
  // Could emit event or update store
  console.log(`[${this.id}] Progress: ${percent.toFixed(0)}%`);
}
```

## Common Patterns

### Pattern 1: Multi-Step Scan

```typescript
public async execute(context: ScanContext): Promise<ScanResult<any>> {
  this.log('Step 1: Analyzing dependencies...');
  const deps = await this.analyzeDependencies(context.project.path);

  this.log('Step 2: Checking configuration...');
  const config = await this.checkConfiguration(context.project.path);

  this.log('Step 3: Running linter...');
  const lintResults = await this.runLinter(context.project.path);

  return this.createResult(true, {
    dependencies: deps,
    configuration: config,
    lintResults,
  });
}
```

### Pattern 2: Conditional Decision

```typescript
public buildDecision(result: ScanResult<any>, project: Project): DecisionData | null {
  if (!result.success) return null;

  const { criticalIssues, warnings } = result.data;

  // Only show decision for critical issues
  if (criticalIssues.length === 0) {
    this.log('No critical issues, skipping decision');
    return null;
  }

  // Different severity based on count
  const severity = criticalIssues.length > 10 ? 'error'
    : criticalIssues.length > 5 ? 'warning'
    : 'info';

  return this.createDecision({ /* ... */ }, project);
}
```

### Pattern 3: Cascading Actions

```typescript
onAccept: async () => {
  this.log('Step 1: Backing up files...');
  await this.backupFiles(project.path);

  this.log('Step 2: Fixing issues...');
  const fixed = await this.fixIssues(errorDetails);

  this.log('Step 3: Running tests...');
  const testResult = await this.runTests(project.path);

  if (!testResult.success) {
    this.log('Tests failed, rolling back...');
    await this.rollback(project.path);
    throw new Error('Fixes broke tests, rolled back');
  }

  this.log(`✅ Fixed ${fixed} issues, tests passing`);
}
```

## Debugging

### Enable Debug Mode

```typescript
// When getting registry
const registry = getInitializedRegistry(true);

// Or when initializing
initializeAdapters(true);
```

### Check Registry Stats

```typescript
const registry = getInitializedRegistry();
const stats = registry.getStats();

console.log('Total adapters:', stats.totalAdapters);
console.log('By category:', stats.adaptersByCategory);
console.log('By type:', stats.adaptersByType);
console.log('Most used:', stats.mostUsed);
```

### List Matching Adapters

```typescript
const project = { id: '1', type: 'express', path: '/test' };
const adapters = registry.findAdapters(project, 'build');

console.log('Matching adapters:', adapters.map(a => ({
  id: a.id,
  name: a.name,
  priority: a.priority,
})));
```

### Test Adapter Directly

```typescript
const adapter = new ExpressBuildAdapter();
const context = {
  project: { id: '1', type: 'express', path: '/test/project' },
  options: { verbose: true },
};

const result = await adapter.execute(context);
console.log('Result:', result);
```

## Troubleshooting

### "Adapter not registered"

**Cause**: Adapter not added to `initialize.ts`

**Fix**: Add your adapter to the initialization:

```typescript
import { getAllYourAdapters } from './yourframework';

export function initializeAdapters() {
  // ...
  const yourAdapters = getAllYourAdapters();
  registry.registerMany(yourAdapters);
  // ...
}
```

### "No adapter found"

**Cause**: `canHandle()` returns false or `supportedTypes` doesn't match

**Fix**: Check your adapter's `canHandle()` logic and `supportedTypes` array

### "Scan returns empty data"

**Cause**: API endpoint not working or incorrect response parsing

**Fix**: Check API endpoint, add logging, verify response structure

## Next Steps

1. Read the [README.md](./README.md) for architecture overview
2. Study existing adapters in `nextjs/` and `fastapi/`
3. Copy `TEMPLATE_ADAPTER.ts` to start your own
4. Write tests for your adapter
5. Submit a pull request!

## Additional Resources

- [BaseAdapter Source](./BaseAdapter.ts)
- [ScanRegistry Source](./ScanRegistry.ts)
- [Type Definitions](./types.ts)
- [NextJS Adapter Example](./nextjs/NextJSBuildAdapter.ts)
- [FastAPI Adapter Example](./fastapi/FastAPIBuildAdapter.ts)
