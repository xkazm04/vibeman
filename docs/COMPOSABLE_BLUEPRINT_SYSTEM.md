# Composable Blueprint System - Target Architecture

## Executive Summary

The Composable Blueprint System transforms Vibeman's current preset-based scanning into a **visual, modular pipeline builder** where users can compose custom analysis workflows from reusable components. This document defines the target architecture for a cutting-edge codebase analysis and implementation automation platform.

---

## 1. Vision & Goals

### Core Principles
1. **Composability** - Every scan component is a reusable building block
2. **Visual-First** - High-quality node visualization for pipeline design and execution monitoring
3. **Background Execution** - Blueprints run at app root level, freeing users to work elsewhere
4. **Progressive Disclosure** - Simple presets for beginners, full customization for power users
5. **Extensibility** - Easy to add new analyzers, processors, and executors

### Target Experience
```
User Journey:
1. Opens Blueprint Builder → sees visual canvas with component palette
2. Drags components onto canvas → connects them into a pipeline
3. Configures each node → sets thresholds, filters, prompts
4. Saves blueprint → stored in database with full configuration
5. Runs blueprint → watches progress in floating progress panel
6. Reviews results → accepts/rejects proposals in decision queue
7. Monitors execution → Claude Code tasks run in background
```

---

## 2. System Architecture

### 2.1 Architectural Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                            │
├─────────────────────────────────────────────────────────────────────┤
│  BlueprintCanvas    │  ComponentPalette  │  BlueprintProgressPanel  │
│  (Node Editor)      │  (Drag Source)     │  (Floating Monitor)      │
├─────────────────────────────────────────────────────────────────────┤
│                        ORCHESTRATION LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│  BlueprintEngine    │  PipelineExecutor  │  DecisionAggregator      │
│  (Workflow Manager) │  (Step Runner)     │  (Result Collector)      │
├─────────────────────────────────────────────────────────────────────┤
│                        COMPONENT LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  Analyzers          │  Processors        │  Executors    │ Testers  │
│  (Static Scans)     │  (Transformers)    │  (Claude Code)│ (Verify) │
├─────────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                                    │
├─────────────────────────────────────────────────────────────────────┤
│  BlueprintConfigDb  │  ExecutionHistoryDb │  ComponentRegistryDb    │
│  (Saved Pipelines)  │  (Run History)      │  (Available Components) │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Type Definitions

#### **Analyzer Components** (Pre-Scan / Static Analysis)
Purpose: Gather data about the codebase without making changes.

| Component ID | Name | Description | Outputs |
|--------------|------|-------------|---------|
| `analyzer.console` | Console Statements | Detect console.log/warn/error | `ConsoleIssue[]` |
| `analyzer.any-types` | TypeScript Any | Find any type usage | `AnyTypeIssue[]` |
| `analyzer.unused-imports` | Unused Imports | Detect dead imports | `UnusedImport[]` |
| `analyzer.large-files` | Large Files | Files exceeding threshold | `LargeFile[]` |
| `analyzer.long-functions` | Long Functions | Functions over N lines | `LongFunction[]` |
| `analyzer.complexity` | Cyclomatic Complexity | High complexity functions | `ComplexFunction[]` |
| `analyzer.duplication` | Code Duplication | Duplicate code blocks | `DuplicateBlock[]` |
| `analyzer.magic-numbers` | Magic Numbers | Hardcoded values | `MagicNumber[]` |
| `analyzer.react-hooks` | React Hook Deps | Hook dependency issues | `HookIssue[]` |
| `analyzer.client-server` | Client/Server Mix | Next.js boundary violations | `BoundaryViolation[]` |
| `analyzer.security` | Security Scan | Vulnerability detection | `SecurityIssue[]` |
| `analyzer.dependencies` | Dependency Scan | Outdated/vulnerable deps | `DependencyIssue[]` |
| `analyzer.custom` | Custom Analyzer | User-defined patterns | `CustomIssue[]` |

#### **Processor Components** (Decision Builders / Transformers)
Purpose: Transform analyzer outputs into actionable decisions.

| Component ID | Name | Description | Input → Output |
|--------------|------|-------------|----------------|
| `processor.filter` | Issue Filter | Filter by severity/category | `Issue[] → Issue[]` |
| `processor.group` | Issue Grouper | Group by file/category/type | `Issue[] → GroupedIssues` |
| `processor.prioritize` | Priority Ranker | Sort by impact/effort ratio | `Issue[] → RankedIssues` |
| `processor.batch` | Batch Creator | Create execution batches | `Issue[] → Batch[]` |
| `processor.decision` | Decision Builder | Build user decisions | `Issue[] → Decision[]` |
| `processor.merge` | Stream Merger | Combine multiple streams | `Stream[] → Stream` |
| `processor.llm-enhance` | LLM Enhancement | Add AI analysis/suggestions | `Issue[] → EnhancedIssue[]` |

#### **Executor Components** (Claude Code Integration)
Purpose: Generate and execute Claude Code requirements.

| Component ID | Name | Description | Actions |
|--------------|------|-------------|---------|
| `executor.requirement` | Requirement Generator | Create .md requirement files | Write to `.claude/requirements/` |
| `executor.batch-runner` | Batch Task Runner | Execute multiple requirements | Spawn Claude Code processes |
| `executor.single-runner` | Single Task Runner | Execute one requirement | Single Claude Code execution |
| `executor.git-ops` | Git Operations | Commit, branch, PR creation | Git commands |
| `executor.context-update` | Context Updater | Update contexts after changes | Refresh context DB |

#### **Tester Components** (Verification - Future)
Purpose: Verify changes after execution.

| Component ID | Name | Description | Verification |
|--------------|------|-------------|--------------|
| `tester.build` | Build Verification | Run build after changes | `npm run build` |
| `tester.type-check` | Type Check | Run TypeScript check | `tsc --noEmit` |
| `tester.lint` | Lint Check | Run linter | `npm run lint` |
| `tester.unit-tests` | Unit Tests | Run test suite | `npm test` |
| `tester.screenshot` | Visual Regression | Compare screenshots | Playwright capture |
| `tester.e2e` | E2E Tests | Run end-to-end tests | Playwright tests |

---

## 3. Data Models

### 3.1 Database Schema

```sql
-- Blueprint configuration (saved pipelines)
CREATE TABLE IF NOT EXISTS blueprint_configs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  blueprint_type TEXT NOT NULL CHECK (blueprint_type IN ('preset', 'custom', 'template')),

  -- Visual layout data
  canvas_data TEXT NOT NULL, -- JSON: node positions, zoom, viewport

  -- Pipeline definition
  nodes TEXT NOT NULL,       -- JSON: array of BlueprintNode
  edges TEXT NOT NULL,       -- JSON: array of BlueprintEdge

  -- Execution settings
  execution_mode TEXT NOT NULL CHECK (execution_mode IN ('sequential', 'parallel', 'smart')),
  auto_execute INTEGER DEFAULT 0,
  require_approval INTEGER DEFAULT 1,

  -- Metadata
  icon TEXT,
  color TEXT,
  tags TEXT,                 -- JSON array
  is_favorite INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_executed_at TEXT
);

-- Blueprint execution history
CREATE TABLE IF NOT EXISTS blueprint_executions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  config_id TEXT NOT NULL,

  -- Execution state
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  phase TEXT NOT NULL CHECK (phase IN ('initializing', 'analyzing', 'processing', 'executing', 'testing', 'finalizing')),

  -- Progress tracking
  progress INTEGER DEFAULT 0,           -- 0-100
  progress_message TEXT,
  current_node_id TEXT,
  completed_nodes TEXT,                 -- JSON array of node IDs

  -- Results
  total_issues_found INTEGER DEFAULT 0,
  total_decisions_created INTEGER DEFAULT 0,
  total_tasks_executed INTEGER DEFAULT 0,
  result_summary TEXT,                  -- JSON with detailed stats

  -- Error handling
  error_message TEXT,
  error_node_id TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timing
  started_at TEXT,
  completed_at TEXT,
  duration_ms INTEGER,

  -- Trigger info
  trigger_type TEXT CHECK (trigger_type IN ('manual', 'scheduled', 'git_hook', 'file_watch')),
  trigger_metadata TEXT,                -- JSON

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (config_id) REFERENCES blueprint_configs(id) ON DELETE CASCADE
);

-- Node execution details (per-node progress within an execution)
CREATE TABLE IF NOT EXISTS blueprint_node_executions (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  node_id TEXT NOT NULL,

  -- Node info (denormalized for query performance)
  node_type TEXT NOT NULL,
  node_name TEXT NOT NULL,

  -- Execution state
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  progress INTEGER DEFAULT 0,

  -- I/O tracking
  input_data TEXT,                      -- JSON: what this node received
  output_data TEXT,                     -- JSON: what this node produced

  -- Timing
  started_at TEXT,
  completed_at TEXT,
  duration_ms INTEGER,

  -- Errors
  error_message TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (execution_id) REFERENCES blueprint_executions(id) ON DELETE CASCADE
);

-- Component registry (available components)
CREATE TABLE IF NOT EXISTS blueprint_components (
  id TEXT PRIMARY KEY,

  -- Identity
  component_type TEXT NOT NULL CHECK (component_type IN ('analyzer', 'processor', 'executor', 'tester')),
  component_id TEXT NOT NULL UNIQUE,    -- e.g., 'analyzer.console'
  name TEXT NOT NULL,
  description TEXT,

  -- Categorization
  category TEXT,                        -- e.g., 'code-quality', 'security', 'performance'
  tags TEXT,                            -- JSON array

  -- Visual
  icon TEXT,
  color TEXT,

  -- Configuration schema
  config_schema TEXT,                   -- JSON Schema for node configuration
  default_config TEXT,                  -- JSON default values

  -- I/O definitions
  input_types TEXT,                     -- JSON array of accepted input types
  output_types TEXT,                    -- JSON array of produced output types

  -- Compatibility
  supported_project_types TEXT,         -- JSON array: ['nextjs', 'fastapi', etc.]
  requires_context INTEGER DEFAULT 0,

  -- Implementation reference
  implementation_path TEXT NOT NULL,    -- Path to implementation module

  -- Metadata
  version TEXT DEFAULT '1.0.0',
  is_builtin INTEGER DEFAULT 1,
  is_deprecated INTEGER DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blueprint_configs_project ON blueprint_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_configs_type ON blueprint_configs(blueprint_type);
CREATE INDEX IF NOT EXISTS idx_blueprint_executions_project ON blueprint_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_executions_config ON blueprint_executions(config_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_executions_status ON blueprint_executions(status);
CREATE INDEX IF NOT EXISTS idx_blueprint_node_executions_exec ON blueprint_node_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_components_type ON blueprint_components(component_type);
CREATE INDEX IF NOT EXISTS idx_blueprint_components_id ON blueprint_components(component_id);
```

### 3.2 TypeScript Types

```typescript
// Node types for visual editor
interface BlueprintNode {
  id: string;
  type: 'analyzer' | 'processor' | 'executor' | 'tester';
  componentId: string;              // e.g., 'analyzer.console'

  // Visual positioning
  position: { x: number; y: number };

  // Configuration
  config: Record<string, unknown>;  // Component-specific settings

  // Metadata
  label?: string;                   // Custom label override
  description?: string;
  disabled?: boolean;
}

interface BlueprintEdge {
  id: string;
  source: string;                   // Source node ID
  target: string;                   // Target node ID
  sourceHandle?: string;            // For nodes with multiple outputs
  targetHandle?: string;            // For nodes with multiple inputs

  // Data transformation
  transformer?: string;             // Optional data transformer ID

  // Visual
  animated?: boolean;
  style?: EdgeStyle;
}

interface BlueprintConfig {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  blueprintType: 'preset' | 'custom' | 'template';

  // Canvas state
  canvasData: {
    zoom: number;
    viewport: { x: number; y: number };
  };

  // Pipeline definition
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];

  // Execution settings
  executionMode: 'sequential' | 'parallel' | 'smart';
  autoExecute: boolean;
  requireApproval: boolean;

  // Metadata
  icon?: string;
  color?: string;
  tags?: string[];
  isFavorite: boolean;
  useCount: number;

  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
}

// Execution types
interface BlueprintExecution {
  id: string;
  projectId: string;
  configId: string;

  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  phase: 'initializing' | 'analyzing' | 'processing' | 'executing' | 'testing' | 'finalizing';

  progress: number;
  progressMessage?: string;
  currentNodeId?: string;
  completedNodes: string[];

  totalIssuesFound: number;
  totalDecisionsCreated: number;
  totalTasksExecuted: number;
  resultSummary?: ExecutionResultSummary;

  errorMessage?: string;
  errorNodeId?: string;
  retryCount: number;

  startedAt?: string;
  completedAt?: string;
  durationMs?: number;

  triggerType: 'manual' | 'scheduled' | 'git_hook' | 'file_watch';
  triggerMetadata?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}

// Component definition types
interface ComponentDefinition {
  id: string;
  componentType: 'analyzer' | 'processor' | 'executor' | 'tester';
  componentId: string;
  name: string;
  description?: string;

  category?: string;
  tags?: string[];

  icon?: string;
  color?: string;

  configSchema?: JSONSchema;
  defaultConfig?: Record<string, unknown>;

  inputTypes: string[];
  outputTypes: string[];

  supportedProjectTypes: string[];
  requiresContext: boolean;

  implementationPath: string;

  version: string;
  isBuiltin: boolean;
  isDeprecated: boolean;
}
```

---

## 4. Component Implementation Architecture

### 4.1 Component Base Classes

```typescript
// Base component interface
interface IBlueprintComponent<TInput = unknown, TOutput = unknown, TConfig = unknown> {
  readonly id: string;
  readonly type: 'analyzer' | 'processor' | 'executor' | 'tester';
  readonly name: string;
  readonly version: string;

  // Lifecycle
  initialize(config: TConfig): Promise<void>;
  execute(input: TInput, context: ExecutionContext): Promise<TOutput>;
  cleanup(): Promise<void>;

  // Validation
  validateConfig(config: TConfig): ValidationResult;
  validateInput(input: TInput): ValidationResult;

  // Metadata
  getConfigSchema(): JSONSchema;
  getInputTypes(): string[];
  getOutputTypes(): string[];
}

// Execution context passed to all components
interface ExecutionContext {
  executionId: string;
  projectId: string;
  projectPath: string;
  projectType: string;

  // Progress reporting
  reportProgress(progress: number, message?: string): void;

  // Logging
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void;

  // Cancellation
  isCancelled(): boolean;
  onCancel(callback: () => void): void;

  // Inter-component communication
  getNodeOutput<T>(nodeId: string): T | undefined;

  // Services
  getDatabase(): DatabaseConnection;
  getLLMManager(): LLMManager;
}

// Abstract base for analyzers
abstract class BaseAnalyzer<TConfig, TOutput> implements IBlueprintComponent<void, TOutput, TConfig> {
  readonly type = 'analyzer';

  abstract readonly id: string;
  abstract readonly name: string;
  readonly version = '1.0.0';

  protected config!: TConfig;

  async initialize(config: TConfig): Promise<void> {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }
    this.config = config;
  }

  abstract execute(input: void, context: ExecutionContext): Promise<TOutput>;

  async cleanup(): Promise<void> {
    // Override if needed
  }

  abstract validateConfig(config: TConfig): ValidationResult;

  validateInput(): ValidationResult {
    return { valid: true };
  }

  abstract getConfigSchema(): JSONSchema;

  getInputTypes(): string[] {
    return [];
  }

  abstract getOutputTypes(): string[];
}

// Abstract base for processors
abstract class BaseProcessor<TInput, TOutput, TConfig> implements IBlueprintComponent<TInput, TOutput, TConfig> {
  readonly type = 'processor';

  abstract readonly id: string;
  abstract readonly name: string;
  readonly version = '1.0.0';

  protected config!: TConfig;

  async initialize(config: TConfig): Promise<void> {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }
    this.config = config;
  }

  abstract execute(input: TInput, context: ExecutionContext): Promise<TOutput>;

  async cleanup(): Promise<void> {}

  abstract validateConfig(config: TConfig): ValidationResult;
  abstract validateInput(input: TInput): ValidationResult;
  abstract getConfigSchema(): JSONSchema;
  abstract getInputTypes(): string[];
  abstract getOutputTypes(): string[];
}

// Abstract base for executors
abstract class BaseExecutor<TInput, TOutput, TConfig> implements IBlueprintComponent<TInput, TOutput, TConfig> {
  readonly type = 'executor';

  abstract readonly id: string;
  abstract readonly name: string;
  readonly version = '1.0.0';

  protected config!: TConfig;

  async initialize(config: TConfig): Promise<void> {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }
    this.config = config;
  }

  abstract execute(input: TInput, context: ExecutionContext): Promise<TOutput>;

  async cleanup(): Promise<void> {}

  abstract validateConfig(config: TConfig): ValidationResult;
  abstract validateInput(input: TInput): ValidationResult;
  abstract getConfigSchema(): JSONSchema;
  abstract getInputTypes(): string[];
  abstract getOutputTypes(): string[];
}
```

### 4.2 Shared Component Library Structure

```
src/lib/blueprint/
├── components/
│   ├── analyzers/
│   │   ├── BaseAnalyzer.ts
│   │   ├── ConsoleAnalyzer.ts
│   │   ├── AnyTypesAnalyzer.ts
│   │   ├── UnusedImportsAnalyzer.ts
│   │   ├── LargeFilesAnalyzer.ts
│   │   ├── LongFunctionsAnalyzer.ts
│   │   ├── ComplexityAnalyzer.ts
│   │   ├── DuplicationAnalyzer.ts
│   │   ├── MagicNumbersAnalyzer.ts
│   │   ├── ReactHooksAnalyzer.ts
│   │   ├── ClientServerAnalyzer.ts
│   │   ├── SecurityAnalyzer.ts
│   │   ├── DependencyAnalyzer.ts
│   │   └── index.ts
│   │
│   ├── processors/
│   │   ├── BaseProcessor.ts
│   │   ├── FilterProcessor.ts
│   │   ├── GroupProcessor.ts
│   │   ├── PriorityProcessor.ts
│   │   ├── BatchProcessor.ts
│   │   ├── DecisionProcessor.ts
│   │   ├── MergeProcessor.ts
│   │   ├── LLMEnhanceProcessor.ts
│   │   └── index.ts
│   │
│   ├── executors/
│   │   ├── BaseExecutor.ts
│   │   ├── RequirementExecutor.ts
│   │   ├── BatchRunnerExecutor.ts
│   │   ├── SingleRunnerExecutor.ts
│   │   ├── GitOpsExecutor.ts
│   │   ├── ContextUpdateExecutor.ts
│   │   └── index.ts
│   │
│   ├── testers/
│   │   ├── BaseTester.ts
│   │   ├── BuildTester.ts
│   │   ├── TypeCheckTester.ts
│   │   ├── LintTester.ts
│   │   ├── UnitTestTester.ts
│   │   ├── ScreenshotTester.ts
│   │   ├── E2ETester.ts
│   │   └── index.ts
│   │
│   └── index.ts                    # Component registry export
│
├── engine/
│   ├── BlueprintEngine.ts          # Main orchestrator
│   ├── PipelineExecutor.ts         # Step-by-step execution
│   ├── ComponentLoader.ts          # Dynamic component loading
│   ├── ExecutionContext.ts         # Context factory
│   └── index.ts
│
├── prompts/
│   ├── templates/
│   │   ├── fix-console.md
│   │   ├── fix-any-types.md
│   │   ├── fix-unused-imports.md
│   │   ├── refactor-large-file.md
│   │   ├── refactor-long-function.md
│   │   ├── reduce-complexity.md
│   │   ├── extract-duplicates.md
│   │   ├── extract-constants.md
│   │   ├── fix-hook-deps.md
│   │   ├── fix-client-server.md
│   │   └── index.ts
│   │
│   ├── builders/
│   │   ├── PromptBuilder.ts        # Base prompt builder
│   │   ├── RequirementBuilder.ts   # Claude Code requirement builder
│   │   └── index.ts
│   │
│   └── index.ts
│
├── types/
│   ├── component.types.ts
│   ├── execution.types.ts
│   ├── pipeline.types.ts
│   ├── issue.types.ts
│   └── index.ts
│
└── index.ts                        # Main export
```

---

## 5. Visual Editor Design

### 5.1 Canvas Architecture

The visual editor uses a **custom SVG + Framer Motion** approach (like DocsAnalysisLayout) for maximum flexibility:

```typescript
// BlueprintCanvas component structure
interface BlueprintCanvasProps {
  config: BlueprintConfig;
  onChange: (config: BlueprintConfig) => void;
  isReadOnly?: boolean;
  execution?: BlueprintExecution;     // For showing live progress
}

// Canvas state
interface CanvasState {
  zoom: number;
  viewport: { x: number; y: number };
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  isDragging: boolean;
  draggedNodeId: string | null;
  connectionStart: { nodeId: string; handleId: string } | null;
}
```

### 5.2 Node Visualization

Each node type has distinct visual treatment:

```
┌─────────────────────────────────────────┐
│  ANALYZER NODE                          │
│  ┌──────────────────────────────────┐   │
│  │  🔍  Console Statements          │   │  ← Icon + Name
│  │  ─────────────────────────────── │   │
│  │  Detect debug logs in production │   │  ← Description
│  │  ─────────────────────────────── │   │
│  │  Severity: Medium                │   │  ← Config preview
│  │  Threshold: 5                    │   │
│  └──────────────────────────────────┘   │
│                    ●                    │  ← Output handle
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  PROCESSOR NODE                         │
│         ●                               │  ← Input handle
│  ┌──────────────────────────────────┐   │
│  │  ⚙️  Priority Ranker             │   │
│  │  ─────────────────────────────── │   │
│  │  Sort by impact/effort ratio     │   │
│  │  ─────────────────────────────── │   │
│  │  Top N: 20                       │   │
│  └──────────────────────────────────┘   │
│                    ●                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  EXECUTOR NODE                          │
│         ●                               │
│  ┌──────────────────────────────────┐   │
│  │  🚀  Claude Code Runner          │   │
│  │  ─────────────────────────────── │   │
│  │  Execute requirements            │   │
│  │  ─────────────────────────────── │   │
│  │  Batch Size: 5                   │   │
│  │  Auto-commit: Yes                │   │
│  └──────────────────────────────────┘   │
│                    ●                    │
└─────────────────────────────────────────┘
```

### 5.3 Execution State Visualization

During execution, nodes show real-time status:

```
Node States:
- PENDING:    Gray outline, muted colors
- RUNNING:    Cyan glow, pulsing animation, spinner icon
- COMPLETED:  Green glow, checkmark badge, fade pulse
- FAILED:     Red glow, X badge, error tooltip
- SKIPPED:    Dashed outline, skip icon
```

Connection line animations:
- **Pending**: Dashed gray line
- **Active**: Animated gradient flow (cyan → violet → cyan)
- **Completed**: Solid green line with traveling particles
- **Failed**: Red line with X marker

### 5.4 Component Palette

```
┌─────────────────────────────────────┐
│  COMPONENT PALETTE                  │
├─────────────────────────────────────┤
│  🔍 ANALYZERS                    ▼  │
│  ├─ Console Statements              │
│  ├─ TypeScript Any Types            │
│  ├─ Unused Imports                  │
│  ├─ Large Files                     │
│  ├─ Long Functions                  │
│  ├─ Cyclomatic Complexity           │
│  ├─ Code Duplication                │
│  └─ + 6 more...                     │
├─────────────────────────────────────┤
│  ⚙️ PROCESSORS                   ▼  │
│  ├─ Filter                          │
│  ├─ Group                           │
│  ├─ Priority Ranker                 │
│  ├─ Batch Creator                   │
│  └─ Decision Builder                │
├─────────────────────────────────────┤
│  🚀 EXECUTORS                    ▼  │
│  ├─ Requirement Generator           │
│  ├─ Batch Task Runner               │
│  ├─ Git Operations                  │
│  └─ Context Updater                 │
├─────────────────────────────────────┤
│  ✅ TESTERS                      ▼  │
│  ├─ Build Verification              │
│  ├─ Type Check                      │
│  └─ Unit Tests                      │
└─────────────────────────────────────┘
```

---

## 6. Progress Panel Design

### 6.1 Floating Progress Panel

The progress panel floats at the bottom-right (like GlobalTaskBar) but shows blueprint-specific information:

```
┌──────────────────────────────────────────────────────────────┐
│  BLUEPRINT EXECUTION                                    ─ □ X │
├──────────────────────────────────────────────────────────────┤
│  Code Quality Scan                              ▶ RUNNING     │
│  ═══════════════════════════════░░░░░░░░░░░░░  67%           │
│                                                               │
│  Phase: Analyzing                                             │
│  Current: Detecting unused imports in 234 files               │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Pipeline Progress                                       │ │
│  │                                                          │ │
│  │  ✅ Console Scan ────────→ ✅ Any Types ───────→        │ │
│  │                                           ↓              │ │
│  │  🔄 Unused Imports ←───── ✅ Large Files ←──────        │ │
│  │         ↓                                                │ │
│  │  ⏳ Priority Ranker ────→ ⏳ Decision Builder            │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Stats: 45 issues found │ 12 decisions queued │ 3:24 elapsed  │
│                                                               │
│  [ Pause ]  [ View Details ]  [ Cancel ]                      │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Collapsed State

```
┌───────────────────────────────────────────────────────┐
│  🔄 Code Quality Scan  67%  │  45 issues  │  3:24    ▲│
└───────────────────────────────────────────────────────┘
```

---

## 7. Preset Blueprints

### 7.1 Built-in Presets

These are the default blueprints that replace current preset scans:

**1. Code Quality Scan**
```yaml
name: Code Quality Scan
nodes:
  - analyzer.console
  - analyzer.any-types
  - analyzer.unused-imports
  - processor.filter (severity >= medium)
  - processor.group (by category)
  - processor.decision
```

**2. Maintainability Scan**
```yaml
name: Maintainability Scan
nodes:
  - analyzer.large-files
  - analyzer.long-functions
  - analyzer.complexity
  - analyzer.duplication
  - processor.prioritize (by effort/impact)
  - processor.batch (max 5)
  - processor.decision
```

**3. Full Project Analysis**
```yaml
name: Full Project Analysis
nodes:
  - analyzer.console
  - analyzer.any-types
  - analyzer.unused-imports
  - analyzer.large-files
  - analyzer.long-functions
  - analyzer.complexity
  - analyzer.duplication
  - analyzer.magic-numbers
  - analyzer.react-hooks
  - analyzer.client-server
  - processor.merge
  - processor.filter
  - processor.prioritize
  - processor.batch
  - executor.requirement
  - executor.batch-runner
  - tester.build
  - tester.type-check
```

**4. Security Audit**
```yaml
name: Security Audit
nodes:
  - analyzer.security
  - analyzer.dependencies
  - processor.filter (category = security)
  - processor.prioritize (severity first)
  - processor.decision
```

**5. Quick Cleanup**
```yaml
name: Quick Cleanup
nodes:
  - analyzer.console
  - analyzer.unused-imports
  - processor.filter (autoFixAvailable = true)
  - executor.requirement
  - executor.single-runner
```

---

## 8. API Endpoints

### 8.1 Blueprint Configuration API

```
GET    /api/blueprints                    - List all blueprints
POST   /api/blueprints                    - Create new blueprint
GET    /api/blueprints/:id                - Get blueprint by ID
PUT    /api/blueprints/:id                - Update blueprint
DELETE /api/blueprints/:id                - Delete blueprint
POST   /api/blueprints/:id/duplicate      - Duplicate blueprint
POST   /api/blueprints/:id/export         - Export as JSON
POST   /api/blueprints/import             - Import from JSON
```

### 8.2 Blueprint Execution API

```
POST   /api/blueprints/:id/execute        - Start execution
GET    /api/blueprints/executions         - List all executions
GET    /api/blueprints/executions/:id     - Get execution status
POST   /api/blueprints/executions/:id/pause   - Pause execution
POST   /api/blueprints/executions/:id/resume  - Resume execution
POST   /api/blueprints/executions/:id/cancel  - Cancel execution
GET    /api/blueprints/executions/:id/nodes   - Get node execution details
```

### 8.3 Component Registry API

```
GET    /api/blueprints/components         - List all available components
GET    /api/blueprints/components/:id     - Get component details
GET    /api/blueprints/components/:id/schema  - Get config schema
```

---

## 9. Migration Strategy

### 9.1 Phase 1: Foundation (Infrastructure)
1. Create database tables
2. Implement base component classes
3. Create component registry
4. Build BlueprintEngine core

### 9.2 Phase 2: Component Extraction
1. Extract static scans from `src/lib/scan/` into analyzer components
2. Extract prompts from various locations into `src/lib/blueprint/prompts/`
3. Create processor components from existing logic
4. Wrap Claude Code execution in executor components

### 9.3 Phase 3: Preset Migration
1. Convert existing blueprint scans to preset blueprints
2. Map old scan IDs to new blueprint configs
3. Maintain backward compatibility with events/badges

### 9.4 Phase 4: Visual Editor
1. Implement BlueprintCanvas component
2. Create ComponentPalette
3. Build node configuration panels
4. Implement drag-and-drop

### 9.5 Phase 5: Execution System
1. Implement PipelineExecutor
2. Create BlueprintProgressPanel
3. Integrate with existing DecisionQueue
4. Add background execution support

### 9.6 Phase 6: Polish & Testing
1. Build preset blueprint library
2. Add component documentation
3. Create user tutorials
4. Performance optimization

---

## 10. Success Metrics

### 10.1 User Experience
- Time to create custom blueprint: < 5 minutes
- Blueprint execution visibility: 100% (always know what's running)
- Learning curve: Users can create first custom blueprint within 15 minutes

### 10.2 Technical
- Component reuse rate: > 80% of code shared between presets
- Execution reliability: 99%+ success rate for valid blueprints
- Performance: < 100ms UI response during execution

### 10.3 Extensibility
- Time to add new analyzer: < 1 hour
- Lines of code per new component: < 200
- Zero changes to core engine when adding components

---

## Appendix A: Example Component Implementation

```typescript
// src/lib/blueprint/components/analyzers/ConsoleAnalyzer.ts

import { BaseAnalyzer, ExecutionContext, ValidationResult } from '../base';
import { detectConsoleStatements } from '@/lib/scan/patterns/code-quality';

interface ConsoleAnalyzerConfig {
  severity: 'low' | 'medium' | 'high';
  includeDebug: boolean;
  includeInfo: boolean;
  excludePatterns: string[];
}

interface ConsoleIssue {
  file: string;
  line: number;
  type: 'log' | 'warn' | 'error' | 'debug' | 'info';
  code: string;
}

export class ConsoleAnalyzer extends BaseAnalyzer<ConsoleAnalyzerConfig, ConsoleIssue[]> {
  readonly id = 'analyzer.console';
  readonly name = 'Console Statements';

  async execute(_: void, context: ExecutionContext): Promise<ConsoleIssue[]> {
    const issues: ConsoleIssue[] = [];

    // Get project files
    const files = await this.getProjectFiles(context.projectPath, ['**/*.ts', '**/*.tsx']);
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      if (context.isCancelled()) break;

      const file = files[i];
      context.reportProgress(Math.round((i / totalFiles) * 100), `Scanning ${file}`);

      const content = await this.readFile(file);
      const detected = detectConsoleStatements(content);

      for (const item of detected) {
        // Apply config filters
        if (!this.config.includeDebug && item.type === 'debug') continue;
        if (!this.config.includeInfo && item.type === 'info') continue;
        if (this.config.excludePatterns.some(p => file.includes(p))) continue;

        issues.push({
          file,
          line: item.lineNumber,
          type: item.type,
          code: item.code,
        });
      }
    }

    context.log('info', `Found ${issues.length} console statements`);
    return issues;
  }

  validateConfig(config: ConsoleAnalyzerConfig): ValidationResult {
    if (!['low', 'medium', 'high'].includes(config.severity)) {
      return { valid: false, errors: ['Invalid severity level'] };
    }
    return { valid: true };
  }

  getConfigSchema(): JSONSchema {
    return {
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          default: 'medium',
          description: 'Minimum severity to report',
        },
        includeDebug: {
          type: 'boolean',
          default: true,
          description: 'Include console.debug statements',
        },
        includeInfo: {
          type: 'boolean',
          default: true,
          description: 'Include console.info statements',
        },
        excludePatterns: {
          type: 'array',
          items: { type: 'string' },
          default: ['node_modules', '.test.', '.spec.'],
          description: 'File patterns to exclude',
        },
      },
    };
  }

  getOutputTypes(): string[] {
    return ['ConsoleIssue[]'];
  }
}
```

---

## Appendix B: Preset Blueprint JSON Example

```json
{
  "id": "preset-code-quality",
  "name": "Code Quality Scan",
  "description": "Detect common code quality issues including console statements, any types, and unused imports",
  "blueprintType": "preset",
  "canvasData": {
    "zoom": 1,
    "viewport": { "x": 0, "y": 0 }
  },
  "nodes": [
    {
      "id": "node-1",
      "type": "analyzer",
      "componentId": "analyzer.console",
      "position": { "x": 100, "y": 100 },
      "config": {
        "severity": "medium",
        "includeDebug": false,
        "includeInfo": false,
        "excludePatterns": ["node_modules", ".test.", ".spec."]
      }
    },
    {
      "id": "node-2",
      "type": "analyzer",
      "componentId": "analyzer.any-types",
      "position": { "x": 100, "y": 250 },
      "config": {
        "threshold": 5
      }
    },
    {
      "id": "node-3",
      "type": "analyzer",
      "componentId": "analyzer.unused-imports",
      "position": { "x": 100, "y": 400 },
      "config": {}
    },
    {
      "id": "node-4",
      "type": "processor",
      "componentId": "processor.merge",
      "position": { "x": 350, "y": 250 },
      "config": {}
    },
    {
      "id": "node-5",
      "type": "processor",
      "componentId": "processor.filter",
      "position": { "x": 550, "y": 250 },
      "config": {
        "minSeverity": "medium"
      }
    },
    {
      "id": "node-6",
      "type": "processor",
      "componentId": "processor.decision",
      "position": { "x": 750, "y": 250 },
      "config": {
        "groupBy": "category"
      }
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-1", "target": "node-4" },
    { "id": "edge-2", "source": "node-2", "target": "node-4" },
    { "id": "edge-3", "source": "node-3", "target": "node-4" },
    { "id": "edge-4", "source": "node-4", "target": "node-5" },
    { "id": "edge-5", "source": "node-5", "target": "node-6" }
  ],
  "executionMode": "parallel",
  "autoExecute": false,
  "requireApproval": true,
  "icon": "Search",
  "color": "#06b6d4",
  "tags": ["code-quality", "cleanup", "quick"]
}
```

---

*Document Version: 1.0.0*
*Last Updated: 2024*
*Author: Vibeman Architecture Team*
