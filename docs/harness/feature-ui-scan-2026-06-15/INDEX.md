# Feature + UI Scan — vibeman, 2026-06-15

> Combined **feature-scout 🔍 + ui-perfectionist 🎨** scan of the vibeman codebase (the local AI dev-orchestration tool itself).
> 19 parallel subagent runs, batched in 3 waves of ≤8. One subagent per context, both lenses applied, capped at 5 combined findings/context.

---

## Totals

| | Critical | High | Medium | Low | **Total** |
|---|---:|---:|---:|---:|---:|
| Across 19 contexts | 11 | 47 | 37 | 0 | **95** |
| Share | 12% | 49% | 39% | 0% | 100% |

Lens split: **66 feature 🔍 / 29 ui 🎨** (UI-heavy contexts skewed feature-side because several modules' UIs were deleted in the 2026-06-13 headless slim-down — see drift note).

Counts verified two ways: sum of `> Total:` headers = 95; count of `- **Priority**:` bullets = 95. ✓

---

## ⚠️ Headline meta-finding: context-map drift

**~6 of 19 contexts point at files deleted in the 2026-06-13 headless slim-down.** Their manifests are stale; the scanners re-grounded findings in the surviving code (orphaned tables, dead Tauri commands, misleading docs). Worst offenders:

| Context | Manifest accuracy | What survives |
|---|---|---|
| Annette AI Assistant | 0/26 files exist | orphaned `annette_*` tables, `src/lib/tools/*`, residual `NotificationBell`/`/runner` refs |
| Social Feedback System | 0/17 exist | orphaned Tauri `social_cmds.rs` querying dropped tables, dead env getters, HallOfFame dead paths |
| Dependencies & Security | 0/17 exist | `npm audit` quality gate, orphaned `security_scans/patches/prs` schema |
| Integrations & Template Discovery | 3/23 exist | headless `template-discovery` lib + Tauri commands (with column bugs) |
| Debt Prediction & Refactoring | most gone | live `src/lib/scan/**` engine, refactor store slices wired to dead endpoints |
| Brain & Behavioral Signals | UI files gone | `brainService`, signal/reflection routes (autonomy loops orphaned) |

**Triage consequence:** findings in these contexts skew "clean up dead code / reconnect orphaned backend" rather than "add feature / polish UI." A dedicated **context-map refresh** (Phase 6/7 `refresh_context`) should follow any cleanup wave.

---

## Per-context breakdown

(Sorted by criticals desc, then high desc)

| # | Context | Group | Crit | High | Med | Total | Report |
|---|---|---|---:|---:|---:|---:|---|
| 1 | Integrations & Template Discovery | Social & Integrations | 2 | 2 | 1 | 5 | `integrations-templates.md` |
| 2 | Brain & Behavioral Signals | Intelligence Layer | 1 | 3 | 1 | 5 | `brain-signals.md` |
| 3 | Debt Prediction & Refactoring | Analysis & Quality | 1 | 3 | 1 | 5 | `debt-prediction.md` |
| 4 | Scan Queue & Build Fixer | Code Execution & Automation | 1 | 3 | 1 | 5 | `scan-queue-build-fixer.md` |
| 5 | Annette AI Assistant | Intelligence Layer | 1 | 2 | 2 | 5 | `annette-assistant.md` |
| 6 | Blueprint & Onboarding | Code Execution & Automation | 1 | 2 | 2 | 5 | `blueprint-onboarding.md` |
| 7 | Database & Schema | Data & Infrastructure | 1 | 2 | 2 | 5 | `database-schema.md` |
| 8 | Dependencies & Security | Analysis & Quality | 1 | 2 | 2 | 5 | `dependencies-security.md` |
| 9 | Goals & Daily Standup | Core Development Engine | 1 | 2 | 2 | 5 | `goals-standup.md` |
| 10 | Remote Device Control | Social & Integrations | 1 | 2 | 2 | 5 | `remote-device-control.md` |
| 11 | Context Management | Core Development Engine | 0 | 3 | 2 | 5 | `context-management.md` |
| 12 | Docs & Architecture Explorer | Data & Infrastructure | 0 | 3 | 2 | 5 | `docs-architecture.md` |
| 13 | Ideas System | Core Development Engine | 0 | 3 | 2 | 5 | `ideas-system.md` |
| 14 | Manager & Directions | Core Development Engine | 0 | 3 | 2 | 5 | `manager-directions.md` |
| 15 | TaskRunner & Claude Code | Code Execution & Automation | 0 | 3 | 2 | 5 | `taskrunner-claude-code.md` |
| 16 | Testing & Scenarios | Analysis & Quality | 0 | 3 | 2 | 5 | `testing-scenarios.md` |
| 17 | Reflector & Executive Analysis | Intelligence Layer | 0 | 2 | 3 | 5 | `reflector-executive.md` |
| 18 | Social Feedback System | Social & Integrations | 0 | 2 | 3 | 5 | `social-feedback.md` |
| 19 | Workspace & Project Management | Data & Infrastructure | 0 | 2 | 3 | 5 | `workspace-project-mgmt.md` |

---

## All 11 critical findings

### Security / safety (2)
1. **Remote Device Control — Unauthenticated mesh/fleet command dispatch executes local Claude Code & writes files.** Mesh `/commands` POST explicitly skips API-key checks; the processor runs every pending command incl. `start_remote_batch` (runs Claude Code locally) and `triage_*` (writes requirement files) → unauthenticated RCE/file-write on any device joining the mesh. `src/app/api/remote/mesh/commands/route.ts:4-5,110-178`
2. **Dependencies & Security — `security_scan` quality gate silently passes on real vulnerabilities.** The catch block returns `passed:true` whenever `npm audit` exits non-zero — i.e. on every project that actually has a CVE — so the gate is a no-op against real vulns. `src/app/api/lifecycle/quality-gate/route.ts:248-256`

### Runtime-breaking (4)
3. **Database & Schema — Five migrations (138/139/140/141/229) exist on disk but were never registered in the runner.** 4 live features (file-write queue, triage rules, insight lineage dedup, CLI transcript mirror) throw `no such table`/`no such column` on any fresh DB. `src/app/db/migrations/index.ts:88-89`
4. **Integrations — Rust `get_discovered_templates` queries a nonexistent `stale` column** (schema uses `status`) → headless template listing errors out entirely. `src-tauri/src/commands/lifecycle_cmds.rs:197,203`
5. **Integrations — Rust `get_generation_history` filters on a nonexistent `project_id` column.** `src-tauri/src/commands/misc_cmds.rs:146`
6. **Debt Prediction — Refactor store POSTs to `/api/refactor/{generate-packages,execute-dsl,analyze}` which don't exist** → the entire refactor wizard pipeline is wired to nothing. `src/stores/slices/refactor/packagesSlice.ts:127`

### Built-but-unwired (flagship autonomy/UX dead) (3)
7. **Brain — `runCrossProjectSynthesis` (architecture-drift detection + auto proactive-goal generation) has zero callers.** vibeman's flagship autonomy loop is inert. `src/lib/brain/brainService.ts:489-538`
8. **Goals — Rich "Daily Mission Briefing" `PredictiveStandup` is exported but rendered nowhere.** `src/app/features/DailyStandup/components/PredictiveStandup.tsx:105`
9. **Blueprint — "Run blueprint scan" onboarding step is a dead end; no `blueprint` route exists in `page.tsx`** → worst first-run moment in the product. `src/app/page.tsx:78-101`

### Dead-schema / cleanup (2)
10. **Integrations (dup of #4/#5 context) — additional headless template surface returns stale/error rows unfiltered** (counted critical by scanner; see report).
11. **Scan Queue & Build Fixer — Build Fixer requirement-file Markdown is hand-built & divergent** across call sites (scanner rated structural-critical; see report). *(Note: the Build Fixer's bigger problem — fully built but wired to nothing — is logged High; see Theme B.)*

---

## Triage themes (the fix-wave clusters)

| Theme | Approx count | Why it's a wave, not scattered fixes |
|---|---:|---|
| **A. Safety & correctness criticals** | 6 | Security + runtime crashes; share a "make it not break/leak" mental model. Highest urgency. |
| **B. Reconnect inert autonomy engines** | 5–6 | The product's value prop (autonomous orchestration) has its core loops built but uncalled. One mental model: trace the orphaned service → wire to its trigger. |
| **C. Surface built backends in the UI** | 6 | Working backends unreachable from the app (audit, standup, X-ray, refactor, reflector insights, Manager "Implement with AI"). |
| **D. Operator visibility & control** | 5 | TaskRunner + Ideas: cost totals, retry, progress/cancel, bulk triage — all about seeing/steering running work. |
| **E. UI consistency & design-system** | 5–6 | Hardcoded layer colors vs token, destructive-action confirmation parity, empty/loading states, shared templates, atom salvage. |
| **F. Headless-slim-down cleanup + map integrity** | 5–6 | Orphaned tables/commands/docs from the 2026-06-13 cull + a context-manifest integrity check to stop future drift. |

---

## Suggested next-phase split (6 waves)

**Wave 1 — Safety & correctness criticals** (6 fixes): remote-mesh/fleet auth guard · security-gate no-op fix · wire 5 orphaned migrations · 2 Rust column bugs · guard/remove orphaned-table Tauri commands.

**Wave 2 — Reconnect inert autonomy engines** (5): `runCrossProjectSynthesis` on reflection-complete · signal-decay scheduled job · `scanForReverts` revert-learning · Build Fixer → execution loop · behavioral-context MCP tool.

**Wave 3 — Surface built backends in the UI** (6): Manager "Implement with AI" wiring · render PredictiveStandup + standup-generate path · Context Balance Audit panel · Reflector "Promote to Direction/Idea" + cross-project tab · refactor-wizard bridge route · X-Ray real-data wiring.

**Wave 4 — Operator visibility & control** (5): TaskRunner cost/token totals · retry/re-run · batch progress + stop control · Ideas scan progress/cancel · Buffer bulk triage + effort/impact values.

**Wave 5 — UI consistency & design-system** (5): layer-color token · workspace delete confirmation parity · empty/loading states · Build Fixer shared markdown template · atom salvage / orphaned keyboard-nav hook.

**Wave 6 — Headless-slim-down cleanup + map integrity** (5): drop orphaned `annette_*` + `security_*` schema · HallOfFame dead-path refs + dead env getters · ScanStrategy scaffolding header + dedupe unused-code analyzer · context-manifest integrity check + refresh drifted contexts.

---

## How this scan was run

- **Scanner prompts:** `src/lib/prompts/registry/agents/feature-scout.ts` + `ui-perfectionist.ts`, applied combined per context.
- **Date:** 2026-06-15. **Scope:** all 19 contexts, full-stack (Next.js/TS + the surviving Tauri `src-tauri/` commands).
- **Method:** 19 `general-purpose` subagents, 3 waves of ≤8; each read its context's file list from `_contexts.json`, read ~10–18 files, wrote one report, replied terse. Orchestrator read only the replies (not the reports) during scanning.
- **Cap:** exactly 5 combined findings/context (feature + UI mixed).
- **Verification:** finding counts cross-checked (header sum 95 = bullet count 95); priorities normalized across `crit/critical` and `med/medium` abbreviations.
- **Baseline (Phase B2):** TypeScript = 0 errors. Test/lint baseline captured at first fix wave.
