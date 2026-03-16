# Manager Feature

Review and accept implementation logs produced by CLI sessions.

## Architecture

```
Manager/
  ManagerLayout.tsx          # Root orchestrator — data fetching, view switching, modal state
  components/
    ManagerHeader.tsx         # Header with view toggle, project filter, bulk actions
    ManagerCardGrid.tsx       # Flat card grid of implementation logs
    ManagerSystemMap.tsx      # Context-grouped system map (map view)
    DevelopmentFlowMap.tsx    # Cross-context flow graph (flow view)
    ImplementationLogDetail.tsx  # Detail modal — accept, reject, create requirement
    ImplementationLogCard.tsx    # Individual log card
    ImplementationProposalBridge.tsx  # Bridge between logs and proposal system
    TabEmptyStates.tsx        # Empty state illustrations per tab
    StatsBar.tsx              # Summary stats bar
    FlowArrow.tsx             # SVG arrow for flow connections
    BottleneckBadge.tsx       # Bottleneck indicator in flow view
    CrossContextDetail.tsx    # Cross-context relationship detail panel
    LogPreview.tsx            # Compact log preview
    NewTaskModal.tsx          # Modal for creating new tasks from logs
    NewTaskInputPanel.tsx     # Input panel inside the new-task modal
    UserInputPanel.tsx        # User-facing input form
    LLMInputForm.tsx          # LLM advisor input form
    useFlowAnalysis.ts        # Hook for computing flow analysis data
  hooks/
    useLLMAdvisorFlow.ts      # Hook orchestrating LLM advisor generation
  lib/
    types.ts                  # Feature-specific TypeScript types
    config.ts                 # Feature configuration constants
    advisorConfig.ts          # LLM advisor type definitions
    promptTemplates.ts        # Prompt templates for LLM advisors
    llmHelpers.ts             # LLM API call helpers
    proposalAdapter.ts        # Adapter between logs and proposal format
```

## View Modes

| Mode    | Component            | Description                                    |
|---------|----------------------|------------------------------------------------|
| `cards` | `ManagerCardGrid`    | Flat grid of all pending logs                  |
| `map`   | `ManagerSystemMap`   | Context groups on left, filtered cards on right|
| `flow`  | `DevelopmentFlowMap` | Cross-context flow graph with bottleneck detection |

## Data Flow

1. `ManagerLayout` fetches untested implementation logs from `/api/implementation-logs/untested`
2. Context groups and relationships are loaded for map/flow views
3. User can filter by project (on by default) or view all logs
4. Accepting a log marks it as tested and removes it from the list
5. The detail modal supports creating requirements from logs

## Theming

Uses `useThemeStore` for dynamic accent colors via `getThemeColors()`.
