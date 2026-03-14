# Requirements: Vibeman v2.0 Template Discovery & Research Integration

**Defined:** 2026-03-14
**Core Value:** Maximize developer productivity by automating routine development tasks through AI agents, with seamless mobile control for managing work queues remotely.

## v1 Requirements

Requirements for v2.0 milestone. Each maps to roadmap phases.

### Pipeline Hardening

- [ ] **PIPE-01**: ts-morph Project instance reused across file scans instead of creating new per file
- [ ] **PIPE-02**: useEffect auto-scan does not re-trigger infinitely on project switch
- [ ] **PIPE-03**: Path normalization centralized in single utility instead of 5 fragmented locations
- [ ] **PIPE-04**: Stale template cleanup skipped when scan partially fails (no silent data loss)

### Generation Flow

- [ ] **GEN-01**: User can select research granularity (quick/standard/deep) before generation
- [ ] **GEN-02**: User sees CLI command to run after .md file generation
- [ ] **GEN-03**: User can copy CLI command to clipboard with one click
- [ ] **GEN-04**: User can preview interpolated prompt before generating .md file
- [ ] **GEN-05**: User can view generation history showing what was generated, when, and for what query

### UI Redesign

- [ ] **UI-01**: Integrations module has clean visual hierarchy with consistent spacing and typography
- [ ] **UI-02**: Project scanner card with path input and scan button
- [ ] **UI-03**: Discovered templates displayed in grid with metadata cards
- [ ] **UI-04**: Research launcher panel with query input, granularity selector, and template selector

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Template search/filter within discovered templates
- **ADV-02**: Batch generation across multiple templates simultaneously
- **ADV-03**: Execution history timeline with visual representation
- **ADV-04**: Template categorization display by research type

## Out of Scope

| Feature | Reason |
|---------|--------|
| Direct CLI execution from Vibeman | Security risk, different runtime environment — show command + copy instead |
| Research results viewing | res project has its own report UI — avoid duplication |
| Template editing in Vibeman | Templates are source code in res project — creates sync issues |
| Multi-project simultaneous scanning | Adds state complexity for minimal value — one project at a time |
| Template versioning | Overcomplicates "scan and use latest" pattern |
| File watching / auto-rescan | chokidar on external paths is fragile — manual rescan button instead |
| config_json rename/migration | Existing field works, cosmetic rename not worth migration risk |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase 1 | Pending |
| PIPE-02 | Phase 1 | Pending |
| PIPE-03 | Phase 1 | Pending |
| PIPE-04 | Phase 1 | Pending |
| GEN-01 | Phase 2 | Pending |
| GEN-02 | Phase 2 | Pending |
| GEN-03 | Phase 2 | Pending |
| GEN-04 | Phase 2 | Pending |
| GEN-05 | Phase 2 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after roadmap creation*
