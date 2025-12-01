## Goals
- Make UI compact, space‑efficient, and smooth with thousands of results.
- Keep files easy to orient, target ≤200 lines per file via focused components.
- Ensure step process scales to 1000+ source files with streaming, batching, and virtualized rendering.

## Current State Summary
- Feature: `src/app/features/RefactorWizard` with step router and multiple step UIs.
- Large lists use `VirtualizedOpportunityList.tsx` and `VirtualizedSuggestionList.tsx` via `src/components/ui/VirtualList.tsx`.
- Store: `src/stores/refactorStore.ts` (zustand + persist) holds `opportunities`, selections, filters, and step state.
- Scanning/analysis libs under `lib/` (e.g., `fileScanner.ts`, `scanTechniques.ts`).
- Potential issue: `VirtualList` wraps `react-window` using a `List` export; should be `FixedSizeList` to guarantee virtualization.

## Architecture Changes
- Introduce a dedicated Results domain with clear boundaries:
  - `results/ResultsController.ts` orchestrates fetching, chunk merging, and exposes a typed index.
  - `results/ResultsIndex.ts` builds searchable/grouped indices for fast filtering.
  - `results/types.ts` defines lean result DTOs and normalized shapes.
- Split UI into compact, focused components (≤200 lines):
  - Toolbars: `ResultsToolbar.tsx` (filters, search, grouping), `ReviewToolbar.tsx`.
  - Lists: `OpportunityRow.tsx`, `SuggestionRow.tsx`, `EmptyState.tsx`.
  - Panels: `StatsPanel.tsx`, `SummaryBanner.tsx`.
- Move heavy computations into `lib/` functions; keep components presentational.

## UI/UX Compact Design
- Dense list rows:
  - Single‑line primary text + compact badges (severity, category, file path tail).
  - Right‑aligned actions: select, expand, add to package.
  - Fixed `rowHeight` with ellipsis for long text to maximize viewport utilization.
- Header toolbars:
  - Inline search, quick severity/category filters, folder scope chip, and selection count.
  - Debounced inputs; reflect active filters with pills, easy clear.
- Detail panel:
  - Side drawer for row expansion with diff/preview; keeps main list dense.
- Keyboard support:
  - Up/Down to navigate, Space to toggle selection, Enter to open details.
- Progressive enhancement:
  - Disable heavy animations when dataset size exceeds thresholds; favor instant transitions.

## Performance Strategy
- Fix virtualization wrapper:
  - Update `VirtualList.tsx` to use `FixedSizeList` and memoized row renderers.
- Introduce infinite loading and chunked merge:
  - Load results in pages (e.g., 2–5k items per chunk) with an IntersectionObserver sentinel.
  - Maintain a lightweight `resultsIndex` for fast filter/search without scanning entire arrays.
- Minimize persisted payloads:
  - Persist only filter state and selection IDs; keep large `opportunities` ephemeral in memory.
  - Use `partialize`/`merge` to avoid serializing entire datasets to localStorage.
- Stable props and memoization:
  - Derive row props with `useMemo`, handlers with `useCallback`, pure row components.
- Computation off main thread:
  - Move heavy grouping/summarization to `lib` or a Web Worker if needed (defer until proven necessary).
- Animation budget:
  - Skip `framer-motion` transitions on list route when `rowCount` > threshold.

## Data Flow and Scaling
- Scanning step:
  - Stream or batch server responses; poll or SSE; append results to `ResultsController`.
- Client index:
  - Build maps by `severity`, `category`, `file`, and `ruleId` as chunks arrive.
- Filtering/search:
  - Operate on indices to produce filtered ID arrays; feed virtualized list with IDs, not full objects.
- Selection:
  - Maintain `Set<string>` of IDs; compute derived counts via index to avoid O(n) scans.

## Step Process for Large Codebases
- SettingsStep:
  - Compact folder selector and scan scope chips; concurrency slider and file type filters.
- ScanStep:
  - Show live progress, chunk counts, and backpressure status. Allow pause/resume.
- PlanStep:
  - Auto‑group opportunities by category/rule; present batch actions with confirmation.
- ReviewStep:
  - Virtualized list with compact rows, fast filter/search, keyboard navigation, selection tally.
- PackageStep:
  - Generate packages incrementally; show dependency resolution stats.
- ResultsStep:
  - Summary banner, stats grid, next steps; paginate large summaries if needed.

## Code Organization & File Size Policy
- Target ≤200 lines per file:
  - Extract hooks: `useResultsController.ts`, `useResultsFilters.ts`, `useSelection.ts`.
  - Keep presentational components minimal; move logic to hooks and `lib`.
  - Adopt consistent naming and colocate component + hook pairs per feature subfolder.
- Shared UI primitives:
  - `VirtualList.tsx` (fixed), `ListToolbar.tsx`, `Badge.tsx`, `IconButton.tsx`.

## Testing and Verification
- Unit tests:
  - Indices and filters (property tests for stability under large inputs).
  - Selection logic and chunk merging.
- Integration tests:
  - Virtualized list navigation, infinite loading sentinel, keyboard controls.
- Performance checks:
  - Scripted benchmark loading 100k synthetic items, verify render FPS and memory.
- E2E paths:
  - Multi‑step flow through large scans, ensure no stalls or crashes.

## Migration Plan
- Phase 1: Fix virtualization wrapper, introduce compact rows and toolbar; keep existing data flow.
- Phase 2: Add `ResultsController` and index; shift filters to index‑based.
- Phase 3: Implement chunked fetch/infinite loading; reduce persisted fields.
- Phase 4: Harden tests, performance scripts, and finalize step UX polish.

## Deliverables
- Updated `VirtualList.tsx` ensuring stable virtualization.
- New compact row components and toolbars for Review/Results.
- Results domain (controller, index, types) with hooks.
- Reduced persistence footprint; improved store actions and filters.
- Tests and a basic performance benchmark harness.

## Acceptance Criteria
- Smooth scroll and interaction with 50k+ items loaded in chunks.
- No component file exceeds 200 lines; hooks and libs keep logic tidy.
- Scan flows complete on 1000+ files without UI stalls; filters/search respond <50ms.
- Persisted storage remains small; reload does not block the main thread.
