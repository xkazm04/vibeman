# Canonical Signal Type Enum Implementation

## Summary

Created a single source of truth for behavioral signal types in `@/types/signals.ts` to eliminate inconsistencies across the codebase. Previously, signal types were defined independently in at least 4 locations with different subsets (4, 5, and 7 types), causing silent failures when signals like `cli_memory` were recorded but couldn't be visualized.

## Changes Made

### 1. Created Canonical Enum (`src/types/signals.ts`)

- **SignalType enum**: All 7 signal types in one place
- **SIGNAL_METADATA**: Complete metadata registry with:
  - `displayName`: Full name for UI
  - `shortLabel`: Abbreviated label for compact views
  - `color`: Hex color for visualization
  - `canVisualize`: Flag indicating if type can be shown on canvas
  - `description`: What the signal tracks

- **Helper functions**:
  - `getAllSignalTypes()`: Returns all 7 types
  - `getVisualizableSignalTypes()`: Returns only the 4 types that can be shown on canvas
  - `canVisualizeSignal(type)`: Check if a type is visualizable
  - `getSignalMetadata(type)`: Get metadata for a type
  - `isValidSignalType(value)`: Type guard for validation

### 2. Updated All Consumers

| File | Change |
|------|--------|
| `src/types/signals.ts` | **NEW** - Canonical source of truth |
| `src/app/db/models/brain.types.ts` | Import and re-export `BehavioralSignalType` from canonical source |
| `src/app/api/brain/signals/route.ts` | Use `isValidSignalType()` and `getAllSignalTypes()` for validation |
| `src/app/db/repositories/behavioral-signal.repository.ts` | Use `getAllSignalTypes()` to initialize count map |
| `src/app/features/Brain/sub_MemoryCanvas/lib/types.ts` | Import `BehavioralSignalType` instead of hardcoded union |
| `src/app/features/Brain/sub_MemoryCanvas/lib/constants.ts` | Derive `COLORS`, `LABELS`, and `LANE_TYPES` from metadata |
| `src/app/features/Brain/sub_MemoryCanvas/lib/signalMapper.ts` | Use `canVisualizeSignal()` to filter, handle all 7 types |
| `src/app/features/Brain/sub_MemoryCanvas/lib/renderEmptyState.ts` | Use `LANE_TYPES` and `LABELS` from constants |
| `src/app/features/Brain/sub_Timeline/EventCanvasTimeline.tsx` | Derive lane labels from `SIGNAL_METADATA` |

### 3. Signal Types

**Visualizable** (shown on canvas):
- `git_activity` - Git commits and file changes
- `api_focus` - API endpoint usage
- `context_focus` - Time spent in contexts
- `implementation` - Requirement implementation outcomes

**Non-visualizable** (tracked but not shown):
- `cross_task_analysis` - Multi-project analysis activities
- `cross_task_selection` - Plan selection in cross-task workflows
- `cli_memory` - CLI insights and decisions

## Benefits

1. **Single Source of Truth**: All signal types and metadata defined in one place
2. **Type Safety**: Validation, mapping, and rendering all derive from the same enum
3. **No Silent Failures**: `cli_memory` signals are now properly handled (filtered out of canvas, counted in stats)
4. **Easy Extension**: Add new signal types in one place, all layers update automatically
5. **Metadata-Driven**: Colors, labels, and visualization support are centrally defined

## Testing

Created comprehensive test suite in `tests/unit/signal-types.test.ts`:
- ✅ All 7 signal types defined
- ✅ Metadata exists for all types
- ✅ Correct types marked as visualizable
- ✅ Valid color hex codes
- ✅ Helper functions work correctly
- ✅ Consistency across canvas constants
- ✅ 15/15 tests passing

## Migration Notes

- **Breaking Change**: None - all existing signal data remains compatible
- **API Compatible**: All existing signal types still accepted
- **Canvas Behavior**: Now correctly filters out non-visualizable types instead of silently dropping them

## Future Improvements

When adding a new signal type:
1. Add to `SignalType` enum in `src/types/signals.ts`
2. Add metadata entry to `SIGNAL_METADATA`
3. Add data interface to `src/app/db/models/brain.types.ts`
4. Add summary extraction case to `signalMapper.ts` if visualizable
5. Add validation case to API route if it has custom data shape

That's it! Everything else updates automatically.
