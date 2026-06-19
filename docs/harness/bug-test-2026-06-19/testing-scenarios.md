# Testing & Scenarios — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495732017_7ps585j
> Group: Analysis & Quality
> Files read: ~9
> Total: 5 (Critical: 1, High: 3, Medium: 1, Low: 0)

> MANIFEST DRIFT: ~11 of the 18 listed files do not exist — `src/app/features/TestScenarioGenerator/`, `src/app/api/test-scenarios/{route,generate,execute}`, `src/app/api/test-results/route.ts`, `src/app/api/tester/scenarios.ts`, `src/app/api/tester/selectors/{route,scan}`, and all four `test-*.repository.ts` / `test-case-*.repository.ts`. The only surviving real files are `src/app/api/tester/lib/{browserbase,screenshotExecutor,contextScreenshotExecutor}.ts`, `src/app/api/tester/{screenshot,diagnostic}/route.ts`, and `src/stores/testResultStore.ts`. The "scenarios module removal" comment (screenshotExecutor.ts:6) confirms a half-deleted feature. This context's manifest should be regenerated.

## 1. Visual-regression "test" never compares — every run is success-theater
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: success-theater / false-positive results
- **File**: src/app/api/tester/lib/screenshotExecutor.ts:144-171 (and contextScreenshotExecutor.ts:207-265)
- **Scenario**: Run a screenshot scenario against a page that has visibly regressed (broken layout, missing component). The executor captures a PNG, overwrites the prior file (line 144: "no timestamp - will replace existing file"), and returns `success: true`. No baseline is loaded, no pixel/structural diff is computed, no threshold is checked.
- **Root cause**: The context is described as "screenshot comparison... for visual regression testing," but the implementation only *captures* an image. `success` encodes "a screenshot was saved," not "the UI matches a baseline." Overwriting the previous screenshot destroys the only thing a future diff could compare against.
- **Impact**: The flagship value prop — catching visual regressions — is structurally impossible. Every scenario "passes" as long as the page loads, giving false confidence. A regressed UI is reported green.
- **Fix sketch**: Save captures as `current.png` beside a committed `baseline.png`; add a diff step (e.g. `pixelmatch`/`odiff`) with a configurable threshold; return `success` from the diff result, and expose `diffPixels`/`diffPath`. Only overwrite baseline on explicit "approve" action.
- **Value**: effort 6 / impact 9 / risk 4

## 2. Store calls `/api/test-results`, which does not exist — results dashboard is permanently empty
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: silent-failure / dead integration
- **File**: src/stores/testResultStore.ts:57 (`fetch('/api/test-results?projectId=...')`)
- **Scenario**: Any UI that mounts `useTestResultStore` calls `loadTestResults(projectId)`. The route `src/app/api/test-results/route.ts` was deleted (manifest lists it; no file or any `test-results` route exists). The fetch returns Next's 404 HTML, `response.ok` is false, the thrown error is caught, logged to `console.error`, and `loading` is set false. `results` stays `{}` forever.
- **Root cause**: Endpoint removed during the scenarios-module teardown, but the consumer store was left wired to it. The catch block swallows the failure with only a `console.error`, so it looks "loaded but empty" rather than "broken."
- **Impact**: `getResultsForScan` always returns `null` and `getOverallStats` always returns all-zeros. Any Blueprint/dashboard surface fed by this store shows 0 tests / 0 pass / 0 fail with no error indication. Effectively a dead feature masquerading as a working one.
- **Fix sketch**: Either restore the `/api/test-results` route (reading `contexts.test_updated`/`preview` per project) or delete the orphaned store; surface the fetch failure to the UI instead of swallowing it (set an `error` field).
- **Value**: effort 4 / impact 7 / risk 3

## 3. Natural-language step parser silently drops/mis-maps steps, then reports success
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: silent-failure / wrong-selector false-pass
- **File**: src/app/api/tester/lib/contextScreenshotExecutor.ts:300-408 (parseScenario / parseStepText), :356-360 unknown-type→wait fallback
- **Scenario**: A scenario line the regexes don't recognize returns `null` from `parseStepText` and is silently skipped (no error). An unknown JSON step type is replaced by a 1s `wait` (line 359). A click like `Click on Settings` with no quotes/path may match nothing and be dropped, so the screenshot is taken on the *wrong* page — yet `parseScenario` always returns `{success:true}` and the run reports `success:true` with `stepsExecuted < intended`.
- **Root cause**: Parser is best-effort and treats "couldn't understand this instruction" as "skip it," conflating partial execution with success. Caller (screenshot/route.ts:174) treats any `result.success` as a passing test and updates `test_updated` + `preview`.
- **Impact**: Tests appear to pass while actually screenshotting an unintended state. `totalSteps`/`stepsExecuted` are returned but never asserted by the caller, so coverage silently erodes. Compounds finding #1 (no diff to catch the wrong screenshot).
- **Fix sketch**: Make `parseScenario` collect unparsed lines and fail (or warn-and-flag) when any line yields no step; have the route reject `stepsExecuted !== totalSteps` as not-passed; drop the unknown-type→wait fallback in favor of an explicit parse error.
- **Value**: effort 5 / impact 7 / risk 4

## 4. The testing tool itself has zero tests
- **Severity**: High
- **Lens**: test-mastery
- **Category**: missing-coverage (highest irony / blast radius)
- **File**: src/app/api/tester/** and src/stores/testResultStore.ts (no `*.test.ts`/`*.spec.ts` anywhere in the context)
- **Scenario**: Glob for `**/*.{test,spec}.ts` under `src/app/api/tester` and for `testResultStore`/`screenshotExecutor` test files returns nothing. The pure, easily-testable units — `parseScenario`, `parseStepText`, `sanitizeFilename`, `validateInput`, and the store's `getOverallStats` reduce — have no assertions, despite a mature Vitest harness in the repo.
- **Root cause**: Feature shipped without tests; the parser is the highest-leverage LLM-generatable batch because it is pure (string in → step[] out) and anchors a real invariant ("a scenario the user wrote must produce the step they intended, or fail loudly").
- **Impact**: Findings #1 and #3 (the silent-skip and no-diff success-theater) would have been caught by even minimal tests. Regressions in the parser/selector mapping ship undetected; the one feature whose job is catching regressions cannot detect its own.
- **Fix sketch**: Add `contextScreenshotExecutor.test.ts` asserting: unknown JSON type does NOT silently become a wait; an unparseable NL line fails the scenario; `sanitizeFilename` blocks `../`; `validateInput` rejects bad URLs. Add `testResultStore.test.ts` for the `getOverallStats` reduce and the 404-fetch error path.
- **Value**: effort 3 / impact 7 / risk 1

## 5. Server pre-check uses HEAD against Next.js and rejects the whole run on a non-2xx
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: external-service / false-negative
- **File**: src/app/api/tester/screenshot/route.ts:37-65, 140-151
- **Scenario**: `checkServerAccessibility(baseUrl)` does `fetch(baseUrl, {method:'HEAD'})` against the app root. Next.js route handlers/pages frequently don't implement HEAD or the `/` route returns a redirect/4xx for an auth-gated app; `response.ok` is false → the route returns 503 "Dev server not accessible" and never runs the scenario, even though the actual test path is reachable.
- **Root cause**: Assumes the project's `/` answers HEAD with 2xx. Conflates "root didn't 2xx to a HEAD" with "server is down." Also defines `isLocalhostUrl` (line 25) that is never used — dead code, and the contextScreenshotExecutor leaks browser in the dead `executeScenarios` plural variant (screenshotExecutor.ts:202) which never closes the browser (no callers, but a trap for reuse).
- **Impact**: Valid test runs blocked with a misleading "is your dev server running?" error; intermittent on apps that redirect root. Erodes trust and produces false negatives independent of the actual UI.
- **Fix sketch**: Use `method:'GET'` and treat any HTTP response (incl. 3xx/4xx) as "server up"; only the AbortError/connection-refused path should 503. Delete unused `isLocalhostUrl` and the no-caller `executeScenarios`.
- **Value**: effort 2 / impact 5 / risk 2
