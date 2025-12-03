# Blueprint Scans Migration Plan

## Overview

This document outlines the migration strategy for moving existing Blueprint scans into the new composable Blueprint Library architecture. The goal is to extract core logic into reusable components while maintaining backward compatibility with existing consumers.

---

## Current State Analysis

### Existing Scan Categories

**A. Main Blueprint Scans** (`sub_Blueprint/lib/`)
| Scan | Purpose | Execution Mode | Creates Requirement |
|------|---------|----------------|---------------------|
| BuildScan | Detect build errors | Worker + Adapter | No (decision only) |
| ContextsScan | Discover features, batch create requirements | Worker + Fire-and-forget | Yes (multiple) |
| ScreenCoverage | Generate test scenarios for contexts | Pre-scan + Batch | Yes (multiple) |
| UnusedScan | Detect unused code | Streaming API | Yes (2 files) |
| VisionScan | Generate project documentation | Full pipeline + polling | Yes (single) |

**B. Context Scans** (`sub_Blueprint/lib/context-scans/`)
| Scan | Purpose | Execution Mode | Creates Requirement |
|------|---------|----------------|---------------------|
| ContextReview | Review/update context files | Fire-and-forget | Yes |
| PhotoScan | Take UI screenshots | Direct API | No |
| TestScan | Execute Playwright tests | Full pipeline + polling | Yes |
| TestDesign | Create test scenarios/steps | Full pipeline + polling | Yes |
| SeparatorScan | Split large contexts | Full pipeline + polling | Yes |

### Shared Infrastructure
- **Pipeline System**: `claudeCodePipeline.ts` - 3-step execution (create → execute → poll)
- **Adapter System**: Framework-specific implementations (NextJS, FastAPI)
- **Worker System**: Background thread execution for CPU-intensive scans
- **Scan Utilities**: `scanUtils.ts` - shared API calls, formatting, events
- **Decision Queue**: Async user confirmation system

---

## Migration Architecture

### New Blueprint Library Structure

```
src/lib/blueprint/
├── types/
│   └── index.ts                    # Core types (existing)
│
├── components/
│   ├── base/
│   │   ├── BaseAnalyzer.ts         # ✅ Exists
│   │   ├── BaseProcessor.ts        # ✅ Exists
│   │   ├── BaseExecutor.ts         # ✅ Exists
│   │   └── BaseScan.ts             # 🆕 NEW - Base class for scans
│   │
│   ├── analyzers/                  # Technical analyzers (existing)
│   │
│   ├── scans/                      # 🆕 NEW - Migrated scan components
│   │   ├── base/
│   │   │   ├── ScanComponent.ts    # Abstract scan interface
│   │   │   └── ScanPipeline.ts     # Migrated pipeline logic
│   │   │
│   │   ├── project/                # Project-level scans
│   │   │   ├── BuildScan.ts
│   │   │   ├── ContextsScan.ts
│   │   │   ├── UnusedScan.ts
│   │   │   ├── VisionScan.ts
│   │   │   └── ScreenCoverageScan.ts
│   │   │
│   │   └── context/                # Context-specific scans
│   │       ├── ContextReviewScan.ts
│   │       ├── PhotoScan.ts
│   │       ├── TestScan.ts
│   │       ├── TestDesignScan.ts
│   │       └── SeparatorScan.ts
│   │
│   ├── processors/                 # Existing processors
│   │
│   └── executors/
│       ├── RequirementExecutor.ts  # ✅ Exists
│       └── ClaudeCodeExecutor.ts   # 🆕 NEW - Claude Code execution
│
├── prompts/
│   ├── builders/
│   │   ├── PromptBuilder.ts        # ✅ Exists
│   │   ├── ContextPromptBuilder.ts # 🆕 Migrated context prompts
│   │   ├── TestPromptBuilder.ts    # 🆕 Migrated test prompts
│   │   └── FeaturePromptBuilder.ts # 🆕 Migrated feature prompts
│   │
│   └── templates/                  # 🆕 NEW - Prompt templates
│       ├── contextReview.ts
│       ├── testDesign.ts
│       ├── separator.ts
│       ├── screenCoverage.ts
│       ├── featureContexts.ts
│       ├── unusedCleanup.ts
│       └── unusedIntegration.ts
│
├── pipeline/                       # 🆕 NEW - Migrated pipeline
│   ├── PipelineExecutor.ts         # Core pipeline logic
│   ├── PipelineStep.ts             # Step abstraction
│   └── types.ts                    # Pipeline types
│
├── adapters/                       # 🆕 NEW - Migrated adapters
│   ├── base/
│   │   ├── ScanAdapter.ts          # Base adapter interface
│   │   └── AdapterRegistry.ts      # Adapter registration
│   │
│   ├── nextjs/
│   │   └── NextJSAdapter.ts
│   │
│   └── fastapi/
│       └── FastAPIAdapter.ts
│
└── index.ts                        # Main exports
```

---

## Component Design

### 1. BaseScan Abstract Class

```typescript
// src/lib/blueprint/components/scans/base/ScanComponent.ts

import { ExecutionContext, ValidationResult } from '../../types';

export type ScanExecutionMode =
  | 'fire-and-forget'    // Queue and return immediately
  | 'polling'            // Wait for completion (max 10 min)
  | 'direct'             // Direct API call, no requirement
  | 'streaming';         // Stream response handling

export interface ScanConfig {
  projectId: string;
  projectPath: string;
  projectType?: string;
  projectName?: string;
  contextId?: string;        // For context-specific scans
  onProgress?: (progress: number, message?: string) => void;
}

export interface ScanResult<TData = unknown> {
  success: boolean;
  error?: string;
  data?: TData;
  requirementPath?: string;
  taskId?: string;
}

export interface DecisionData {
  type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  count?: number;
  data?: Record<string, unknown>;
  customContent?: React.ComponentType<any>;
  onAccept: () => Promise<void>;
  onReject?: () => Promise<void>;
}

export abstract class BaseScan<TConfig extends ScanConfig, TData = unknown> {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly executionMode: ScanExecutionMode;
  abstract readonly requiresContext: boolean;

  protected config: TConfig;
  protected context?: ExecutionContext;

  constructor(config: TConfig) {
    this.config = config;
  }

  // Core execution method
  abstract execute(): Promise<ScanResult<TData>>;

  // Build decision data for UI
  abstract buildDecision(result: ScanResult<TData>): DecisionData | null;

  // Validate configuration
  abstract validateConfig(): ValidationResult;

  // Progress reporting
  protected reportProgress(progress: number, message?: string): void {
    this.config.onProgress?.(progress, message);
  }

  // Check if scan can run for given project type
  canHandle(projectType: string): boolean {
    return true; // Override in subclasses
  }
}
```

### 2. ScanPipeline (Migrated from claudeCodePipeline.ts)

```typescript
// src/lib/blueprint/pipeline/PipelineExecutor.ts

export interface PipelineConfig {
  projectPath: string;
  projectId: string;
  requirementName: string;
  requirementContent: string;
  executionMode: 'fire-and-forget' | 'polling';
  maxPollingTime?: number;  // Default: 10 minutes
  onProgress?: (progress: number, message?: string) => void;
}

export interface PipelineResult {
  success: boolean;
  taskId?: string;
  requirementPath?: string;
  error?: string;
  completedAt?: string;
}

export class PipelineExecutor {
  private static readonly DEFAULT_MAX_POLLING = 10 * 60 * 1000; // 10 minutes
  private static readonly POLL_INTERVAL = 2000; // 2 seconds

  async execute(config: PipelineConfig): Promise<PipelineResult> {
    const { executionMode } = config;

    // Step 1: Create requirement file (20%)
    const createResult = await this.createRequirement(config);
    if (!createResult.success) return createResult;

    // Step 2: Execute requirement (30%)
    const executeResult = await this.executeRequirement(config, createResult.requirementPath!);
    if (!executeResult.success) return executeResult;

    // Step 3: Poll or return (50%)
    if (executionMode === 'polling') {
      return this.pollForCompletion(config, executeResult.taskId!);
    }

    return executeResult;
  }

  private async createRequirement(config: PipelineConfig): Promise<PipelineResult> {
    config.onProgress?.(10, 'Creating requirement file...');

    const response = await fetch('/api/claude-code/requirement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath: config.projectPath,
        name: config.requirementName,
        content: config.requirementContent,
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to create requirement file' };
    }

    const data = await response.json();
    config.onProgress?.(20, 'Requirement file created');

    return { success: true, requirementPath: data.path };
  }

  private async executeRequirement(
    config: PipelineConfig,
    requirementPath: string
  ): Promise<PipelineResult> {
    config.onProgress?.(30, 'Executing requirement...');

    const response = await fetch('/api/claude-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'execute-requirement-async',
        projectPath: config.projectPath,
        requirementPath,
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to execute requirement' };
    }

    const data = await response.json();
    config.onProgress?.(40, 'Requirement queued for execution');

    return { success: true, taskId: data.taskId, requirementPath };
  }

  private async pollForCompletion(
    config: PipelineConfig,
    taskId: string
  ): Promise<PipelineResult> {
    const maxTime = config.maxPollingTime ?? PipelineExecutor.DEFAULT_MAX_POLLING;
    const startTime = Date.now();

    while (Date.now() - startTime < maxTime) {
      const elapsed = Date.now() - startTime;
      const progressPercent = 40 + Math.min(50, (elapsed / maxTime) * 50);

      config.onProgress?.(progressPercent, 'Waiting for task completion...');

      const response = await fetch('/api/claude-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-task-status',
          taskId,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.status === 'completed') {
          config.onProgress?.(100, 'Task completed successfully');
          return { success: true, taskId, completedAt: new Date().toISOString() };
        }

        if (data.status === 'failed') {
          return { success: false, error: data.error || 'Task failed', taskId };
        }
      }

      await new Promise(resolve => setTimeout(resolve, PipelineExecutor.POLL_INTERVAL));
    }

    return { success: false, error: 'Task timed out', taskId };
  }
}
```

### 3. Example Migrated Scan: VisionScan

```typescript
// src/lib/blueprint/components/scans/project/VisionScan.ts

import { BaseScan, ScanConfig, ScanResult, DecisionData } from '../base/ScanComponent';
import { PipelineExecutor } from '../../../pipeline/PipelineExecutor';
import { ValidationResult } from '../../../types';

interface VisionScanConfig extends ScanConfig {
  outputPath?: string;  // Default: 'context/high.md'
}

interface VisionScanData {
  documentPath: string;
  generatedAt: string;
}

export class VisionScan extends BaseScan<VisionScanConfig, VisionScanData> {
  readonly id = 'scan.vision';
  readonly name = 'Vision Scan';
  readonly description = 'Generate high-level project documentation';
  readonly executionMode = 'polling' as const;
  readonly requiresContext = false;

  private pipeline = new PipelineExecutor();

  async execute(): Promise<ScanResult<VisionScanData>> {
    this.reportProgress(5, 'Building vision requirement...');

    // Step 1: Build requirement content (server-side)
    const buildResponse = await fetch('/api/blueprint/vision-requirement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: this.config.projectId,
        projectPath: this.config.projectPath,
      }),
    });

    if (!buildResponse.ok) {
      return { success: false, error: 'Failed to build vision requirement' };
    }

    const { content } = await buildResponse.json();

    // Step 2: Execute via pipeline
    const result = await this.pipeline.execute({
      projectPath: this.config.projectPath,
      projectId: this.config.projectId,
      requirementName: 'vision-scan',
      requirementContent: content,
      executionMode: 'polling',
      onProgress: this.config.onProgress,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        documentPath: this.config.outputPath || 'context/high.md',
        generatedAt: result.completedAt!,
      },
      taskId: result.taskId,
    };
  }

  buildDecision(result: ScanResult<VisionScanData>): DecisionData | null {
    if (!result.success) {
      return {
        type: 'vision-scan-error',
        title: 'Vision Scan Failed',
        description: result.error || 'Unknown error occurred',
        severity: 'error',
        onAccept: async () => {},
      };
    }

    return {
      type: 'vision-scan-complete',
      title: 'Vision Scan Complete',
      description: `High-level documentation generated at ${result.data?.documentPath}`,
      severity: 'info',
      data: result.data,
      onAccept: async () => {
        // Navigate to documentation or show notification
      },
    };
  }

  validateConfig(): ValidationResult {
    if (!this.config.projectId) {
      return { valid: false, errors: ['projectId is required'] };
    }
    if (!this.config.projectPath) {
      return { valid: false, errors: ['projectPath is required'] };
    }
    return { valid: true };
  }
}
```

---

## Migration Strategy

### Phase 1: Foundation (No Breaking Changes)

1. **Create base abstractions**
   - `BaseScan` abstract class
   - `ScanComponent` interface
   - `PipelineExecutor` (migrate from claudeCodePipeline.ts)

2. **Create prompt templates**
   - Migrate prompts from `sub_Blueprint/lib/prompts/` and `context-scans/prompts/`
   - Keep original files, have them import from new location

3. **Create adapter base**
   - Migrate `BaseAdapter` and `ScanRegistry`
   - Keep original adapters working

### Phase 2: Scan Migration (Gradual)

**Order of migration** (least to most complex):

1. **VisionScan** - Simple, self-contained, uses full pipeline
2. **PhotoScan** - Simple, direct API call
3. **TestScan** - Similar to VisionScan
4. **SeparatorScan** - Uses context, pipeline
5. **ContextReviewScan** - Fire-and-forget pattern
6. **TestDesignScan** - Complex, multiple API calls
7. **ScreenCoverageScan** - Batch processing
8. **ContextsScan** - Batch processing, feature discovery
9. **UnusedScan** - Streaming response
10. **BuildScan** - Adapter system, workers

### Phase 3: Backward Compatibility Layer

```typescript
// src/app/features/Onboarding/sub_Blueprint/lib/blueprintVisionScan.ts
// AFTER MIGRATION - Thin wrapper for backward compatibility

import { VisionScan } from '@/lib/blueprint/components/scans/project/VisionScan';
import { useBlueprintStore } from '../store/blueprintStore';

// Keep original function signature for existing consumers
export async function executeVisionScan(
  projectId: string,
  projectPath: string,
  onProgress?: (progress: number, message?: string) => void
) {
  const scan = new VisionScan({
    projectId,
    projectPath,
    onProgress: (progress, message) => {
      // Update store for existing UI
      useBlueprintStore.getState().updateScanProgress(progress);
      onProgress?.(progress, message);
    },
  });

  const result = await scan.execute();
  return scan.buildDecision(result);
}

// Re-export for type compatibility
export { VisionScan };
```

### Phase 4: Blueprint Composer Integration

1. **Register scans as components**
   - Each scan becomes a selectable component in the Composer
   - Scans can be chained with processors

2. **Context selection UI**
   - Context-specific scans show context selector
   - Selection stored in blueprint composition

3. **Execution modes in UI**
   - Show execution mode indicator (fire-and-forget vs polling)
   - Progress tracking for polling scans

---

## Component Mapping

### Project Scans → Blueprint Components

| Original | New Component | Type | Notes |
|----------|---------------|------|-------|
| BuildScan | `scan.build` | Analyzer | Uses adapters |
| ContextsScan | `scan.contexts` | Analyzer + Executor | Batch creates requirements |
| ScreenCoverage | `scan.screen-coverage` | Analyzer + Executor | Batch creates requirements |
| UnusedScan | `scan.unused` | Analyzer | Streaming + 2 executors |
| VisionScan | `scan.vision` | Analyzer + Executor | Full pipeline |

### Context Scans → Blueprint Components

| Original | New Component | Type | Notes |
|----------|---------------|------|-------|
| ContextReview | `scan.context-review` | Analyzer + Executor | Requires context |
| PhotoScan | `scan.photo` | Executor | Direct API, no requirement |
| TestScan | `scan.test` | Analyzer + Executor | Full pipeline |
| TestDesign | `scan.test-design` | Analyzer + Executor | Full pipeline |
| SeparatorScan | `scan.separator` | Analyzer + Executor | Full pipeline |

---

## API Considerations

### New API Endpoints (if needed)

```
POST /api/blueprint/scans/execute
  - Unified scan execution endpoint
  - Body: { scanId, config, executionMode }
  - Returns: { taskId, status }

GET /api/blueprint/scans/:taskId/status
  - Check scan status
  - Returns: { status, progress, result }

POST /api/blueprint/scans/:taskId/cancel
  - Cancel running scan
```

### Existing APIs (reused)

- `/api/claude-code/requirement` - Create requirement file
- `/api/claude-code` - Execute requirement, get status
- `/api/contexts/*` - Context CRUD operations
- `/api/blueprint/vision-requirement` - Build vision prompt
- `/api/blueprint/test-requirement` - Build test prompt

---

## Testing Strategy

1. **Unit Tests**
   - Test each scan component in isolation
   - Mock API calls and pipeline

2. **Integration Tests**
   - Test backward compatibility wrappers
   - Verify existing consumers still work

3. **E2E Tests**
   - Test full scan execution flow
   - Verify decisions and UI updates

---

## Rollout Plan

### Week 1-2: Foundation
- [ ] Create `BaseScan` and `ScanComponent` abstractions
- [ ] Migrate `PipelineExecutor` from claudeCodePipeline.ts
- [ ] Create prompt templates module
- [ ] Unit tests for base components

### Week 3-4: Simple Scans
- [ ] Migrate VisionScan
- [ ] Migrate PhotoScan
- [ ] Migrate TestScan
- [ ] Create backward compatibility wrappers
- [ ] Verify existing UI still works

### Week 5-6: Context Scans
- [ ] Migrate SeparatorScan
- [ ] Migrate ContextReviewScan
- [ ] Migrate TestDesignScan
- [ ] Context selection integration in Composer

### Week 7-8: Complex Scans
- [ ] Migrate ScreenCoverageScan (batch processing)
- [ ] Migrate ContextsScan (batch processing)
- [ ] Migrate UnusedScan (streaming)
- [ ] Migrate BuildScan (adapters)

### Week 9-10: Integration
- [ ] Blueprint Composer scan selection
- [ ] Scan chaining support
- [ ] Full E2E testing
- [ ] Documentation update

---

## Success Criteria

1. **Zero Breaking Changes**
   - All existing scan triggers still work
   - UI components unchanged
   - API contracts preserved

2. **Code Reuse**
   - Shared pipeline logic
   - Shared prompt templates
   - Shared validation

3. **Composability**
   - Scans selectable in Blueprint Composer
   - Scans chainable with processors
   - Context selection integrated

4. **Maintainability**
   - Clear separation of concerns
   - Consistent patterns
   - Comprehensive tests

---

## Open Questions

1. **Worker Migration**: Should web workers be migrated to the Blueprint library, or kept in the feature folder?
   - Recommendation: Keep workers in feature folder, they're UI-specific optimizations

2. **Adapter Location**: Should framework adapters live in Blueprint library or feature folder?
   - Recommendation: Migrate to Blueprint library for reuse across features

3. **Decision Queue**: Should decision handling be part of Blueprint library?
   - Recommendation: Keep in feature folder, it's UI-specific

4. **Store Integration**: How should scans update the Blueprint store?
   - Recommendation: Pass callbacks, don't import store directly in library

---

## Next Steps

1. Review and approve this migration plan
2. Create Phase 1 components (BaseScan, PipelineExecutor)
3. Migrate VisionScan as proof of concept
4. Iterate based on learnings
