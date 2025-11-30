# TaskRunner Component Patterns

This document describes the expected prop shapes, data flows, and usage patterns for TaskRunner components. Use this as a reference when extending or testing TaskRunner functionality.

## Table of Contents

1. [Core Data Types](#core-data-types)
2. [Components Overview](#components-overview)
3. [Data Flow](#data-flow)
4. [Mock Data Generation](#mock-data-generation)
5. [Testing Patterns](#testing-patterns)

---

## Core Data Types

### ProjectRequirement

Represents a single requirement file that can be executed by Claude Code.

```typescript
interface ProjectRequirement {
  projectId: string;          // Unique project identifier
  projectName: string;        // Human-readable project name
  projectPath: string;        // Absolute file system path
  requirementName: string;    // Requirement filename (without .md)
  status: RequirementStatus;  // Current execution status
  taskId?: string;            // Task ID when queued/running
  batchId?: BatchId | null;   // Which batch this belongs to
}

type RequirementStatus =
  | 'idle'           // Not scheduled
  | 'queued'         // In batch queue
  | 'running'        // Currently executing
  | 'completed'      // Finished successfully
  | 'failed'         // Execution failed
  | 'session-limit'; // Hit Claude session limit
```

### BatchState

Represents a batch of tasks to execute.

```typescript
interface BatchState {
  id: string;                 // Unique batch identifier
  name: string;               // Display name (e.g., "Batch 1")
  taskIds: string[];          // Array of task IDs in this batch
  status: BatchStatusUnion;   // Discriminated union for status
  completedCount: number;     // Successfully completed tasks
  failedCount: number;        // Failed tasks
}

type BatchStatusUnion =
  | { type: 'idle' }
  | { type: 'running'; startedAt: number; currentTaskId?: string }
  | { type: 'paused'; startedAt: number; pausedAt: number }
  | { type: 'completed'; startedAt: number; completedAt: number; totalDuration: number };

type BatchId = 'batch1' | 'batch2' | 'batch3' | 'batch4';
```

### TaskState

Represents the state of an individual task within a batch.

```typescript
interface TaskState {
  id: string;               // Task ID (format: "projectId:requirementName")
  batchId: BatchId;         // Which batch owns this task
  status: TaskStatusUnion;  // Discriminated union for status
}

type TaskStatusUnion =
  | { type: 'queued' }
  | { type: 'running'; startedAt: number; progress?: number }
  | { type: 'completed'; completedAt: number; duration?: number }
  | { type: 'failed'; error: string; completedAt: number; isSessionLimit?: boolean };
```

---

## Components Overview

### TaskItem

Individual requirement card showing status and allowing selection.

**Props:**
```typescript
interface TaskItemProps {
  requirement: ProjectRequirement;  // The requirement data
  isSelected: boolean;              // Whether item is selected
  onToggleSelect: () => void;       // Selection callback
  onDelete: () => void;             // Delete callback
  projectPath: string;              // Path for editing
}
```

**Key Behaviors:**
- Shows status icon based on `requirement.status`
- Disabled (not selectable) when status is `running` or `queued`
- Right-click opens context menu with Edit/Delete options
- Selection shows green dot indicator

**Visual States:**
| Status | Border | Background | Icon |
|--------|--------|------------|------|
| idle | gray-700/30 | gray-800/20 | FileCode (gray) |
| queued | amber-500/40 | amber-500/5 | Clock (amber) |
| running | blue-500/40 | blue-500/5 | Loader2 (spinning) |
| completed | green-500/40 | green-500/5 | CheckCircle2 (green) |
| failed | red-500/40 | red-500/5 | XCircle (red) |
| session-limit | red-500/40 | red-500/5 | XCircle (red) |

### TaskColumn

Project column grouping requirements with selection controls.

**Props:**
```typescript
interface TaskColumnProps {
  projectId: string;
  projectName: string;
  requirements: ProjectRequirement[];
  selectedRequirements: Set<string>;
  onToggleSelect: (reqId: string) => void;
  onDelete: (reqId: string) => void;
  onToggleProjectSelection: (projectId: string) => void;
  getRequirementId: (req: ProjectRequirement) => string;
}
```

**Key Behaviors:**
- Header checkbox toggles all selectable requirements
- Requirements sorted by status (idle → queued → running → failed → completed)
- Shows selected/total count in header
- Scrollable list with max height

### DualBatchPanel

Batch management panel showing up to 4 concurrent batches.

**Props:**
```typescript
interface DualBatchPanelProps {
  batch1: BatchState | null;
  batch2: BatchState | null;
  batch3?: BatchState | null;
  batch4?: BatchState | null;
  onStartBatch: (batchId: BatchId) => void;
  onPauseBatch: (batchId: BatchId) => void;
  onResumeBatch: (batchId: BatchId) => void;
  onClearBatch: (batchId: BatchId) => void;
  onCreateBatch: (batchId: BatchId) => void;
  selectedCount: number;
  requirements: ProjectRequirement[];
  getRequirementId: (req: ProjectRequirement) => string;
}
```

**Key Behaviors:**
- Shows "Create batch" when slot is empty
- Progress bar shows completed/total percentage
- Queue visualization shows recent tasks with status icons
- Auto-clears completed batches after 3 seconds
- Batch 2-4 only shown when batch 1 is running or they exist

---

## Data Flow

### 1. Requirements Loading

```
Page Load
    ↓
Load projects from projectConfigStore
    ↓
For each project: fetch requirements via API
    ↓
Map to ProjectRequirement objects
    ↓
Store in component state
    ↓
Merge with store tasks for status
```

### 2. Batch Creation

```
User selects requirements
    ↓
Clicks "Create batch"
    ↓
onCreateBatch(batchId) called
    ↓
Store creates BatchState with taskIds
    ↓
Creates TaskState for each requirement
    ↓
Requirements get status 'queued'
```

### 3. Batch Execution

```
User clicks "Start"
    ↓
Batch status → 'running'
    ↓
executeNextTask() called
    ↓
First queued task → 'running'
    ↓
Polling starts for task completion
    ↓
On complete: task → 'completed', next task starts
    ↓
When all done: batch → 'completed'
```

### 4. Status Merging

```typescript
// In TaskRunnerLayout
const requirementsWithStatus = useMemo(() => {
  return requirements.map((req) => {
    const reqId = getRequirementId(req);
    const task = storeTasks[reqId];

    if (task) {
      return {
        ...req,
        status: taskStatusToLegacy(task.status),
      };
    }

    return req;
  });
}, [requirements, storeTasks]);
```

---

## Mock Data Generation

### Basic Requirement

```typescript
import { createMockRequirement } from './testing/mockGenerators';

const req = createMockRequirement({
  projectId: 'my-project',
  projectName: 'My Project',
  requirementName: 'add-feature',
  status: 'idle',
});
```

### Multiple Requirements

```typescript
import { createMockRequirementsForProject } from './testing/mockGenerators';

const requirements = createMockRequirementsForProject('project-1', 5, {
  projectName: 'Frontend App',
});
```

### Mixed Statuses

```typescript
import { createMixedStatusRequirements } from './testing/mockGenerators';

// Creates one requirement for each status
const mixed = createMixedStatusRequirements('project-1');
```

### Batch Execution Scenario

```typescript
import { createBatchExecutionScenario } from './testing/mockGenerators';

const { requirements, tasks } = createBatchExecutionScenario('batch1');
// Returns: 2 completed, 1 running, 3 queued, 1 failed
```

### Complete Test Scenario

```typescript
import { createTaskRunnerScenario } from './testing/mockGenerators';

const { requirements, batches, tasks, selectedRequirements } = createTaskRunnerScenario();
// Full setup with 3 projects, running batch, and selections
```

---

## Testing Patterns

### Unit Test Setup

```typescript
import {
  createMockRequirement,
  createRunningBatch,
} from '../testing/mockGenerators';
import {
  getRequirementId,
  createTrackingActions,
} from '../testing/testUtils';

describe('TaskItem', () => {
  it('should call onToggleSelect when clicked', () => {
    const { handlers, wasActionCalled } = createTrackingActions();
    const req = createMockRequirement({ status: 'idle' });

    // Render and click...

    expect(wasActionCalled('toggleSelect')).toBe(true);
  });
});
```

### Story Development

```typescript
import { createMockRequirement } from '../mockGenerators';
import type { ProjectRequirement } from '../../lib/types';

export function MyStory() {
  const requirement = createMockRequirement({
    requirementName: 'example-task',
    status: 'running',
  });

  return (
    <TaskItem
      requirement={requirement}
      isSelected={false}
      onToggleSelect={() => {}}
      onDelete={() => {}}
      projectPath={requirement.projectPath}
    />
  );
}
```

### Validation

```typescript
import { isValidRequirement, isValidBatchState } from '../testUtils';

// Validate data shapes
if (!isValidRequirement(data)) {
  throw new Error('Invalid requirement structure');
}
```

---

## Common Patterns

### Getting Requirement ID

Always use the composite ID format:

```typescript
const getRequirementId = (req: ProjectRequirement) =>
  `${req.projectId}:${req.requirementName}`;
```

### Checking Selectability

Requirements in `running` or `queued` state cannot be selected:

```typescript
const isSelectable = (req: ProjectRequirement) =>
  req.status !== 'running' && req.status !== 'queued';
```

### Status Type Guards

Use the type guards from `lib/types.ts`:

```typescript
import {
  isTaskQueued,
  isTaskRunning,
  isTaskCompleted,
  isTaskFailed,
  isBatchRunning,
} from '../lib/types';

if (isTaskRunning(task.status)) {
  // TypeScript knows status.startedAt exists
  console.log(task.status.startedAt);
}
```

### Creating Status Objects

Use the factory functions:

```typescript
import {
  createQueuedStatus,
  createRunningStatus,
  createCompletedStatus,
  createFailedStatus,
} from '../lib/types';

const status = createRunningStatus(Date.now(), 50); // 50% progress
```

---

## File Structure

```
TaskRunner/
├── testing/
│   ├── COMPONENT_PATTERNS.md    # This file
│   ├── mockGenerators.ts        # Factory functions for mock data
│   ├── testUtils.ts             # Testing utilities and helpers
│   └── stories/
│       ├── index.tsx            # Stories overview and test runner
│       ├── TaskItem.stories.tsx
│       ├── TaskColumn.stories.tsx
│       └── DualBatchPanel.stories.tsx
├── components/
│   ├── DualBatchPanel.tsx
│   ├── QueueVisualization.tsx
│   └── ...
├── lib/
│   ├── types.ts                 # Type definitions
│   └── ...
├── store/
│   └── taskRunnerStore.ts       # Zustand store
├── TaskItem.tsx
├── TaskColumn.tsx
└── TaskRunnerLayout.tsx
```

---

## Quick Reference

### Status Priority (Sort Order)
1. idle (0)
2. queued (1)
3. running (2)
4. failed (3)
5. session-limit (4)
6. completed (5)

### Batch IDs
- `batch1` - Always visible
- `batch2` - Shows when batch1 running or exists
- `batch3` - Shows when any batch running or exists
- `batch4` - Shows when any batch running or exists

### Test IDs (data-testid)
- `create-batch-{batchId}-btn`
- `start-batch-{batchId}-btn`
- `pause-batch-{batchId}-btn`
- `resume-batch-{batchId}-btn`
- `clear-batch-{batchId}-btn`
- `claude-log-viewer-button`
