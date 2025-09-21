# UI_REFACTOR_PLAN.md

Purpose

A high-level plan to modularize and optimize the React/Next.js UI in this repository. It identifies where to extract reusable components and proposes performance techniques aligned with current patterns (Zustand, TanStack Query, Monaco, markdown renderers, large tables/trees).

Scope

- Source scanned: .tsx files under src/
- Focuses on major UI surfaces and shared primitives. Not an exhaustive per-file inventory.

UI landscape (by feature areas)

- Global layouts/pages
  - src/app/layout.tsx, src/app/page.tsx, multiple feature layouts (ProjectsLayout, CoderLayout, PreviewLayout, MonitorLayout, BackgroundTaskLayout)
- Coder & Context management
  - src/app/coder/** (Backlog, CodeTree, Context…)
  - Many modal/dialog components and panels around context groups, file selection, and tooltips
- Projects & AI workflows
  - src/app/projects/** (Project forms, tabs, AI panels, file scanner modals/results)
- Background tasks & Events
  - src/app/background-tasks/**, src/app/combined-layout/**, src/app/events/**
- Runner (process control)
  - src/app/runner/** (config, toggles, status, kill modal)
- Annette (voicebot prototype)
  - src/app/annette/** (status panel, demo UI)
- Shared component libraries
  - src/components/** (editor, markdown, ui, generic modals)

Modularization plan (extract or consolidate reusable components)

1) Modal system unification
- Evidence
  - src/components/ui/BaseModal.tsx, ModalHeader.tsx, ModalContent.tsx
  - src/components/UniversalModal.tsx, SaveContextFileDialog.tsx, ui/SaveFileDialog.tsx
  - Many feature-specific modals: ContextSaveModal, GroupManagementModal, FileScannerModal, ScanResultsModal, AIProjectReviewModal, ProjectSelectionModal, Goals*Modal, BackgroundTask* dialogs, Runner/EmergencyKillModal
- Plan
  - Create a single modal primitive family under components/ui/modal:
    - ModalRoot, ModalHeader, ModalBody, ModalFooter, ModalClose, ModalSize variants, ModalPortal
    - Standardize props (isOpen, onOpenChange, title, description, footerActions)
  - Build thin feature-specific wrappers that only pass content and actions
  - Add a reusable ConfirmDialog primitive for destructive actions (used by Runner, reviewer screens)
- Candidate refactors
  - Replace bespoke modals in coder/context, projects/file-scanner, runner, reviewer with the shared primitive

2) Data table and list virtualization
- Evidence
  - EventTable/EventRow, BackgroundTaskTable/Row, various “table/list” UIs
- Plan
  - Introduce components/ui/datagrid with:
    - Virtualized list/table (react-virtual or react-window)
    - Column definitions, cell renderers, row selection, empty/empty-search states
    - Loading/skeleton and error states standardized
  - Wire to TanStack Query’s select and keepPreviousData for smooth transitions
- Candidate refactors
  - EventTable, BackgroundTaskTable, file-scan results lists, context lists

3) Tree view consolidation
- Evidence
  - src/app/coder/CodeTree/*: TreeView, TreeNode, TreeHeader, TreeSearch, TreeFooter, TreeSuggestion
- Plan
  - Extract a generic tree library under components/ui/tree:
    - Tree, TreeNode, Icons, Keyboard navigation, Search highlight, Virtualization for large repos
  - Expose controlled/uncontrolled selection and lazy loading for deep directories
- Candidate refactors
  - CodeTree components to use the shared tree primitives

4) Editor primitives (Monaco family)
- Evidence
  - components/editor/: MonacoEditor, MonacoDiffEditor, MultiFileEditor, FileTab
- Plan
  - Create components/editor/provider with a single dynamic-loaded Monaco provider (next/dynamic)
  - Standardize props: language, value, onChange, path, readOnly, diffLeft/diffRight
  - Provide an EditorToolbar slot for actions (format, copy, download, AI assist)
- Candidate refactors
  - Replace multiple ad-hoc editor wrappers with provider-backed primitives

5) Markdown rendering kit
- Evidence
  - components/markdown/: MarkdownViewer, InteractiveContent, Md* components, PlantUML* components
- Plan
  - Consolidate renderer config (remark/rehype plugins, syntax highlighting) into a single MarkdownProvider
  - Provide composable blocks (Callout, Table, TOC, Code with copy)
- Candidate refactors
  - Unify markdown viewers across Projects/AI docs, review, and previews

6) Panels, headers, and layout scaffolding
- Evidence
  - Many feature-specific “Header”, “Panel”, and left/right layout shells: ContextPanel, GoalsLayout, ProjectsLayout, PreviewLayout, MonitorLayout
- Plan
  - Extract components/ui/panel and components/ui/layout:
    - PageHeader (title, subtitle, actions, breadcrumbs), Panel (variant, padding), SplitPane, Toolbar
  - Target consistent spacing, keyboard focus, and responsive behavior
- Candidate refactors
  - Replace bespoke feature headers and panels with standardized primitives

7) Form field components
- Evidence
  - ProjectForm, ProjectPortSelection, ProjectAdd/Edit/Delete, numerous ad-hoc inputs inside modals
- Plan
  - Introduce components/ui/form using react-hook-form + zod (if desired):
    - Field primitives: TextField, TextArea, NumberField, Select, Combobox, Switch, Slider
    - FormRow, FormActions, ValidationMessage
- Candidate refactors
  - All project and context configuration dialogs/forms

8) Status and feedback components
- Evidence
  - StatusLever, RunnerSwitch, FileScannerStatus, BuildErrorResults, TestStatus, various “loading” and “empty” states
- Plan
  - Create components/ui/status with:
    - StatusBadge (success/error/warn/info), ProgressBar, Skeletons, EmptyState, AsyncActionButton (with pending)
- Candidate refactors
  - Replace bespoke status displays across runner, file scanner, background tasks, annette

9) Menus and context menus
- Evidence
  - components/ContextMenu.tsx and coder/Context/ContextMenu/ContextMenu.tsx (potential duplication)
- Plan
  - Consolidate into components/ui/menu with context menu, dropdown menu, command palette patterns
- Candidate refactors
  - Use unified menu across coder, projects, reviewer

Performance optimization plan

A) Rendering and state management
- Use React.memo strategically for leaf components in large lists/trees (EventRow, BackgroundTaskRow, TreeNode)
- Prefer stable callbacks and memoized derived data (useCallback/useMemo) in hot paths
- Zustand: use selector functions and shallow compare to minimize re-renders; avoid passing entire stores to deep trees
- TanStack Query: set sensible staleTime and gcTime; use select to map server data to render-friendly shape; enable keepPreviousData for paginated lists
- Split large components by concern and lazy-load rarely used parts with next/dynamic (SSR: false for Monaco and heavy client-only components)

B) Virtualization and windowing
- Virtualize large tables (events, background tasks) and trees (repository view) using react-virtual/react-window
- Window long markdown content and code diffs; render only visible sections

C) Suspense, streaming, and transitions
- Wrap data-fetching regions with <Suspense> and progressively render (Next.js app router supports RSC/Suspense)
- Use useTransition for filter/search interactions (TreeSearch, table filters) to keep UI responsive
- Defer non-critical client JS by moving logic server-side where possible (RSC), and promote heavy transforms to server utilities

D) Code splitting and dynamic imports
- Monaco editors: dynamic import with separate chunks; load diff/editor only when needed
- Markdown stack (remark/rehype, syntax highlighting): dynamic import; load PlantUML testers/dev tools only in development
- Feature-level lazy routes: split big feature modals (e.g., ScanResultsModal) and load on demand

E) Lists and keys
- Ensure stable keys for list items (ids not indices) across EventTable, BackgroundTaskTable, TreeView
- Avoid inline object/array props inside lists to reduce re-renders (hoist constants)

F) Expensive computations and workers
- Offload heavy parsing or encoding (e.g., PlantUML, large diff calculations) to Web Workers when run on the client
- Throttle/debounce search inputs (TreeSearch, global search) and drag-resize events

G) Network and cache behavior
- Coalesce requests via Query invalidation scopes and background refetch; avoid redundant polling
- Consider SSE/WebSocket (or keep Supabase realtime) for events/logs to avoid frequent polling calls

H) Bundle size and client/server boundaries
- Keep “use client” only where necessary; prefer RSC for static/derivable parts
- Move large utility modules used solely by APIs to server-only to avoid bundling client-side
- Use next/image and optimize icons (tree-shake lucide-react / import per-icon)

Quick-win candidates (low effort, high impact)
- Virtualize EventTable and BackgroundTaskTable; memoize rows
- Dynamic import Monaco and MarkdownViewer; lazy-load diff editor and PlantUML
- Unify modal primitives and replace bespoke modals incrementally (start with ProjectSelectionModal, FileScannerModal)
- Introduce AsyncActionButton for long-running actions (queue start/stop, repo pull, scans)
- Add useTransition for table filtering and tree search; debounce inputs
- Zustand selectors for stores in coder/projects UIs to reduce re-renders

Suggested folder additions
- components/ui/modal (modal system)
- components/ui/datagrid (virtualized table/list)
- components/ui/tree (generic tree)
- components/ui/form (form fields + validation)
- components/ui/status (badges, skeletons, progress, empty states)
- components/ui/menu (dropdown/context menu/command palette)
- components/editor/provider (shared Monaco provider + tooling)
- components/markdown/provider (shared markdown pipeline)

Phased rollout
- Phase 1 (1–2 days): Modal primitives, AsyncActionButton, dynamic import Monaco/Markdown, debounce + transitions
- Phase 2 (2–4 days): Virtualized DataGrid for Events/BackgroundTasks, Zustand selector adoption, Tree primitives
- Phase 3 (ongoing): Form primitives adoption across project/context forms, markdown provider unification, worker offloading for heavy tasks

Notes
- Keep public interfaces stable; refactor behind adapter components to avoid widespread callsite changes
- Maintain UI testability by standardizing testids and ARIA roles across the new primitives
