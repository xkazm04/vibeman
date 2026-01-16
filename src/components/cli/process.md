# CLI Batch Sessions - Process Documentation

## Overview

CLI Batch Sessions is an alternative task execution system that uses Claude Code CLI directly via Server-Sent Events (SSE). It supports up to 4 parallel sessions with real-time streaming output, session chaining (resume), and a server-side task registry for stuck task detection.

**Key Differences from DualBatchPanel**:
- Direct CLI execution via SSE streaming (vs. polling-based)
- Real-time log output in embedded terminals
- Session chaining for multi-task conversations
- Server-side task registry for state synchronization
- Skills system for context injection

---

## Architecture

### Component Hierarchy

```
CLIBatchPanel
├── CLISession (x4)
│   └── CompactTerminal
│       ├── Log Display (SSE stream)
│       ├── Status Bar
│       └── Input Prompt
└── Recovery Status Indicator
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| CLIBatchPanel | Main container, manages 4 sessions | `CLIBatchPanel.tsx` |
| CLISession | Individual session UI with controls | `CLISession.tsx` |
| CompactTerminal | Terminal display with SSE streaming | `CompactTerminal.tsx` |
| cliSessionStore | Zustand store for session state | `store/cliSessionStore.ts` |
| taskRegistry | Server-side task state tracking | `taskRegistry.ts` + API |
| useCLIRecovery | Recovery hook for page refresh | `store/useCLIRecovery.ts` |

### Store Pattern

**Single Zustand Store** (`store/cliSessionStore.ts`):
- Persists to localStorage via zustand/middleware
- Manages 4 session states independently
- Tracks task queues with status per session
- Handles skill toggles and completion counts

**Server-Side Registry** (`api/cli-task-registry/route.ts`):
- In-memory task state tracking
- Prevents concurrent task conflicts
- Detects stale/stuck tasks via heartbeat
- Authoritative source for execution state

---

## Process Flow

### Phase 1: Task Selection & Queuing

| Step | Action | Location |
|------|--------|----------|
| 1.1 | User selects requirements in TaskColumn | `TaskRunnerLayout.tsx` |
| 1.2 | User clicks "+" button on a session | `CLISession.tsx:142-150` |
| 1.3 | Requirements converted to QueuedTasks | `CLIBatchPanel.tsx:88-90` |
| 1.4 | Tasks added to session queue | `cliSessionStore.ts:addTasksToSession` |
| 1.5 | Selection cleared | `CLIBatchPanel.tsx:93` |

### Phase 2: Session Start

| Step | Action | Location |
|------|--------|----------|
| 2.1 | User clicks Play button on session | `CLISession.tsx:177-185` |
| 2.2 | `autoStart` set to true | `cliSessionStore.ts:setAutoStart` |
| 2.3 | `isRunning` set to true | `cliSessionStore.ts:setRunning` |
| 2.4 | Queue processing useEffect triggers | `CompactTerminal.tsx:471-480` |

### Phase 3: Task Execution

| Step | Action | Location |
|------|--------|----------|
| 3.1 | Find next pending task in queue | `CompactTerminal.tsx:459` |
| 3.2 | Wait 3s delay (for file cleanup) | `CompactTerminal.tsx:464-468` |
| 3.3 | Register task with server registry | `CompactTerminal.tsx:267-268` |
| 3.4 | Clear stale registry entries if needed | `CompactTerminal.tsx:275-294` |
| 3.5 | Set `isStreaming=true`, update currentTaskId | `CompactTerminal.tsx:297-299` |
| 3.6 | Notify parent via `onTaskStart` | `CompactTerminal.tsx:300` |
| 3.7 | Start heartbeat interval (2 min) | `CompactTerminal.tsx:303-308` |
| 3.8 | Build skills prefix (if first task) | `CompactTerminal.tsx:311-314` |
| 3.9 | POST to `/api/claude-terminal/query` | `CompactTerminal.tsx:324-333` |
| 3.10 | Connect to SSE stream | `CompactTerminal.tsx:351` |

### Phase 4: SSE Streaming

| Step | Action | Location |
|------|--------|----------|
| 4.1 | EventSource connects to stream URL | `CompactTerminal.tsx:248-261` |
| 4.2 | Parse incoming SSE events | `CompactTerminal.tsx:251-260` |
| 4.3 | Handle `connected` event (set sessionId) | `CompactTerminal.tsx:149-155` |
| 4.4 | Handle `message` events (assistant output) | `CompactTerminal.tsx:156-167` |
| 4.5 | Handle `tool_use` events (track file changes) | `CompactTerminal.tsx:168-194` |
| 4.6 | Handle `tool_result` events (abbreviated) | `CompactTerminal.tsx:195-205` |
| 4.7 | Handle `result` event (completion) | `CompactTerminal.tsx:206-221` |
| 4.8 | Handle `error` event (failure) | `CompactTerminal.tsx:222-248` |

### Phase 5: Task Completion

| Step | Action | Location |
|------|--------|----------|
| 5.1 | Stop heartbeat interval | `CompactTerminal.tsx:208-211` |
| 5.2 | Register completion with server | `CompactTerminal.tsx:217` |
| 5.3 | Call `onTaskComplete(taskId, success)` | `CompactTerminal.tsx:218` |
| 5.4 | Parent updates CLI store status | `CLIBatchPanel.tsx:133-134` |
| 5.5 | Parent updates TaskRunner store | `CLIBatchPanel.tsx:135-136` |
| 5.6 | Update idea status (if success) | `CLIBatchPanel.tsx:140-141` |
| 5.7 | Delete requirement file (if success) | `CLIBatchPanel.tsx:144` |
| 5.8 | Notify parent for UI refresh | `CLIBatchPanel.tsx:148` |
| 5.9 | Remove task from queue after 2s | `CLIBatchPanel.tsx:151-153` |
| 5.10 | Queue processing triggers next task | `CompactTerminal.tsx:471-480` |

### Phase 6: Queue Empty

| Step | Action | Location |
|------|--------|----------|
| 6.1 | No more pending tasks found | `CompactTerminal.tsx:469` |
| 6.2 | `onQueueEmpty` callback fired | `CompactTerminal.tsx:472` |
| 6.3 | `autoStart` set to false | `CLIBatchPanel.tsx:159` |
| 6.4 | `isRunning` set to false | `CLIBatchPanel.tsx:160` |

---

## Server-Side Task Registry

### Purpose

Provides authoritative task state to prevent:
- Multiple tasks running in same session
- Stuck tasks blocking execution
- State desync between client and server

### API Endpoints

| Endpoint | Method | Action | Purpose |
|----------|--------|--------|---------|
| `/api/cli-task-registry` | GET | Query | Get task status or session tasks |
| `/api/cli-task-registry` | POST | start | Register task as running |
| `/api/cli-task-registry` | POST | complete | Mark task as completed/failed |
| `/api/cli-task-registry` | POST | heartbeat | Keep task alive (prevent timeout) |
| `/api/cli-task-registry` | POST | clear | Clear all tasks for a session |
| `/api/cli-task-registry` | DELETE | - | Remove specific task |

### Registry State

```typescript
interface TaskRecord {
  taskId: string;
  sessionId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  requirementName?: string;
}
```

### Timeout Detection

| Constant | Value | Purpose |
|----------|-------|---------|
| RECORD_TTL | 1 hour | Auto-cleanup old records |
| TASK_TIMEOUT | 10 minutes | Mark as stale if no heartbeat |

### Client Helpers

| Function | Purpose | Location |
|----------|---------|----------|
| `registerTaskStart()` | Register task as running | `taskRegistry.ts:44-62` |
| `registerTaskComplete()` | Mark task done | `taskRegistry.ts:67-83` |
| `sendTaskHeartbeat()` | Keep task alive | `taskRegistry.ts:88-100` |
| `getTaskStatus()` | Query task state | `taskRegistry.ts:105-115` |
| `clearSessionTasks()` | Clear session | `taskRegistry.ts:143-155` |

---

## Stuck Task Detection

### Mechanisms

1. **Server Registry Check on Start**
   - Before starting task, check if server has running task
   - If found but client not streaming, clear as stale
   - Location: `CompactTerminal.tsx:267-294`

2. **Periodic Stuck Check**
   - Every 30s during execution, poll server status
   - If server says completed but client streaming, sync state
   - If task stale (>10 min), mark as failed
   - Location: `CompactTerminal.tsx:393-461`

3. **Heartbeat Keep-Alive**
   - Every 2 minutes, send heartbeat to server
   - Prevents false timeout detection
   - Location: `CompactTerminal.tsx:303-308`

---

## Skills System

### Purpose

Inject context into first task prompt of a session.

### Available Skills

| Skill ID | Name | Description |
|----------|------|-------------|
| `screenshot` | Screenshot | Capture screenshot after implementation |
| `git` | Git Commit | Commit and push changes after task |

### Skill Prompt Injection

```typescript
// First task only (not on resume)
const skillsPrefix = !resumeSession && enabledSkills.length > 0
  ? buildSkillsPrompt(enabledSkills)
  : '';
```

Location: `CompactTerminal.tsx:311-314`, `skills.ts:buildSkillsPrompt`

---

## Session Chaining

### Purpose

Maintain Claude conversation context across multiple tasks.

### How It Works

1. First task creates new session, receives `sessionId` in response
2. Subsequent tasks pass `resumeSessionId` to API
3. Claude continues with full conversation history

### Implementation

| Step | Location |
|------|----------|
| Store sessionId on `connected` event | `CompactTerminal.tsx:151` |
| Check `sessionId !== null` for resume | `CompactTerminal.tsx:466` |
| Pass `resumeSessionId` to API | `CompactTerminal.tsx:330` |

---

## Error Handling

### SSE Errors

- **Event**: `error` type in SSE stream
- **Action**: Set error state, mark task failed
- **Location**: `CompactTerminal.tsx:222-248`

### API Errors

- **Detection**: Non-OK response from query API
- **Action**: Set error, mark task failed, stop heartbeat
- **Location**: `CompactTerminal.tsx:335-349`

### Network Errors

- **Detection**: Fetch throws exception
- **Action**: Set error, mark task failed
- **Location**: `CompactTerminal.tsx:351-364`

### Abort Handling

- **User Action**: Click stop button or press Escape
- **Effect**: Close SSE, mark task failed, clear heartbeat
- **Location**: `CompactTerminal.tsx:541-560`

---

## Recovery System

### Page Refresh Recovery

| Step | Action | Location |
|------|--------|----------|
| R.1 | Load persisted state from localStorage | Zustand persist middleware |
| R.2 | `useCLIRecovery()` hook triggers | `CLIBatchPanel.tsx:83` |
| R.3 | Enter recovery phase (10s window) | `useCLIRecovery.ts:31-32` |
| R.4 | Call `recoverCLISessions()` | `useCLIRecovery.ts:35` |
| R.5 | Recovery phase ends after 5s | `useCLIRecovery.ts:38-40` |

### Recovery Status Display

- Only shows "Recovering X" during actual recovery phase
- Disappears after recovery completes
- Location: `useCLIRecovery.ts:61-107`

---

## TaskRunner Store Integration

### Purpose

Sync CLI task status to TaskColumn for visual feedback.

### How It Works

1. When task starts, update TaskRunner store:
   ```typescript
   updateTaskRunnerStatus(taskId, createRunningStatus());
   ```

2. When task completes:
   ```typescript
   updateTaskRunnerStatus(taskId, success
     ? createCompletedStatus()
     : createFailedStatus('Task failed'));
   ```

3. TaskColumn reads from TaskRunner store via `requirementsWithStatus`

Location: `CLIBatchPanel.tsx:122-136`

---

## Data Types

### QueuedTask

```typescript
interface QueuedTask {
  id: string;              // Same as requirement ID: "projectId:requirementName"
  projectPath: string;
  projectName: string;
  requirementName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  addedAt: number;         // Timestamp
}
```

### CLISessionState

```typescript
interface CLISessionState {
  queue: QueuedTask[];
  isRunning: boolean;
  autoStart: boolean;
  projectPath: string | null;
  claudeSessionId: string | null;
  enabledSkills: SkillId[];
  completedCount: number;
}
```

### LogEntry

```typescript
interface LogEntry {
  id: string;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'error' | 'system';
  content: string;
  timestamp: number;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  model?: string;
}
```

### CLISSEEvent

```typescript
interface CLISSEEvent {
  type: 'connected' | 'message' | 'tool_use' | 'tool_result' | 'result' | 'error';
  timestamp: number;
  data: Record<string, unknown>;
}
```

---

## Key Files & Artifacts

### Component Files

| File | Purpose |
|------|---------|
| `CLIBatchPanel.tsx` | Main container with session management |
| `CLISession.tsx` | Individual session UI |
| `CompactTerminal.tsx` | Terminal with SSE streaming |
| `skills.ts` | Skill definitions and prompt builder |
| `taskRegistry.ts` | Client-side registry helpers |
| `types.ts` | Type definitions |

### Store Files

| File | Purpose |
|------|---------|
| `store/index.ts` | Store exports |
| `store/cliSessionStore.ts` | Zustand session store |
| `store/useCLIRecovery.ts` | Recovery hooks |
| `store/cliExecutionManager.ts` | Execution management |

### API Files

| File | Purpose |
|------|---------|
| `api/cli-task-registry/route.ts` | Server-side task registry |
| `api/claude-terminal/query/route.ts` | Task execution endpoint |
| `api/claude-terminal/stream/[id]/route.ts` | SSE stream endpoint |

### Storage Keys

| Key | Purpose |
|-----|---------|
| `cli-session-storage` | Zustand persist storage |

---

## Execution Constraints

| Constraint | Value | Location |
|------------|-------|----------|
| Max Sessions | 4 | `CLIBatchPanel.tsx:22` |
| Tasks per Session Running | 1 | Single-threaded per terminal |
| Inter-Task Delay | 3 seconds | `CompactTerminal.tsx:464` |
| Heartbeat Interval | 2 minutes | `CompactTerminal.tsx:306` |
| Stuck Check Interval | 30 seconds | `CompactTerminal.tsx:453` |
| Task Timeout | 10 minutes | `api/cli-task-registry:36` |
| Registry TTL | 1 hour | `api/cli-task-registry:27` |
| Recovery Phase | 10 seconds | `useCLIRecovery.ts:32` |

---

## API Integration

### Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/claude-terminal/query` | POST | Start task execution |
| `/api/claude-terminal/stream/[id]` | GET (SSE) | Stream execution output |
| `/api/cli-task-registry` | POST/GET | Task registry operations |
| `/api/claude-code/requirement` | DELETE | Delete requirement file |
| `/api/ideas/update-implementation-status` | POST | Update idea status |

### Request/Response Flow

```
CLIBatchPanel
    |
    v
POST /api/claude-terminal/query
    { projectPath, prompt, resumeSessionId? }
    |
    v
Response: { streamUrl: "/api/claude-terminal/stream/{executionId}" }
    |
    v
EventSource connects to streamUrl
    |
    v
SSE events: connected -> message* -> tool_use* -> tool_result* -> result|error
```

---

## Known Issues & Fixes

### ✅ FIXED: 'Recovering' Label Stuck During Normal Operation

**Status**: FIXED (2025-01)

**Original Issue**: The "Recovering X" label would show indefinitely during normal operation, not just during actual recovery.

**Root Cause**: `useCLIRecoveryStatus` was returning `isRecovering: true` whenever there were pending tasks with autoStart, not just during recovery phase.

**Fix Applied**:
- Added module-level `isInRecoveryPhase` and `recoveryPhaseEndTime` tracking
- Recovery phase now lasts ~10 seconds, then ends
- `isRecovering` only returns true during actual recovery phase

**Files Modified**: `store/useCLIRecovery.ts`

### ✅ FIXED: 'Waiting for task' Infinite Loop

**Status**: FIXED (2025-01)

**Original Issue**: After implementing server registry, tasks would get stuck with "Another task running, will retry in 5s..." messages indefinitely.

**Root Cause**: The logic to detect stale tasks was too conservative. It would wait for a task that wasn't actually running.

**Fix Applied**:
- Simplified detection: if client is not streaming and tries to start task, any server "running" record is stale
- Immediately clear stale entries and proceed
- Removed complex retry mechanism

**Files Modified**: `CompactTerminal.tsx`

### ✅ FIXED: CLI Tasks Not Showing Status in TaskColumn

**Status**: FIXED (2025-01)

**Original Issue**: Tasks executed via CLI sessions didn't show their status (running/completed/failed) in TaskColumn.

**Root Cause**: CLI sessions only updated their own store, not the TaskRunner store that TaskColumn reads from.

**Fix Applied**:
- Added TaskRunner store integration in CLIBatchPanel
- `handleTaskStart` and `handleTaskComplete` now update both stores
- TaskColumn receives status via `requirementsWithStatus` merge

**Files Modified**: `CLIBatchPanel.tsx`

### ✅ FIXED: Task Completion Sometimes Skipped (Stale Closure)

**Status**: FIXED (2025-01)

**Original Issue**: Task completion callbacks were inconsistently triggered. Sometimes tasks would finish executing but not transition to "completed" status.

**Root Cause**: Classic React stale closure problem. In `executeTask`:
1. `setCurrentTaskId(task.id)` schedules async state update
2. `connectToStream(streamUrl)` runs immediately with `handleSSEEvent` callback
3. The callback closure captured the OLD `currentTaskId` value (often `null`)
4. When SSE `result` event arrived, `if (currentTaskId)` check failed

**Fix Applied**:
- Added `currentTaskIdRef` ref to track current task ID
- Set ref BEFORE connecting to stream: `currentTaskIdRef.current = task.id`
- Updated all handlers to read from ref instead of state closure:
  - `handleSSEEvent` (result and error cases)
  - `handleAbort`
  - `handleClear`
  - Stuck task detection interval
- Ref provides immediate, synchronous access to latest value

**Key Code Pattern**:
```typescript
// Before (stale closure problem)
if (currentTaskId) {  // May be null due to stale closure
  onTaskComplete?.(currentTaskId, success);
}

// After (ref always current)
const taskId = currentTaskIdRef.current;
if (taskId) {
  onTaskComplete?.(taskId, success);
  currentTaskIdRef.current = null;
}
```

**Files Modified**: `CompactTerminal.tsx`

---

## Optimization Recommendations

### 1. ✅ Session Persistence Across Page Navigation (IMPLEMENTED)

**Status**: Implemented in Phase 1 (2025-01)

Users can now navigate away from CLI module and return - execution continues seamlessly.

**Implementation Summary**:
- Added `currentExecutionId` and `currentTaskId` to Zustand store (v4)
- Store execution ID when task starts
- On mount, check if execution exists and reconnect to SSE stream
- Server already supported this (keeps executions in memory, replays events)

**Files Modified**:
- `store/cliSessionStore.ts` - Added fields, action, migration
- `types.ts` - Added props to CompactTerminalProps
- `CompactTerminal.tsx` - Reconnection logic
- `CLISession.tsx` - Pass new props
- `CLIBatchPanel.tsx` - Handle execution changes

**Future Enhancement (Phase 2)**: Background execution service singleton for true multi-tab/component-unmount resilience.

### 2. Parallel Task Execution (Priority: LOW)

Currently each session runs one task at a time. Could support:
- Multiple concurrent tasks per session (with Claude's multi-turn support)
- Better utilization of Claude's context window

### 3. Progress Tracking (Priority: MEDIUM)

DualBatchPanel has progressLines tracking. CLI could add:
- Parse Claude output for progress indicators
- Checkpoint detection from tool usage
- Visual progress bar in terminal

### 4. Git Integration (Priority: MEDIUM)

Skills system exists but could be enhanced:
- Automatic commit after successful task
- Branch management per session
- Conflict detection

---

## Comparison: CLI vs DualBatchPanel

| Feature | CLI Batch | DualBatchPanel |
|---------|-----------|----------------|
| Execution Method | SSE streaming | Polling (10s) |
| Real-time Output | Yes (terminal) | No |
| Session Chaining | Yes (resume) | No |
| Progress Tracking | Basic | progressLines + checkpoints |
| Parallel Batches | 4 sessions | 4 batches |
| Tasks per Unit | 1 | 1 |
| Recovery | Via registry | Via store recovery |
| Git Integration | Via skills | Built-in |
| Screenshot | Via skills | Built-in |
