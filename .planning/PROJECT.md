# Vibeman

## What This Is

An AI-driven development platform that automates the entire software development lifecycle using multiple specialized AI agents. Vibeman boosts personal productivity through intelligent code analysis, idea generation, batch implementation, and automated testing. Includes remote control via Butler mobile app for triaging and triggering execution while away from desk.

## Core Value

Maximize developer productivity by automating routine development tasks through AI agents, with seamless mobile control for managing work queues remotely.

## Current Milestone: v2.0 Template Discovery & Research Integration

**Goal:** Transform the unused PromptTemplates module into a template discovery and research execution system.

**Target features:**
- Template discovery: Scan foreign projects for `TemplateConfig` exports in `src/templates/configs/*.ts`
- Auto-import: Discovered templates saved to DB with metadata
- Variable UI: Simplified form for filling research queries (minimum: query field)
- Requirement generation: Create .md files with CLI execution hints
- Full redesign: Rebuild Integrations module with clean visual hierarchy

**Integration target:**
- res project at `C:/Users/mkdol/dolla/res`
- 10 templates: tech_market, financial, competitive, investigative, due_diligence, legal, contract, reputation, purchase_decision, understanding

## Requirements

### Validated

<!-- v1.0 Butler-Vibeman Remote Integration (2026-01-28) -->
- ✓ Supabase integration with credentials management and connection testing
- ✓ Manual sync of directions and requirements to Supabase
- ✓ Auto-sync of accept/reject decisions back to SQLite
- ✓ Zen mode command center with 1-4 CLI sessions and event sidebar
- ✓ Remote batch execution via Supabase commands
- ✓ Butler mobile triage with swipe gestures (accept/reject/skip)
- ✓ Butler batch composer with healthcheck pre-flight
- ✓ Push notifications for batch completion/failure

### Active

<!-- v2.0 Template Discovery & Research Integration -->

**Template Discovery:**
- [ ] DISC-01: Scan project path for `src/templates/configs/*.ts` files
- [ ] DISC-02: Parse TypeScript to extract `TemplateConfig` exports
- [ ] DISC-03: Store discovered templates in DB with source_project_path
- [ ] DISC-04: Detect template changes on re-scan (update vs skip)
- [ ] DISC-05: Show discovery progress and results in UI

**Research Variable UI:**
- [ ] VAR-01: Query input field (required, the research topic)
- [ ] VAR-02: Granularity selector (quick/standard/deep)
- [ ] VAR-03: Template selector from discovered templates
- [ ] VAR-04: Preview interpolated prompt before generation
- [ ] VAR-05: Generate .md requirement file with filled variables

**Execution Hints:**
- [ ] EXEC-01: Show CLI command to run after generation
- [ ] EXEC-02: Copy-to-clipboard for command
- [ ] EXEC-03: Track generation history per template

**UI Redesign:**
- [ ] UI-01: Clean visual hierarchy with consistent spacing
- [ ] UI-02: Project scanner card (path input + scan button)
- [ ] UI-03: Discovered templates grid with metadata cards
- [ ] UI-04: Research launcher panel with variable inputs
- [ ] UI-05: Execution history timeline
- [ ] UI-06: Remove whitespace issues, improve typography

### Out of Scope

- Direct CLI invocation from Vibeman — user runs command manually in res project
- Research results viewing — handled by res project's report UI
- Template editing in Vibeman — edit source `.ts` files in res project
- Multi-project simultaneous discovery — one project at a time
- Template versioning — always use latest from source

## Context

**Existing Vibeman Architecture:**
- Next.js 16 + React 19 + TypeScript
- SQLite database with repository pattern (`src/app/db/`)
- Integrations module exists (`src/app/features/Integrations/`) — target for redesign
- PromptTemplates submodule (`sub_PromptTemplates/`) — ~20 files, never used

**Existing PromptTemplates Module:**
- Manual template creation with 6 categories
- `{{VARIABLE}}` interpolation syntax
- Batch generation via GeneratorPanel
- API routes: `/api/prompt-templates/*`
- DB: `prompt_templates` table with variables JSON

**Integration Target (res project):**
- Path: `C:/Users/mkdol/dolla/res`
- Templates: `src/templates/configs/*.ts`
- 10 templates: tech_market, financial, competitive, investigative, due_diligence, legal, contract, reputation, purchase_decision, understanding

**TemplateConfig Structure:**
```typescript
{
  templateId: string;
  templateName: string;
  description: string;
  searchAngles: SearchAngle[];
  findingTypes: FindingTypeConfig[];
  perspectives: string[];
  searchDepthGuidance: { quick, standard, deep };
  defaultMaxSearches: number;
}
```

**Data Flow:**
1. User enters project path → Vibeman scans for templates
2. Discovered templates stored in SQLite with metadata
3. User selects template → fills query variable
4. Vibeman generates `.md` requirement file
5. User copies CLI command → runs in res project
6. Claude Code executes research → saves to Supabase

## Constraints

- **Vibeman-only changes**: res project is read-only for discovery
- **File structure detection**: Scan `src/templates/configs/*.ts` pattern, no manifest
- **SQLite compatibility**: Use existing DB patterns and better-sqlite3
- **Existing UI patterns**: Follow Vibeman's dark theme and component conventions
- **TypeScript parsing**: Extract exports without full compilation (regex or ts-morph)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| File structure discovery | Simpler than manifest, no source project changes needed | — Pending |
| Generate file + CLI hint | Decouples Vibeman from res execution environment | — Pending |
| Full UI redesign | Module never used, opportunity to do it right | — Pending |
| Regex-based TS parsing | Faster than full ts-morph, sufficient for export extraction | — Pending |
| Single project at a time | Simpler state management, avoid confusion | — Pending |

---
*Last updated: 2026-02-02 after v2.0 milestone initialization*
