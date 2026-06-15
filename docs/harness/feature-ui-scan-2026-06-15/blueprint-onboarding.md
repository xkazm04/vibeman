# Blueprint & Onboarding — Feature + UI Scan
> Context: Blueprint & Onboarding | Group: Code Execution & Automation
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (3f feature / 2ui ui) | Priority: 1crit/2high/2med/0low
> Files read: ~16

## 1. "Run blueprint scan" onboarding step is a dead end — no `blueprint` route exists
- **Lens**: 🔍 feature-scout
- **Priority**: crit
- **Category**: functionality
- **File(s)**: src/app/page.tsx:78-101 (no `case 'blueprint'`); src/app/features/Onboarding/sub_GettingStarted/lib/config.ts:29 (`location: 'blueprint'`); src/components/QuickActionBar/index.tsx:43,89; src/components/onboarding/NextActionBanner.tsx:28 (`targetModule: 'blueprint'`)
- **Current state**: The router `renderActiveModule()` switch has cases for overview/coder/contexts/ideas/tinder/tasker/reflector/manager/halloffame/explorer but NO `case 'blueprint'`, so `setActiveModule('blueprint')` falls through to `default → OverviewLayout`. Yet the second onboarding task, the QuickActionBar "Run Blueprint" button, the NextActionBanner after project registration, and workflowStore all navigate users to `'blueprint'`. BlueprintModal.tsx is a `return null` stub and the entire `/api/blueprint/*` tree + blueprint stores referenced in the manifest were deleted. The step only ever "completes" as a side effect of contexts already existing (useOnboardingConditions.ts:79).
- **Opportunity**: Wire the `blueprint` module to a real destination. Simplest correct fix: re-point the task/buttons' `location`/`targetModule` to `'contexts'` and trigger the existing structure-scan + context-generation flow from there; or add a `case 'blueprint'` rendering a lightweight scan launcher. Either way the first-run "analyze my project" promise must do something.
- **Value**: This is step 2 of 7 in the only guided onboarding path; today a brand-new user clicks "Run blueprint scan" and is silently dropped on the Overview screen with no scan and no feedback — the single worst first-run moment in the product.
- **Effort**: 3
- **Implementation sketch**: Decide the canonical destination (Contexts generation). Update `config.ts:29`, `QuickActionBar` lines 43/89, `NextActionBanner` STEP_DETAILS entries, and `workflowStore:157` to that module. Optionally add `case 'blueprint': return <LazyContextLayout .../>` to page.tsx as a stopgap so legacy `'blueprint'` navigations resolve instead of falling through to default.

## 2. Structure-scan accept/reject workflow has full backend but zero UI surface
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/api/structure-scan/lib/scanOrchestrator.ts:118-263 (analyze/save/reject/preview); src/app/api/structure-scan/analyze/route.ts; src/app/api/structure-scan/save/route.ts; src/app/api/structure-scan/trigger/route.ts:11-17 ("for decision queue")
- **Current state**: A complete two-step workflow exists server-side — `analyzeStructure()` returns framework violations, `getRequirementPreview()` groups them with a human summary ("3 misplaced, 1 anti-pattern"), `saveRequirements()` writes requirement files, `logRejection()` records dismissals, and `/trigger` explicitly says it returns violations "for client to show in decision queue." But a Grep for `structure-scan/(analyze|save)` callers finds only docs and one scan strategy — no feature component renders this. The Blueprint UI that consumed it was deleted, orphaning the backend.
- **Opportunity**: Surface the analyze → preview → accept/reject loop in the Getting Started drawer (or a Contexts panel): call `/analyze`, show the grouped `getRequirementPreview` summary, and let the user Accept (POST `/save`) or Reject (logRejection). This converts dead backend into the concrete "analyze project structure → auto-create requirement files" payoff onboarding already advertises.
- **Value**: Reactivates a built, validated automation (framework-aware structure linting → auto-generated Claude Code requirements) that today does nothing for users — high value-per-effort because the hard part is already written and tested.
- **Effort**: 3
- **Implementation sketch**: Add a small client panel that POSTs `{projectPath, projectType}` to `/api/structure-scan/analyze`, renders `data.violations` via the preview grouping, and on Accept POSTs the violations array to `/api/structure-scan/save`. Mark the `run-blueprint` step complete on a successful save.

## 3. Onboarding step completion is poll-only — no auto-detection for `run-task`/`review-impl` correctness
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: functionality
- **File(s)**: src/app/features/Onboarding/lib/useOnboardingConditions.ts:91-129
- **Current state**: `useOnboardingAutoComplete` infers `run-task` AND `review-impl` BOTH from a single condition: any idea with `status === 'implemented'` (lines 113-121). So the moment one task runs, "Run first task" and "Review implementation" both flip to done simultaneously — the user never sees "review implementation" as the next actionable step, collapsing two distinct onboarding stages into one. Completion is also re-fetched only on `refreshTrigger` bumps, so progress can lag until something forces a refresh.
- **Opportunity**: Distinguish the two states using real signals already in the system: complete `run-task` when an implementation log / task exists (the implementation-log repository), and complete `review-impl` only when a log/idea has been explicitly accepted-or-rejected by the user. This restores the intended 7-step ladder.
- **Value**: The guided path is the product's core activation funnel; merging steps 6 and 7 means users are told "all done" before they've experienced the human-review gate that is central to Vibeman's "review AI changes" value proposition.
- **Effort**: 2
- **Implementation sketch**: In the ideas effect, split: `completeStepIfNeeded(hasImpl, 'run-task', ...)` stays; gate `review-impl` on a separate query (e.g. `/api/implementation-logs` reviewed state or idea `status === 'accepted'` post-review) instead of reusing `implemented`.

## 4. `OnboardingPanel` is a dead duplicate of `StarterTasks` with a hardcoded second copy of the task list
- **Lens**: 🎨 ui-perfectionist
- **Priority**: med
- **Category**: maintenance
- **File(s)**: src/app/features/Onboarding/components/OnboardingPanel.tsx:26-69; src/app/features/Onboarding/components/GettingStartedItem.tsx; src/app/features/Onboarding/sub_GettingStarted/lib/config.ts:18-61
- **Current state**: `OnboardingPanel` hardcodes the same 7 onboarding tasks (labels + descriptions) that `config.ts` `ONBOARDING_TASKS` already defines and that the live `ControlPanel`/`StarterTasks` path renders. A Grep shows `OnboardingPanel` and its wrapper `GettingStartedItem` are only ever imported by each other and re-exported from an index — nothing mounts them. It also uses a non-clickable amber variant (no navigation) versus the cyan clickable variant users actually see, so the two diverge in behavior and styling. Any edit to the task list (e.g. fixing finding #1's labels) must be made in two places or they drift.
- **Opportunity**: Delete `OnboardingPanel.tsx` + `GettingStartedItem.tsx` (and the index re-export), or, if a top-sliding variant is still wanted, refactor it to consume `buildTasks(...)` from `config.ts` and reuse `OnboardingTaskItem` so there is one source of truth for both task data and item rendering.
- **Value**: Eliminates a divergent second copy of onboarding content that invites inconsistent labels/themes between two "Getting Started" surfaces, and removes ~180 lines of dead UI — reducing the risk that a future onboarding edit only lands in one place.
- **Effort**: 1
- **Implementation sketch**: Confirm no dynamic import of `OnboardingPanel`, then remove the file, `GettingStartedItem.tsx`, and the `components/index.ts` export; the `amber` theme branch in `OnboardingTaskItem` can stay for reuse or be pruned.

## 5. Getting Started drawer has no empty/all-complete or loading state
- **Lens**: 🎨 ui-perfectionist
- **Priority**: high
- **Category**: ui
- **File(s)**: src/app/features/Onboarding/sub_GettingStarted/components/StarterTasks.tsx:12-59; src/app/features/Onboarding/components/ControlPanel.tsx:27 (`activeProject?.id`)
- **Current state**: `StarterTasks` renders `nextTaskIndex = tasks.findIndex(!completed)`; when every task is done `nextTaskIndex` is `-1` so nothing is highlighted and the list just shows seven struck-through items with no celebration or "what next" affordance — an anticlimactic end to onboarding. There is also no handling for the no-active-project case (ControlPanel passes `activeProject?.id`, so with no project all steps read incomplete with no explanation) and no loading skeleton while `useOnboardingAutoComplete`'s fetches resolve, so steps can visibly "pop" from incomplete to complete after the drawer opens.
- **Opportunity**: Add three states to the drawer: (a) all-complete celebration block ("You're set up — explore advanced features") reusing the existing `NextActionBanner` all-complete styling; (b) a "Select or register a project to begin" empty state when there is no `activeProject`; (c) a brief skeleton/spinner while completion checks are in flight to prevent the late-pop.
- **Value**: Completion, empty, and loading states are the difference between a polished onboarding and one that feels broken; the all-complete state in particular gives users a clear "graduation" moment and a path deeper into the product instead of a dead list.
- **Effort**: 2
- **Implementation sketch**: In `StarterTasks`, branch on `tasks.every(t => t.completed)` to render the celebration; have `ControlPanel` pass an `isLoading`/`hasProject` flag (it already reads `activeProject`) and render skeleton/empty variants accordingly.
