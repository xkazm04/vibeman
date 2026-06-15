# Feature+UI Scan — Fix Wave 6: Headless-Slim-Down Cleanup + Map Integrity

> 5 findings closed across 5 commits.
> Baseline preserved: TypeScript 0 → 0 errors; tests 539/542 → 539/542 (same 3 pre-existing failures). The schema-drop migration ran cleanly on the test DB.

Theme: retire the dead weight the 2026-06-13 headless slim-down left behind, and add
a guard so context-map drift can't silently recur. 4 code-cleanups via parallel
edit-only subagents; the irreversible schema-drop migration was authored directly by
the orchestrator after verifying orphaned status.

## Commits

| # | Commit | Finding | Files |
|---|---|---|---|
| 1 | `chore(config): remove dead Social env getters…` | social #3 | envConfig.ts, .env.example |
| 2 | `refactor(unused-code): import the analyzer lib…` | debt #2 | api/unused-code/route.ts |
| 3 | `docs(scan): replace stale "FIXED VERSION"… header` | debt #5 | ScanStrategy.ts |
| 4 | `feat(context): detect context-map drift… in the audit` | social #5 (meta) | audit.ts, contexts/audit/route.ts, ContextAuditPanel.tsx |
| 5 | `chore(db): drop orphaned schema…` | annette #1, deps #2 | 232_drop_orphaned_schema.ts (new), migrations/index.ts, repository.utils.ts |

## What was cleaned up

1. **Dead env getters** — `socialEncryptionSecret()` (with a hardcoded default secret) and `grokApiKey()` had zero callers after the Social module was deleted. Removed both + their `.env.example` keys (re-confirmed zero callers).
2. **Analyzer dedup** — `/api/unused-code/route.ts` re-inlined the entire ~500-line analyzer that `src/lib/scan/unusedCodeDetector.ts` already exports (and had begun to drift). Deleted ~535 duplicated lines; the route now imports the lib (identical progress signature + return shape).
3. **ScanStrategy header** — replaced the misleading "FIXED VERSION / TO APPLY: copy this file" scaffolding header (on a file that IS already that path and is imported everywhere) with an accurate module doc block. Comment-only.
4. **Context-map integrity check** (the headline meta-finding's fix) — extended the existing context audit to resolve each context's `files[]` against disk and emit `stale_context` (all files missing) / `missing_files` (partial) findings plus `staleContexts`/`missingFiles` totals; the ContextAuditPanel surfaces them. This is the durable guard against the exact drift this scan uncovered (~6 contexts pointing at deleted files).
5. **Orphaned schema drop** — migration 232 drops `annette_rapport` (sole surviving table of the wholesale-deleted Annette subsystem) and `security_scans/patches/prs` (deleted Dependencies module). All four verified to have **zero live readers/writers** in `src/**`. `DROP TABLE IF EXISTS`, children before parents (safe no-op where never created). Also removed the 10 stale `annette_*` allow-list entries.

## Conservatism note on the irreversible drop

The user's Wave-6 instruction named "annette_*/security_* schema." During prep I found this needed scoping, not blanket execution:
- Only `annette_rapport` is actually created by a migration (the other 9 `annette_*` allow-list entries referenced never-created tables — cleaned from the allow-list, no table to drop).
- `security_*` has 5 created tables. I dropped only the 3 tied to the deleted Dependencies module (`scans/patches/prs`, finding-backed + 0 readers). `security_alerts`/`security_intelligence` (from migration 032, NOT part of the deleted module, and present in the dynamic-access allow-list so a 0-grep isn't fully conclusive) were **deliberately left** for separate verification. Dropping them now is a documented follow-up, not skipped silently.

## Verification table

| Gate | Before | After Wave 6 |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vitest run` | 539/542 (3 pre-existing fail) | 539/542 (same 3) |

## Cumulative status (waves 1–6): 34 / 95 closed.

## Patterns established (catalogue items 12–13)

12. **Allow-list / schema vs reality drift** — a table-name allow-list (or migration set) lists entities that no migration creates and/or no code reads. Bites as confusing dead surface and false "this exists" signals. Fix: verify against BOTH the create-sites and live readers before acting; clean the allow-list alongside any drop. Counting allow-list entries ≠ counting real tables.
13. **Irreversible action under a broad instruction** — when told to "drop X*" / "delete all Y", expand the glob and verify each member before the destructive step; scope to the evidence-backed subset and document what you held back, rather than executing the literal glob. A 0-grep is strong but not conclusive for entities reachable via a dynamic-name allow-list.

## What remains (open per INDEX)

- Waves covered themes A–F; remaining individual findings are the medium/low items not bundled into a wave (e.g. Manager AI-generated proposals, Reflector cross-project view + history, Docs Impact-Simulator apply-with-Claude + doc-gen empty state, Ideas lifecycle persistence + agent-performance stats, Brain next-context indicator, Scan-Queue dashboard + retry + auto-merge policy, hypothesis-assertion surfacing). All catalogued in INDEX.md and the per-context reports.
- Deferred from earlier waves: refactor store→/api/refactor/analyze wiring (W3); processor-layer command-auth defense-in-depth (W1); Build-Fixer fix→verify loop (W2); security_alerts/intelligence drop verification (W6).
