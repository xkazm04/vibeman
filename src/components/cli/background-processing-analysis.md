# CLI Background Processing Analysis

## Current Architecture

### What's Already Working (Server-Side)

The server-side is **already capable of background processing**:

| Component | Location | Capability |
|-----------|----------|------------|
| `activeExecutions` Map | `cli-service.ts:95` | Keeps all executions in memory |
| `execution.events[]` | `cli-service.ts:90` | Stores all events during execution |
| Log files | `.claude/logs/` | Full transcript written to disk |
| Stream reconnection | `stream/route.ts:174` | Can replay events from any index |
| Execution cleanup | `cleanupExecutions()` | 1 hour TTL for completed executions |

### What's Lost on Navigation (Client-Side)

| Data | Storage | Problem |
|------|---------|---------|
| `logs[]` | useState | Lost on unmount |
| `fileChanges[]` | useState | Lost on unmount |
| `isStreaming` | useState | Lost on unmount |
| `sessionId` | useState | Lost on unmount |
| SSE connection | ref | Closed on unmount |
| `currentExecutionId` | **Not stored** | Never persisted |

### What's Persisted (Zustand)

| Data | Location | Status |
|------|----------|--------|
| `queue[]` with status | cliSessionStore | ✅ Persisted |
| `isRunning`, `autoStart` | cliSessionStore | ✅ Persisted |
| `claudeSessionId` | cliSessionStore | ✅ Persisted |
| `enabledSkills` | cliSessionStore | ✅ Persisted |

---

## Root Cause

When user navigates away from CLI module:

1. `CompactTerminal` unmounts
2. Cleanup effect closes SSE connection
3. Local state (logs, fileChanges) is garbage collected
4. **BUT** Claude CLI process continues running on server
5. Server keeps collecting events in `execution.events[]`
6. When user returns, component remounts fresh with no connection to the running execution

---

## Proposed Solutions

### Option A: Execution ID Persistence + Reconnection (Recommended - Phase 1)

**Complexity**: Low | **Impact**: High

Persist `executionId` and reconnect on mount.

**Changes Required**:

1. **Add `currentExecutionId` to Zustand store**
   ```typescript
   // In cliSessionStore.ts
   interface CLISessionState {
     // ... existing
     currentExecutionId: string | null;
   }
   ```

2. **Store execution ID when task starts**
   ```typescript
   // In CompactTerminal.tsx executeTask()
   setCurrentExecutionId(sessionId, executionId);
   ```

3. **On mount, check for active execution**
   ```typescript
   useEffect(() => {
     if (session.currentExecutionId && !isStreaming) {
       reconnectToExecution(session.currentExecutionId);
     }
   }, []);
   ```

4. **Create reconnection function**
   ```typescript
   async function reconnectToExecution(executionId: string) {
     // 1. Fetch execution status
     const { execution } = await fetch(`/api/claude-terminal/query?executionId=${executionId}`);

     // 2. If still running, reconnect SSE
     if (execution.status === 'running') {
       connectToStream(`/api/claude-terminal/stream?executionId=${executionId}`);
     }

     // 3. Replay missed events into logs
     // Server stream already handles this via lastEventIndex
   }
   ```

**Pros**: Minimal changes, leverages existing server capability
**Cons**: Logs before reconnection are not shown (can be enhanced)

---

### Option B: Log Persistence in Zustand (Phase 1 Enhancement)

**Complexity**: Low | **Impact**: Medium

Store logs in persisted store.

**Changes Required**:

1. **Add logs to session state** (with size limit)
   ```typescript
   interface CLISessionState {
     logs: LogEntry[];  // Keep last 500 entries
   }
   ```

2. **Sync logs to store**
   ```typescript
   const addLog = useCallback((entry: LogEntry) => {
     setLogs(prev => [...prev, entry].slice(-500));  // Local state
     addLogToStore(sessionId, entry);  // Persist
   }, []);
   ```

**Pros**: Logs survive navigation
**Cons**: localStorage size limit (~5MB), may need pruning

---

### Option C: Background Execution Service (Recommended - Phase 2)

**Complexity**: Medium | **Impact**: Very High

Create a singleton service that maintains connections across navigation.

```
┌─────────────────────────────────────────────────────────┐
│                    Module-Level Service                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │           BackgroundExecutionService              │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │   │
│  │  │ SSE 1  │ │ SSE 2  │ │ SSE 3  │ │ SSE 4  │    │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘    │   │
│  │       ↑          ↑          ↑          ↑         │   │
│  │       └──────────┴──────────┴──────────┘         │   │
│  │                Events Buffer                      │   │
│  └──────────────────────────────────────────────────┘   │
│                           ↕                              │
│              Zustand Store (Subscribers)                 │
└─────────────────────────────────────────────────────────┘
                           ↕
              ┌─────────────────────────┐
              │  CompactTerminal (UI)   │
              │  - Reads from store     │
              │  - Dispatches commands  │
              └─────────────────────────┘
```

**Architecture**:

```typescript
// backgroundExecutionService.ts
class BackgroundExecutionService {
  private connections: Map<CLISessionId, EventSource> = new Map();
  private events: Map<CLISessionId, CLIExecutionEvent[]> = new Map();

  // Singleton
  private static instance: BackgroundExecutionService;
  static getInstance() {
    if (!this.instance) this.instance = new BackgroundExecutionService();
    return this.instance;
  }

  // Start watching an execution
  watchExecution(sessionId: CLISessionId, executionId: string) {
    const es = new EventSource(`/api/claude-terminal/stream?executionId=${executionId}`);
    this.connections.set(sessionId, es);

    es.onmessage = (e) => {
      const event = JSON.parse(e.data);
      this.events.get(sessionId)?.push(event);

      // Update Zustand store
      useCLISessionStore.getState().appendEvent(sessionId, event);
    };
  }

  // Get events for a session
  getEvents(sessionId: CLISessionId): CLIExecutionEvent[] {
    return this.events.get(sessionId) || [];
  }
}

// Module-level singleton - survives component unmounts
export const bgService = BackgroundExecutionService.getInstance();
```

**Usage in Component**:
```typescript
function CompactTerminal({ sessionId, ... }) {
  // Read events from store (populated by background service)
  const events = useCLISessionStore(s => s.sessions[sessionId].events);

  // Start execution dispatches to service
  const handleStartTask = (task) => {
    const executionId = await startExecution(task);
    bgService.watchExecution(sessionId, executionId);
  };

  // Render from store, not local state
  return (
    <div>{events.map(e => <LogEntry key={e.id} event={e} />)}</div>
  );
}
```

**Pros**:
- True background processing
- Events never lost
- Multiple tabs can share state
- Components become pure UI renderers

**Cons**:
- More complex architecture
- Requires refactoring CompactTerminal

---

### Option D: Service Worker (Phase 3 - Optional)

**Complexity**: High | **Impact**: Very High

Use Service Worker for persistent connections.

**Pros**:
- Survives page refresh
- Works when tab is backgrounded
- Can show notifications

**Cons**:
- Complex setup
- Browser compatibility
- Overkill for localhost

---

## Recommended Implementation Path

### Phase 1: Quick Win (1-2 hours)
1. Add `currentExecutionId` to Zustand store
2. Implement reconnection on mount
3. Clear execution ID on completion

**Result**: User can navigate away and back, execution continues, logs resume from where they left off.

### Phase 2: Better UX (4-6 hours)
1. Create `BackgroundExecutionService` singleton
2. Move SSE management out of component
3. Store events in Zustand
4. Refactor `CompactTerminal` to be a pure renderer

**Result**: True background processing, events never lost, component can unmount freely.

### Phase 3: Full Solution (Optional)
1. Add log persistence to localStorage
2. Consider IndexedDB for large logs
3. Add Service Worker for page-refresh survival

---

## Quick Implementation: Phase 1

Here's the minimal change for immediate improvement:

### 1. Update Store

```typescript
// cliSessionStore.ts - Add to CLISessionState
currentExecutionId: string | null;

// Add action
setCurrentExecutionId: (sessionId: CLISessionId, executionId: string | null) => void;
```

### 2. Update CompactTerminal

```typescript
// Store execution ID when task starts
const executeTask = useCallback(async (task, resumeSession) => {
  // ... existing code ...
  const { executionId, streamUrl } = await response.json();

  // NEW: Persist execution ID
  setCurrentExecutionId(sessionId, executionId);

  connectToStream(streamUrl);
}, [...]);

// Clear on completion
const handleSSEEvent = useCallback((event) => {
  if (event.type === 'result' || event.type === 'error') {
    // NEW: Clear execution ID
    setCurrentExecutionId(sessionId, null);
  }
}, [...]);

// NEW: Reconnect on mount
useEffect(() => {
  const execId = session.currentExecutionId;
  if (execId && !isStreaming) {
    // Check if execution still exists and reconnect
    fetch(`/api/claude-terminal/query?executionId=${execId}`)
      .then(r => r.json())
      .then(({ execution }) => {
        if (execution?.status === 'running') {
          connectToStream(`/api/claude-terminal/stream?executionId=${execId}`);
          setIsStreaming(true);
          setCurrentTaskId(/* need to track this too */);
        } else {
          // Execution completed while away - clear it
          setCurrentExecutionId(sessionId, null);
        }
      });
  }
}, []);
```

---

## Summary

| Option | Effort | Impact | Recommendation |
|--------|--------|--------|----------------|
| A: Reconnection | Low | High | **Do first** |
| B: Log persistence | Low | Medium | Enhancement |
| C: Background service | Medium | Very High | **Phase 2** |
| D: Service Worker | High | Very High | Optional |

The server architecture already supports everything needed. The fix is entirely client-side:
1. Persist execution IDs
2. Reconnect on mount
3. Eventually, move to a background service pattern
