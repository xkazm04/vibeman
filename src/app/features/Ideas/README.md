# Ideas Feature

Discovery and triage of code-improvement ideas through configurable scans.

## Architecture

```
Ideas/
  IdeasLayout.tsx              # Root orchestrator — project selection, scan, view switching
  components/
    IdeasHeaderWithFilter.tsx   # Header with project/context/group filters
    IdeaDetailModal.tsx         # Detail modal — edit, delete, status changes
    IdeasLoadingState.tsx       # Loading skeleton
    ContextGroupSelector.tsx    # Context group filter dropdown
    ContextItemSelector.tsx     # Individual context item selector
    ContextRowSelection.tsx     # Row-level context selection
    ProjectRowSelection.tsx     # Row-level project selection
    ProviderStatus.tsx          # LLM provider status indicator
    ScanTypePreview.tsx         # Preview of scan type configuration
  sub_Buffer/
    BufferView.tsx              # Flat grouped list view (default)
    BufferColumn.tsx            # Column within the buffer view
    BufferItem.tsx              # Individual idea card in the buffer
    TriageRulesPanel.tsx        # Triage rule configuration panel
  sub_Kanban/
    KanbanBoard.tsx             # Status-column kanban layout
    KanbanColumn.tsx            # Individual kanban column
    KanbanCard.tsx              # Draggable kanban card
  sub_IdeasSetup/
    ScanInitiator.tsx           # Scan trigger with type selector
    ScanTypeSelector.tsx        # Scan type configuration
    ProjectFilter.tsx           # Project filter for scans
    components/
      ClaudeIdeasButton.tsx     # Quick-scan button
      PromptEditorModal.tsx     # Custom prompt editor
      ProviderSelector.tsx      # LLM provider picker
    lib/
      ScanTypeConfig.ts         # Scan type definitions
      ideaExecutor.ts           # Scan execution logic
  sub_Lifecycle/
    LifecycleDashboard.tsx      # Lifecycle overview dashboard
    components/                 # Lifecycle-specific UI components
    lib/                        # Lifecycle orchestrator and executors
  lib/
    contextLoader.ts            # Context name resolution helpers
    ideaConfig.ts               # Feature configuration
    ideasHandlers.ts            # API route handlers
    scanApi.ts                  # Scan API client
    scanTypes.ts                # Scan type definitions
    selectionTypes.ts           # Selection-related types
```

## View Modes

| Mode     | Component     | Description                              |
|----------|---------------|------------------------------------------|
| `buffer` | `BufferView`  | Flat grouped list, default view          |
| `kanban` | `KanbanBoard` | Status-column layout for triage workflow |

## Data Flow

1. Projects are loaded from `useServerProjectStore` on mount
2. User selects a project; context filters reset to avoid stale state
3. Scan initiator runs configured scans against selected contexts
4. Scan completion invalidates the React Query cache (`useInvalidateIdeas`)
5. Buffer or Kanban view renders the updated idea list
6. Idea detail modal handles edits/deletes (cache invalidated internally)

## Key Patterns

- React Query is used for data fetching with shared cache between header filters and the main view
- `LazyContentSection` provides staggered entrance animations
- `React.memo` wraps the layout to prevent unnecessary re-renders from parent state changes
