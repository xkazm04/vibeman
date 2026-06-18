# Debt Prediction & Refactoring — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495729972_ypr631b
> Group: Analysis & Quality
> Files read: ~24
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

> **Manifest is heavily stale.** Of the 18 listed context files, **12 no longer exist**: the entire `src/app/features/DebtPrediction/**` tree (engine, dashboard, HealthScoreGauge, OpportunityCard, PredictionList, predictionEngine.ts, patternDetectorStubs.ts), all five `src/app/api/debt-predictions/**` routes, `src/app/api/unused-code/save-report/route.ts`, and `src/app/db/repositories/debt-prediction.repository.ts`. `debtPredictionStore.ts` is gone. `src/stores/refactorStore.ts` and the `RefactorWizard/lib/*` files are now **type-only re-export stubs** (`getScanTechniques()` returns `[]`). The live logic that survives is the refactor store slices, `/api/refactor/*`, and the real detection engine under `src/lib/scan/**`. Findings target what actually runs.

## 1. DB schema for a deleted feature is orphaned — debt_predictions tables built every migration, never read or written
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: dead-code / stale-manifest / data-integrity
- **File**: src/app/db/migrations/index.ts:1903 (migrateDebtPredictionTables → debt_predictions, opportunity_cards, prediction_outcomes; FKs at :2059/:2093)
- **Scenario**: Migration still runs `migrateDebtPredictionTables()` creating `debt_predictions` + `opportunity_cards` + 6 indexes + outcome tables. But every reader/writer (repository, `/api/debt-predictions/*` routes, predictionEngine, the whole DebtPrediction feature) was deleted. No code in the repo references these tables.
- **Root cause**: Feature was removed (engine + UI + API + repo) but the schema migration and the context manifest were not, so the "Debt Prediction" half of this context is a ghost — it has tables but no engine, no scoring, no health gauge.
- **Impact**: Empty tables ship to every install; the context's headline capability (debt prediction / health gauges / opportunity cards) does not exist at runtime. Any consumer (or this very scan) expecting prediction data gets nothing silently. Maintenance + confusion cost; FK targets that nothing populates.
- **Fix sketch**: Either drop the migration (add a `DROP TABLE IF EXISTS` follow-up migration) or restore the feature; update the context manifest `Files:` list to reflect reality so future scans don't chase phantom files.
- **Value**: effort 2 / impact 6 / risk 2

## 2. generate-packages is a success-theater stub: store reports "completed" with zero packages after a real-looking AI request
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: success-theater / silent-failure / Map-Reduce fan-in
- **File**: src/app/api/refactor/generate-packages/route.ts:72 (returns `{packages:[],context:null,dependencyGraph:null}`) consumed by src/stores/slices/refactor/packagesSlice.ts:148-157
- **Scenario**: User selects opportunities → `generatePackages()` POSTs them, the route validates `projectPath` then **always returns an empty payload**. Store sets `packageGenerationStatus:'completed'`, `packages: data.packages || []` = `[]`, then calls `selectFoundationalPackages()` over an empty list. UI shows "completed, 0 packages" — indistinguishable from "no debt found." The package-based Map-Reduce AI pattern (the context's other headline feature) does nothing.
- **Root cause**: The route's own header admits the generation engine "does not currently exist" and returns a "valid-shape stub" specifically so the store "stops 404-ing and completes cleanly." Completing cleanly with no work is reported as success rather than as `not-implemented`.
- **Impact**: The marquee refactoring-wizard workflow is inert but presents as healthy. Users burn selection effort for nothing; no error, no telemetry, no "feature unavailable" signal. `llmProvider/llmModel/selectedFolders` are sent and ignored.
- **Fix sketch**: Return HTTP 501 (or `{packages:[], notImplemented:true}`) and have the store surface `packageGenerationStatus:'error'`/a disabled-feature banner instead of `'completed'`; or implement real grouping.
- **Value**: effort 3 / impact 7 / risk 2

## 3. Unused-component detector deletes good components: default-export name guessed from filename → false "unused" → lost code
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: false-positive / data-loss / detector-correctness
- **File**: src/lib/scan/unusedCodeDetector.ts:349-355 (`componentName = path.basename(file,'.tsx')`) + 379-388 (default → search `componentName`) + 263-319 (`searchComponentUsage`)
- **Scenario**: A file `widgets/Card.tsx` whose default export is `export default function FancyCard()` and is imported elsewhere as `import Box from '../widgets/Card'`. The detector searches usage for the **filename** `Card` (not the real export `FancyCard`, not the import alias `Box`). `searchComponentUsage` looks for `<Card>`/`import Card from`/`import { Card }` — none match the aliased default import, so the file is reported `unused` with reason "No JSX usage or imports found." Any auto-remove acts on a live component. Symmetric false-negative: a truly-unused `Card.tsx` is kept if any *other* `Card` symbol exists anywhere.
- **Root cause**: Default exports have no intrinsic name at the import site, so the code assumes filename == component name == import name. JS allows arbitrary default-import aliases and `export default function X`, breaking that assumption. Usage search is also pure-regex over text (no path resolution), so it can't tie an import back to *this* file.
- **Impact**: Highest blast radius in the context. Drives a destructive "remove unused code" action on false positives → irreversible code loss / broken build; and silently retains dead code on false negatives. Stats (`unusedExports`, `unusedFiles`) are correspondingly wrong.
- **Fix sketch**: Resolve default-import usage by *module path* (match `import \w+ from '<thispath>'`) not by guessed name; never delete on a name-only match; require an import that resolves to this exact file before flagging unused.
- **Value**: effort 6 / impact 9 / risk 7

## 4. Zero tests for the entire live detection + refactor-store layer (highest-blast detector has none)
- **Severity**: High
- **Lens**: test-mastery
- **Category**: missing-coverage / risk-weighted gap
- **File**: src/lib/scan/unusedCodeDetector.ts (no test), src/lib/scan/patterns/duplication.ts:41 jaccardSimilarity / :70 detectDuplication (no test), src/lib/scan/patterns/code-quality.ts:55 detectUnusedImports (no test), src/stores/slices/refactor/*.ts (no test)
- **Scenario**: Glob for `*.test.ts`/`*.spec.ts` under `src/lib/scan/**`, `src/stores/slices/refactor/**`, and the DebtPrediction/RefactorWizard trees returns **nothing**. The data-loss detector (Finding 3), the Jaccard similarity math, and `detectUnusedImports` (regex-only, slices `restOfFile` so usage *above* the import line is invisible) all ship untested. `jaccardSimilarity` returns `intersection.size/union.size`; for strings shorter than the n-gram size (`str.length < 3`) both gram sets are empty → `0/0 = NaN`, silently never `>= 0.85` (luckily safe, but untested and undocumented).
- **Root cause**: Detection logic was extracted into `src/lib/scan/**` for testability ("Extracted from /api/unused-code route") but no test batch followed; the deleted DebtPrediction engine took any prior coverage with it.
- **Impact**: Every regex/threshold tweak (the techniques are full of hand-tuned thresholds: 200/350/500 lines, 0.85 similarity, 100-char min block) can flip results with no regression net. Wrong opportunities → wrong refactor decisions; the destructive unused-code path has no safety net at all.
- **Fix sketch**: LLM-generatable batch anchored to invariants: (a) `detectUnusedComponents` returns `[]` for a component imported via aliased default; (b) flags a genuinely-orphaned file; (c) `jaccardSimilarity(x,x)===1`, identical blocks → dup, sub-n-gram strings don't throw/NaN-leak; (d) `detectUnusedImports` ignores `import type`, catches a named import used only in JSX.
- **Value**: effort 4 / impact 8 / risk 3

## 5. detectUnusedImports only scans text AFTER the import line → re-export / same-line usage false positives
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: detector-correctness / false-positive
- **File**: src/lib/scan/patterns/code-quality.ts:94 (`content.split('\n').slice(index + 1)`) → :115 `patterns.some(... .test(restOfFile))`
- **Scenario**: `detectUnusedImports` checks usage only in `restOfFile` = everything *below* the import statement. An import consumed on the same line, in another import (`export { Foo } from './foo'` placed above), or via a barrel re-export earlier in the file is treated as unused. Combined with `checkUnusedImports` (techniques/nextjs/unused-imports.ts), this yields "N potentially unused imports" opportunity cards that are wrong, and `autoFixAvailable:true` invites an auto-removal that breaks the build.
- **Root cause**: Assumption that an import is always used strictly below its declaration. Holds for typical top-of-file imports but not for re-exports, decorators, or generated files; the regex approach also can't see usage inside template literals stripped by normalization.
- **Impact**: Noise + a destructive auto-fix (`autoFixAvailable:true`) on false positives. Lower blast radius than Finding 3 (line-level, not whole-file delete) but same class of "remove live code" hazard.
- **Fix sketch**: Search the whole file body (excluding the matched import range) rather than only `slice(index+1)`; never auto-remove an import that appears in any `export ... from` line.
- **Value**: effort 3 / impact 5 / risk 4
