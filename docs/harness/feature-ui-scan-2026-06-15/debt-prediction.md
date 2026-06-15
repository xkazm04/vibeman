# Debt Prediction & Refactoring — Feature + UI Scan
> Context: Debt Prediction & Refactoring | Group: Analysis & Quality
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (4f feature / 1ui ui) | Priority: 1crit/3high/1med/0low
> Files read: ~16

> **Manifest drift note:** The context manifest (`ctx_1770495729972_ypr631b`) is heavily stale. None of the listed UI paths exist anymore — `src/app/features/DebtPrediction/**`, `src/app/features/RefactorWizard/components`, the entire `src/app/api/debt-predictions/**` tree, and `src/app/api/unused-code/save-report/route.ts` are all gone (removed in the headless slim-down). What survives and was scanned: `src/stores/slices/refactor/*` (5 live Zustand slices), `src/app/features/RefactorWizard/lib/*` (now stubs), `src/app/api/unused-code/route.ts`, and the real detection engine in `src/lib/scan/**` + `src/lib/refactor/**`. Findings below are grounded in the surviving code.

## 1. Refactor store calls dead API endpoints — the entire wizard pipeline is wired to nothing
- **Lens**: 🔍 feature-scout
- **Priority**: critical
- **Category**: functionality
- **File(s)**: src/stores/slices/refactor/packagesSlice.ts:127, src/stores/slices/refactor/dslSlice.ts:102, src/stores/slices/refactor/types.ts:146
- **Current state**: The refactor store is fully implemented (analysis/opportunities/wizard/packages/DSL slices), and `generatePackages()` POSTs to `/api/refactor/generate-packages` while `executeDSLSpec()` POSTs to `/api/refactor/execute-dsl`. The combined `startAnalysis` action (types.ts:146) is also declared. But **`src/app/api/refactor/` does not exist** — there is no route directory at all, so every one of these calls 404s. The detection engine in `src/lib/scan/` (a real `RefactorScanStrategy` with 13 NextJS detectors) is also orphaned: no API route imports `getScanStrategy`/`detectOpportunities` (only the README, the strategy files, and the store *types* reference it).
- **Opportunity**: Add the missing `src/app/api/refactor/analyze/route.ts` (documented in `src/lib/scan/README.md:158`) that calls `getScanStrategy(projectPath, projectType).scanProjectFiles()` then `.detectOpportunities()` and returns `RefactorOpportunity[]`. This single route reconnects the live engine to the live store and resurrects the feature without rebuilding either side.
- **Value**: Restores the headline "debt prediction & refactoring" capability — a working server-side scanner already exists and a working client store already exists; only the ~40-line bridge is missing. Without it the feature is dead weight.
- **Effort**: 3
- **Implementation sketch**: Create `route.ts` POST handler reading `{projectPath, projectType, selectedGroups}`; call `const s = await getScanStrategy(projectPath, projectType); const files = await s.scanProjectFiles(projectPath, selectedFolders); const opps = await s.detectOpportunities(files, selectedGroups)`; return `{opportunities: opps}`. Then add `generate-packages` + `execute-dsl` siblings (or stub them to return `{packages:[]}`) so the store stops 404-ing.

## 2. Two divergent copies of the unused-code analyzer — route inlines what the lib already exports
- **Lens**: 🎨 ui-perfectionist (maintenance)
- **Priority**: high
- **Category**: maintenance
- **File(s)**: src/app/api/unused-code/route.ts:37-571, src/lib/scan/unusedCodeDetector.ts:1-427
- **Current state**: `src/lib/scan/unusedCodeDetector.ts` is an explicit clean extraction ("Extracted from /api/unused-code route", line 6) exporting `analyzeUnusedCode`, `extractExports`, `extractImports`, `findTsxFiles`. Yet `src/app/api/unused-code/route.ts` does NOT import it — it re-inlines the *entire* 500-line implementation (identical `IGNORED_DIRS`, `NEXTJS_ENTRY_PATTERNS`, `extractExports`, `searchComponentUsage`, `analyzeUnusedCode`). Two copies that will drift; the lib copy already lost the `logger` emoji prefixes, signalling they're already diverging.
- **Opportunity**: Delete the inlined logic from the route and `import { analyzeUnusedCode } from '@/lib/scan/unusedCodeDetector'`. Keep only the request parsing, validation, and the streaming wrapper in the route.
- **Value**: Removes ~480 duplicated lines, eliminates the drift risk where a fix to one copy silently leaves the other broken, and makes the AST analyzer unit-testable in one place.
- **Effort**: 2
- **Implementation sketch**: In `route.ts`, drop the interfaces/constants/helpers/`analyzeUnusedCode` (lines 37-571) and import the lib's `analyzeUnusedCode(projectPath, onProgress)`; the streaming and non-streaming branches already match its `(current,total,currentFile)` progress signature.

## 3. Unused-code scan is O(components × files) re-reading every file from disk per component
- **Lens**: 🔍 feature-scout (user_benefit / performance)
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/lib/scan/unusedCodeDetector.ts:263-319 (searchComponentUsage), :365-400, mirrored in src/app/api/unused-code/route.ts:363-430
- **Current state**: For every component file, `searchComponentUsage` loops over *all* project files and calls `fs.readFile` on each (line 292), then runs ~8 regexes. With N component files and M total files that is N×M disk reads — on a medium Next.js app (hundreds of components × thousands of files) this is tens of thousands of redundant reads per scan, with no caching of file contents across the outer loop.
- **Opportunity**: Read each file's content once into an in-memory map before the usage loop, and build a single combined-usage set (or reverse import index) so each component is checked against pre-loaded buffers instead of re-reading the tree per component.
- **Value**: Turns a multi-minute scan into seconds on real projects, making the "find unused code" action actually usable interactively rather than a background job users abandon.
- **Effort**: 3
- **Implementation sketch**: After `findTsxFiles`, `const contents = new Map(await Promise.all(files.map(async f => [f, await fs.readFile(f,'utf-8')])))`; change `searchComponentUsage` to take the map and `contents.get(file)` instead of reading; optionally pre-`includes(name)` filter stays as the cheap guard.

## 4. Detection engine ignores the `lineNumbers` field — opportunities can't deep-link to the offending code
- **Lens**: 🔍 feature-scout (user_benefit)
- **Priority**: medium
- **Category**: feature
- **File(s)**: src/stores/slices/refactor/types.ts:18 (lineNumbers?: Record<string, number[]>), src/lib/scan/techniques/nextjs/large-file.ts:34-45, src/lib/scan/techniques/nextjs/duplication.ts:15-26, src/lib/scan/techniques/nextjs/unused-imports.ts:15-26
- **Current state**: `RefactorOpportunity` defines an optional `lineNumbers: Record<string, number[]>` and `RefactorScanStrategy.createOpportunity` accepts it (ScanStrategy.ts:252), but none of the 13 NextJS technique detectors populate it — they all emit only `files: [file.path]`. The underlying pattern matchers (`detectDuplication`, `detectUnusedImports`) and the large-file line counter already know exactly where findings are, but discard the positions.
- **Opportunity**: Have each detector return the line numbers it already computes and pass them into `lineNumbers`, so downstream UI/TaskRunner can jump straight to the line (and so auto-fix requirements can target precise ranges instead of whole files).
- **Value**: Transforms findings from "this file is bad somewhere" into actionable, click-to-line items — the difference between a report and a fixable work item; also makes generated refactor requirements far more precise.
- **Effort**: 2
- **Implementation sketch**: Update `detectUnusedImports`/`detectDuplication`/etc. to return `{line}` per match; in each technique build `lineNumbers: { [file.path]: lines }` and include it in the returned opportunity object (the type already supports it).

## 5. Canonical `ScanStrategy.ts` still carries "FIXED VERSION / TO APPLY: copy this file" scaffolding header
- **Lens**: 🎨 ui-perfectionist (maintenance)
- **Priority**: high
- **Category**: maintenance
- **File(s)**: src/lib/scan/ScanStrategy.ts:1-9
- **Current state**: The header of the live, imported interface file reads: `"ScanStrategy Interface (FIXED VERSION)"` ... `"TO APPLY: Copy this file to src/lib/scan/ScanStrategy.ts"` — i.e. it claims to be a patch staged for application, even though it *is already* `src/lib/scan/ScanStrategy.ts` and is imported by every strategy + `index.ts`. This is leftover migration scaffolding that misleads any contributor into thinking the file is provisional or a duplicate, and invites someone to "apply" it over itself.
- **Opportunity**: Replace the header with an accurate doc comment describing the `ScanStrategy` interface, `RefactorScanStrategy` base class, and the `detector()` helper.
- **Value**: Removes a genuinely confusing false signal in a foundational file that 6+ files depend on; prevents accidental damage from someone acting on the stale "TO APPLY" instruction. Low effort, real clarity gain for the engine's maintainability.
- **Effort**: 1
- **Implementation sketch**: Rewrite lines 1-9 to a normal module doc block (purpose + the two exported abstractions), dropping the "FIXED VERSION" / "TO APPLY" lines.
