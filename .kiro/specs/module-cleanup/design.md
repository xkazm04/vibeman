# Design Document: Module Cleanup

## Overview

This design covers the cleanup and enhancement of several vibeman modules. The changes are organized into seven distinct areas:

1. **Implementation Log Enhancement** - Increase default display limit from 20 to 40 items
2. **Advisor Removal** - Remove deprecated advisor functionality from Context Overview
3. **Refactor Agent** - Add new code refactoring prompt agent
4. **General Ideas Deletion** - Enable deletion of ideas without context
5. **Context Multiselect** - Convert single-select to multiselect with sorting
6. **History Removal** - Remove scan history and narrator features
7. **Tinder Context Display** - Show context name on idea cards

## Architecture

The changes follow the existing modular architecture of vibeman:

```
vibeman/src/app/features/
├── Goals/sub_ImplementationLog/     # Requirement 1
├── Context/sub_ContextOverview/     # Requirement 2
├── Ideas/
│   ├── lib/scanTypes.ts             # Requirement 3
│   ├── components/ContextRowSelection.tsx  # Requirement 5
│   ├── sub_Buffer/BufferColumn.tsx  # Requirement 4
│   └── sub_IdeasSetup/              # Requirement 6
│       ├── ScanInitiator.tsx
│       └── components/
└── tinder/components/IdeaCard.tsx   # Requirement 7
```

## Components and Interfaces

### 1. ImplementationLogList Component

**File:** `vibeman/src/app/features/Goals/sub_ImplementationLog/ImplementationLogList.tsx`

**Change:** Update default `limit` prop from 10 to 40.

```typescript
interface ImplementationLogListProps {
  projectId: string;
  limit?: number;  // Default: 40 (changed from 10)
}
```

### 2. Context Overview Components

**Files to modify:**
- `ContextOverview.tsx` - Remove advisor tab and imports
- `ContextOverviewInline.tsx` - Remove advisor tab and imports
- `components/ContextOverviewHeader.tsx` - Remove 'advisors' from TabType

**Files to delete:**
- `AdvisorPanel.tsx`
- `advisorPrompts.ts`
- `AdvisorResponseView.tsx`
- `types.ts`

**TabType change:**
```typescript
// Before
export type TabType = 'manager' | 'docs' | 'testing' | 'files' | 'advisors';

// After
export type TabType = 'manager' | 'docs' | 'testing' | 'files';
```

### 3. Refactor Agent Configuration

**File:** `vibeman/src/app/features/Ideas/lib/scanTypes.ts`

**New ScanType:**
```typescript
export type ScanType =
  | 'zen_architect'
  // ... existing types
  | 'code_refactor';  // NEW

// New config entry
{
  value: 'code_refactor',
  label: 'Code Refactor',
  emoji: '🧹',
  color: 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-emerald-500/40 text-emerald-300',
  description: 'Code cleanup, dead code removal & structure',
  category: 'technical',
  agentFile: 'code_refactor.md'
}
```

### 4. BufferColumn Component

**File:** `vibeman/src/app/features/Ideas/sub_Buffer/BufferColumn.tsx`

**Change:** Enable delete button for General (no-context) ideas.

```typescript
// Current condition (line ~95):
{contextId && ideas.length > 0 && (

// New condition:
{ideas.length > 0 && (
```

**API Change:** The `onContextDelete` callback needs to handle `null` contextId for General ideas.

### 5. ContextRowSelection Component

**File:** `vibeman/src/app/features/Ideas/components/ContextRowSelection.tsx`

**Interface change:**
```typescript
interface ContextRowSelectionProps {
  contexts: Context[];
  contextGroups: ContextGroup[];
  selectedContextIds: string[];  // Changed from selectedContextId?: string | null
  onSelectContexts: (contextIds: string[]) => void;  // Changed from onSelectContext
}
```

**Sorting:** Add alphabetical sorting within groups:
```typescript
const groupedContexts = React.useMemo(() => {
  // ... existing grouping logic
  // Add sorting within each group
  Object.keys(grouped).forEach(groupId => {
    grouped[groupId].sort((a, b) => a.name.localeCompare(b.name));
  });
  return grouped;
}, [contexts, contextGroups]);
```

### 6. ScanInitiator Component

**File:** `vibeman/src/app/features/Ideas/sub_IdeasSetup/ScanInitiator.tsx`

**Removals:**
- Remove `History` icon import from lucide-react
- Remove `showHistory` state
- Remove `ScanHistoryTimeline` import and component
- Remove `ScanNarrator` import and component
- Remove history toggle button

**Files to delete:**
- `components/ScanHistoryTimeline.tsx`
- `components/ScanNarrator.tsx`

### 7. IdeaCard Component

**File:** `vibeman/src/app/features/tinder/components/IdeaCard.tsx`

**New props and state:**
```typescript
interface IdeaCardProps {
  idea: DbIdea;
  projectName: string;
  contextName?: string;  // NEW - optional, defaults to "General"
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  style?: React.CSSProperties;
}
```

**Display change:** Add context name next to project name in footer:
```tsx
<div className="flex items-center gap-2">
  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
  <span className="text-sm text-gray-400">{projectName}</span>
  <span className="text-sm text-gray-500">•</span>
  <span className="text-sm text-gray-400">{contextName || 'General'}</span>
</div>
```

## Data Models

No database schema changes required. All changes are UI/component level.

**Existing models used:**
- `DbIdea` - Contains `context_id` field (nullable)
- `Context` - Contains `name` and `id` fields
- `ContextGroup` - Contains `id`, `name`, `color` fields

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: General Ideas Deletion Completeness

*For any* project with ideas where context_id is null, after executing the delete operation for General ideas, querying ideas for that project should return zero ideas with null context_id.

**Validates: Requirements 4.3**

### Property 2: Context Alphabetical Sorting

*For any* list of contexts within a context group, the rendered order should match the alphabetical sorting by name in ascending order (a-z).

**Validates: Requirements 5.3**

### Property 3: General Context Fallback

*For any* idea displayed in the tinder card where context_id is null or undefined, the displayed context name should be "General".

**Validates: Requirements 7.3**

## Error Handling

### Deletion Errors
- If deletion of General ideas fails, display error toast and maintain current state
- Rollback optimistic updates on API failure

### Context Loading Errors
- If context name cannot be loaded for tinder card, fallback to "General"
- Log error but don't block card rendering

### Multiselect Edge Cases
- Ensure at least "Full Project" option remains available when no contexts selected
- Handle empty context lists gracefully

## Testing Strategy

### Unit Testing

Unit tests will verify specific component behaviors:

1. **ImplementationLogList** - Verify default limit is 40
2. **BufferColumn** - Verify delete button appears for General ideas
3. **ContextRowSelection** - Verify multiselect behavior and sorting
4. **IdeaCard** - Verify context name display and fallback

### Property-Based Testing

Property-based tests will use **fast-check** library for TypeScript.

Each property test will:
- Run minimum 100 iterations
- Be tagged with format: `**Feature: module-cleanup, Property {number}: {property_text}**`

**Property 1 Test:** Generate random sets of ideas with mixed context_id values, execute deletion, verify no null context_id ideas remain.

**Property 2 Test:** Generate random context lists with various names, verify rendered order matches `Array.sort((a, b) => a.name.localeCompare(b.name))`.

**Property 3 Test:** Generate random ideas with null/undefined context_id, verify display always shows "General".

### Integration Testing

- Verify advisor removal doesn't break Context Overview functionality
- Verify history removal doesn't break ScanInitiator functionality
- Verify multiselect integrates correctly with scan operations
