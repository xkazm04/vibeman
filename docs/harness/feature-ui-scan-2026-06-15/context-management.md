# Context Management — Feature + UI Scan
> Context: Context Management | Group: Core Development Engine
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (3f feature / 2ui ui) | Priority: 0crit/3high/2med/0low
> Files read: ~17

## 1. Surface the Context Balance Audit in the Context UI
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/lib/contexts/audit.ts:52, src/app/api/contexts/audit/route.ts:16, src/app/features/Context/ContextLayout.tsx:266
- **Current state**: A complete advisory grader exists — `auditContexts()` scores the project against the granularity policy and taxonomy and returns rich findings (oversized/undersized contexts, uncategorized contexts, orphaned contexts, file overlap, groups missing a domain). It is exposed at `GET /api/contexts/audit`, but a grep of `src/app/features/Context/**` shows **zero** consumers — the only UI signal is the trivial per-context `ContextHealthIndicator` (file-count + description heuristic in `ContextEntity.health`). The audit's real diagnostic value is invisible to the user.
- **Opportunity**: Add an "Audit" affordance to `HorizontalContextBarHeader` (next to Export/Delete-All) that fetches `/api/contexts/audit?projectId=…` and opens a findings panel grouped by severity (warn/info), each finding deep-linking to its `contextId`/`groupId`. Show the `totals` rollup (overlapping files, uncategorized contexts, groups missing domain) as a one-line health summary.
- **Value**: Turns an already-built backend capability into actionable cleanup guidance, directly supporting the "full coverage / smart grouping" promise the empty state advertises and feeding Vibeman's autonomous-refactor loop with concrete targets.
- **Effort**: 3
- **Implementation sketch**: Add `auditProject(projectId)` to `contextAPI`; new `ContextAuditPanel.tsx` rendered via `useGlobalModal`; map `findings[].severity` to existing color tokens; on click, scroll/highlight the matching `ContextSection`/card by id.

## 2. Wire uncovered-file (coverage gap) detection into the audit
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/lib/contexts/audit.ts:55, src/app/api/contexts/audit/route.ts:29, src/app/features/Context/components/ContextEmptyState.tsx:28
- **Current state**: `auditContexts()` accepts an optional `opts.sourceFileCount` and the report shape implies coverage analysis, but the audit route never passes it — it defaults to `totalFiles` (sum of files already in contexts), so the "Full Coverage" feature the empty state promises ("UI + Logic + API + Types in each context") is never actually verified. The audit detects file *overlap* (`file_overlap`) but can never detect files that belong to **no** context.
- **Opportunity**: Have the audit route obtain the project's real source-file list (the same scan used by context generation / `disk/glob`) and pass both `sourceFileCount` and the file set into `auditContexts`, then emit a new `uncovered_file` finding plus a coverage percentage in `totals`.
- **Value**: Coverage gaps are the single most important context-map quality signal — orphaned files silently fall outside every scan/refactor/idea pass. This makes the autonomous engine's blind spots explicit and is the natural trigger for "scan these N uncovered files into contexts."
- **Effort**: 3
- **Implementation sketch**: In `audit/route.ts`, glob source files (reuse the generation file collector), build `Set(filesInContexts)`, compute `uncovered = allFiles - covered`; extend `auditContexts` to accept `allFiles?: string[]`, push `uncovered_file` findings (capped like overlap) and add `coverage` to `totals`.

## 3. Expose group health-scan history & issue breakdown (not just one number)
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: user_benefit
- **File(s)**: src/app/db/repositories/group-health.repository.ts:95, src/app/api/group-health-scan/route.ts:34, src/app/features/Context/sub_ContextGroups/components/GroupHealthBar.tsx:51
- **Current state**: Each scan persists a detailed `scan_summary` (per-issue counts: `unusedImports`, `consoleStatements`, `anyTypes` found/fixed) and the repo offers `getByGroup`, `getLatestCompletedByGroup`, and `getStats`. The API even returns `scans`, `latestCompleted`, and `stats`. Yet the UI renders only a single clamped percentage via `GroupHealthBar` — history, trend, and the issue breakdown are stored but never shown, and there is no `scan_summary` consumer in `src/app/features/Context`.
- **Opportunity**: Add a small expandable "scan history" popover on the group card (triggered from `GroupHealthScanButton`'s area) listing the last N scans with timestamp, score delta, and issues found→fixed, sourced from `GET /api/group-health-scan?groupId=…`.
- **Value**: Lets users see whether repeated scans are actually improving a group and what categories of debt remain — converting fire-and-forget scans into a measurable improvement trail.
- **Effort**: 2
- **Implementation sketch**: New `GroupScanHistoryPopover.tsx` fetching `?groupId`; render `scans[]` with `health_score`, `issues_found`, `issues_fixed`, `completed_at`; reuse `GroupHealthBar` mini-bars for per-scan score.

## 4. Fix GroupHealthScanButton label/icon semantics
- **Lens**: 🎨 ui-perfectionist
- **Priority**: med
- **Category**: ui
- **File(s)**: src/app/features/Context/sub_ContextGroups/components/GroupHealthScanButton.tsx:66, src/app/features/Context/sub_ContextGroups/components/GroupHealthScanButton.tsx:74
- **Current state**: The component is documented as the health-scan trigger and lives in the health-scan flow, but its tooltip says `Refactoring... / Refactor (…)` and it uses a `RefreshCw` icon. Sibling scan buttons (`BeautifyScanButton`, `PerformanceScanButton`) each have their own distinct labels/icons, so this "refactor" button is visually indistinguishable in intent from a generic refresh and inconsistent with the "health" naming used everywhere else (store, repo, API, `GroupHealthBar`).
- **Opportunity**: Align the icon and copy with the action: use a health/heart-pulse icon (e.g. `Activity`/`HeartPulse` from lucide, already used elsewhere) and label it "Health scan" with the last-scan time, matching the labeling pattern of the beautify/performance siblings.
- **Value**: Removes a real intent-ambiguity (users currently can't tell a health scan from a data refresh), improving discoverability of the scan suite without any accessibility regression.
- **Effort**: 1
- **Implementation sketch**: Swap `RefreshCw`→`Activity`; change `title` to `Health scan (${formatLastScan()})` / `Scanning… ${progress}%`; add a matching `aria-label`.

## 5. Wire up (or remove) the orphaned keyboard-navigation hook
- **Lens**: 🎨 ui-perfectionist
- **Priority**: high
- **Category**: maintenance
- **File(s)**: src/app/features/Context/sub_ContextGroups/hooks/useKeyboardNavigation.ts:30, src/app/features/Context/ContextLayout.tsx:330
- **Current state**: `useKeyboardNavigation` is a fully built 327-line accessibility feature (Tab/arrow grid navigation, `M` move-menu, `1-9` quick-move-to-group, Enter/Escape) but a repo-wide grep shows it is **never imported** — the only references are the file itself and the docs manifest. Meanwhile context cards in `ContextLayout` are moved exclusively via `@dnd-kit` drag-and-drop with a 300ms delay, which is keyboard-inaccessible. The hook's `[data-context-card]`/`dataset.contextId` selectors also imply card markup that may not exist, so it's dead code that also creates an a11y gap.
- **Opportunity**: Wire the hook into the grid in `ContextLayout` — attach `containerRef`, ensure `ContextJailCard` renders `data-context-card`/`data-context-id` and is focusable, render the move menu, and call `queueMove` from `onMoveContext`. (If product declines, delete the file so it stops masquerading as shipped a11y.)
- **Value**: Makes the core organizational primitive operable without a mouse (keyboard + screen-reader users currently cannot regroup contexts), and eliminates misleading dead code that inflates the perceived a11y surface.
- **Effort**: 3
- **Implementation sketch**: In `ContextLayout`, instantiate the hook with `contexts`/`groups`/`queueMove`/`openGroupDetail`; spread `containerRef` onto the grid `div`; add `tabIndex`, `data-context-card`, `data-context-id` to the card wrapper; render a `MoveMenu` portal at `moveMenuPosition`.
