# Task Runner Store Migration Guide

## Overview

This document guides you through migrating from the localStorage-based batch management to the centralized Zustand store. The new store provides:

✅ **Better batch isolation** - Each batch only processes its own tasks
✅ **Task offloading** - Move queued tasks between batches
✅ **Centralized state** - Single source of truth for all batch/task state
✅ **Auto-recovery** - Continues interrupted batches after page reload
✅ **Per-batch pause/resume** - Independent control of each batch
✅ **Cleaner code** - No more prop drilling or scattered state logic

## Architecture Changes

### Before (Old System)
```
TaskRunnerHeader
  ├─ useState for each batch
  ├─ useRef for execution queue
  ├─ useEffect for batch recovery
  ├─ Manual localStorage sync
  └─ taskExecutor.ts (stateless functions)
```

### After (New System)
```
useTaskRunnerStore (Zustand)
  ├─ All batch state
  ├─ All task state
  ├─ Execution logic
  ├─ Auto localStorage persistence
  └─ Recovery logic

Components (React)
  └─ useTaskRunnerHooks (selectors & actions)
```

## Store Structure

```typescript
{
  // Batch State (up to 4 batches)
  batches: {
    batch1: { id, name, taskIds, status, completedCount, failedCount },
    batch2: { ... },
    batch3: { ... },
    batch4: { ... }
  },

  // Task State (all tasks across all batches)
  tasks: {
    'task-1': { id, batchId, status, startedAt, completedAt, error },
    'task-2': { ... },
    ...
  },

  // Execution State
  executingTasks: Set<string>, // Currently running task IDs
  isPaused: boolean,

  // Git Configuration
  gitConfig: { enabled, commands, commitMessage }
}
```

## Key Concepts

### 1. Task Isolation
Each batch now has a dedicated list of task IDs (`taskIds` array). Tasks are tagged with their `batchId`, ensuring no cross-contamination.

**Before:**
```typescript
// All tasks in one queue, batch assignment was loose
executionQueueRef.current = ['task1', 'task2', 'task3', ...];
```

**After:**
```typescript
// Each batch has its own task list
batches.batch1.taskIds = ['task1', 'task2'];
batches.batch2.taskIds = ['task3', 'task4'];

// Tasks know their batch
tasks['task1'] = { id: 'task1', batchId: 'batch1', ... };
```

### 2. Execution Control
The store ensures only one task per batch runs at a time, but multiple batches can run in parallel.

```typescript
// Check if batch can start a new task
const canStart = store.canStartTask('batch1'); // false if already running a task

// Get next queued task for a specific batch
const nextTask = store.getNextTaskForBatch('batch1');
```

### 3. Task Offloading
New feature! Move queued tasks from one batch to another.

```typescript
// Move specific tasks
store.offloadTasks('batch1', 'batch2', ['task-5', 'task-6']);

// Or move individual task
store.moveTask('task-5', 'batch1', 'batch2');
```

## Migration Steps

### Step 1: Remove Old State Management

**In TaskRunnerHeader.tsx**, remove:

```typescript
// ❌ Remove these
const [batch1, setBatch1] = useState<BatchState | null>(null);
const [batch2, setBatch2] = useState<BatchState | null>(null);
const [batch3, setBatch3] = useState<BatchState | null>(null);
const [batch4, setBatch4] = useState<BatchState | null>(null);
const executionQueueRef = useRef<string[]>([]);
const isExecutingRef = useRef(false);

// ❌ Remove all recovery useEffect logic

// ❌ Remove manual batch update functions
```

### Step 2: Add Store Hooks

**In TaskRunnerHeader.tsx**, add:

```typescript
import {
  useAllBatches,
  useCreateBatch,
  useStartBatchExecution,
  useStoreRecovery
} from './store';

function TaskRunnerHeader({ requirements, ... }) {
  // Initialize store and recover from localStorage
  useStoreRecovery(requirements);

  // Get all batch states
  const batches = useAllBatches();

  // Get actions
  const createBatch = useCreateBatch();
  const startBatchExecution = useStartBatchExecution();

  // ... rest of component
}
```

### Step 3: Update Batch Creation

**Before:**
```typescript
const handleCreateBatch = (batchId) => {
  const batch = BatchStorage.createBatch(...);
  setBatch1(batch); // or setBatch2, etc.
  BatchStorage.save({ ...currentState, [batchId]: batch });
};
```

**After:**
```typescript
const handleCreateBatch = (batchId: BatchId) => {
  const selectedIds = Array.from(selectedRequirements);
  createBatch(batchId, `Batch ${batchId}`, selectedIds);
};
```

### Step 4: Update Batch Start Logic

**Before:**
```typescript
const handleStartBatch = (batchId) => {
  setBatch1({ ...batch1, status: 'running' });
  executionQueueRef.current = [...batch1.requirementIds];
  setTimeout(() => executeNextRequirement(), 500);
};
```

**After:**
```typescript
const handleStartBatch = (batchId: BatchId) => {
  startBatchExecution(batchId, requirements);
};
```

### Step 5: Update Batch Display

**In TaskRunnerLayout.tsx or DualBatchPanel.tsx:**

**Before:**
```typescript
<BatchPanel
  batch={batch1}
  onStart={() => handleStartBatch('batch1')}
  onPause={() => handlePauseBatch('batch1')}
  ...
/>
```

**After:**
```typescript
import { useBatch, useBatchActions, useBatchTasks } from './store';

function BatchPanel({ batchId }: { batchId: BatchId }) {
  const batch = useBatch(batchId);
  const actions = useBatchActions(batchId);
  const tasks = useBatchTasks(batchId);

  return (
    <div>
      <button onClick={actions.start}>Start</button>
      <button onClick={actions.pause}>Pause</button>
      <button onClick={actions.resume}>Resume</button>
      {/* Display tasks */}
      {tasks.map(task => (
        <div key={task.id}>{task.status}</div>
      ))}
    </div>
  );
}
```

### Step 6: Add Auto-Execution Monitor

**In each batch panel component:**

```typescript
import { useAutoExecution, useExecutionMonitor } from './store';

function BatchPanel({ batchId, requirements }) {
  // Automatically start execution when batch is running
  useAutoExecution(batchId, requirements);

  // Monitor task completion and restart execution
  useExecutionMonitor(batchId, requirements);

  // ... rest of component
}
```

### Step 7: Remove Old taskExecutor.ts Logic

The store now handles execution internally. You can remove or simplify `taskExecutor.ts`:

**Keep:**
- Helper functions like `checkApiHealth()`
- Git integration functions
- Screenshot capture functions

**Remove:**
- `executeNextRequirement()` function (now in store)
- `updateBatchProgress()` function (now in store)
- Global `executingRequirements` Set (now in store)

## New Features

### Feature 1: Task Offloading UI

Create a component to offload tasks from one batch to another:

```typescript
import { useOffloadTasks, useAvailableBatchesForOffload, useBatchTasks } from './store';

function TaskOffloadPanel({ sourceBatchId }: { sourceBatchId: BatchId }) {
  const offloadTasks = useOffloadTasks();
  const availableBatches = useAvailableBatchesForOffload(sourceBatchId);
  const tasks = useBatchTasks(sourceBatchId);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [targetBatch, setTargetBatch] = useState<BatchId | null>(null);

  const queuedTasks = tasks.filter(t => t.status === 'queued');

  const handleOffload = () => {
    if (!targetBatch || selectedTasks.length === 0) return;
    offloadTasks(sourceBatchId, targetBatch, selectedTasks);
    setSelectedTasks([]);
  };

  return (
    <div>
      <h3>Offload Tasks to Another Batch</h3>
      <div>
        {queuedTasks.map(task => (
          <label key={task.id}>
            <input
              type="checkbox"
              checked={selectedTasks.includes(task.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedTasks([...selectedTasks, task.id]);
                } else {
                  setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                }
              }}
            />
            {task.id}
          </label>
        ))}
      </div>
      <select value={targetBatch || ''} onChange={(e) => setTargetBatch(e.target.value as BatchId)}>
        <option value="">Select target batch</option>
        {availableBatches.map(batchId => (
          <option key={batchId} value={batchId}>{batchId}</option>
        ))}
      </select>
      <button onClick={handleOffload} disabled={!targetBatch || selectedTasks.length === 0}>
        Offload {selectedTasks.length} task(s)
      </button>
    </div>
  );
}
```

### Feature 2: Overall Progress Display

```typescript
import { useOverallProgress } from './store';

function OverallProgressBar() {
  const progress = useOverallProgress();

  return (
    <div>
      <div>Total: {progress.total}</div>
      <div>Completed: {progress.completed}</div>
      <div>Failed: {progress.failed}</div>
      <div>Remaining: {progress.remaining}</div>
      <div>Progress: {progress.percentage}%</div>
      <progress value={progress.completed} max={progress.total} />
    </div>
  );
}
```

### Feature 3: Git Configuration

```typescript
import { useGitConfig } from './store';

function GitConfigPanel() {
  const { gitConfig, setGitConfig } = useGitConfig();

  const handleToggle = () => {
    if (gitConfig) {
      setGitConfig(null);
    } else {
      setGitConfig({
        enabled: true,
        commands: ['git add .', 'git commit -m "{message}"'],
        commitMessage: 'Auto-commit: {requirementName}'
      });
    }
  };

  return (
    <div>
      <button onClick={handleToggle}>
        {gitConfig ? 'Disable' : 'Enable'} Git Integration
      </button>
    </div>
  );
}
```

## Testing the Migration

### Test 1: Batch Isolation
1. Create batch1 with 3 tasks
2. Create batch2 with 3 tasks
3. Start both batches
4. Verify each batch only processes its own tasks
5. Check that tasks don't jump between batches

### Test 2: Recovery
1. Create a batch and start it
2. Reload the page mid-execution
3. Verify the batch recovers and continues
4. Verify task states are preserved

### Test 3: Pause/Resume Per Batch
1. Create 2 batches and start both
2. Pause batch1 while keeping batch2 running
3. Verify batch1 stops but batch2 continues
4. Resume batch1 and verify it continues

### Test 4: Task Offloading
1. Create batch1 with 5 queued tasks
2. Create empty batch2
3. Offload 2 tasks from batch1 to batch2
4. Start batch2
5. Verify offloaded tasks run in batch2

### Test 5: Multi-Batch Parallelism
1. Create 4 batches with 2 tasks each
2. Start all 4 batches
3. Verify all 4 run in parallel (4 tasks executing simultaneously)
4. Verify completion tracking is accurate per batch

## Troubleshooting

### Issue: Tasks not starting after migration

**Solution:** Ensure you're using `useAutoExecution` and `useExecutionMonitor` hooks in your batch panel components.

### Issue: Store state not persisting

**Solution:** Check that `zustand/middleware` persist is properly configured. The store automatically saves to localStorage.

### Issue: Multiple tasks from same batch running

**Solution:** This shouldn't happen. Check `canStartTask()` logic in the store.

### Issue: Tasks showing in wrong batch

**Solution:** Verify task IDs are unique and that `batchId` is correctly set when creating tasks.

## Benefits Summary

| Feature | Before | After |
|---------|--------|-------|
| Batch Isolation | ❌ Weak | ✅ Strong |
| Task Offloading | ❌ No | ✅ Yes |
| Per-Batch Pause | ⚠️ Complex | ✅ Simple |
| State Persistence | ⚠️ Manual | ✅ Auto |
| Code Complexity | ❌ High | ✅ Low |
| Parallel Execution | ⚠️ Buggy | ✅ Reliable |
| Recovery | ⚠️ Partial | ✅ Complete |

## Next Steps

1. ✅ Store created
2. ⏳ Migrate TaskRunnerHeader
3. ⏳ Migrate TaskRunnerLayout
4. ⏳ Add Task Offloading UI
5. ⏳ Test all scenarios
6. ⏳ Remove old batchStorage.ts
7. ⏳ Simplify taskExecutor.ts

## Support

If you encounter issues during migration, check:
- Store hooks are imported correctly
- `requirements` array is passed to execution hooks
- Batch IDs match between components
- LocalStorage is not corrupted (clear if needed)
