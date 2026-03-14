# Project Research Summary

**Project:** Vibeman v2.0 - Template Discovery & Research Integration
**Domain:** Development platform add-on — template scanning, variable input, and .md file generation
**Researched:** 2026-03-14
**Confidence:** HIGH

## Executive Summary

This milestone is a UI/UX redesign and pipeline hardening effort on infrastructure that already exists. The scanning pipeline (ts-morph AST parsing in `src/lib/template-discovery/`), the database repository, the API routes, and the primary UI components are all implemented. The work is not about building a new feature from scratch — it is about making an existing but rough feature production-quality: fixing data integrity bugs, hardening the scan logic, completing the generation flow with CLI command output, and redesigning the Integrations module layout.

The recommended approach is to address correctness before polish. Five critical pitfalls all live in the scanning pipeline (ts-morph memory leaks, useEffect re-render loops, misleading `config_json` type, path normalization inconsistencies, and aggressive stale cleanup). All five must be resolved before auto-scan ships. Building on top of buggy data storage or looping effects creates rework in later phases. Once the pipeline is solid, the missing output step (CLI command display + copy) can be added as a small targeted feature. Only then should the visual redesign be applied, to avoid reworking UI that sits on a broken foundation.

The key risks are well-understood from direct codebase analysis. None are hard to fix, but they are all data-integrity or correctness issues that must be caught in Phase 1. The stack requires zero new npm dependencies. The architecture patterns are already established. The main execution risk is scope creep — the research explicitly confirms that template editing, direct CLI execution, and multi-project scanning are anti-features that should not be built.

## Key Findings

### Recommended Stack

The milestone requires zero new npm dependencies. ts-morph 27.0.2, glob 13.0.6, better-sqlite3 12.6.2, React 19, framer-motion 12.35.0, Zustand 5.0.11, and Tailwind 4.2.1 are all already installed and integrated. The existing code assets in `src/lib/template-discovery/` and `sub_TemplateDiscovery/` form a complete foundation that needs hardening and polish, not replacement.

**Core technologies:**
- **ts-morph 27.0.2:** AST parsing of TemplateConfig exports — already installed and working in parser.ts; no changes to the parsing approach needed, but Project instantiation must be fixed
- **glob 13.0.6:** File discovery via `src/templates/*/*.ts` patterns — already integrated in scanner.ts; always use forward slashes in patterns
- **better-sqlite3 12.6.2:** Template storage — repository pattern with upsert, deleteStale, getBySourcePath already implemented
- **Zustand 5.0.11:** Discovery panel state — follow existing `useClientProjectStore` pattern; add persist middleware for last-used template/project
- **React 19 + framer-motion + lucide-react + Tailwind:** UI layer — all present and actively used in existing TemplateColumn/TemplateItem components

See `.planning/research/STACK.md` for full technology table and rationale for rejected alternatives.

### Expected Features

The feature dependency chain is linear: project path input → scan trigger → template list → template selection → query input + granularity selector → prompt preview → generate .md → CLI command display + copy.

**Must have (table stakes):**
- Project path input + scan — entry point; already implemented
- Template list with metadata — already implemented in TemplateColumn/TemplateItem
- Query input field — already in TemplateVariableForm
- Granularity selector (quick/standard/deep) — maps to `searchDepthGuidance`; simple dropdown; not yet present
- Generate .md requirement file — fileGenerator.ts exists
- CLI command display + copy — the missing output step; format: `cd [path] && npx claude --prompt [file]`
- Scan progress indicator — loading state during POST; partially handled
- Error display for failed scans — already handled in API

**Should have (differentiators):**
- Prompt preview before generation — PromptPreviewModal exists, needs polish
- Change detection on re-scan — already implemented via contentHash; surface results clearly in UI
- Generation history — GenerationHistoryPanel exists, functional but unpolished
- Template categorization — category already extracted from folder structure
- Clean visual hierarchy — the primary visual work of this milestone

**Defer to v2+:**
- Template search/filter — 10 templates do not need search
- Batch generation — complexity for minimal value
- Generation history deep polish — functional, lower priority than correctness work

**Explicit anti-features (do not build):**
- Direct CLI execution from Vibeman — security risk; show command + copy instead
- Research results viewing — duplicates the res project's own report UI
- Template editing — creates source sync issues; show read-only config
- Multi-project scanning — unnecessary state complexity
- File watching / auto-rescan — fragile on external paths; manual Rescan button is correct

See `.planning/research/FEATURES.md` for the full feature dependency diagram.

### Architecture Approach

The architecture follows a clean server/client boundary enforced via `import 'server-only'` guards. The API route acts as the orchestrator chaining scanner → parser → repository. Client-side code only calls fetch endpoints through `discoveryApi.ts`. All file system access, ts-morph parsing, and SQLite writes stay server-side. The existing patterns are correct and should be preserved.

**Major components:**
1. **scanner.ts** — file discovery via glob; produces list of .ts paths; server-only
2. **parser.ts** — ts-morph AST parse per file; extracts TemplateConfig exports; server-only; needs batch-Project fix
3. **API routes** (`/api/template-discovery/*`) — orchestrate scan, list, and generate; Next.js route handlers
4. **discovered-template.repository.ts** — SQLite CRUD with upsert and stale cleanup; all DB access goes here
5. **discoveryApi.ts** — client-side fetch wrappers; no file system access
6. **promptGenerator.ts + fileGenerator.ts** — string interpolation and .md output; client-side library
7. **TemplateDiscovery UI components** — panel, item, form, modal, history; React components using Vibeman theme

**Key refinements needed:** (1) The API route uses `parseTemplateConfig()` (one ts-morph Project per file) rather than `parseTemplateConfigs()` (batch). Fix to reuse one Project per scan request. (2) The output directory for generated files needs a configurable strategy — default `{res-project-path}/research-requests/` rather than the hardcoded `.claude/commands/` path.

See `.planning/research/ARCHITECTURE.md` for the full data flow diagram and anti-patterns catalogue.

### Critical Pitfalls

1. **ts-morph per-file Project instantiation causes memory leaks** — the current `parseTemplateConfig()` creates a new TypeScript compiler host for every file. Under auto-scan (which fires on every project switch), memory grows unbounded. Fix: reuse one ts-morph Project per scan batch. Alternative: replace with regex for the stable 10-template corpus. Do not ship auto-scan without this fix. Phase 1.

2. **Auto-scan useEffect chains can infinite-loop** — `handleScan` depends on `loadTemplates`, which itself fires on `projectPath` change. React 19 strict mode double-invokes effects. If callbacks are not referentially stable, chain-fires repeated API calls and UI flicker. Fix: 300ms debounce on auto-scan; consolidate into single effect. Phase 1.

3. **`config_json` column stores raw TypeScript source, not JSON** — the column name is misleading. Any code calling `JSON.parse(template.config_json)` will throw `SyntaxError`. Do not add downstream features that treat this column as JSON. Fix: rename type to `config_source` in TypeScript types, or extract structured fields as separate columns during parsing. Phase 1 — decide before DB schema is locked.

4. **Path normalization is inconsistent across layers** — scanner, API route, repository, and UI all normalize `\` to `/` independently. If any path passes through without normalization, upsert matching fails, producing duplicate DB records, and `deleteStale` removes all templates on the next scan. Fix: create a single `normalizePath()` utility and apply it at the repository layer. Phase 1 — data integrity issue.

5. **Stale cleanup deletes too aggressively on partial scan failure** — if 3 of 10 template files fail to parse, the working 7 are recorded but the 3 that errored count as "missing", so `deleteStale()` removes previously stored templates for those files. Fix: gate `deleteStale()` on `errors.length === 0` or a minimum parse-success threshold. Phase 1.

6. **Auto-scan fires for every project switch, not just template projects** — shows "0 templates" noise for non-research projects and wastes file system access and API calls. Fix: add a project designation flag or auto-detect by checking for `src/templates/` existence before scanning. Phase 2.

7. **Generated file slug has no uniqueness guarantee** — the 5-word slug produces near-duplicate filenames for similar queries, risking silent overwrites. Fix: append a timestamp or short hash to the filename. Phase 2.

See `.planning/research/PITFALLS.md` for the full pitfall analysis including security mistakes, UX pitfalls, integration gotchas, and the "looks done but isn't" verification checklist.

## Implications for Roadmap

Four phases are appropriate. Phase 1 must resolve all five scanning pipeline correctness issues before any UI investment. Phase 2 completes the generation flow (the missing output step). Phase 3 applies the visual redesign. Phase 4 handles edge-case hardening and history polish.

### Phase 1: Scanning Pipeline Hardening

**Rationale:** All five critical pitfalls live in the scanning pipeline and are pre-conditions for correct behavior. Building UI on top of buggy data storage wastes effort. This phase has no UI deliverables — it is pure correctness work on already-written code.
**Delivers:** Reliable scan → store cycle with correct path normalization, no memory leaks, no re-render loops, safe stale cleanup, and an honest type name for the config storage column.
**Addresses:** Scan progress indicator refinement, error display for failed scans.
**Avoids:** ts-morph memory leak, useEffect re-render loop, config_json parse failures, path normalization inconsistencies, stale cleanup over-deletion.
**Research flag:** Standard patterns. All fixes target specific identified lines in the codebase. No additional research needed.

### Phase 2: Generation Flow Completion

**Rationale:** The "CLI command display + copy" step is the missing output of the entire feature. Users have no clear path from "generated file" to "run the research". This phase closes that gap with targeted additions to existing components.
**Delivers:** Granularity selector dropdown, CLI command display with copy button post-generation, configurable output directory (`research-requests/` default), timestamp-based unique filenames, project designation flag to gate auto-scan noise.
**Uses:** Existing fileGenerator.ts, promptGenerator.ts, discoveryApi.ts — all wire together; no new libraries.
**Implements:** The tail of the data flow diagram: generate .md → show CLI command → copy to clipboard.
**Avoids:** File output path conflicts, wrong-project auto-scan noise.
**Research flag:** Standard patterns. No external research needed.

### Phase 3: UI Redesign

**Rationale:** Once the underlying behavior is correct and the generation flow is complete, the visual redesign can be applied without risk of rework. The existing prototype UI is functional but rough.
**Delivers:** Clean visual hierarchy for the Integrations module (three-panel layout: Scanner Card, Template Grid, Research Launcher), polished PromptPreviewModal, template categorization display, last-scanned timestamp indicator, Zustand-persisted state so last-used template and project survive navigation.
**Implements:** UI layer using existing framer-motion, lucide-react, Tailwind, and Vibeman theme patterns.
**Avoids:** UX pitfalls — state lost on navigation, CLI command shown only after generation (show command template earlier in the flow).
**Research flag:** Standard patterns. Vibeman's theme system and component conventions are well-established in the codebase.

### Phase 4: Edge Case Hardening and History Polish

**Rationale:** Remaining items are either lower-priority polish (generation history) or safety checks that reduce risk in edge cases and require a working system to verify against.
**Delivers:** Error boundary for Integrations panel (prevents blank page on DB failure), generation history UX polish, in-app overwrite confirmation modal replacing the `confirm()` call, bundle size verification (ts-morph must not appear in client-side chunks).
**Avoids:** "Looks done but isn't" items — multiline description regex failures, CRLF hash instability, nested folder category extraction, generation history FK integrity after template deletion.
**Research flag:** Standard patterns. No research needed.

### Phase Ordering Rationale

- Phases 1 → 2 are ordered by dependency: correctness must precede feature completion because the generation flow depends on reliable template data from the scan.
- Phase 3 follows Phase 2 because UI redesign of a feature that does not work end-to-end creates rework risk.
- Phase 4 is deferred because its items improve an already-working system and are not blockers.
- All five critical pitfalls from PITFALLS.md fall in Phase 1 intentionally — the research makes clear these are pre-conditions, not enhancements.

### Research Flags

Phases with standard patterns (no `/gsd:research-phase` needed during planning):
- **Phase 1:** All fixes are direct code changes to identified file locations. No API research, no new patterns.
- **Phase 2:** CLI command format, output path strategy, and project designation are product decisions documented in PITFALLS.md and ARCHITECTURE.md — not open research questions.
- **Phase 3:** Vibeman's UI patterns (theme system, framer-motion, lucide-react) are well-documented in the existing codebase.
- **Phase 4:** Error boundaries and modal replacement follow established React patterns.

No phases require external research. All unknowns are resolved by the existing codebase and planning documents.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies already installed and integrated; versions confirmed from package.json; no external API research needed |
| Features | HIGH | Requirements from PROJECT.md (DISC-01 through EXEC-03) combined with direct codebase gap analysis; no speculation |
| Architecture | HIGH | Based on direct analysis of all relevant source files; patterns already established in the project; no inference required |
| Pitfalls | HIGH | All pitfalls identified via direct code inspection with specific file and line references; none are inferred from external sources |

**Overall confidence:** HIGH

### Gaps to Address

- **Output directory strategy:** The generate endpoint currently writes to `.claude/commands/` (hardcoded). The research recommends `{res-project-path}/research-requests/` as the default. This is a product decision that needs confirmation against the res project's expected CLI input format before Phase 2 implementation.
- **Granularity mapping:** How quick/standard/deep maps to the res project's `searchDepthGuidance` field values needs verification against actual template config files. Confirm the enum values before building the dropdown.
- **Project designation mechanism:** A "template project" flag requires either a new DB column (migration needed) or auto-detection via `src/templates/` existence check. The auto-detect approach avoids a migration. Decide during Phase 2 task planning.

## Sources

### Primary (HIGH confidence — direct codebase analysis)
- `src/lib/template-discovery/parser.ts` — ts-morph per-file Project instantiation, regex fallback extraction
- `src/lib/template-discovery/scanner.ts` — glob patterns, path normalization
- `src/app/features/Integrations/sub_TemplateDiscovery/TemplateDiscoveryPanel.tsx` — useEffect chains, auto-scan trigger
- `src/app/api/template-discovery/route.ts` — stale cleanup logic, path normalization, pipeline orchestration
- `src/app/api/template-discovery/generate/route.ts` — slug generation, hardcoded output path
- `src/app/db/repositories/discovered-template.repository.ts` — upsert logic, content hash handling
- `.planning/PROJECT.md` — out-of-scope items, TemplateConfig structure, requirements DISC-01 through EXEC-03

### Secondary (HIGH confidence — package registry)
- [ts-morph npm](https://www.npmjs.com/package/ts-morph) — v27.0.2 confirmed as latest release
- [ts-morph documentation](https://ts-morph.com/) — Project instantiation patterns and memory behavior

---
*Research completed: 2026-03-14*
*Ready for roadmap: yes*
