# Workspace & Project Management — Feature + UI Scan
> Context: Workspace & Project Management | Group: Data & Infrastructure
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (3f feature / 2ui ui) | Priority: 0crit/2high/3med/0low
> Files read: ~16

> Manifest drift noted: `HallOfFame/components/ComponentGrid.tsx`, `HallOfFame/components/PreviewModal.tsx` path is correct but the layout actually composes `FeaturedHero`/`CategoryTabs`/`ComponentTable` (no `ComponentGrid`); `api/disk/glob` and `api/disk/list-directories` do not exist (the disk dir has only `batch/`, `file/`, `search/`). The real workspace CRUD UI lives in `src/app/projects/sub_Workspaces/` (not in the manifest's `Overview/` listing).

## 1. Destructive workspace delete has no confirmation in the modal path (and is inconsistent with the drawer path)
- **Lens**: 🎨 ui-perfectionist
- **Priority**: high
- **Category**: ui
- **File(s)**: src/app/projects/sub_Workspaces/WorkspaceList.tsx:74, src/app/projects/sub_Workspaces/WorkspaceManager.tsx:47, src/components/Navigation/ShortcutsBar.tsx:117
- **Current state**: In the WorkspaceManager modal (mounted at `ProjectsLayout.tsx:108`), the trash button calls `onDelete(ws.id)` → `handleDelete` → `deleteWorkspace(id)` immediately, with no confirmation, no undo, and no loading/disabled state on the button. The other deletion surface, `ShortcutsBar.tsx:117`, *does* guard with `window.confirm("Delete workspace...projects will become unassigned")`. So the same destructive action behaves differently depending on where the user triggers it.
- **Opportunity**: Add a confirmation step to the modal delete (inline "Confirm delete?" two-step on the row, or reuse the same copy as the drawer), and disable the trash button while the request is in flight. Ideally factor a single `confirmDeleteWorkspace(ws)` helper used by both surfaces so the wording and behavior stay identical.
- **Value**: Prevents accidental, silent loss of workspace organization (a misclick wipes project groupings with zero feedback) and removes a jarring behavioral inconsistency between two paths to the same action.
- **Effort**: 2
- **Implementation sketch**: In `WorkspaceList`, add per-row `pendingDeleteId` state; first click sets it and swaps the trash icon for a red "Confirm" affordance (auto-reset on blur/timeout); second click calls `onDelete`. Disable the button when `pendingDeleteId === ws.id && deleting`. Optionally hoist the confirm copy from `ShortcutsBar.handleDeleteWorkspace` into a shared util.

## 2. Workspace-level git status rollup is computed but never surfaced in the workspace UI
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/features/Overview/sub_WorkspaceArchitecture/lib/useArchitectureData.ts:217, src/app/api/git/branches/route.ts:104, src/app/projects/sub_Workspaces/WorkspaceList.tsx:52
- **Current state**: `/api/git/branches` already returns `{ branch, dirty }` per project with bounded concurrency, and `useArchitectureData.fetchBranches` consumes it to annotate Matrix nodes. But the workspace management surfaces (`WorkspaceList` rows, `ArchitectureBottomBar` project badge at line 144) show only a static project *count*. A user managing a multi-repo workspace cannot see "3 of 8 projects have uncommitted changes" without opening the architecture canvas and inspecting each node.
- **Opportunity**: Surface an aggregate git-health badge per workspace (e.g. "5 clean · 3 dirty") in `WorkspaceList` rows and in the bottom-bar project badge, reusing the existing `/api/git/branches` payload. This fits Vibeman's autonomous-dev direction: knowing which workspaces have unpushed/uncommitted work is a prerequisite for batch commit orchestration.
- **Value**: Gives an at-a-glance "what needs attention" signal across a workspace's repos, turning the workspace list from a passive label into an actionable dashboard.
- **Effort**: 3
- **Implementation sketch**: Lift the `branchInfo` Map out of `useArchitectureData` into a small shared hook (or call `/api/git/branches` from `WorkspaceList` with the workspace's project paths), then render a dirty/clean count chip next to the existing project-count span; debounce/refetch on workspace switch.

## 3. No batch "commit & push" across a workspace despite a hardened single-project endpoint
- **Lens**: 🔍 feature-scout
- **Priority**: medium
- **Category**: feature
- **File(s)**: src/app/api/git/commit-and-push/route.ts:162, src/app/api/git/branches/route.ts:104, src/stores/workspaceStore.ts:203
- **Current state**: `/api/git/commit-and-push` is a robust, security-hardened single-project endpoint (validated templates, `execFile`, committed-but-not-pushed guard). `/api/git/branches` already enumerates dirty repos for a whole project set. Yet there is no workspace-scoped operation that commits/pushes all dirty repos in the active workspace — the user must repeat the action project by project.
- **Opportunity**: Add a "Commit & push workspace" action that takes the active workspace's project IDs (`getActiveWorkspaceProjectIds`), filters to dirty repos via `/api/git/branches`, and fans out to the existing per-project endpoint with bounded concurrency, returning a per-project results summary.
- **Value**: Closes the loop on multi-repo orchestration — after an autonomous TaskRunner batch touches several repos in a workspace, one action ships them all instead of N manual round-trips.
- **Effort**: 3
- **Implementation sketch**: New `POST /api/git/workspace-commit` that resolves project paths, calls the dirty-filter, then `mapWithConcurrency` (mirror `git/branches`) over `commit-and-push`'s handler logic; return `{ projectId, success, error }[]`. Trigger it from a button in `WorkspaceList`/`ArchitectureBottomBar`, reusing finding #2's git badge as the entry point.

## 4. "Recently used" / quick-switch is missing from the workspace switcher
- **Lens**: 🔍 feature-scout
- **Priority**: medium
- **Category**: user_benefit
- **File(s)**: src/components/Navigation/ShortcutsBar.tsx:163, src/stores/workspaceStore.ts:65, src/stores/workspaceStore.ts:209
- **Current state**: The workspace drawer (`ShortcutsBar.tsx:163+`) lists workspaces in static `position`/`created_at` order. `setActiveWorkspace` just stores the id; the persist `partialize` (`workspaceStore.ts:209`) keeps `activeWorkspaceId` but tracks no recency or usage. Power users juggling many workspaces re-scan the full list every switch, and the Blueprint shortcut already advertises a `^B` hotkey while workspace switching has none.
- **Opportunity**: Track `lastUsedAt` per workspace in the store (persisted), sort the drawer with the active + most-recent workspaces first, and add a keyboard shortcut to cycle/jump to the previous workspace (matching the existing `^B` pattern).
- **Value**: Cuts the cost of context-switching for users who orchestrate work across several workspaces daily — the core multi-project audience for this tool.
- **Effort**: 2
- **Implementation sketch**: Add `workspaceLastUsed: Record<string,number>` to `workspaceStore`, set it in `setActiveWorkspace`, include it in `partialize`; sort the drawer `workspaces.map` by `lastUsed` desc. Register a hotkey in `ShortcutsBar` that toggles between the two most-recent workspace ids.

## 5. HallOfFame star toggle and component rows lack pending/optimistic + accessible state
- **Lens**: 🎨 ui-perfectionist
- **Priority**: medium
- **Category**: ui
- **File(s)**: src/app/features/HallOfFame/HallOfFameLayout.tsx:37, src/app/features/HallOfFame/components/ComponentTable.tsx:82
- **Current state**: `handleToggleStar` awaits the POST to `/api/hall-of-fame/star` *before* updating `starredIds`, so the star icon does not react until the round-trip completes, and there is no in-flight/disabled state — rapid clicks can fire duplicate toggles and visually desync. The star button (`ComponentTable.tsx:82`) also exposes only a `title`, no `aria-pressed`/`aria-label`, so screen readers don't announce starred state, and the table rows are clickable `div`s (line 66) with no keyboard affordance.
- **Opportunity**: Make the star toggle optimistic (flip `starredIds` immediately, roll back on failure), disable the button while a request for that id is pending, add `aria-pressed={isStarred}` + a descriptive `aria-label`, and give the row `role="button"`/`tabIndex`/Enter handling (or wrap content in a real button).
- **Value**: Instant, reliable feedback on starring (no perceived lag or double-toggles) plus a meaningful accessibility improvement for the component showcase that other surfaces in the app treat as a design-system reference.
- **Effort**: 2
- **Implementation sketch**: In `handleToggleStar`, update `starredIds` before `fetch` and revert in the `catch`; track a `pendingStar` Set to disable the button. In `ComponentTable`, add `aria-pressed`/`aria-label` to the star button and `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space → `onComponentClick`) to the row.
