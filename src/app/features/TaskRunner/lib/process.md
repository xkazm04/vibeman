# TaskRunner Feature - Process Documentation

## Overview

TaskRunner is a batch execution system for running Claude Code tasks automatically. It supports up to 4 concurrent batches with parallel execution, progress tracking, error recovery, and Git integration.

## Architecture

### Dual Store Pattern

The TaskRunner uses two complementary execution patterns:

1. **Zustand Store** (`store/taskRunnerStore.ts`) - **Primary state management (ACTIVE)**
   - Persists to localStorage via zustand/middleware
   - Manages batches, tasks, and execution state
   - Handles polling recovery after page refresh
   - Uses module-level requirements cache for task continuation

2. **Task Executor** (`lib/taskExecutor.ts`) - **Legacy execution logic (DEPRECATED)**
   - Provides `executeNextRequirement()` for queue-based execution
   - Includes retry logic and health checks
   - ⚠️ **DO NOT USE** - Maintained only for backward compatibility reference

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| TaskRunnerStore | Zustand store for state management | `store/taskRunnerStore.ts` |
| TaskExecutor | Execution logic with retry handling | `lib/taskExecutor.ts` |
| BatchStorage | localStorage persistence helper | `lib/batchStorage.ts` |
| TaskRunnerHeader | Main UI with batch controls | `TaskRunnerHeader.tsx` |
| DualBatchPanel | Batch visualization and controls | `components/DualBatchPanel.tsx` |

---

## Process Flow

### Phase 1: Batch Creation

| Step | Action | Location |
|------|--------|----------|
| 1.1 | User selects requirements from task list | `TaskRunnerLayout.tsx` |
| 1.2 | User clicks "Create Batch" button | `TaskRunnerHeader.tsx:72-91` |
| 1.3 | Store creates batch with task IDs | `taskRunnerStore.ts:133-163` |
| 1.4 | Requirements updated with `batchId` and status='queued' | `TaskRunnerHeader.tsx:79-87` |
| 1.5 | Batch state persisted to localStorage | `taskRunnerStore.ts:719-729` |

### Phase 2: Batch Execution Start

| Step | Action | Location |
|------|--------|----------|
| 2.1 | User clicks "Start" on batch panel | `TaskRunnerHeader.tsx:93-99` |
| 2.2 | Batch status set to 'running' | `taskRunnerStore.ts:165-181` |
| 2.3 | `executeNextTask()` triggered | `taskRunnerStore.ts:397-526` |
| 2.4 | Global `isRunning` state updated | `TaskRunnerHeader.tsx:98` |

### Phase 3: Task Execution

| Step | Action | Location |
|------|--------|----------|
| 3.1 | Find next queued task for batch | `taskRunnerStore.ts:408-410` |
| 3.2 | Parse composite task ID (`projectId:requirementName`) | `taskRunnerStore.ts:419-435` |
| 3.3 | Locate requirement in requirements array | `taskRunnerStore.ts:427-435` |
| 3.4 | Mark task as 'running', add to executingTasks | `taskRunnerStore.ts:473-484` |
| 3.5 | Call `executeRequirementAsync()` API | `taskRunnerStore.ts:488-493` |
| 3.6 | API creates task in backend execution queue | `Claude/lib/requirementApi.ts:35-84` |
| 3.7 | Backend reads requirement `.md` file | `Claude/sub_ClaudeCodeManager/executionManager.ts:34-40` |
| 3.8 | Build execution prompt with context | `Claude/sub_ClaudeCodeManager/executionPrompt.ts:16-168` |
| 3.9 | Spawn Claude CLI process | `Claude/sub_ClaudeCodeManager/executionManager.ts:123-132` |
| 3.10 | Stream output to log file | `Claude/sub_ClaudeCodeManager/executionManager.ts:138-149` |

### Phase 4: Status Polling

| Step | Action | Location |
|------|--------|----------|
| 4.1 | Start polling with 10s interval | `taskRunnerStore.ts:755-848` |
| 4.2 | Store interval ID for recovery | `taskRunnerStore.ts:850-851` |
| 4.3 | Call `getTaskStatus()` API | `taskRunnerStore.ts:759` |
| 4.4 | Check for completion/failure/session-limit | `taskRunnerStore.ts:776-840` |
| 4.5 | Max 60 poll attempts (10 min timeout) | `taskRunnerStore.ts:750` |

### Phase 5: Task Completion

| Step | Action | Location |
|------|--------|----------|
| 5.1 | Update task status to 'completed' | `taskRunnerStore.ts:779` |
| 5.2 | Stop polling interval | `taskRunnerStore.ts:782` |
| 5.3 | Increment batch `completedCount` | `taskRunnerStore.ts:785-799` |
| 5.4 | Delete requirement `.md` file | `taskRunnerStore.ts:802-806` |
| 5.5 | Remove from `executingTasks` set | `taskRunnerStore.ts:797` |
| 5.6 | Trigger next task execution | `taskRunnerStore.ts:809` |
| 5.7 | Update idea status to 'implemented' | `taskExecutor.ts:446-456` |
| 5.8 | Trigger screenshot capture (optional) | `taskExecutor.ts:309-318` |

### Phase 6: Batch Completion

| Step | Action | Location |
|------|--------|----------|
| 6.1 | Check if all tasks processed | `taskRunnerStore.ts:411-416` |
| 6.2 | Call `completeBatch()` | `taskRunnerStore.ts:217-241` |
| 6.3 | Set batch status to 'completed' | `taskRunnerStore.ts:235` |
| 6.4 | Log completion stats | `taskRunnerStore.ts:224-228` |

---

## Error Handling

### Task Creation Errors

- **Retry Logic**: Up to 5 retries with exponential backoff (2s, 4s, 6s, 8s, 10s)
- **Transient Error Detection**: Next.js build errors, invalid JSON responses
- **Location**: `taskExecutor.ts:229-260`

### Polling Errors

- **Max Errors**: 15 consecutive errors before failure
- **Recovery**: Continues polling despite individual errors
- **Timeout**: 60 attempts (10 minutes)
- **Location**: `taskRunnerStore.ts:750`, `taskExecutor.ts:270-271`

### Task Failures

- **Status Update**: Task marked as 'failed' with error message
- **Batch Continuation**: Execution continues with next task
- **Count Tracking**: `failedCount` incremented
- **Location**: `taskRunnerStore.ts:812-839`

### Session Limit Detection

- **Detection**: Backend detects "Turn limit reached" in output
- **Action**: Queue cleared, all pending tasks reset to 'idle'
- **Location**: `taskExecutor.ts:352-363`

---

## Recovery System

### Page Refresh Recovery

| Step | Action | Location |
|------|--------|----------|
| R.1 | Load persisted state from localStorage | `taskRunnerStore.ts:719-729` |
| R.2 | Call `recoverFromStorage()` on mount | `TaskRunnerHeader.tsx:54` |
| R.3 | Validate tasks still exist in requirements | `taskRunnerStore.ts:628-643` |
| R.4 | Reconnect polling for running tasks | `taskRunnerStore.ts:669-689` |
| R.5 | Resume execution for queued tasks | `taskRunnerStore.ts:694` |

### Polling Reconnection

- Active polling intervals stored in `Map<string, NodeJS.Timeout>`
- On recovery, `startPollingForTask()` re-establishes monitoring
- Location: `taskRunnerStore.ts:740-752`

---

## Configuration Options

### Git Integration

| Setting | Storage Key | Default |
|---------|-------------|---------|
| Git Enabled | `taskRunner_gitEnabled` | `false` |
| Git Config | `taskRunner_gitConfig` | `null` |
| Commit Message Template | `taskRunner_gitConfig.commitMessageTemplate` | `Auto-commit: {requirementName}` |

**Default Git Commands**:
```javascript
['git add .', 'git commit -m "{commitMessage}"', 'git push']
```

### Screenshot Capture

| Setting | Storage Key | Default |
|---------|-------------|---------|
| Screenshot Enabled | `taskRunner_screenshotEnabled` | `false` |

### Batch Storage

| Storage Key | Purpose |
|-------------|---------|
| `taskRunner_batchState` | Legacy MultiBatchState persistence |
| `task-runner-storage` | Zustand store persistence |

---

## Data Types

### BatchState (Store)

```typescript
interface BatchState {
  id: string;                    // Unique batch identifier
  name: string;                  // Display name
  taskIds: string[];             // Array of task IDs (projectId:requirementName)
  status: 'idle' | 'running' | 'paused' | 'completed';
  startedAt: number | null;      // Timestamp
  completedAt?: number | null;   // Timestamp
  completedCount: number;        // Successful tasks
  failedCount: number;           // Failed tasks
}
```

### TaskState

```typescript
interface TaskState {
  id: string;           // Composite: "projectId:requirementName"
  batchId: BatchId;     // 'batch1' | 'batch2' | 'batch3' | 'batch4'
  status: 'queued' | 'running' | 'completed' | 'failed';
  error?: string;
  startedAt?: number;
  completedAt?: number;
}
```

### ProjectRequirement

```typescript
interface ProjectRequirement {
  projectId: string;
  projectName: string;
  projectPath: string;
  requirementName: string;
  status: 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'session-limit';
  taskId?: string;
  batchId?: BatchId | null;
}
```

---

## Execution Constraints

| Constraint | Value | Location |
|------------|-------|----------|
| Max Batches | 4 | `taskRunnerStore.ts:32` |
| Tasks per Batch Running | 1 | `taskRunnerStore.ts:600-610` |
| Poll Interval | 10 seconds | `taskRunnerStore.ts:848` |
| Max Poll Attempts | 60 (10 min) | `taskRunnerStore.ts:750` |
| Max Creation Retries | 5 | `taskExecutor.ts:231` |
| Max Poll Errors | 15 | `taskExecutor.ts:271` |
| Health Check Attempts | 5 | `taskExecutor.ts:213` |
| Health Check Delay | 2 seconds | `taskExecutor.ts:217` |

---

## Key Files & Artifacts

### Runtime Files

| File | Purpose |
|------|---------|
| `.claude/commands/<requirement>.md` | Requirement specification file |
| `.claude/logs/<requirement>_<timestamp>.log` | Execution output log |
| `.claude/logs/prompt_<timestamp>.txt` | Temporary execution prompt |

### Database Tables

| Table | Database | Purpose |
|-------|----------|---------|
| `implementation_log` | `database/goals.db` | Tracks implementation history |
| `ideas` | `database/goals.db` | Idea status updates |

### Context Files

| Pattern | Purpose |
|---------|---------|
| `contexts/<feature>/.context` | Context documentation updated by Claude |

---

## Parallel Execution Model

The TaskRunner supports parallel batch execution with isolation:

```
Batch 1: Task A (running) → Task B (queued) → Task C (queued)
Batch 2: Task D (running) → Task E (queued)
Batch 3: Task F (running)
Batch 4: [empty]
```

**Rules**:
- Each batch processes one task at a time
- Multiple batches can run simultaneously
- Paused batches skip their tasks in the queue
- Tasks cannot be moved while running

---

## API Integration

### Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/claude-code` | POST | Create and queue task |
| `/api/claude-code?action=status` | GET | Get task status |
| `/api/git/commit-and-push` | POST | Execute git operations |
| `/api/ideas/update-implementation-status` | POST | Update idea status |

### Frontend API Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `executeRequirementAsync()` | `Claude/lib/requirementApi.ts` | Start async task execution |
| `getTaskStatus()` | `Claude/lib/requirementApi.ts` | Poll task status |
| `deleteRequirement()` | `Claude/lib/requirementApi.ts` | Delete requirement file |
| `executeGitOperations()` | `sub_Git/gitApi.ts` | Execute git commands |

---

## UI Components Hierarchy

```
TaskRunnerLayout
├── TaskRunnerHeader
│   ├── ConfigurationToolbar
│   │   ├── GitControl
│   │   └── ExecutionPromptEditor
│   └── DualBatchPanel
│       └── QueueVisualization
├── TaskColumn
│   └── TaskItem
│       └── RequirementCard
└── TaskOffloadPanel
```

---

## Store Hooks

Custom hooks for component integration:

| Hook | Purpose | Location |
|------|---------|----------|
| `useAllBatches()` | Get all batch states | `store/useTaskRunnerHooks.ts` |
| `useCreateBatch()` | Create new batch | `store/useTaskRunnerHooks.ts` |
| `useStartBatchExecution()` | Start batch execution | `store/useTaskRunnerHooks.ts` |
| `useBatch()` | Get specific batch | `store/useTaskRunnerHooks.ts` |
| `useStoreRecovery()` | Trigger recovery on mount | `store/useTaskRunnerHooks.ts` |
| `useOverallProgress()` | Get combined progress | `store/useTaskRunnerHooks.ts` |

---

## Known Issues & Critical Bugs

### ✅ FIXED: "Requirement not found" Error on Subsequent Tasks

**Status**: FIXED (2025-11-27)

**Original Issue**: After the first task in a batch completes, all subsequent tasks failed with "Requirement not found" error.

**Root Cause**: The `startPollingForTask()` function was passing only the completed requirement `[requirement]` instead of the full requirements array to `executeNextTask()`.

**Fix Applied**:
1. Added module-level requirements cache (`cachedRequirements`) in `taskRunnerStore.ts`
2. `setCachedRequirements()` is called when batch execution starts (in `useStartBatchExecution` hook)
3. `getCachedRequirements()` is used in polling callbacks to get full requirements array
4. Recovery function also caches requirements on startup

**Files Modified**:
- `store/taskRunnerStore.ts` - Added cache and updated polling callbacks
- `store/useTaskRunnerHooks.ts` - Updated `useStartBatchExecution` to cache requirements

### ✅ FIXED: Git Operations Can Block Execution

**Status**: FIXED (2025-11-27)

**Original Issue**: Git operations (commit, push) could hang or fail, blocking subsequent task execution.

**Fix Applied**: Updated `executionWrapper.ts` git instructions to be explicitly non-blocking:
- Added "NON-BLOCKING" header to git section
- Clear instructions that git failures should be reported and continued
- Error handling guidance for all failure modes

### ✅ FIXED: Implementation Logs Generated in Codebase

**Status**: FIXED (2025-11-27)

**Original Issue**: Claude sometimes created logging scripts directly in the target project instead of using the internal logging API.

**Fix Applied**:
1. Simplified logging instructions in `executionWrapper.ts` to use direct API call
2. Created new simplified endpoint `/api/implementation-log` with camelCase fields
3. Auto-generates UUID for log entries
4. Clear "DO NOT create script files" instructions

---

## Prompt Builder Architecture

### Execution Wrapper Flow

```
Idea/Goal/Manual Requirement
        |
reqFileBuilder.ts (buildRequirementFromIdea)
        |
requirement_file/executionWrapper.ts (wrapRequirementForExecution)
        |
Final Prompt to Claude Code CLI
```

### Execution Wrapper Sections Analysis

| Section | Purpose | Clarity Issues |
|---------|---------|----------------|
| Core Guidelines | Immediate execution instructions | Clear |
| File Structure | Next.js/React folder conventions | Clear |
| Test Selectors | data-testid attribute requirements | Clear |
| Theming | Match existing UI patterns | Clear |
| Documentation Policy | When to create docs | May conflict with other sections |
| Implementation Logging | Create log entry via API | Too complex, causes confusion |
| Screenshot Capture | Conditional screenshot workflow | Complex multi-step process |
| Git Operations | Post-implementation git commands | Should be non-blocking |
| Final Checklist | Verification steps | Clear |

---

## Optimization Recommendations

### 1. Fix Requirements Array Bug (Priority: CRITICAL)

Store a reference to the full requirements array that can be accessed during polling callbacks.

### 2. Simplify Implementation Logging (Priority: HIGH)

Replace the complex multi-step logging with a single API call instruction.

### 3. Make Git Operations Non-Blocking (Priority: MEDIUM)

Add explicit non-blocking instructions with timeout handling.

### 4. Reduce Prompt Redundancy (Priority: MEDIUM)

The current prompt has some redundant sections that should be consolidated.

```

---

## Fixes Applied (2025-11-27)

All optimization recommendations have been implemented:

### 1. Requirements Array Bug - FIXED

**Files Modified**:
- `store/taskRunnerStore.ts`: Added `cachedRequirements` module-level variable with `setCachedRequirements()` and `getCachedRequirements()` exports
- `store/useTaskRunnerHooks.ts`: Updated `useStartBatchExecution` to call `setCachedRequirements(requirements)`
- Polling callbacks now use `getCachedRequirements()` for task continuation

### 2. Implementation Logging - SIMPLIFIED

**Files Modified**:
- `lib/prompts/requirement_file/executionWrapper.ts`: Replaced complex script-based logging with single API call
  
**New Endpoint Created**:
- `api/implementation-log/route.ts`: POST endpoint with simplified JSON body, auto-generates UUID

### 3. Git Operations - NON-BLOCKING

**Files Modified**:
- `lib/prompts/requirement_file/executionWrapper.ts`: Added "(NON-BLOCKING)" header, clear failure handling instructions

### 4. Core Guidelines - STREAMLINED

**Files Modified**:
- `lib/prompts/requirement_file/executionWrapper.ts`: Removed duplicate instructions
