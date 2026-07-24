# /vibeman — Skill Iteration Log

Why each non-obvious rule in `SKILL.md` exists. **When a rule looks redundant on a future
read, check here before removing** — the reason may still apply. Newest entries are at the
bottom; each entry names the run that produced it.

Operational instructions live in `SKILL.md`. The scan-memory vault contract lives in
`SCAN-MEMORY.md`. This file is history only and is never needed to execute a pipeline.

---

### 2026-04-08 — initial transfer from `/research` skill iteration (runs 1-6)

**Context:** The `/research` skill at `personas/.claude/skills/research/skill.md` went through a 6-run iteration cycle on the personas codebase. Several of its rules proved high-leverage across every run and are directly applicable to vibeman's Phase 4 (Plan) and Phase 5 (Implement). They were ported here. Vibeman's execution-heavy counters, quality score, and baseline comparison are kept unchanged — those are vibeman's own strengths that `/research` doesn't have.

**Rules added:**

- **Phase 4.1b — Host-infrastructure-first grep.** Before planning any task, grep for the category of host infrastructure the goal would attach to (HTTP server, DB migration, background job, middleware, config loader). Added because every `/research` run that applied this rule found existing surface area the naive plan would have duplicated — typically 2-4 planned tasks per discovery. Across 6 runs of `/research`, the rule caught ~25 candidate findings as "already existed" that would otherwise have become wasted implementation work. The single highest-leverage change made to any skill in that iteration.

- **Phase 4.1c — Prefix-namespace grep.** When the host-first grep finds one entity, immediately grep for all entities with the same prefix. Added after `/research` run 4 discovered `team_memories` and missed `persona_teams` + `persona_team_members` + `persona_team_connections` on the first pass. The fix: always expand the grep to the prefix namespace so the full related structure surfaces in one pass.

- **Phase 4.1d — Already-existed check.** Explicit scan for whether the planned feature is already partially implemented. Added because half the findings in `/research` runs 4 and 5 turned out to be implementations of things the skill was about to propose building from scratch. For an execution skill like vibeman, this is even more critical: the cost of implementing a duplicate is higher than the cost of just proposing one.

- **Phase 4.1 reordering — load `harness-learnings.md` FIRST.** Was step 6; now step 1. Accumulated learnings should be in hand before the other context steps so the host-first grep knows what to look for. Same reason `/research` loads `codebase-stack.md` at the start of Phase 1.

- **Phase 5 non-goals list.** Added explicit "do NOT" items (CI/CD, deps, tests, auth, public APIs, files outside target). `/research` handoff plans always include a "non-goals" section because every run discovered scope-creep traps; the same pattern applies to vibeman execution.

- **Phase 5 security check on privileged surfaces.** When touching HTTP/IPC/spawn sites, grep for auth/sandbox patterns first. Added after `/research` runs 1 and 3 both surfaced security findings (personas' management API had no auth; `--dangerously-skip-permissions` with no OS sandbox). The pattern: privileged surface + missing standard defense = critical. Vibeman could silently introduce such gaps by implementing a feature without this check.

- **Phase 5 stuck-escape-hatch.** After 3 failed fix attempts, write a breadcrumb to `docs/harness/followups-{date}.md`. `/research` handoff plans always include a "what to do if you get stuck" section for exactly this reason — stuck sessions should leave notes for the next session instead of burning context retrying.

- **Phase 6.8 — write-back to `harness-learnings.md`.** Before the brain signal step, append any structural facts discovered during the run. Added because `/research` runs 2, 3, 4, 6 all discovered structural facts about the codebase that future runs needed — but until a Phase 10e rule was added, those facts were lost. The analog here: every Phase 6 run should contribute back to the learnings file so the next Phase 4.1 starts with richer context.

- **Phase 7 — `Already-existed catches` section in the report.** Track what the host-first rule caught. `/research` added this as `already_existed: [...]` in run 4's frontmatter; run 6 made it a standard counter. High catch rates are a signal that the goal was underspecified or context has drifted.

**Rules NOT transferred (and why):**

- **Cluster detection in presentation.** `/research` Phase 7 bundles related findings before showing them to the user. Vibeman implements one goal at a time with dependencies already explicit in the task graph — clustering doesn't add value for a single-goal execution.
- **Handoff plan as output option.** Vibeman IS the executor; it produces code + a report, not plans to be executed elsewhere.
- **Discovery briefs.** Vibeman is an execution skill, not a research skill.
- **Obsidian memory loop.** `/research` writes to `~/Documents/Obsidian/personas`. Vibeman uses `harness-learnings.md` + brain signals instead — same idea, simpler and more in-repo.
- **Catalog-vs-runtime rule (verbatim).** This was personas-specific ("87 connectors in catalog, 0-3 bound per persona"). The *general principle* — "config count ≠ runtime count" — is worth remembering but doesn't warrant a dedicated rule in vibeman until a concrete case justifies it.
- **Framework-vs-plugin routing (verbatim).** Personas-specific boundary between core and `dev-tools` plugin. Vibeman targets different codebases; it should discover their boundaries organically via the host-first rule rather than bake in assumptions about plugin structure.

**Open questions for future vibeman iterations:**

- Does the host-first rule pay off the same way in vibeman's execution context as it did in `/research`'s extraction context? The payoff mechanism is identical (avoiding duplicate work), but vibeman writes code — if the rule catches something mid-Phase 5, it may be too late to avoid the cost entirely. Worth measuring the catch rate across early runs.
- Should `docs/harness/harness-learnings.md` have a formal structure (sections, frontmatter) the way `codebase-stack.md` does in personas? The `/research` skill got more value out of a structured reference file than a flat list. Consider formalizing once 3-5 runs have contributed learnings.
- The security check rule (Phase 5) fires on grep heuristics. It may produce false positives on internal dev-only endpoints. Track the false-positive rate over early runs — if it's noisy, add a way for the user to mark a target file as "known-safe" via a frontmatter or comment.

---

### 2026-04-09 — Run #1 on `auto-invoicer` (PDF export goal)

**Context:** First real run of vibeman after the initial /research transfer. Goal: PDF export of InvoiceForm. Auto-invoicer is a near-greenfield Next.js 16 + React 19 + Tailwind 4 project (~600 LOC of source). Quality score: 85/100. 4 tasks planned, 4 completed, 0 failed. The full meta-observations are in the Run #1 conversation; this entry distills only the *durable* skill changes that came out of it.

**Validations (rules that paid off, so leave them alone):**

- **Phase 4.1d already-existed check fires on the very first run of every project.** The naive plan was "task 1: add a Download PDF button" — three tasks. The host-first / already-existed pass discovered that `InvoiceForm.tsx` was *fully uncontrolled* (every input used `defaultValue`, line items were a hardcoded inline array, totals were baked-in literal strings). Without that check, vibeman would have written a button that downloads a PDF of nothing meaningful. Reframed scope from 1 layer to 2 layers: data model + controlled state, *then* PDF generation. **The rule has now been validated in execution context the same way it was validated in research context — confirming the open question from the initial transfer.**
- **Per-task tsc + commit rhythm catches errors when they're cheap to fix.** During Task 4, `tsc` caught a `ReactElement<DocumentProps>` type variance issue in `download.ts`. Because the failure happened inside a single small task with a hot mental model, the fix was a 4-line type cast with an inline comment. If this had been batched into a 4-task megacommit verified only at Phase 6, the same error would have required a much larger debug session to isolate. Keep the rhythm.
- **Phase 5 non-goals list earned its keep twice in one run.** Once during planning (forced explicit "no API route, no theme parity in PDF, no toast lib") and once during implementation (caught the urge to wire the dormant Save Draft button as a "free extra"). The discipline of *naming* what you won't do dramatically beats just "intending to be focused".

**Rules added in this iteration (Run #1 → SKILL v2):**

- **Phase 2 step 1 — lightweight project snapshot (always run).** Read package.json + README + top-level src/ + 1–2 entry points before asking the user for a goal. Added because Phase 2 is impossible to do well without context: I had to scout the codebase anyway just to ask an *intelligent* goal question. Now formalized as ~5 file reads at the start of Phase 2, explicitly cheap, explicitly lightweight. Phase 4.1 still does the deep context-gather; this is just enough to avoid asking blindly.
- **Phase 2 step 3 — propose grounded goal options when no goals exist.** Previously the skill jumped to "describe a NEW goal" with no scaffolding. Now: when no open goals exist, the assistant uses the Phase 2 snapshot to propose 3–4 concrete options with title / one-line description / scope estimate / visible risks. The user can pick one or describe their own. Caught the risk that the "ask blindly" path leaves the user with no anchor on what's possible.
- **Phase 2 step 6 — sanity-check goal size.** Explicit pushback if the goal would obviously exceed 8 tasks / 5 directories. The plan-approval gate already catches oversized goals indirectly, but adding it here means scope conversations happen *before* Phase 4.1 burns context on a doomed plan.
- **Phase 4.1e — Escalation report mini-template.** Formalizes the structure I had to improvise mid-Run-#1 when the host-first finding required user input. Standard template: what I expected, what's actually there, why it changes the plan, options table, recommendation, decision needed. Distinguishes "silently adapt" (small finding) from "escalate" (changes task count or feasibility). The bar: if you'd write "actually, the goal needs to be rescoped" in Phase 4.4, you should have escalated in 4.1e instead.
- **Phase 6.1 — also run `next build` (or equivalent) for Next.js projects.** `tsc --noEmit` only checks types. `next build` validates `"use client"` boundaries, SSR/client integration, prerender behavior, and turbopack module resolution. These are real failure modes for libraries like `@react-pdf/renderer`. Adding `next build` to Phase 6.1 caught nothing on Run #1 (it passed), but the *positive* signal was much stronger than tsc alone — and on a future run with subtler use-client mistakes, this is exactly the gate that will catch them. Generalized as "run the project's actual build, not just the type checker".
- **Phase 6.8 — formalized harness-learnings.md schema with `Open follow-ups` section.** Was previously a flat "Structural facts" list. Now has four named sections: Structural facts / Conventions enforced / Anti-patterns to avoid / Open follow-ups (from Run #N). The Open follow-ups section is the new addition: it captures what *this* run deliberately chose not to do, so the next run doesn't either re-flag it as a finding or accidentally re-implement it differently. Run #1's seeded learnings file already uses this shape.
- **Phase 6.9 — fix `requirementName` → `requirementId`.** Pre-Run-#1 the skill template used `requirementName: GOAL_TITLE`, but the live brain API rejects with `Invalid signal data: implementation.data requires requirementId (string)`. Worked around by passing the goal ID. **Bug in skill template, fixed.** Every future run was guaranteed to waste one API call on this until corrected.

**Open questions for Run #2 and beyond:**

- **Quality score rubric is gameable.** Run #1 scored 85/100 partly because "no test runner = +15 free points" applies regardless of whether tests *should* exist. A project that genuinely has no test suite gets the same neutral treatment as a project that has tests but they were skipped, which feels wrong. Considered changes (any of these would be a real shift): (a) split the 30-point test slot into 15 "test runner present" + 15 "tests passed", so absent tests cap at 15; (b) treat absent tests as -0 / +0 instead of +15, with a Phase-7 nudge to add tests as a follow-up goal; (c) detect "should have tests" by language/framework conventions and weight accordingly. **Decision needed from user before Run #2** — see end of message.
- **`FILES_READ` is a noisy metric.** Run #1 read 8 files; only ~2 actually shaped the plan. On a 1000-file repo this would explode without measuring anything useful. Probably not actionable until we see it on a larger project — flagging for Run #2 or #3.
- **Should `harness-learnings.md` get frontmatter (run count, last updated, project version)?** The new four-section shape is structured enough for now. Revisit after 3–5 runs of contributions to see if the file is starting to drift.
- **The host-first rule is now validated for execution-context (not just research-context).** Open question from the initial transfer: closed. The rule pays off the same way — in fact more, because catching a missing host saves *implementation* cost, not just *recommendation* cost.

**Rules considered and NOT added (with reasoning):**

- **Phase 6.2 — split test score into "runner present" (15) + "tests passed" (15).** Previously "no test runner = +15 free points", which rewarded absence of tests indistinguishably from neutral state. Now: runner present = 15, tests pass = 15. No runner = 0/30. User chose Option B (split) over Option A (keep as-is) and Option C (stack-detection). Rationale: simplest honest rubric; doesn't encode stack-specific conventions; forces future runs to honestly reflect the test gap; a 70-score for shipped+built+linted code is still grade B and still passes the ≥70 gate. Counter-argument acknowledged: early prototypes genuinely may not need tests, and this rubric can't distinguish "intentionally untested" from "negligently untested" — but the cost of that ambiguity is lower than the cost of silently inflating scores.

- **Auto-snapshot the rendered PDF on Phase 6 for visual diffing.** Tempting, but adds dependency on a headless renderer and only validates one of many possible feature outputs. Run #1's smoke test (pdf renderToFile + magic-byte check) was project-specific; baking it into the skill adds boilerplate for non-PDF projects. Skip until visual smoke testing is the bottleneck on multiple goals.
- **Force the assistant to commit `harness-learnings.md` separately from feature code.** Considered for cleanliness, but the cost of a tiny extra commit is real and the benefit is purely cosmetic. Run #1 did this organically without a rule. Skip.
- **Make `next build` mandatory for all stacks, not just Next.js.** The "Next.js or equivalent" wording captures the principle without forcing a specific command. Different stacks have different equivalents (`cargo build`, `vite build`, etc.). Phrasing the rule as a principle is better than a list.

---

### 2026-06-02 — Pipeline C "Scan and decide" added (+ Mini panel removed from the app)

**Context:** User asked for a third Phase-0 mode that minimizes input — pick one context group, let the skill choose the in-app Idea scanner(s), generate a capped backlog, handshake on each idea, then implement the approved scope. Added alongside A/B rather than folded into B because it uses a different engine: Vibeman's in-app Idea scanners (`/api/ideas/claude` → `/api/scans` → `/api/ideas`, the `AGENT_REGISTRY` scan types) that persist structured ideas, vs. Pipeline B's subagent role-prompts that write markdown findings reports.

**Design decisions (and why):**
- **One context group chosen by the user; scanners chosen by the skill.** The user's only required input is the group — that's the whole point of "decide-for-me." Scanner selection is autonomous (the "decide" in "scan and decide") but displayed with a one-line rationale and a cheap override, so it's transparent without being a second blocking prompt.
- **Cap 1–3 scanners and ≤5 ideas per scanner.** A backlog reviewable in one sitting is the point; uncapped scans produce noise nobody triages. The 5-idea cap is enforced in the C3 subagent instruction — `/api/ideas/claude`'s own prompt does not cap.
- **`/api/ideas/claude` returns a prompt, not results (verified against the route).** It builds `requirementContent` for an agent to execute (analyze → `POST /api/scans` → `POST /api/ideas`). C3 must *execute* that prompt via a per-scanner subagent, not just call the endpoint. This same misunderstanding is why the deleted "Mini" dashboard always showed "0 ideas" — `MiniScanPanel` read a non-existent `ideasGenerated` field off this endpoint, so it never reflected real work. That panel was removed from the app in the same change (it duplicated Ideas/Tinder/Tasker and never functioned).
- **Filter the C4 review to this run's `scan_id`s.** `GET /api/ideas?status=pending` returns ALL pending ideas; without filtering by the C3 scan ids the review mixes in stale backlog.
- **C5 reuses Phase 4.1b–d + Phase 5 + Phase 6, not a new flow.** Accepted ideas are just tasks. The already-existed grep matters *more* here because auto-generated ideas are likelier than a hand-written goal to propose something already implemented.

**API contracts used (verified 2026-06-02):** `GET /api/context-groups?projectId=` → `{data:[{id,name}]}`; `GET /api/contexts?groupId=` → `{data:[{id,name,description,file_paths}]}`; `POST /api/ideas/claude {projectId,projectName,projectPath,scanType,groupId}` → `{requirementContent}`; `POST /api/scans` → `{scan:{id}}`; `POST /api/ideas {scan_id,project_id,category,title,…}`; `GET /api/ideas?projectId=&status=pending` → `{ideas}`; `PATCH /api/ideas {id,status}`.

**Also fixed this session — Phase B1 hardcoded path.** The scan-type registry step pointed at `C:/Users/kazda/kiro/vibeman/src/lib/prompts/registry/agents/*.ts` — a stale home-directory absolute path from a different machine that returned nothing here (the repo is `C:/Users/mkdol/dolla/vibeman`). Replaced with a cwd-independent Glob on the repo-relative path `src/lib/prompts/registry/agents/*.ts` plus a `**/`-glob fallback, since the skill ships inside the Vibeman repo. Pipeline C was deliberately authored the same way (inline scanner table + API-sourced groups) so it never acquires a machine-specific path.

**Open questions for the first Pipeline C run:**
- Is per-scanner subagent dispatch (C3) worth it for only 1–3 scanners, or is inline execution simpler? Measure context cost on the first real run.
- Should rejected-idea `user_feedback` feed back into C2 scanner selection on a re-run of the same group? Potentially a learning loop like Phase 2a's goal-judgment log.

---

### 2026-06-02 — Working-directory discipline (first Pipeline C run on `pof` surfaced a leak)

**Context:** First real Pipeline C run (group "Character & Combat Authoring" on the `pof` project, 13 ideas generated → all accepted → all implemented). The run went well, but it exposed a structural hazard: the skill ships *inside* the Vibeman repo and is invoked with cwd = the Vibeman repo, while the work targets a *different* repo (`PROJECT_PATH`). Two things nearly went wrong, and one did:

1. **Temp leak (did happen).** I staged the three ~30 KB scanner `requirementContent` prompts to `C:\…\vibeman\.tmp_pof_scan\*.txt` — i.e. *inside the Vibeman working tree* — to hand them to the C3 subagents. Cleaned up at the end, but it should never have been written there.
2. **Commit hazard (avoided by luck/care).** The skill's Phase 5 and C5 commit snippets were bare `git add` / `git commit`. Run from the Vibeman cwd, those commit to **Vibeman**, not the target. I happened to use `git -C "$PROJECT_PATH"` by hand, but the skill *as written* would have committed 14 commits into the Vibeman repo.
3. **Build/test hazard (avoided).** Bare `npx tsc` / `npx vitest` / `npx next build` likewise inspect/build the Vibeman repo when run from cwd. I used `npm --prefix "$PROJECT_PATH"` by hand.

**Fixes applied to the skill:**
- **Added a top-of-file "Working directory discipline (CRITICAL)" block** (right after the Prerequisite). States plainly: the skill ships in the Vibeman repo, cwd = Vibeman, `PROJECT_PATH` is a *different* directory, and every target operation (read/edit/grep/build/test/lint/`git`/temp files) must be scoped to `PROJECT_PATH` via `git -C`, `npm --prefix`, or absolute paths. Calls out that the ONLY things read from the Vibeman repo are the scanner/idea registries, and that the session-start `gitStatus` describes Vibeman, not the target.
- **Phase 5 commit snippet** → `git -C "$PROJECT_PATH" add/commit`, plus a "branch off the project's default branch first" instruction so the target's `master`/`main` stays clean (this run created `vibeman/char-combat-ideas` in `pof` by hand — now codified).
- **Phase C5 commit + typecheck snippet** → `git -C "$PROJECT_PATH"` and `npm --prefix "$PROJECT_PATH" run typecheck`.
- **Phase C3 dispatch** → explicit note: pass `requirementContent` inline to the subagent, or stage under `PROJECT_PATH`/OS-temp and delete — **never** into the Vibeman repo/cwd (named the `.tmp_*`-in-Vibeman leak as the classic mistake).

**Why this matters:** every prior entry assumed cwd = the project, which was true when vibeman was dog-fooded on its own repo, but is false for A/B/C runs against *other* projects — the common case. Bare git/build commands are silent footguns: they "succeed" against the wrong repo. The guard block + `-C`/`--prefix` scoping makes the target explicit at every mutation site.

**Open questions:**
- Should the skill assert the target up front — e.g. `git -C "$PROJECT_PATH" rev-parse --show-toplevel` and refuse to proceed if it resolves to the Vibeman repo — as a hard guard rather than a documented convention?
- The terse `npx tsc`/`npx vitest` snippets elsewhere in the file still read as cwd-relative; the guard block covers them by reference, but a future pass could rewrite each to the `--prefix`/`-p` form for zero ambiguity.

---

### 2026-07-24 — Scan memory: the vault, coverage-driven selection, and the file split

**Context:** The user's report was "periodical rescanning from scratch — we don't track coverage,
or the list of implemented topics per area/context." Measured before designing:

- `ascent/docs/harness/` held **17 scan directories**. `bug-ui-scan` alone ran five times
  (06-16, 06-20, 06-25, 07-09) over the same 44 contexts, plus `ambiguity-ui-scan` on 07-16.
  Every one of them was a cold start.
- Two files in that tree were **invented mid-run by earlier sessions** because the skill has no
  coverage or resume model: `bug-ui-scan-2026-07-09/_SCAN-BRIEF.md` (a shared subagent brief) and
  `ambiguity-ui-scan-2026-07-16/SCAN-STATE.md` (a hand-written resume ledger recording
  "Completed 31/44 · Failed mid-scan 4 · In flight at cutoff 2 · Never dispatched 7" after the
  session hit its usage limit). The next run started again from context 1.
- That brief literally told every subagent *"This codebase has been through prior audits. Only
  report what you can CONFIRM by reading the current source"* — and handed over **zero data**
  about what those audits had found. The instruction was unactionable by construction.
- Overlapping findings across runs were verifiable: the `app-shell-seo-error-pages` context
  produced a `global-error` boundary finding on 06-25 and again, differently phrased, on 07-09.
- Pipeline C wrote `user_feedback` on rejected ideas to the Vibeman DB and **never read it back**.
  This was already logged as an open question on 2026-06-02 and had gone unfixed for two months.
- `ascent/docs/harness/harness-learnings.md` had reached **1,553 lines** of append-only prose. It
  is a fine archaeology document and a useless dispatch-time index.

**Prior art borrowed (not invented here):** `personas/.claude/skills/architect` and `/explorer`
already solved this with `$VAULT/<Skill>/coverage.md` — a per-theme heatmap carrying last-scan
date, findings surfaced/actioned across the last 3 runs, and a **yield density** ratio. That
schema has real entries going back to 2026-05-01 and demonstrably drives their "pick the stalest,
highest-yield area" phase. `/perfect` contributed the vault-resolution probe, the `next:` session
pointer, and the write-incrementally discipline.

**Design decisions (and why):**

- **Archive vs index split.** Full reports stay in `PROJECT_PATH/docs/harness/<run>/` — they were
  never the problem. The vault holds one line per finding plus a pointer. Duplicating report prose
  into the vault would reproduce the `harness-learnings.md` failure at a new path.
- **The unit of memory is the context ledger, not the finding note.** One markdown file per
  finding was considered and rejected: a single ascent scan produced 302 findings, so per-finding
  notes means ~300 files per scan and no way to read a context's history at a glance. The ledger
  is one file per context with four status sections (Fixed / Rejected / Open-deferred /
  Known-clean) and permanent `#NN` ids that survive status changes.
- **The payoff is the prior-coverage digest**, pasted verbatim into each scanner subagent's
  prompt above its role prompt. It carries: already-fixed (+SHA), user-rejected (+the user's own
  words), open findings with an explicit `CONFIRM #NN` / `RETIRE #NN` reply contract, known-clean
  paths, the project pattern catalogue, and — the highest-signal line — **which files changed
  since the last same-lens scan**. Everything else in this design exists to make that block
  accurate.
- **Rejected findings are never capped in the digest**, unlike fixed ones. Re-proposing something
  the user already declined costs trust, not tokens; it is the one failure mode worth spending
  unbounded prompt budget to prevent.
- **Coverage-driven context selection replaces "all contexts".** With 44 contexts and a session
  that covers ~20, "scan everything" guarantees an arbitrary cut — which is precisely how the
  07-16 run died. `tools/coverage.mjs plan` ranks by lens gap, age, churn, open pressure, and
  reach, minus a yield-decay cooldown.
- **A script, not a rule.** Staleness and the digest are computed by `tools/coverage.mjs`, not
  reconstructed by the model each run. "Files changed since SHA" needs a real `git diff`; asking
  the model to remember to run it every time is how the rule quietly stops happening.

**Two bugs found by dry-running the script on vibeman before shipping it:**

1. **All 15 never-scanned contexts scored identically (2.80)**, so the ranking collapsed to
   context-map order — no information. Never-scanned contexts have no SHA to diff against, so the
   churn term was constant. Fixed by falling back to a 90-day `git log --name-only` window, plus a
   small reach term.
2. **Raw churn ratio over-ranked tiny contexts.** A 3-file context at 100% churn outranked an
   18-file context at 61%. Fixed with additive smoothing (`churn / (files + 4)`) — a small
   denominator is a noisy ratio, not a strong signal. After the fix the ranking put
   `Scan Queue & Build Fixer` (9/12 files touched in 90d, and genuinely the newest subsystem)
   at the top, which matches reality.

**Also changed:**

- **Pipeline C's rejection loop is closed** (open question from 2026-06-02): C2 now reads the
  do-not-suggest list and rejected rows before selecting scanners; C4 mirrors accept/reject
  decisions — with reasons — into the context ledger.
- **File split.** `SKILL.md` was 99 KB / 1,447 lines, loaded in full on every invocation. This log
  (~120 lines of pure history, never needed to execute anything) moved here; the vault schema and
  templates went to `SCAN-MEMORY.md`, loaded only in Phase 0.5 / B8 / C6.
- **No backfill.** The user chose to start fresh rather than reconstruct the existing 17+17+14+…
  scan directories. Pre-vault scan dirs are listed in `Scan.md` as pointers and explicitly marked
  *not indexed*; `digest` surfaces them opportunistically for a context with no ledger, but
  nothing parses them. (`ascent` alone carries 1,099 commits with `Refs: docs/harness/…` trailers,
  so a backfill remains mechanically feasible if the cold-start cost ever justifies it.)

**Open questions for the first vault-backed run:**

- Does the digest actually suppress re-reporting, or do subagents restate fixed findings in new
  words? Measure: count findings in run N+1 that match a `Fixed` ledger row. If it is above ~10%,
  the digest needs the fixed rows' *root cause*, not just the title.
- Is `CONFIRM #NN` / `RETIRE #NN` honored reliably enough to trust the open-findings ledger, or
  does it need a verification pass?
- The yield-decay cooldown (last 2 scans, ≥4 surfaced, <15% actioned) is a guess. Revisit once any
  project has 3+ vault-recorded scans of one context.
- `harness-learnings.md` and the vault now overlap at the edges (structural facts vs context
  notes). Deliberate for now — the repo file is the one that travels with the repo. Revisit if
  they start contradicting each other.
