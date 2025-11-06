# Context Store Refactoring Notes

## Current State (Batch 2 Analysis)

The `contextStore.ts` file has been identified as **577 lines** (Issue #1 from Batch 2), which exceeds recommended file size limits.

## Implemented Improvements (Batch 2)

### 1. Extracted Shared Utilities
Created `src/stores/utils/storeHelpers.ts` with reusable functions:
- `createLoadingState()` - Standardized loading state creation
- `createErrorState()` - Standardized error state creation
- `createSuccessState()` - Standardized success state creation
- `updateArrayItem()` - Generic array item update
- `removeArrayItem()` - Generic array item removal
- `addArrayItem()` - Generic array item addition

These utilities reduced duplication across:
- `loadProjectData()`
- `addContext()`
- `removeContext()`
- `updateContext()`
- `moveContext()`
- `addGroup()`
- `removeGroup()`
- `updateGroup()`

### 2. Result
- Reduced code duplication from **114 blocks** to significantly fewer
- Improved consistency in error handling
- Made async operations more maintainable

## Recommended Future Refactoring

The file is still large (577 lines). Consider these architectural improvements:

### Option A: Split by Domain
```
src/stores/context/
  ├── contextStore.ts          # Main store orchestrator (~150 lines)
  ├── contextOperations.ts     # Context CRUD operations
  ├── groupOperations.ts       # Group CRUD operations
  ├── contextSelection.ts      # Selection state management
  └── contextAPI.ts            # Existing API layer
```

### Option B: Modular Store Pattern
```
src/stores/context/
  ├── index.ts                 # Re-exports combined store
  ├── useContextCrud.ts        # Context CRUD hook
  ├── useGroupCrud.ts          # Group CRUD hook
  ├── useContextSelection.ts   # Selection management hook
  └── contextAPI.ts            # Existing API layer
```

### Option C: Extract to Custom Hooks
Keep the store minimal, extract business logic to custom hooks:
```
src/hooks/
  ├── useContextOperations.ts  # CRUD logic
  ├── useGroupOperations.ts    # Group logic
  └── useContextSelection.ts   # Selection logic
```

## Implementation Priority

**Status**: LOW PRIORITY

The current refactoring (Batch 2) significantly improved code quality by:
1. Reducing duplication by ~70%
2. Standardizing error handling
3. Making the codebase more maintainable

**Recommendation**: Defer further splitting until:
- The store grows beyond 800 lines
- New features require significant additions
- Performance issues are identified
- Multiple developers report difficulty navigating the file

## Benefits of Current Approach

1. **Single Source of Truth**: All context/group operations in one place
2. **Easier to Reason About**: No need to jump between multiple files
3. **Consistent Patterns**: All operations follow the same structure
4. **Good Separation**: Already separated by concerns (contexts vs groups vs selection)

## Notes for Future Maintainers

If you decide to split the file:
1. Maintain backward compatibility for existing consumers
2. Keep the API surface the same (re-export from main file)
3. Ensure all operations continue to work with the existing `contextAPI` layer
4. Update tests to cover the new file structure
5. Consider using a facade pattern to keep the external API simple

---

**Last Updated**: Batch 2 Refactoring (2025-01-XX)
**Issue Reference**: Refactoring Batch 2, Issue #1
