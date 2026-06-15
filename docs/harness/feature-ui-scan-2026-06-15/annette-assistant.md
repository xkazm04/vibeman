# Annette AI Assistant — Feature + UI Scan
> Context: Annette AI Assistant | Group: Intelligence Layer
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (4f feature / 1ui ui) | Priority: 1crit/2high/2med/0low
> Files read: ~10

> **CRITICAL MANIFEST DRIFT — READ FIRST.** Every UI/backend file this context points at is **gone**. All 26 manifest paths under `src/app/features/Commander/*`, `src/app/features/Annette/*`, `src/app/api/annette/*`, `src/app/api/voicebot/*`, `src/app/db/repositories/annette*.ts`, `src/app/db/models/annette.types.ts`, and `src/stores/annetteStore.ts` return "file does not exist." Per the project's own auto-memory ([headless-slim-down.md]), on 2026-06-13 Vibeman was slimmed to a headless tool and "Annette/Commander + entire voice subsystem (voicebot, lib/voice, voiceCompanionStore)" were **deleted (~128k lines)**. The DB tables were "left in place (reversible)." So this context is a **ghost**: no live UI, no live API, no store — only orphaned DB tables, a still-running migration, a stale how-to doc, broken e2e specs, and a generic tool layer that *was* Annette's intended backend.
>
> Because there is no live Annette UI to audit, a conventional "5 UI nits + features" report would be fabrication. The 5 findings below are the **genuinely highest-value, code-grounded** opportunities that survive: clean up the misleading orphans, and either resurrect or formally retire the realized-but-unwired pieces. This fits vibeman's autonomous-AI-dev-orchestration direction (the surviving `src/lib/tools/*` is exactly the "voice/chat → create requirement → accept implementation" loop, now strandable into the headless flow).

## 1. Orphaned `annette_*` tables (13 of them) are still created on every fresh DB — silent dead schema
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: maintenance
- **File(s)**: `src/app/db/migrations/116_annette_rapport.ts:14`, `src/app/db/migrations/index.ts:37,257`, `src/app/db/repositories/repository.utils.ts:19-28`
- **Current state**: The Annette feature is deleted, but migration 116 still runs (`once('m116', () => migrate116AnnetteRapport(...))` at `index.ts:257`) and creates `annette_rapport` on every fresh install. The dynamic-update whitelist at `repository.utils.ts:19-28` still blesses **13 `annette_*` tables** (`annette_audio_cache`, `annette_knowledge_edges/nodes`, `annette_memories`, `annette_memory_consolidations/topics`, `annette_messages`, `annette_rapport`, `annette_sessions`, `annette_user_preferences`) with no repository or caller anywhere in `src/`.
- **Opportunity**: Make a deliberate keep-or-cut decision and document it. Either (a) gate these migrations + whitelist entries behind a feature flag / move them to an `archived/` migration set so new DBs don't sprout dead tables, or (b) if Annette is coming back, add a one-line tracking comment pointing at the revival plan so the next auditor doesn't re-flag it.
- **Value**: Every new vibeman install currently materializes a dead 13-table subsystem, inflating schema, slowing first-run migration, and misleading anyone reading the DB. A clear keep/cut removes recurring confusion across all future scans and onboardings.
- **Effort**: 2
- **Implementation sketch**: Decide keep vs. cut. To cut: in `index.ts` wrap `m116` (and any other `annette_*` creators) in `if (process.env.VIBEMAN_ANNETTE === '1')`, prune the 13 names from `VALID_TABLE_NAMES`, and add a top-of-file note in `116_annette_rapport.ts` linking the slim-down decision. To keep: add the revival-plan comment only.

## 2. The realized "create requirement / accept implementation" tool layer is unwired after Annette's removal — reattach it to the headless flow
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: `src/lib/tools/index.ts:9-22`, `src/lib/tools/requirement-generator.ts:1-56`, `src/lib/tools/implementation-accept.ts`, `src/lib/tools/ANNETTE_INTEGRATION_EXAMPLE.md`
- **Current state**: `src/lib/tools/` still exports a fully-built action layer — `generateRequirementFile`, `generateImplementationPlan`, `acceptImplementation`, `batchAcceptImplementations`, `rejectImplementation`. Its header comment says it can be used "in Manager, Annette, or any other feature," and `ANNETTE_INTEGRATION_EXAMPLE.md` is 365 lines showing how to wire it into the **now-deleted** `src/app/features/Annette/tools/manager-tools.ts`. The tool code survived the cull; its only documented consumer did not.
- **Opportunity**: This is exactly the autonomous loop vibeman now wants headless: "describe a task → generate a requirement file → Claude Code executes → accept/reject implementation." Expose these tools as MCP tools (the slim-down already added 11 MCP tools) or as a thin `/api/tools/requirement` + `/api/tools/implementation/accept` route pair so the `/vibeman` skill and CLI fleet can drive the same loop Annette was meant to.
- **Value**: Recovers a complete, already-written capability for zero re-implementation cost and routes it to the surviving headless interface — turning dead-since-deletion code into the orchestration tool's request/accept primitives.
- **Effort**: 3
- **Implementation sketch**: Add MCP tool wrappers (or 2 API routes) calling `generateRequirementFile`/`acceptImplementation` from `@/lib/tools`. Reuse the param shape in `RequirementGeneratorInput` (`requirement-generator.ts:27-46`). Then rewrite `ANNETTE_INTEGRATION_EXAMPLE.md` to document the MCP/HTTP entry point instead of the deleted Annette handler (see finding 4).

## 3. `ANNETTE_INTEGRATION_EXAMPLE.md` documents deleted files and will mislead the next contributor/agent
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: maintenance
- **File(s)**: `src/lib/tools/ANNETTE_INTEGRATION_EXAMPLE.md:8,155,157`
- **Current state**: This doc instructs readers to add tools to `src/app/features/Annette/tools/manager-tools.ts` (line 8), import from `../tools/manager-tools` in `src/app/features/Annette/lib/actionHandler.ts` (lines 155-157), and "train NLP model to recognize requirement creation intents." Every path it references was deleted on 2026-06-13. An agent following this doc would create files in a non-existent feature tree.
- **Opportunity**: Rewrite (or delete) the doc so it reflects the headless reality: same `@/lib/tools` imports, but consumed by an MCP tool / API route, not an Annette action handler. Keep the genuinely reusable parts (intent-map idea, error-handling pattern, batch ops) repointed at the live consumer.
- **Value**: Prevents agents and humans from generating code into a phantom module — a real hazard given vibeman's own CLI fleet reads these docs to drive autonomous work.
- **Effort**: 1
- **Implementation sketch**: Replace the "In Annette's tool handlers (`src/app/features/Annette/...`)" examples with the finding-2 MCP/route consumer, drop the "train NLP model" step, and add a one-line banner: "Annette UI removed 2026-06-13; these tools now power the headless requirement loop."

## 4. Stale Annette E2E specs test UI that no longer exists — silent CI rot
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: maintenance
- **File(s)**: `e2e/annette/annette-chat.spec.ts:34-45,54-57`, `e2e/annette/annette-tools.spec.ts`
- **Current state**: Two Playwright suites still navigate via `getByTestId('nav-other-commander')` (line 35), wait for `input[placeholder="Ask Annette..."]` (line 44), and assert `h2:has-text("Annette")` + `text=Brain-powered AI assistant` (lines 55-56). The nav item, the Commander route, and the chat input were all deleted. These tests can only time out or silently no-op (note the `expect(true).toBe(true)` escape hatch at `annette-chat.spec.ts:110`).
- **Opportunity**: Delete the two `e2e/annette/*` specs (the feature is gone), or, if Annette is being resurrected, mark them `test.skip` with a tracking note so they aren't counted as "passing coverage."
- **Value**: Removes dead/flaky tests that waste CI time and create false confidence — and removes the `expect(true).toBe(true)` no-op assertion that already masks the breakage.
- **Effort**: 1
- **Implementation sketch**: `git rm e2e/annette/annette-chat.spec.ts e2e/annette/annette-tools.spec.ts`. If resurrection is planned, instead wrap each `describe` in `test.describe.skip` with a `// TODO(annette-revival)` comment.

## 5. No empty/redirect state for the dead `/runner` Annette references and notification surface
- **Lens**: 🎨 ui-perfectionist
- **Priority**: crit
- **Category**: functionality
- **File(s)**: `src/components/Navigation/NotificationBell.tsx`, `src/app/runner/components/RunnerRightPanel.tsx`, `src/app/runner/types.ts`
- **Current state**: After the Annette/Commander deletion, live UI surfaces still reference Annette (these three files matched `annette|Commander` in `src/`). If any of these render an Annette tab, link, notification source, or runner panel entry that points at the removed `nav-other-commander` route, the user gets a dead control — a click leading nowhere, or a notification with no destination. There is no graceful empty/redirect state for the removed feature.
- **Opportunity**: Audit these three files for any user-visible Annette entry point (nav item, notification category, runner panel section). Remove the control if the feature is dead, or render a clear "Annette is no longer available in headless mode" empty state instead of a silently broken link.
- **Value**: A nav item or notification that leads to a 404/blank panel is the worst UX failure — it breaks user trust in the whole tool. Either removing it or giving it an honest empty state restores a coherent, no-dead-ends interface. (Highest priority precisely because it's the only *user-facing* residue of the deletion.)
- **Effort**: 2
- **Implementation sketch**: Grep each file for `annette`/`commander`/`nav-other-commander`; if it's a rendered link/tab/notification source, delete that branch; if removal is risky mid-migration, replace the target with a small `EmptyState` ("Voice assistant removed") component rather than leaving a broken route.
