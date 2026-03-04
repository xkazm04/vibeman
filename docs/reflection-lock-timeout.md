# Reflection Lock Timeout and Scope Isolation

## Overview
This document describes the timeout-guarded concurrency lock system implemented for Brain reflection completion in `src/lib/brain/brainService.ts`.

## Problem Statement
The original `completeReflection()` implementation used a simple `Set<string>` for concurrency control with the following issues:

1. **No timeout**: If a reflection crashed without hitting the `finally` block, the lock became permanent until server restart
2. **No scope distinction**: Global and project reflections could interfere because both shared the same `activeCompletions` Set keyed only by `projectId`
3. **Race condition potential**: The check `has()` and `add()` were separate operations, not atomic

## Solution

### 1. Timestamped Locks with Auto-Expiry
```typescript
interface LockEntry {
  timestamp: number;
  reflectionId: string;
}

const activeCompletions = new Map<string, LockEntry>();
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
```

Each lock now stores:
- **timestamp**: When the lock was acquired
- **reflectionId**: Which reflection holds the lock (for debugging/error messages)

Locks automatically expire after 5 minutes, preventing permanent lockouts from crashed reflections.

### 2. Scope-Aware Lock Keys
```typescript
function getLockKey(projectId: string, scope: string): string {
  return scope === 'global' ? 'global' : `project:${projectId}`;
}
```

Lock keys now distinguish between:
- **Project scope**: `project:<projectId>` (e.g., `project:proj_123`)
- **Global scope**: `global` (single key for all global reflections)

This allows:
- Multiple project reflections to run concurrently (different projects)
- Project and global reflections to run concurrently (different scopes)
- Prevents multiple reflections for the same project or multiple global reflections

### 3. Atomic Lock Acquisition
```typescript
function tryAcquireLock(lockKey: string, reflectionId: string): boolean {
  cleanExpiredLocks();

  if (activeCompletions.has(lockKey)) {
    return false;
  }

  activeCompletions.set(lockKey, {
    timestamp: Date.now(),
    reflectionId,
  });
  return true;
}
```

The check-and-set is now in a single function, reducing race condition windows. The function:
1. Cleans expired locks first
2. Checks if lock exists
3. Sets lock immediately if available
4. Returns success/failure atomically

### 4. Automatic Cleanup
```typescript
function cleanExpiredLocks(): void {
  const now = Date.now();
  for (const [key, entry] of activeCompletions.entries()) {
    if (now - entry.timestamp > LOCK_TIMEOUT_MS) {
      activeCompletions.delete(key);
    }
  }
}
```

Called before every lock acquisition attempt, ensuring stale locks are removed.

## Usage in completeReflection()

```typescript
export function completeReflection(input: CompleteReflectionInput): CompleteReflectionResult {
  const reflection = brainReflectionDb.getById(reflectionId);
  const projectId = reflection.project_id;
  const scope = reflection.scope || 'project';
  const lockKey = getLockKey(projectId, scope);

  if (!tryAcquireLock(lockKey, reflectionId)) {
    const existing = activeCompletions.get(lockKey);
    return {
      success: false,
      error: `Another reflection completion is already in progress for this ${scope} (reflection: ${existing?.reflectionId})`,
      status: 409,
    };
  }

  try {
    // ... reflection completion logic
  } finally {
    releaseLock(lockKey);
  }
}
```

## Test Coverage

See `tests/unit/brain/reflection-locks.test.ts` for comprehensive test coverage:

1. **Concurrent project scope prevention**: Prevents two reflections for the same project from completing simultaneously
2. **Different project scope isolation**: Allows concurrent completions for different projects
3. **Project vs global scope isolation**: Project and global reflections can run concurrently
4. **Global scope prevention**: Prevents multiple global reflections from running simultaneously
5. **Lock release after success**: Locks are properly released after successful completion
6. **Lock release after failure**: Locks are properly released even when completion fails

## Benefits

1. **Self-healing**: Locks auto-expire after 5 minutes, preventing permanent lockouts
2. **Scope isolation**: Global and project reflections don't interfere
3. **Better error messages**: Error messages now include the holding reflection ID
4. **Predictable concurrency**: Clear rules about what can run concurrently
5. **Production-safe**: No manual intervention needed if a reflection crashes

## Metrics

- **Effort**: 1/10 (simple refactor)
- **Impact**: 3/10 (prevents edge-case permanent locks)
- **Risk**: null/10 (backward compatible, only adds safety)
- **Category**: code_quality
