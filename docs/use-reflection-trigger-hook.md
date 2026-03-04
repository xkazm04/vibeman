# useReflectionTrigger Hook

## Overview

The `useReflectionTrigger` hook provides a unified interface for triggering Brain reflections from any component, with built-in deduplication, error handling, and consistent feedback patterns.

## Problem Solved

Previously, reflection triggering was scattered across multiple components (ReflectionStatus, InsightsPanel) with:
- Duplicated validation logic
- Inconsistent error handling
- No race condition protection
- Duplicate triggers from rapid clicks across different UI entry points

## Solution

A single hook that:
1. **Deduplicates triggers** - Local running guard prevents concurrent reflections
2. **Validates configuration** - Ensures required fields are present before triggering
3. **Consistent feedback** - Returns unified status, error, and callback patterns
4. **Type-safe** - Full TypeScript support for both project and global scopes

## API

### Main Hook

```typescript
function useReflectionTrigger(options: UseReflectionTriggerOptions): UseReflectionTriggerReturn
```

#### Options

```typescript
interface UseReflectionTriggerOptions {
  scope: 'project' | 'global';

  // For project scope
  project?: {
    projectId: string;
    projectName: string;
    projectPath: string;
  };

  // For global scope
  global?: {
    projects: Array<{ id: string; name: string; path: string }>;
    workspacePath: string;
  };

  // Optional callbacks
  onSuccess?: () => void;
  onError?: (error: string) => void;
}
```

#### Return Value

```typescript
interface UseReflectionTriggerReturn {
  // Current status
  status: 'idle' | 'triggering' | 'running' | 'completed' | 'failed';

  // Trigger the reflection (no-op if already active)
  trigger: () => Promise<void>;

  // Last error message
  error: string | null;

  // Clear error
  clearError: () => void;

  // Is currently triggering or running
  isActive: boolean;
}
```

### Helper Hooks

#### useProjectReflectionTrigger

Simplified hook for project-scoped reflections:

```typescript
function useProjectReflectionTrigger(
  projectId: string | undefined,
  projectName: string | undefined,
  projectPath: string | undefined,
  callbacks?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
  }
): UseReflectionTriggerReturn
```

#### useGlobalReflectionTrigger

Simplified hook for global reflections:

```typescript
function useGlobalReflectionTrigger(
  projects: Array<{ id: string; name: string; path: string }>,
  workspacePath: string,
  callbacks?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
  }
): UseReflectionTriggerReturn
```

## Usage Examples

### Project Reflection

```typescript
import { useReflectionTrigger } from '@/hooks/useReflectionTrigger';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

function MyComponent() {
  const activeProject = useActiveProjectStore(s => s.activeProject);

  const { trigger, status, error, isActive } = useReflectionTrigger({
    scope: 'project',
    project: activeProject ? {
      projectId: activeProject.id,
      projectName: activeProject.name,
      projectPath: activeProject.path,
    } : undefined,
    onSuccess: () => {
      console.log('Reflection started!');
    },
    onError: (error) => {
      console.error('Failed to trigger:', error);
    },
  });

  return (
    <button onClick={trigger} disabled={isActive}>
      {isActive ? 'Running...' : 'Trigger Reflection'}
    </button>
  );
}
```

### Global Reflection

```typescript
import { useReflectionTrigger } from '@/hooks/useReflectionTrigger';
import { useServerProjectStore } from '@/stores/serverProjectStore';

function GlobalReflectionButton() {
  const allProjects = useServerProjectStore(s => s.projects);

  const { trigger, status } = useReflectionTrigger({
    scope: 'global',
    global: {
      projects: allProjects.map(p => ({
        id: p.id,
        name: p.name,
        path: p.path,
      })),
      workspacePath: '/workspace',
    },
  });

  return (
    <button onClick={trigger} disabled={status === 'running'}>
      Trigger Global Reflection
    </button>
  );
}
```

### Using Helper Hooks

```typescript
import { useProjectReflectionTrigger } from '@/hooks/useReflectionTrigger';

function SimpleButton() {
  const { trigger, isActive } = useProjectReflectionTrigger(
    'project-123',
    'My Project',
    '/path/to/project'
  );

  return (
    <button onClick={trigger} disabled={isActive}>
      Reflect
    </button>
  );
}
```

## Deduplication Behavior

The hook prevents duplicate triggers using:

1. **Local running guard** - `triggerLockRef.current` flag
2. **Status check** - Won't trigger if `isTriggering` or `reflectionStatus === 'running'`
3. **Lock timeout** - 500ms cooldown after trigger completes to prevent rapid re-triggers

Example scenario:
```
User clicks ReflectionStatus "Trigger" button
→ Lock acquired, trigger starts
User clicks InsightsPanel "Trigger" button
→ Lock is held, trigger is a no-op
First trigger completes
→ Lock released after 500ms
User can trigger again
```

## Error Handling

The hook validates configuration before triggering:

```typescript
// Missing project config
const { trigger, error } = useReflectionTrigger({
  scope: 'project',
  project: undefined,
});

await trigger();
// error === 'Missing required project configuration'
// onError callback called with same message
// triggerReflection NOT called
```

```typescript
// Empty projects array for global
const { trigger, error } = useReflectionTrigger({
  scope: 'global',
  global: {
    projects: [],
    workspacePath: '/workspace',
  },
});

await trigger();
// error === 'No projects provided for global reflection'
```

## Status Transitions

```
idle → triggering → running → completed
                ↓          ↓
              failed ← ← ← ←
```

- `idle` - No reflection active
- `triggering` - Hook is calling brainStore.triggerReflection()
- `running` - Reflection CLI session is active
- `completed` - Reflection finished successfully
- `failed` - Reflection or trigger failed

## Migration Guide

### Before

```typescript
// ReflectionStatus.tsx
const [isTriggering, setIsTriggering] = useState(false);
const { triggerReflection } = useBrainStore();

const handleTrigger = async () => {
  setIsTriggering(true);
  try {
    if (!activeProject) return;
    await triggerReflection(activeProject.id, activeProject.name, activeProject.path);
  } finally {
    setIsTriggering(false);
  }
};
```

### After

```typescript
// ReflectionStatus.tsx
const { trigger, isActive } = useReflectionTrigger({
  scope: 'project',
  project: activeProject ? {
    projectId: activeProject.id,
    projectName: activeProject.name,
    projectPath: activeProject.path,
  } : undefined,
});

const handleTrigger = async () => {
  await trigger();
};
```

## Testing

The hook is fully tested with:
- Project and global scope triggers
- Deduplication guards
- Error validation
- Callback invocation
- Status transitions

Run tests:
```bash
npm test tests/unit/hooks/useReflectionTrigger.test.ts
```

## Files Modified

- **Created:**
  - `src/hooks/useReflectionTrigger.ts` - Main hook implementation
  - `tests/unit/hooks/useReflectionTrigger.test.ts` - Test suite
  - `docs/use-reflection-trigger-hook.md` - This documentation

- **Modified:**
  - `src/app/features/Brain/components/ReflectionStatus.tsx` - Uses hook
  - `src/app/features/Brain/components/InsightsPanel.tsx` - Uses hook in empty state

## Future Enhancements

Potential improvements:
1. Toast notifications built into the hook (optional)
2. Retry logic for transient failures
3. Progress tracking for long-running reflections
4. Batch trigger support (trigger multiple projects sequentially)
