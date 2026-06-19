# Annette AI Assistant — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495697973_3moa11n
> Group: Intelligence Layer
> Files read: ~12
> Total: 5 (Critical: 0, High: 2, Medium: 2, Low: 1)

> **SCAN NOTE — STALE CONTEXT (phantom manifest):** Every one of the 26 source files listed for this
> context is **deleted**. The entire Annette/Commander/voicebot subsystem was removed in the
> 2026-06-13 "headless slim-down". Migration `232_drop_orphaned_schema.ts:9-11` documents this
> explicitly ("the entire Annette/Commander subsystem was deleted") and drops the last surviving table
> `annette_rapport`. Verified: `src/app/features/Commander/**`, `src/app/features/Annette/**`,
> `src/app/api/annette/**`, `src/app/api/voicebot/**`, `src/app/db/repositories/annette*`,
> `src/stores/annetteStore.ts`, `src/app/db/models/annette.types.ts` — **none exist** (Glob: no files).
> The strings "Brain-powered AI assistant" / "Ask Annette" / "nav-other-commander" appear nowhere under
> `src/` (only in e2e tests + a cached `test-results/` artifact + a 2026-06-15 harness doc). There is no
> runnable Annette code left to bug-hunt. The findings below are therefore (a) the orphaned test/manifest
> debris this dead context leaves behind, which is the real, actionable risk surface, and (b) one true
> bug preserved in the test-results artifact (a real defect that shipped in the now-deleted UI, useful as a
> regression-test lesson if the feature is ever revived). **No source-level bug-hunt findings are possible
> because there is no source.** Recommend deleting this context from `context_map.json` / `_contexts.json`.

## 1. Orphaned e2e suite tests a deleted subsystem — guaranteed failures, zero signal
- **Severity**: High
- **Lens**: test-mastery
- **Category**: dead-test / stale-test
- **File**: e2e/annette/annette-chat.spec.ts:34 (and e2e/annette/annette-tools.spec.ts:29)
- **Scenario**: Run `npx playwright test`. Both suites call `selectProjectAndOpenAnnette()` → `page.getByTestId('nav-other-commander')` and wait for `input[placeholder="Ask Annette..."]`. The `commander` nav item and the entire Annette UI were deleted, so `annetteItem.waitFor()` times out at 5s and every test in both files fails (or errors in `beforeEach`).
- **Root cause**: Tests were not removed when the feature was deleted in the headless slim-down; the manifest/test layer drifted from the code. The deletion checklist covered tables (migration 232) and source, but not the e2e specs or `context_map.json`.
- **Impact**: ~15 e2e tests permanently red. They pollute the failure list, mask real regressions in the navigation/visual smoke suites, and give a false impression that Annette is still a tested feature. CI (`ci.yml`) runs only `vitest run` + `build`, so these don't block merges — but anyone running e2e locally hits a wall of phantom failures.
- **Fix sketch**: Delete `e2e/annette/` (both specs) and the `test-results/annette-*` cached artifacts; they test a feature that no longer exists.
- **Value**: effort 1 / impact 6 / risk 1

## 2. navigation.spec.ts asserts deleted nav items (`commander`, `conductor`, `zen`) — false failures
- **Severity**: High
- **Lens**: test-mastery
- **Category**: stale-test / fixture-drift
- **File**: e2e/navigation.spec.ts:20-31 (OTHER_NAV array)
- **Scenario**: `OTHER_NAV` hard-codes 10 dropdown items including `{ testId: 'nav-other-commander', label: 'Annette' }`, `nav-other-conductor`, `nav-other-zen`, `nav-other-questions`. The "dropdown opens and shows all items" test (:127) loops `expect(getByTestId(item.testId)).toBeVisible()` — but TopBar now renders items dynamically (`nav-other-${item.module}`, TopBar.tsx:265) from a config that no longer contains `commander`/`conductor`/`zen`. The assertion fails on the first missing item.
- **Root cause**: The nav test treats a hand-maintained module list as ground truth; it wasn't updated when modules were removed. No single source of truth shared between nav config and test.
- **Impact**: The whole-app navigation audit and visual smoke suite (the most valuable e2e safety net) fail on stale entries, so they get ignored — losing real coverage for the modules that DO exist.
- **Fix sketch**: Remove `commander`, `conductor`, `zen` (and any other deleted modules) from `OTHER_NAV`; better, derive the list from the same nav config TopBar consumes so it can't drift again.
- **Value**: effort 1 / impact 6 / risk 1

## 3. Stale context-map entry keeps a deleted feature "in scope" for every future scan
- **Severity**: Medium
- **Lens**: bug-hunter (process/integrity)
- **Category**: manifest-drift / success-theater
- **File**: docs/harness/bug-test-2026-06-19/_contexts.json:264-291 (mirrors context_map.json)
- **Scenario**: This very scan was dispatched against 26 files that don't exist. Any health-scan, idea-scan, or coverage tool keyed off the context map will allocate effort to, and emit findings/scores for, a phantom module — wasting budget and producing fabricated "0% coverage / N issues" signal for code that was intentionally deleted.
- **Root cause**: Context map is regenerated from a manifest that wasn't pruned after the slim-down; deletions update migrations + source but not `context_map.json`. MEMORY.md already flagged "context-map drift (~6 stale contexts)" on 2026-06-15 — this is one of them, still unfixed.
- **Impact**: Recurring wasted scan cost + polluted dashboards (phantom context inflates totals, drags health averages). Low blast radius on runtime, but it silently corrupts every aggregate that counts contexts.
- **Fix sketch**: Drop `ctx_1770495697973_3moa11n` from `context_map.json` (and let `_contexts.json` regenerate); add a context-map validation step that fails when a context's files all resolve to nonexistent paths.
- **Value**: effort 2 / impact 5 / risk 2

## 4. Decision-queue duplicate-suggestion bug captured in the deleted UI (regression lesson)
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: ui-logic / duplicate-rendering (in deleted code — historical)
- **File**: test-results/annette-annette-tools-Anne-fbd4a-e-messages-maintain-context-chromium/error-context.md:19-21
- **Scenario**: Captured page snapshot shows the assistant's "Suggested Next Step" decision card rendered a `button "Which ones are still open?"` whose text was IDENTICAL to a real user chat message. Playwright strict-mode then matched 2 elements for `text=Which ones are still open?` (the chat bubble + the decision-panel suggestion button), proving the decision queue derived a follow-up suggestion that exactly duplicated user input and surfaced it as a clickable "next step".
- **Root cause**: The decision panel generated suggestion buttons without de-duplicating against (or distinguishing from) the user's own messages — a content/identity collision in the now-deleted DecisionPanel. Preserved here only because the source is gone; relevant if Annette/Commander is ever revived.
- **Impact**: Historical/no live impact (code deleted). Value is as a documented invariant for any future rebuild: "decision suggestions must not echo user input verbatim."
- **Fix sketch**: N/A for current code. If revived: dedupe/tag decision suggestions vs. user turns and give them distinct accessible names. Then delete this stale `test-results/` artifact.
- **Value**: effort 1 / impact 3 / risk 1

## 5. Dead `annette.types.ts` model + migration 116 still referenced; coverage docs cite phantom paths
- **Severity**: Low
- **Lens**: test-mastery
- **Category**: dead-code / stale-doc
- **File**: docs/harness/bug-test-2026-06-19/_contexts.json:514 (`src/app/db/models/annette.types.ts` listed under Database context); src/app/db/migrations/116_annette_rapport.ts
- **Scenario**: `annette.types.ts` is referenced in the Database context manifest but does not exist (Glob: no files). Migration 116 still creates `annette_rapport` only for migration 232 to drop it — pure churn run on every fresh DB. The 2026-06-15 harness doc `feature-ui-scan-2026-06-15/annette-assistant.md` and `tests/coverage-report.md` reference Annette paths that are gone, giving false coverage/health baselines.
- **Root cause**: Type files, harness docs, and coverage manifests reference the deleted module; cleanup stopped at runtime tables.
- **Impact**: Minor: create→drop migration churn, misleading coverage docs, dangling manifest entry in a *different* (still-live) context. No runtime failure.
- **Fix sketch**: Remove the dead `annette.types.ts` entry from the Database context manifest; optionally collapse 116+232 (leave as-is if other DBs already ran 116). Purge Annette rows from coverage/harness docs.
- **Value**: effort 2 / impact 3 / risk 2
