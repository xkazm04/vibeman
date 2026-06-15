# Feature+UI Scan — Fix Wave 5: UI Consistency & Design-System

> 5 findings closed across 5 commits.
> Baseline preserved: TypeScript 0 → 0 errors; tests 539/542 → 539/542 (same 3 pre-existing failures).

Theme: a single, consistent visual language and reusable primitives. Implemented via
5 parallel edit-only subagents (disjoint modules), verified centrally, committed atomically.

## Commits

| # | Commit | Finding | Files |
|---|---|---|---|
| 1 | `refactor(docs): unify layer colors via LAYER_CONFIG token` | docs #5 | SystemMap/types.ts, XRayHotPathsPanel.tsx, XRaySystemMap.tsx |
| 2 | `fix(workspaces): confirm before deleting a workspace…` | workspace #1 | WorkspaceManager.tsx |
| 3 | `refactor(taskrunner): standardize empty states…` | taskrunner #4 | TaskRunnerEmptyState.tsx (new), KanbanColumn.tsx, TaskRunnerFullView.tsx |
| 4 | `refactor(build-fixer): single requirement-markdown template` | scan-queue #5 | buildScanner.ts, requirementCreator.ts, route.ts |
| 5 | `refactor(ui): salvage StatusBadge + AIProcessingPanel…` | social #2, #4 | StatusBadge.tsx (new), AIProcessingPanel.tsx (new), components/ui/index.ts, showcaseRegistry.ts |

## What was unified

1. **Layer-color token** — added `textClass`/`bgClass` + `getLayerStyle(layer)` to the canonical `LAYER_CONFIG` and replaced the inline per-layer Tailwind maps in the X-Ray components, so "amber = server" reads identically everywhere. (Subagent correctly skipped `FilePathChip` — it keys on FileType, not layer; a false positive in the finding.)
2. **Workspace delete confirm** — the manager-modal delete fired with no confirmation, inconsistent with the ShortcutsBar path. Added the same `window.confirm` guard (matching copy) — chosen over the styled modal to avoid a z-index clash with the already-open manager modal.
3. **TaskRunner empty states** — extracted a `TaskRunnerEmptyState` (icon + title + subtext) and applied it to the grid and Kanban-column empty states, matching the polished SessionSidebar pattern.
4. **Build-Fixer markdown template** — collapsed two near-identical branches in `formatErrorGroup` into one `buildRequirementMarkdown` helper, dropping the duplicated instruction prose and the redundant second error dump, and adding the build command to the verify step. (This is the prompt the auto-fixer — and Wave-2's `fix_build` tool — consume.)
5. **Salvaged primitives** — promoted the two reusable Social atoms (whose HallOfFame showcase entries pointed at deleted files) into real `src/components/ui/StatusBadge` + `AIProcessingPanel`, and re-pointed the showcase so "view source"/"copy import" resolve again.

## Verification table

| Gate | Before | After Wave 5 |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vitest run` | 539/542 (3 pre-existing fail) | 539/542 (same 3) |

## Cumulative status (waves 1–5): 29 / 95 closed.

## Patterns established (catalogue item 11)

11. **Token vs ad-hoc class drift** — a canonical design token (hex `LAYER_CONFIG`) coexists with inline Tailwind-class re-encodings of the same concept across components; the two representations drift so the same logical thing renders in subtly different shades. Fix: make the token carry BOTH representations (or a `get*Style()` helper) and have every consumer read it. Watch for false positives — a map that looks similar but keys on a different domain concept (FileType vs ModuleLayer) is not the same token.
