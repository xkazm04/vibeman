# Roadmap: Vibeman v2.0 Template Discovery & Research Integration

## Overview

Transform the existing but rough template discovery pipeline into a production-quality feature. The work follows a correctness-first approach: harden the scanning pipeline (fix memory leaks, infinite loops, path bugs, and data loss), then complete the generation flow (granularity selector, CLI command output, prompt preview, history), then redesign the Integrations module UI. Each phase builds on verified correctness from the previous one.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Pipeline Hardening** - Fix scanning correctness bugs: memory leaks, infinite re-renders, path normalization, and stale cleanup safety
- [ ] **Phase 2: Generation Flow** - Complete the end-to-end generation path: granularity selection, prompt preview, CLI command output, and history
- [ ] **Phase 3: UI Redesign** - Rebuild the Integrations module with clean visual hierarchy, scanner card, template grid, and research launcher

## Phase Details

### Phase 1: Pipeline Hardening
**Goal**: Scanning pipeline produces correct, consistent data without memory leaks or infinite loops
**Depends on**: Nothing (first phase)
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04
**Success Criteria** (what must be TRUE):
  1. Scanning 10 templates completes without growing memory (single ts-morph Project instance reused across all files in a scan)
  2. Switching between projects in the UI does not trigger repeated scan API calls or UI flicker
  3. Rescanning the same project does not create duplicate template records in the database
  4. A scan where 3 of 10 templates fail to parse does not delete the 7 previously stored valid templates
**Plans:** 1/2 plans executed

Plans:
- [ ] 01-01-PLAN.md -- Backend pipeline fixes: ts-morph reuse, path normalization, safe stale cleanup
- [ ] 01-02-PLAN.md -- Frontend: remove auto-scan, add toast feedback, stale/error badges

### Phase 2: Generation Flow
**Goal**: Users can go from selecting a template to having a runnable CLI command in their clipboard
**Depends on**: Phase 1
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-05
**Success Criteria** (what must be TRUE):
  1. User can select quick, standard, or deep granularity before generating a research file
  2. After generating a .md file, user sees the exact CLI command to run the research and can copy it with one click
  3. User can preview the fully interpolated prompt (with query and template variables filled in) before committing to generation
  4. User can view a history of past generations showing query, template used, and timestamp
**Plans**: TBD

### Phase 3: UI Redesign
**Goal**: The Integrations module has a polished, intuitive layout that guides the user through the scan-select-generate workflow
**Depends on**: Phase 2
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. The Integrations module displays with consistent spacing, typography, and visual hierarchy matching Vibeman's dark theme
  2. A dedicated scanner card shows the project path input and scan button with clear status feedback
  3. Discovered templates are displayed in a grid of metadata cards showing template name, description, and category
  4. A research launcher panel presents query input, granularity selector, and template selector in a single coherent form
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Pipeline Hardening | 1/2 | In Progress|  |
| 2. Generation Flow | 0/? | Not started | - |
| 3. UI Redesign | 0/? | Not started | - |
