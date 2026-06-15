# Testing & Scenarios — Feature + UI Scan
> Context: Testing & Scenarios | Group: Analysis & Quality
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (3f feature / 2ui ui) | Priority: 0crit/3high/2med/0low
> Files read: ~14

> **Manifest drift (verified):** Most files listed for this context do NOT exist. Missing: `src/app/features/TestScenarioGenerator/` (entire feature), `src/app/api/test-scenarios/route.ts`, `.../generate/route.ts`, `.../execute/route.ts`, `src/app/api/test-results/route.ts`, `src/app/api/tester/scenarios.ts`, `src/app/api/tester/selectors/**`, and every `test-*.repository.ts` / `test-scenario.types.ts`. The real, live surface is: `src/app/api/tester/{screenshot,diagnostic}/route.ts`, `src/app/api/tester/lib/{browserbase,screenshotExecutor,contextScreenshotExecutor}.ts`, `src/app/features/TaskRunner/sub_Screenshot/screenshotApi.ts`, the MCP `screenshot.ts` tool, the `screenshot-capture` rule, the test-scenario fields on the contexts table, and the editor surface in `src/app/features/Context/sub_ContextPreview/`. The context `desc` advertises "screenshot comparison" and "Browserbase visual regression testing," but neither comparison nor selector scanning exists in code. Findings below target this real surface.

## 1. Test scenario has no editor — the field that drives screenshot capture is invisible in the UI
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/app/features/Context/sub_ContextPreview/ContextPreviewManager.tsx:73,146-256; src/app/api/contexts/preview/route.ts:36-44; src/app/api/tester/screenshot/route.ts:103-124
- **Current state**: `ContextPreviewManager` holds `testScenario` state (line 73), saves it through `/api/contexts/preview`, and passes it to `ContextPreviewActions`, but the JSX only renders an Image Path input + Target + Target Fulfillment textareas. There is **no textarea bound to `testScenario`** anywhere in the app (confirmed: the only `setTestScenario` call just clears it on remove). The screenshot route hard-requires `context.test_scenario` (returns `hasScenario:false` otherwise), so the entire capture pipeline depends on a value users can only set via MCP `context_write` or raw DB.
- **Opportunity**: Add a "Test Scenario" textarea (JSON-steps or numbered natural-language, both already parsed by `contextScreenshotExecutor.parseScenario`) into `ContextPreviewManager`, with a short syntax hint and a sample step. Wire it to the existing `testScenario`/`setTestScenario` state already present.
- **Value**: Unlocks the headline feature of this context for normal users — without it, automated UI screenshots are unreachable except through the agent/CLI path, leaving the Preview panel's save logic half-dead.
- **Effort**: 2
- **Implementation sketch**: In `ContextPreviewManager.tsx`, insert a labeled `<textarea value={testScenario} onChange={e=>setTestScenario(e.target.value)}>` block beside the Target sections; reuse the same `inputStyle`+char-counter pattern. No backend change — `handleSave`→`ContextPreviewActions` already PATCHes `testScenario`.

## 2. Screenshot capture results are written to localStorage, never shown — no pass/fail UI for the test run
- **Lens**: 🎨 ui-perfectionist
- **Priority**: high
- **Category**: ui
- **File(s)**: src/app/features/TaskRunner/sub_Screenshot/screenshotApi.ts:224-263; src/app/api/tester/lib/contextScreenshotExecutor.ts:20-28,196-265; src/stores/testResultStore.ts:54-79
- **Current state**: The executor returns a rich `ScenarioResult` (`success`, `errorType`, `error`, `stepsExecuted`/`totalSteps`, `duration`). The only caller, `triggerScreenshotCapture`, is fire-and-forget and dumps outcomes into `localStorage['screenshot_debug_logs']` — the documented "UI" is literally telling users to open DevTools and run `JSON.parse(...)`. `testResultStore` fetches `/api/test-results`, which **does not exist** (dead store, silent catch at line 75).
- **Opportunity**: Surface the last capture result inline in the Context Preview / ContextCard: a small status chip (green "Passed · 5/5 steps · 2.3s" / red "Selector failed at step 3") driven by the executor's existing fields, plus a "Run Test Now" button that awaits the result instead of fire-and-forget.
- **Value**: Turns an invisible, debug-only flow into a visible loading→success→error state with hover detail, the core UX expectation for any test runner; also retires the broken `testResultStore`/`/api/test-results` dead path.
- **Effort**: 3
- **Implementation sketch**: Add a `Run Test` button in `ContextPreviewActions` that `await`s POST `/api/tester/screenshot` (non-scanOnly) and stores the JSON result in local component state; render a status pill from `success`+`stepsExecuted`/`totalSteps`+`errorType`. Reuse `ErrorDisplay` for the error branch.

## 3. No visual-regression diff despite the context promising "screenshot comparison"
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/api/tester/screenshot/route.ts:174-183; src/app/api/tester/lib/contextScreenshotExecutor.ts:207-265
- **Current state**: On success the route does `updateContext(contextId, { test_updated, preview: result.screenshotPath })` — each run **overwrites** the single `preview` path; no baseline is retained and nothing is compared. The context manifest's stated purpose ("screenshot comparison... visual regression testing") is unimplemented.
- **Opportunity**: Keep a baseline screenshot per context (e.g. `preview` = approved baseline, plus a `last_run` capture), pixel-diff new captures against the baseline (pixelmatch is a tiny dep), store a diff ratio, and flag contexts whose UI drifted beyond a threshold after a TaskRunner change.
- **Value**: Converts the screenshot feature from "saves a thumbnail" into genuine regression detection — directly serving Vibeman's autonomous-dev loop by catching unintended UI breakage from agent-generated changes.
- **Effort**: 4
- **Implementation sketch**: In `contextScreenshotExecutor`, after capture, if a baseline PNG exists load both buffers and run `pixelmatch`; return `diffRatio`+diff image path on `ScenarioResult`. Add an "Approve as baseline" action in the Preview panel; store baseline path in a new `contexts.test_baseline` column (migration) so `preview` overwrite stops destroying history.

## 4. Diagnostic endpoint hardcodes localhost:3000, contradicting the per-project port logic in the capture route
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: functionality
- **File(s)**: src/app/api/tester/diagnostic/route.ts:28,131-143; src/app/api/tester/screenshot/route.ts:127-151
- **Current state**: The capture route correctly derives `baseUrl` from `project.port || 3000` and pre-checks accessibility. The diagnostic route (the user-facing "is screenshot setup OK?" check) instead probes `http://localhost:3000` literally (line 28) and tells users to "Try: POST ... {"scenarioId":"home"}" — a `scenarioId` shape the current `screenshot` route no longer accepts (it takes `contextId`). So diagnostics report a green/red status for the wrong server and hand out a stale example.
- **Opportunity**: Accept `?contextId=` (or `?projectId=`) on the diagnostic GET, resolve the same `project.port` the capture route uses, probe that URL, and update the recommendation text to the real `{"contextId":"..."}` payload.
- **Value**: Removes false-positive/false-negative readiness reports for any project not on port 3000 (i.e. most multi-project Vibeman setups), so users stop chasing phantom "server not accessible" errors.
- **Effort**: 2
- **Implementation sketch**: Parse `contextId` from query; `contextRepository.getContextById` → `projectDb.getProject` → build `http://localhost:${project.port||3000}`; reuse that URL in Check 1; replace the `scenarioId` hint string with the `contextId` payload.

## 5. Standardize the four feature-area "scan/action" buttons — copy-pasted markup across ContextGroups
- **Lens**: 🎨 ui-perfectionist
- **Priority**: med
- **Category**: maintenance
- **File(s)**: src/app/features/Context/sub_ContextGroups/components/GroupHealthScanButton.tsx; .../ProductionScanButton.tsx; .../PerformanceScanButton.tsx; .../BeautifyScanButton.tsx; src/app/features/Context/sub_ContextPreview/components/ContextPreviewActions.tsx:79-98
- **Current state**: Each scan button reimplements the same `motion.button` + `Loader2 animate-spin` + idle/saving label + `buttonVariants.primary` + `whileHover/whileTap` pattern (also duplicated verbatim in `ContextPreviewActions`). When a "Run Test" button (finding #2) is added it will be a fifth copy. Subtle inconsistencies in hover scale and disabled styling already exist between these files.
- **Opportunity**: Extract a single `<AsyncActionButton icon label loadingLabel isLoading disabled onClick variant />` that owns the spinner/label-swap, hover/tap motion, and disabled treatment, and adopt it across the four scan buttons + preview save + the new test-run button.
- **Value**: Guarantees consistent loading/disabled/hover states (an accessibility + perceived-quality win) and removes ~5 copies of identical motion markup, so the in-progress Testing UI is built on a shared primitive instead of a sixth fork.
- **Effort**: 2
- **Implementation sketch**: Create `src/components/ui/AsyncActionButton.tsx` wrapping `motion.button` with props for `icon`, `label`, `loadingLabel`, `isLoading`, `disabled`, `variant`; render `Loader2` spinner when loading. Replace the bodies of the four `*ScanButton.tsx` files and `ContextPreviewActions` with it.
