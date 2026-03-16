# Questions & Directions Feature

Strategic questioning workflow for brainstorming development directions.

## Architecture

```
Questions/
  QuestionsLayout.tsx           # Root orchestrator — context selection, generation, review
  components/
    ContextMapSelector.tsx       # Context selection panel with group-based UI
    CombinedGeneratePanel.tsx    # Unified generate panel for questions and directions
    UnifiedTable.tsx             # Combined questions/directions table with filtering
    DirectionMatrix.tsx          # Effort/impact matrix visualization
    QuestionTree.tsx             # Cascading question tree with depth-based coloring
    QuestionDirectionRow.tsx     # Unified table row for questions and directions
    AnswerQuestionModal.tsx      # Modal for answering questions
    AutoDeepenToast.tsx          # Notification toast for auto-deepen results
    ViewModeToggle.tsx           # Segmented control for review view modes
  lib/
    questionsApi.ts              # API client for questions, contexts, trees, auto-deepen
    directionsApi.ts             # API client for direction operations
```

## Workflow Steps

The layout follows a three-step rail (shown via `LiquidStepRail`):

1. **Select** — Choose context maps to explore
2. **Generate** — Create questions and/or direction proposals via LLM
3. **Review** — Triage results in one of four view modes

## View Modes

| Mode       | Component          | Description                                  |
|------------|--------------------|----------------------------------------------|
| `table`    | `UnifiedTable`     | Combined questions/directions table          |
| `matrix`   | `DirectionMatrix`  | Effort/impact quadrant visualization         |
| `carousel` | `DirectionCarousel`| Swipeable direction cards for quick triage   |
| `tree`     | `QuestionTree`     | Cascading question tree with follow-ups      |

## Key Business Logic

### Auto-Deepening
When a question is answered, the system automatically analyzes the answer for ambiguity.
If gaps are found, follow-up questions are generated and a toast notification appears
(auto-dismissed after 6 seconds). See `handleSaveAnswer` in `QuestionsLayout.tsx`.

### Brainstorm Mode
Direction generation supports a "brainstorm all" mode that uses all contexts regardless
of the current selection, allowing broader exploration.

### Context Auto-Selection
On first load for a project, all contexts are auto-selected. When the user switches
projects, the selection resets to avoid stale context references.

## Exports

The layout re-exports interrogative engines for programmatic access:
- `createQuestionsEngine` — generate questions without UI
- `createDirectionsEngine` — generate directions without UI

These are used by tests, automation, and CLI tools.
