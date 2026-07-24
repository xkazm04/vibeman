---
name: vibeman
description: Run a Vibeman pipeline on a project. Three modes — (A) goal-based development (PLAN > IMPLEMENT > VERIFY > REPORT), (B) audit-driven scan + triage + wave-based fix implementation, or (C) scan-and-decide (pick one context group; the skill auto-selects Idea scanners, generates a capped backlog, you accept/reject each, then it implements the approved scope). Scans are memory-backed — a per-project Obsidian vault records which contexts were scanned with which lens at which commit, what was fixed, and what the user rejected, so repeat runs target new ground instead of restarting from scratch. Read-only modes — status, coverage, reflect. All run with quality gates, brain-signal recording, and structured per-wave/per-phase reporting.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node *), Bash(npx *), Bash(curl *), Bash(git *)
argument-hint: [project-name-or-goal? | status | coverage | reflect]
---

# Vibeman Pipeline — Autonomous Development Cycle

Vibeman offers three pipelines on a project. Pick one at Phase 0 based on what the user wants:

- **Pipeline A — Goal-based development** (the original): user defines a goal, the skill plans → implements → verifies → reports. Best when the user knows what to build.
- **Pipeline B — Scan + Triage + Implementation** (the audit pipeline): user picks a scan agent (e.g. `bug-hunter`) and a context scope; the skill runs parallel per-context audits, compiles a triage INDEX, and then offers wave-based fix sessions until the user pauses. Best when the user wants to discover and remediate problems they don't yet know about.
- **Pipeline C — Scan and Decide** (the decide-for-me pipeline): user picks ONE context group and nothing else; the skill inspects the group, auto-selects the best-fit in-app Idea scanner(s), generates a tight backlog (≤5 ideas per scanner), walks the user through accept/reject on each idea, then implements only the approved scope. Lowest-input pipeline. Best when the user wants to point at one area and have the skill decide and do.

All three pipelines use the same quality gates (TypeScript / lint / tests) and the same baseline-comparison discipline. Phases 1-7 below are Pipeline A; Pipeline B's phases (B1-B7) and Pipeline C's phases (C1-C5) live further down before "Error Handling".

**Prerequisite**: Vibeman must be running at `http://localhost:3000`. If not, tell the user to start it first.

**Working directory discipline (CRITICAL — read before running any command).** This skill ships *inside the Vibeman repo* (`.claude/skills/vibeman/`) and is invoked with the shell's current directory set to the **Vibeman repo itself** — NOT the project you're operating on. The target project is a **separate directory** captured as `PROJECT_PATH` in Phase 1 (e.g. `C:\Users\me\kiro\pof`). Every operation on the target — reading, editing, `grep`, typecheck/lint/test/build, **`git add` / `git commit` / `git diff`**, and any temp/scratch files — MUST be scoped to `PROJECT_PATH`, or you will silently mutate and inspect the *Vibeman* codebase instead of the target. Rules:

- **Never run a bare `git add`, `git commit`, `git diff`, `git log`, `tsc`, `vitest`, `eslint`, or `next build` from the skill's cwd.** Always scope to the project: `git -C "PROJECT_PATH" …`, `npm --prefix "PROJECT_PATH" run <script>`, or pass absolute paths under `PROJECT_PATH`. The terse `npx tsc` / `npx vitest` / `git commit` snippets shown later in this file are shorthand — when you actually run them, scope them to `PROJECT_PATH`.
- **Never write scratch/temp files (scanner prompts, notes, output dirs) into the Vibeman repo or its cwd.** Put working artifacts under `PROJECT_PATH` (e.g. `PROJECT_PATH/docs/harness/…`) or an OS temp dir, and clean them up. `harness-learnings.md`, `goal-judgments.md`, and `followups-*.md` all live under `PROJECT_PATH/docs/harness/`, never under Vibeman.
- **The ONLY things you read from the Vibeman repo are its scanner/idea *registries*** — `src/lib/prompts/registry/agents/*.ts` (Pipeline B) and `src/app/features/Ideas/lib/agentRegistry.ts` (Pipeline C). These are Vibeman's own catalogs, read-only. Never edit or commit them (or anything else) into Vibeman as part of a pipeline run. The exception: deliberate edits to *this skill file* when the user asks you to improve the skill.
- **Ignore the harness `gitStatus` shown at session start for commit purposes** — it describes the *Vibeman* repo, not your target. Re-derive the target's state with `git -C "PROJECT_PATH" status`.

## Headless MCP toolkit (Vibeman MCP server)

When the Vibeman MCP server is connected, prefer these tools over raw `curl` for the headless loop — they wrap the same APIs but handle errors and the approval gate. All operate on the configured project/context; pass `projectId`/`contextId`/`groupId` to override.

**Context map — build & keep fresh:**
- `create_context` / `update_context` — create or amend a context (files, description, test scenario, group).
- `create_context_group` / `update_context_group` — organize contexts into groups.
- `refresh_context` — re-read one context's files and regenerate its description with the LLM. **Call this in Phase 6/7 for every context whose files you changed**, so the context map stays accurate for the next run.
- `refresh_context_group` — same, for a whole group after a batch of changes.

**Idea scan & triage (Pipeline C):**
- `scan_ideas` — run an Idea scanner over a context or group; reads files server-side and writes ideas to the DB (you don't ship file contents). Pass `scanType` (e.g. `bug_hunter`, `perf_optimizer`, `feature_scout`) or omit for the default set.
- `get_backlog` — pull a ranked backlog (default: pending, ranked by value = high impact / low effort & risk).
- `triage_idea` — set an idea's status (accepted/rejected) with feedback; one call per accept/reject decision.

**Risk/effort approval gate (all pipelines, before waves):**
- `save_plan` now scores each requirement and **holds high-effort or high-risk items** (effort or risk ≥ 7 by default; pass `effortThreshold`/`riskThreshold` to tune). Held items are saved as `pending`; safe items as `accepted` (ready for a wave). When `save_plan` reports flagged items, **STOP and present them to the user**.
- `get_pending_approvals` — list items currently held for approval (e.g. after a resume).
- `resolve_approval` — after the user decides, accept (`approved=true` → ready for wave) or reject (`approved=false` → dropped) a batch of flagged idea IDs.

**Gate discipline:** never add a flagged (high risk/effort) item to an implementation wave until the user has explicitly approved it via `resolve_approval`. Use the Phase 4.1e escalation template to present the flagged items.

---

## Scan memory (CRITICAL for Pipelines B and C)

Scans used to cold-start every time. `ascent/docs/harness/` accumulated **17 scan directories** —
`bug-ui-scan` alone ran five times over the same 44 contexts — and each run re-derived the same
ground, re-reported findings that had already been fixed, and re-proposed ideas the user had
already rejected. One run died at 31/44 contexts and the next one began again at context 1.

Every scan is now backed by a per-project **Obsidian vault** that records, per context: which
lenses have scanned it, at which commit, what was fixed (with SHA), **what the user rejected and
why**, what is still open, and which paths were traced and found clean. That memory is compiled
into a **prior-coverage digest** injected into each scanner subagent's prompt, and into a
**staleness ranking** that decides which contexts are worth scanning at all.

- **Schema, note templates, digest format, staleness formula:** `SCAN-MEMORY.md` in this directory.
  Read it at Phase 1.5 and at Phase B8 / C6. Do not read it while implementing fixes.
- **Computation:** `tools/coverage.mjs` (`init` · `plan` · `digest` · `status` · `verify`). Run it;
  do not recompute staleness or rebuild the digest by hand. The skill ships inside the Vibeman
  repo, so from the default cwd the path is `.claude/skills/vibeman/tools/coverage.mjs`; if that
  does not resolve, `Glob **/skills/vibeman/tools/coverage.mjs`. Never hardcode a home directory.
  Record it once as `$COV` and reuse. The script only ever *reads* the target repo (`git diff`,
  `git log`) — it never writes to it.
- **The vault is machine-local** (`Documents/Obsidian/<project>/Scan/`), never inside the Vibeman
  repo and never inside the target repo. `docs/harness/harness-learnings.md` stays where it is —
  it is the file that travels with the repo; the vault links to it rather than replacing it.

The three rules that matter most, if you read nothing else:

1. **Never dispatch a scanner without its context's digest.** A subagent told "prior audits exist"
   with no data will re-report fixed findings — that instruction was in ascent's hand-written
   scan brief and was unactionable by construction.
2. **Never re-propose a rejected finding.** The digest never truncates the rejected list.
3. **Write the vault incrementally** — after each wave, after each fix commit. A killed session
   must lose at most the work in flight.

## Phase 0: Pipeline Selection

**Read-only modes first.** If `$ARGUMENTS` starts with one of these, run it and stop — no
subagents, no code changes, no gates:

| Invocation | Does |
|---|---|
| `/vibeman status [project]` | Phase 1 → Phase 1.5 recall → print the vault headline: contexts with a ledger, open / fixed / rejected counts, last run, and the `next:` pointer. `node tools/coverage.mjs status --vault "$VAULT"`. |
| `/vibeman coverage [project]` | Phase 1 → print the full staleness-ranked plan for the default lens: `node tools/coverage.mjs plan --vault "$VAULT" --project "$PROJECT_PATH" --contexts <map> --lens <lens>`. Answers "what is worth scanning next, and what is provably not". |
| `/vibeman reflect [project]` | Read `$VAULT/Scan/config.md → ## Skill improvement log` plus the last 3 run notes, and propose concrete edits to this skill file. Changes go to `ITERATION-LOG.md` as a new dated entry. |

Otherwise pick a pipeline. If the invocation makes it obvious (e.g. they explicitly say "run a bug hunter scan" or "implement this goal"), skip the prompt and proceed.

Otherwise, ask:

```
What pipeline?
  A. Goal-based development — define a goal, plan, implement, verify, report.
  B. Scan + Triage + Implementation — audit the codebase with a chosen agent
     (bug-hunter, security review, etc.), compile a triage INDEX, then run
     wave-based fix sessions until you pause.
  C. Scan and decide — pick ONE context group; I auto-select the best-fit Idea
     scanner(s), generate a small backlog (≤5 ideas per scanner), you accept/reject
     each idea, then I implement only the approved scope. (Lowest-input mode.)
```

All three pipelines start with the same Phase 1 (project selection), then Phase 1.5 (recall). Pipeline A continues to Phase 2 (goal definition); Pipeline B jumps to Phase B1 (scan configuration); Pipeline C jumps to Phase C1 (context-group selection).

Throughout execution, track these counters for the final report:
- `FILES_CREATED` — number of new files written
- `FILES_MODIFIED` — number of existing files edited
- `FILES_DELETED` — number of files removed
- `FILES_READ` — number of files read during planning/implementation
- `LINES_ADDED` — approximate lines of code added
- `LINES_REMOVED` — approximate lines of code removed
- `TASKS_PLANNED` — total tasks in the approved plan
- `TASKS_COMPLETED` — tasks that compiled and passed verification
- `TASKS_FAILED` — tasks that required fix-forward or were abandoned
- `COMMITS_MADE` — number of git commits created
- `TSC_RUNS` — number of times TypeScript compiler was invoked
- `TSC_ERRORS_FIXED` — TypeScript errors resolved during implementation
- `TESTS_RUN` — whether test suite was executed
- `TESTS_PASSED` — test count if tests were run
- `TESTS_TOTAL` — total test count
- `API_CALLS` — number of Vibeman API calls made
- `DURATION_MINUTES` — approximate wall clock time

---

## Phase 1: Project Selection

Select which project to work on.

1. Fetch the project list from Vibeman:
```bash
curl -s http://localhost:3000/api/projects 2>/dev/null
```

2. If the API call fails, inform the user that Vibeman needs to be running at localhost:3000 and stop.

3. Parse the JSON response. Extract `projects` array.

4. Present a numbered list to the user:
```
Available Vibeman projects:
1. project-name (path: /absolute/path) [type]
2. another-project (path: /other/path) [type]
```

5. If `$ARGUMENTS` is provided, try to match it against project names or IDs (case-insensitive partial match). If a single project matches, auto-select it. If multiple match, show the matches and ask the user to pick.

6. If no argument or no match, ask the user to select by number.

7. Store the selection for use in later phases:
   - `PROJECT_ID` — the project's unique ID
   - `PROJECT_PATH` — the absolute filesystem path
   - `PROJECT_NAME` — the display name

Increment `API_CALLS` by 1.

---

## Phase 1.5: Recall (all pipelines)

Load what previous runs already know before doing anything else. Cheap — a few file reads and
one script call. Skipping it is what produced five cold-start scans of the same 44 contexts.

**1. Resolve the vault.** Per `SCAN-MEMORY.md § Vault resolution`:

```bash
for base in "C:/Users/kazda/Documents/Obsidian" "C:/Users/mkdol/Documents/Obsidian"; do
  [ -d "$base" ] && VAULT_BASE="$base" && break
done
VAULT="$VAULT_BASE/$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]')"
```

If `$VAULT_BASE` exists but `$VAULT` does not, create it. If no Obsidian base exists at all, fall
back to `$PROJECT_PATH/.vibeman/` and say so once. **Never** put the vault in the Vibeman repo.

**2. Materialize the context map as `$CTX_JSON`** — every later `coverage.mjs` call needs it.
Prefer `$PROJECT_PATH/context-map.json` (hyphen; the underscore file is deprecated). If it is
absent or stale, dump the API instead — **to an OS temp dir or under `$PROJECT_PATH`, never into
the Vibeman repo**:

```bash
CTX_JSON="$PROJECT_PATH/context-map.json"
[ -f "$CTX_JSON" ] || { CTX_JSON="${TMPDIR:-/tmp}/vibeman-ctx-$PROJECT_ID.json"; \
  curl -s "http://localhost:3000/api/contexts?projectId=$PROJECT_ID" > "$CTX_JSON"; }
```

`coverage.mjs` accepts either shape (`groups[].contexts[]` or `{data:[…]}`). Delete a temp dump at
session end.

**3. Bootstrap if this is the first run in this project:**

```bash
node "$COV" init \
  --vault "$VAULT" --project "$PROJECT_PATH" --name "$PROJECT_NAME" --contexts "$CTX_JSON"
```

`init` is idempotent — it seeds only what is missing and reports `kept` for what already exists.
It also lists any pre-vault `docs/harness/*` directories in `Scan.md` as **pointers only**; those
are archive, not memory. Nothing parses them.

**4. Read, in this order** (stop at 4 for Pipeline A — it uses `harness-learnings.md` as its
primary memory and only needs the do-not-suggest list from the vault):

1. `$VAULT/Scan/Scan.md` — the headline and the last run's `next:` pointer.
2. `$VAULT/Scan/config.md` — gates, baselines, **`## User taste`**, **`## Do-not-suggest`**.
3. `$VAULT/Scan/patterns.md` — the project's known defect shapes.
4. `$PROJECT_PATH/docs/harness/harness-learnings.md` — structural facts (unchanged role).
5. The most recent `$VAULT/Scan/runs/*.md` — if its `next:` says work was left in flight,
   **announce the resumption point in one sentence and resume there** rather than starting over.
   This is the failure the vault exists to prevent; ascent's 2026-07-16 run left 13 contexts
   undispatched and the next run rescanned all 44.
6. Per-context ledgers are **not** read here — they are read per context at dispatch time by
   `coverage.mjs digest`, which keeps orchestrator context flat regardless of project size.

**5. Open the run note.** Create `$VAULT/Scan/runs/<YYYY-MM-DD>.md` (suffix `-2`, `-3` if the date
is taken) with the pipeline, scope, and `next: <what a session resuming right now should do>`.
Update its `next:` at every phase boundary, not at the end.

**6. Announce.** One sentence: what the vault knows and where this run is starting. For example:
> Vault: 12/16 contexts have ledgers · 4 open findings · 7 rejected (suppressed) · last run
> 2026-07-09 left `next: wave 3 — silent-failure theme`. Resuming there.

---

## Phase 2: Goal Definition

Define what development work to accomplish.

1. **Lightweight project snapshot (always run, ~5 file reads).** Before asking the user for a goal, scan the project just enough to ground any goal question or proposal:
   - Read `PROJECT_PATH/package.json` (or `Cargo.toml` / `pyproject.toml`)
   - Read `PROJECT_PATH/README.md` if it exists
   - List the top level of `src/` (or the main source directory)
   - Read 1–2 obvious entry points (e.g. `src/app/page.tsx`, `src/main.ts`, `src/index.ts`)
   - If a `requirements/` or `docs/` directory exists, peek at the file names — but treat those as **vision documents, not source of truth** unless the codebase actually implements them.

   The purpose of this step is *not* exhaustive context-gathering (that's Phase 4.1) — it's just enough to know what kind of goal is realistic. **When no goals exist, this snapshot lets you propose 3–4 grounded options instead of asking the user blindly.** Track these reads in `FILES_READ`.

2. Check for existing open goals:
```bash
curl -s "http://localhost:3000/api/goals?projectId=PROJECT_ID&status=open" 2>/dev/null
```
Increment `API_CALLS`.

3. If open goals exist, present them:
```
Existing open goals for PROJECT_NAME:
  a. Goal title — description snippet
  b. Another goal — description snippet
  
Pick an existing goal (a/b/...) or describe a NEW development goal:
```

   **If no open goals exist AND the user hasn't specified a goal**, enter **Autonomous Goal Generation** (Phase 2a below) instead of asking blindly. If the user *did* provide a goal description, skip 2a and go to step 4.

4. If the user picks an existing goal, use its title and description. Store the `GOAL_ID`.

5. If the user describes a new goal, create it in Vibeman:
```bash
curl -s -X POST http://localhost:3000/api/goals \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"PROJECT_ID","title":"GOAL_TITLE","description":"GOAL_DESCRIPTION","status":"in_progress"}'
```
Store the returned `GOAL_ID`. Increment `API_CALLS`.

6. **Sanity-check the goal size.** If the goal as worded would obviously require more than 8 tasks, more than 5 directories of changes, or "implement the entire vision document" — push back and ask the user to scope it down before proceeding. A right-sized goal for one pipeline run is 3–8 tasks across ≤5 directories.

7. Ask the user if there are any constraints or target files to focus on. This is optional — if the user says no, proceed with the full project scope.

---

### Phase 2a: Autonomous Goal Generation

When no user-specified goal exists and no open goals are queued, the skill must generate its own goal. This is the core autonomy loop — the skill evaluates the project and decides what work would add the most value.

#### Step 1: Health scan (decides Stabilize vs. Improve)

Run a quick diagnostic to assess whether the project needs *fixing* or is ready for *growth*:

```
Health signals (check all, takes ~30 seconds):
├─ TypeScript errors          → npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
├─ Lint errors                → npx eslint --quiet src/ 2>&1 | grep "error" | wc -l  
├─ Test pass rate             → npx vitest run 2>&1 (if configured)
├─ Open follow-ups count      → count items in harness-learnings.md "Open follow-ups" section
├─ Large files (>400 LOC)     → find src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -5
├─ TODO/FIXME/HACK count      → grep -r "TODO\|FIXME\|HACK" src/ | wc -l
└─ Vision gap                 → compare requirements/ doc sections vs. actual src/ directories
```

**Decision rule:**
- If TypeScript errors > 0 OR test failures > 0 OR lint errors > 5 → **Stabilize** (fix what's broken first)
- If TODO/FIXME count > 10 OR largest file > 600 LOC → **Stabilize** (tech debt is accumulating)
- Otherwise → check **infrastructure readiness** before choosing Improve (see below)

#### Infrastructure readiness check (CRITICAL — runs before Improve)

Before generating feature goals, verify the app has the *structural foundation* to host new features. Features without infrastructure are features users can't find.

Check these in order:
1. **Navigation / routing** — Does the app have more than one route? Is there a header/sidebar with nav links? If the app is a single `page.tsx` monolith with no routing, the #1 goal MUST be "add app shell + route structure" — regardless of what features the backlog contains.
2. **Layout shell** — Is there a shared layout (header, nav, footer) that new pages slot into? If every page is standalone with no common chrome, new features have no home.
3. **Module hosting pattern** — Can you add a new page/section without restructuring existing code? If adding `/contacts` requires refactoring `/` (page.tsx), the layout isn't scalable.

If any of these fail → **the goal is infrastructure, not a feature.** Generate an "app shell + navigation" goal and rank it #1 with confidence=high. This overrides all feature candidates from the Improve Engine.

**Why this rule exists (Run #4 lesson):** The first autonomous run selected "client contact book" — a correct, well-implemented feature that scored 100/100. But the user rejected it because the app had no navigation, no header, no route structure. The contacts were buried inside the invoice form with no standalone access. The feature was technically solid but *undiscoverable*. Infrastructure readiness is the prerequisite that makes features usable.

Present the decision to the user:
```
Health scan: [X] TS errors, [Y] lint errors, [Z/N] tests, [W] TODOs, largest file [F] LOC
Decision: STABILIZE / IMPROVE
Reasoning: [1 sentence why]
```

#### Step 2a: Stabilize Scanner (when health scan says Stabilize)

Systematically scan for concrete improvement targets. Run these greps/checks in parallel:

**Code quality signals:**
1. **Large components** — files > 300 LOC that could be decomposed. `wc -l src/**/*.tsx | sort -rn | head -10`
2. **Duplicated patterns** — grep for repeated code blocks (same function signature in 2+ files, same 5+ line block). `grep -rn "pattern" src/ | sort | uniq -d`
3. **Missing error handling** — async functions without try/catch, fetch calls without error handling. `grep -rn "await.*fetch\|await.*axios" src/ | grep -v "try\|catch"`
4. **Type safety gaps** — any `as any`, type assertions, non-null assertions. `grep -rn "as any\|as unknown\|!\." src/`
5. **Dead code** — exports not imported anywhere, unused variables (eslint can catch these). `npx eslint --rule '{"no-unused-vars":"error"}' src/`
6. **Accessibility gaps** — interactive elements without aria labels, images without alt. `grep -rn "<button\|<a \|<input" src/ | grep -v "aria-\|title=\|alt="`
7. **Performance patterns** — inline object/array creation in JSX props (causes re-renders), missing useMemo/useCallback for expensive computations.

For each finding, record:
```
{ signal: "large-component", file: "path.tsx", line: N, severity: "high|medium|low", description: "..." }
```

**Generate stabilize goals** by clustering findings:
- Group by file/module
- Rank by severity × count
- Generate 3-5 candidate goals, each addressing a cluster
- Each goal should be independently valuable (don't generate goals that only make sense as a set)

#### Step 2b: Improve Engine (when health scan says Improve)

Identify what work would add the most **business value** — not just technical completeness. The Improve Engine has four input sources, checked in priority order. **Impact is the #1 ranking criterion, not confidence.**

**Source 1: Business Domain Scan (highest priority — ALWAYS run this first)**

Before checking follow-ups or code, research what the project's *business domain* actually requires to be viable. This is the single highest-value source because it identifies what makes the product usable for real users, not just technically complete.

For each project, ask: "What would a paying user need from this product that it doesn't have yet?"

Steps:
1. **Research the domain requirements.** Web search for the domain's legal, regulatory, and competitive requirements:
   - For an invoice app: "invoice legal requirements [country]", "mandatory invoice fields EU", "VAT validation API VIES", "invoice numbering rules", "invoice app competitive analysis 2026"
   - For a generic SaaS: "{domain} compliance requirements", "{domain} must-have features for paying users"
2. **Compare against current implementation.** For each requirement discovered, grep the codebase to check if it exists. Record what's missing.
3. **Identify the largest business-value gap.** The gap that, if closed, would move the product closest to being usable by a real paying customer. This is almost always a *business capability* (legal compliance, data validation, workflow automation), not a *UX feature* (theming, animations, polish).
4. **Design an ambitious goal around the gap.** Goals from the domain scan should be 5-8 tasks and address a complete business capability. Examples:
   - "Country-specific invoice compliance: mandatory fields per jurisdiction, VAT ID validation via ARES/VIES, sequential numbering rules"
   - "Client onboarding flow: import contacts from CSV, validate tax IDs against registries, auto-fill from VAT number"
   - "Multi-currency support with live exchange rates and proper decimal handling"

**Why this source is #1 (Run #7 lesson):** Run #7 autonomously selected "PDF theming parity" — a technically correct, well-scoped follow-up item. But the user rejected the *priority*, not the feature. The app was missing core business functionality (legal compliance, registry validation, country-specific rules) that would make it usable for real invoicing. The skill was optimizing for safety (small, vetted follow-ups) instead of value (large, domain-driven capabilities). **Polish doesn't make a product viable; business capabilities do.**

**Source 2: Vision-gap analysis**
If a `requirements/` or design document exists:
1. Read the document's table of contents / section headers
2. For each major section, grep the codebase to check if it's implemented
3. Identify the largest *implementable* gap (something that can ship in 5-8 tasks)
4. Generate 1-2 goals that would close the most impactful gap
5. **Filter: prefer gaps that align with the Business Domain Scan findings.** If the domain scan says "VAT validation is critical" and the vision doc has a section on it, that's a double-signal.

**Source 3: Open follow-ups from harness-learnings.md**
Known gaps left by previous runs. **These are now the LOWEST-priority feature source** (demoted from #1 in skill v3). Follow-ups are typically polish (theming, dialogs, performance optimization) — they matter, but only after core business capabilities are in place. Bundle small follow-ups together into one goal if they collectively justify a run; don't let a single small follow-up consume an entire autonomous run.

**Source 4: Competitive research (web search)**
Search for what competitors do and what users expect. This supplements the domain scan with feature-level ideas. Filter aggressively for feasibility within 5-8 tasks.

**Key shift from earlier versions of this skill:** The ranking used to be confidence > impact. Now it's **impact > confidence**. A high-impact medium-confidence goal (e.g., "add VAT validation via public APIs") beats a high-confidence low-impact goal (e.g., "add confirmation dialogs") every time. The user has confirmed this preference twice (Run #2: "we need more ambitious iterations", Run #7: "goals are too small, leading to non-risky but no high value outcomes").

#### Step 3: Backlog ranking and selection

Combine all candidate goals from Step 2a or 2b into a ranked backlog:

```markdown
## Autonomous Backlog for PROJECT_NAME

| # | Goal | Category | Impact | Confidence | Tasks est. | Source |
|---|------|----------|--------|------------|------------|--------|
| 1 | ... | stabilize/improve | high/med/low | high/med/low | N | follow-up/vision/research/scan |
| 2 | ... | ... | ... | ... | N | ... |
| 3 | ... | ... | ... | ... | N | ... |

**Auto-selected: #N** — [1-sentence reasoning for why this is the highest-value goal right now]
```

**Ranking criteria** (in priority order):
1. **Business impact** — does this move the product closer to being viable for real paying users? Business capabilities (legal compliance, data validation, workflow automation) > UX features (theming, animations) > polish (dialogs, performance tweaks). Ask: "would a freelancer pay for this feature?"
2. **Ambition** — prefer 5-8 task goals that address a complete business capability over 2-3 task goals that close a follow-up item. Small safe goals compound into a polished but unusable product. The user has explicitly asked for ambitious iterations.
3. **Feasibility** — can this ship cleanly in one run? Goals that build on existing infrastructure > goals that require new backends or external services. But don't use feasibility as an excuse to pick small goals — stretch the scope.
4. **Confidence** — how sure are we this is correct? Domain scan findings > vision gaps > follow-ups > competitive research. Note: confidence is #4 now, not #1. A medium-confidence high-impact goal beats a high-confidence low-impact goal.

**Auto-select the #1 goal and proceed** — but present the full backlog so the user can override. If the user is present and interactive, wait for confirmation. If the pipeline is running autonomously (no user interaction expected), auto-proceed with #1 after a 10-second display.

#### Step 4: Goal judgment log (learning loop)

After the run completes (Phase 7), record the autonomous goal decision and its outcome in `docs/harness/goal-judgments.md`:

```markdown
## Run #N — YYYY-MM-DD

**Mode:** stabilize | improve
**Health scan:** X TS errors, Y lint, Z/N tests, W TODOs, largest file F LOC
**Selected goal:** [title]
**Source:** follow-up | vision-gap | web-research | scan
**Confidence at selection:** high | medium | low
**Quality score:** XX/100
**User verdict:** accepted | rejected | modified
**Reasoning (if rejected/modified):** [what the user said about why]

**Lessons for future ranking:**
- [what this run taught about goal selection — e.g. "web-research features need more scoping", "scan findings under 'medium' severity aren't worth a full goal"]
```

This file is the **training data for the skill's judgment**. Over 5-10 runs, patterns emerge:
- Which sources produce accepted goals vs. rejected ones?
- Which confidence levels actually correlate with success?
- What kinds of goals does this specific user/project value?

**Read `goal-judgments.md` at the start of Phase 2a** (alongside harness-learnings) so past decisions inform future ranking. If the log shows a pattern (e.g. "web-research goals are always rejected for this project"), downrank that source automatically.

#### Anti-patterns in autonomous goal generation

- **Don't generate goals that are just "refactor X for cleanliness" unless X is actively causing pain.** Refactoring needs a trigger — a bug, a performance issue, a feature blocked by the current structure. "This file is long" is not enough; "this file is long AND the next feature needs to add to it" is.
- **Don't generate goals from the vision document that skip intermediate steps.** If the vision says "add Supabase backend" but the project has no API routes yet, the goal should be "add first API route" not "integrate Supabase."
- **Don't stack stabilize goals.** If the last 2 runs were both stabilize, force an improve goal even if the health scan suggests more stabilization. The project needs momentum, not just polish.
- **Don't generate goals that duplicate what harness-learnings says is DONE.** Always check the struck-through items before proposing.
- **Web research goals must be grounded in the project's current state.** "Add AI-powered OCR" is not a valid goal if the project has no backend and no AI dependencies. Filter aggressively for feasibility.
- **Don't add features to a monolith.** If the app is a single page with no navigation, adding a new feature just buries it deeper. The first goal must be infrastructure (app shell, routes, nav), then features. A technically perfect feature that users can't find is a failed goal.
- **Don't prioritize polish over product viability.** Follow-up items (theming, dialogs, performance) are polish. They don't make the product viable for real users. If the product is missing core business capabilities (legal compliance, data validation, workflow automation), those MUST come before polish. Ask: "would a freelancer pay for this?" If no, it's polish.
- **Don't default to the safest goal.** Small, well-scoped follow-up items always feel "right" because they're low-risk. But compounding safe goals produces a polished product nobody can use. Prefer ambitious business-capability goals (5-8 tasks) over safe polish goals (2-3 tasks). The user has explicitly asked for this twice.

---

## Phase 3: Baseline Capture

Before any work, measure the project's current health state.

1. Run TypeScript check:
```bash
npx tsc --noEmit 2>&1 | tail -5
```
Record baseline error count. Increment `TSC_RUNS`.

2. Run tests if configured:
```bash
npx vitest run --reporter=verbose 2>&1 | tail -10
```
Record baseline pass/fail count.

3. Store baseline metrics for comparison in Phase 6.

---

## Phase 4: Plan

Analyze the codebase and generate a task plan.

### 4.1 Gather Context

1. **Load accumulated learnings FIRST.** Read `docs/harness/harness-learnings.md` if it exists. This file records structural facts about the codebase discovered by prior runs (existing modules, conventions, tables, anti-patterns) — having it in hand before the other steps prevents re-discovering the same things from scratch.
2. Read `PROJECT_PATH/package.json` to understand the tech stack
3. Read `PROJECT_PATH/tsconfig.json` if it exists
4. Use Glob to discover the project structure:
   - `src/**/*.ts` and `src/**/*.tsx` for source files
   - `tests/**/*.test.ts` for test patterns
5. If target files were specified in Phase 2, read those files in full
6. Otherwise, read key entry points (main layouts, app entry, API routes relevant to the goal)

Track all files read in `FILES_READ`.

### 4.1b Host-infrastructure-first grep (CRITICAL)

Before generating any tasks, grep for the **category of host infrastructure** the goal would attach to. This catches existing-but-undocumented surface area in one grep and typically reframes the planned scope by 30-60%.

Examples:
- Goal mentions a new HTTP endpoint? `Grep "axum::|express|fastify|Router\.|router\.\w+\("` to find existing HTTP server setup
- Goal mentions a new database table? `Grep "CREATE TABLE.*<related_concept>"` in migrations or schema files
- Goal mentions a new background job? `Grep "setInterval|setTimeout|cron|Worker|queue"` to find existing job runners
- Goal mentions auth/middleware? `Grep "middleware|auth.*check|requireAuth|session"` to find existing patterns
- Goal mentions a new config file? `Grep "loadConfig|\.env|dotenv|config\." ` to find existing config loading

**A single discovery here typically reframes 2-4 planned tasks at once** — what looked like "build new infrastructure" becomes "add to existing router" / "extend existing table". Do this before writing any task.

If the host-infrastructure grep returns zero hits AND the goal involves an HTTP/IPC/external surface, **escalate**: either the feature requires building foundational infrastructure (bigger scope than a normal goal) OR the existing infrastructure is missing a standard defense (auth, sandbox, rate limit). Surface the finding to the user before generating tasks.

### 4.1c Prefix-namespace grep

When the host-first grep finds a relevant entity (table, module, class), immediately grep for all entities with the same prefix. E.g., if you find a `users` table, grep for `CREATE TABLE.*user_` — there's almost always more structure around it (`user_sessions`, `user_settings`, `user_preferences`). Missing the related entities leads to tasks that violate existing invariants.

### 4.1d Already-existed check

For each planned feature in the goal, grep the codebase to check whether it already exists (even partially). Common pattern: a goal says "add X feature" and 30-50% of X is already implemented in a file the user didn't mention. Before planning, verify by grepping for:
- Function/method names that would be part of the feature
- Strings/constants specific to the feature
- File names in directories the feature would live in

If **50%+ of the feature already exists**, do NOT generate tasks as if starting from zero. Rescope the goal to "finish/extend existing X at `file.ts:line`" and present the rescoping to the user as part of Phase 4.4 approval. Track already-existed findings in a running note for the Phase 7 report.

**This rule alone has historically caught 30-40% of planned work across similar skills** — don't skip it.

### 4.1e Escalation report (when host-first / already-existed grep finds something consequential)

If steps 4.1b–4.1d surface a finding that **materially changes the goal's scope, approach, or feasibility**, stop and present an escalation report to the user *before* generating tasks. Do NOT silently rescope and proceed — the user needs to make the call.

Use this mini-template:

```markdown
### Phase 4.1 finding (escalating)

**What I expected based on the goal as worded:**
[1–2 sentences]

**What the codebase actually contains:**
- [confirmed fact 1, with file:line]
- [confirmed fact 2]
- [confirmed fact 3]

**Why this changes the plan:**
[1–2 sentences explaining the consequence — e.g. "the goal assumes X, but Y is missing, so the work is actually 2 layers, not 1"]

**Options:**

| Option | Approach | Tasks | Pros | Cons |
|---|---|---|---|---|
| A. [name] | [1-line summary] | N | [...] | [...] |
| B. [name] | [1-line summary] | N | [...] | [...] |
| C. [name] | [1-line summary] | N | [...] | [...] |

**My recommendation:** [A/B/C], because [reason — usually risk vs. value tradeoff].

**Decision needed:** Pick A/B/C, or describe a fourth path. I'll generate the task list once you choose.
```

When to escalate vs. when to silently adapt:
- **Silently adapt** when the finding is small (e.g. file is in a slightly different location, function has a slightly different name). Just adjust the plan and note it in Phase 7's "already-existed catches".
- **Escalate** when the finding changes the *number* of tasks, the *kind* of work, or whether the goal is feasible at all. The user wrote the goal assuming a mental model of the codebase; if that model is wrong, they need to know before you commit a plan.

A good rule of thumb: if you'd find yourself writing "actually, the goal needs to be rescoped to..." in Phase 4.4, you should have escalated in 4.1e instead.

### 4.2 Consult Brain (Optional)

If the goal is non-trivial, check what the Brain knows:
```bash
curl -s "http://localhost:3000/api/brain/context?projectId=PROJECT_ID" 2>/dev/null
```
Increment `API_CALLS`. Use any behavioral insights to inform the plan.

### 4.3 Generate Task List

Based on the codebase analysis and goal, create a task list. Each task must have:

- **Title**: concise action statement (imperative)
- **Description**: what specifically to implement/change
- **Target Files**: which files to create or modify (max 5 per task)
- **Complexity**: 1 (simple, <50 LOC), 2 (moderate, 50-200 LOC), 3 (complex, 200+ LOC)
- **Dependencies**: which tasks must complete first (by index)

Guidelines:
- Aim for **3-8 tasks** per goal
- Order tasks so dependencies come first
- Keep scope tight — max 5 files per task, max 3 directories
- Foundation-first: if baseline has TypeScript errors, task 1 must fix them

Set `TASKS_PLANNED` to the number of tasks.

### 4.4 Present Plan for Approval

Present the plan as a numbered task list:

```
## Development Plan for: GOAL_TITLE

Tasks:
1. [C1] Task title — target: path/to/file.ts
2. [C2] Task title — target: path/to/component.tsx, path/to/route.ts
   depends on: #1
3. [C1] Task title — target: path/to/test.ts
   depends on: #1, #2

Estimated scope: N files across M directories
```

**CHECKPOINT**: Ask the user to approve the plan before proceeding. If the user wants changes, revise and re-present. Do NOT proceed to implementation without explicit approval.

### 4.5 Design review (CRITICAL — runs after plan approval, before implementation)

Before writing any code, step back and answer these strategic questions about the approved plan. Each question must get a concrete answer, not "N/A." If answering reveals a gap, update the task list before proceeding.

**Data completeness:**
- For each external API the plan calls: *what fields does the API actually return?* Research the response schema, not just that the endpoint exists. Map every returned field to a domain requirement. If the API returns data the plan ignores, ask whether that data is legally or functionally required.
- For each new type/interface: *does it capture everything the domain requires?* Not just what's convenient to implement — what would a lawyer, accountant, or paying customer expect?

**Surface coverage:**
- For each new user-facing action (button, API call, feature): *list every place in the app where a user would expect this action to be available.* If the plan only wires it into one surface but 2+ surfaces exist, add tasks for the others. The test: "a user who discovers this feature on page A would be confused that it's missing on page B."

**UI quality:**
- For each new interactive element: *what visual treatment does it deserve relative to the feature's importance?* A core business feature (VAT lookup) should not be styled like a secondary link. Match the visual weight to the feature's value. If the plan doesn't specify styling for a new interactive element, add it to the task description.

**Integration coherence:**
- After the plan is complete, *walk through the user's workflow end-to-end.* Start from "I open the app" and trace through every action the user would take that touches the new feature. Are there dead ends, missing connections, or surprising omissions?

**Why this step exists (Run #8 lesson):** Run #8 autonomously selected the right goal (invoice compliance) and implemented 8 tasks that all passed quality gates. But the execution had three strategic gaps: (1) VAT lookup returned rich data that was thrown away because nobody researched the response schema, (2) the lookup was wired into InvoiceForm but not the contacts page where users actually manage contacts, (3) the lookup button was unstyled bare text that didn't communicate its value. All three gaps would have been caught by asking the design review questions above before writing code. **Technical correctness is necessary but not sufficient — design coherence is what makes features feel complete.**

---

## Phase 5: Implement

Execute each task in dependency order.

### For each task:

1. **Read** the target files to understand current state. Increment `FILES_READ`.
2. **Implement** the changes using Edit, Write tools
   - Follow existing code patterns visible in the project
   - Maintain consistent naming conventions
   - Add proper TypeScript types — no `any` unless absolutely necessary
   - Include error handling for edge cases
   - Track `FILES_CREATED`, `FILES_MODIFIED`, `LINES_ADDED`, `LINES_REMOVED`
3. **Type check** after each task:
```bash
npx tsc --noEmit 2>&1 | head -30
```
Increment `TSC_RUNS`. If errors found and fixed, increment `TSC_ERRORS_FIXED`.

4. If the build fails, fix the errors immediately before moving to the next task. Do not skip broken builds.

5. **Commit** after each successful task (scope to the target repo — never the Vibeman cwd):
```bash
git -C "$PROJECT_PATH" add <changed-files>
git -C "$PROJECT_PATH" commit -m "vibeman: <task title>"
```
If the project is on its default branch (`master`/`main`), create a working branch with `git -C "$PROJECT_PATH" checkout -b vibeman/<goal-slug>` before the first commit, so the project's main branch stays clean. Increment `COMMITS_MADE`. Mark task as `TASKS_COMPLETED`.

6. **Report progress**: After each task, briefly state what was done and the build status.

If a task fails after 3 fix attempts, mark it as `TASKS_FAILED` and move on.

### Implementation Rules

- **Respect target files**: Only modify files listed in the task's target files (create new files if needed)
- **Follow patterns**: Match the project's existing conventions for imports, exports, error handling
- **No gold-plating**: Implement exactly what the task describes, nothing more
- **Fix forward**: If you discover a problem during implementation, fix it in the current task or note it as a follow-up
- **Non-goals** (do NOT do any of these without explicit user approval):
  - Do NOT modify CI/CD configs, `.github/workflows/`, or deployment scripts
  - Do NOT change package dependencies (`package.json`, `Cargo.toml`) beyond what the task explicitly requires
  - Do NOT delete existing tests, even if they appear unrelated — flag them as questionable instead
  - Do NOT touch auth, credential, or secret-handling code unless the goal is explicitly about it
  - Do NOT rename public APIs, exported functions, or database columns without checking all callers
  - Do NOT commit changes to files outside the task's declared target files
- **Security check on privileged surfaces**: When the task touches an HTTP endpoint, IPC command, webhook receiver, or subprocess spawn site, grep for auth/sandbox patterns (`auth|middleware|requireAuth|Bearer|sandbox|--dangerously`) in the target file BEFORE implementing. If the grep returns zero hits, surface the finding to the user as a security risk before proceeding — do not silently add a new unprotected endpoint or spawn site.

### Stuck-escape-hatch

If a task fails after 3 fix attempts:
1. Mark it as `TASKS_FAILED` (existing rule).
2. Write a short note to `docs/harness/followups-{YYYY-MM-DD}.md` describing what was attempted, what failed, and what the next session should try. This creates a breadcrumb so future runs can pick up without re-discovering the same dead end.
3. Continue with the next task. Do not block the pipeline.

---

## Phase 6: Verify

Run quality checks and compute a confidence score.

### 6.1 Build Verification
```bash
npx tsc --noEmit 2>&1
```
Increment `TSC_RUNS`. **For Next.js projects, also run a full production build** — `tsc` only checks types, but `next build` validates the SSR/client boundary, `"use client"` directives, webpack/turbopack module resolution, and prerender behavior. These are real failure modes that `tsc` cannot catch (e.g. importing a browser-only library from a server component, or a use-client file that accidentally pulls in a server-only module).

```bash
# Only for Next.js projects (skip for other stacks)
npx next build 2>&1 | tail -40
```

Score: **+25 points** if both `tsc` and (when applicable) `next build` pass; **0** if either fails. For non-Next.js projects, run the project's equivalent (`cargo build`, `vite build`, `tsc -p .`, etc.) — the principle is "the actual build the project ships, not just the type checker".

### 6.2 Test Verification
```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```
Set `TESTS_RUN` to true. Record `TESTS_PASSED` and `TESTS_TOTAL`.

Score (split into two halves):
- **+15 points** if a test runner is present and configured (vitest.config, jest.config, cargo test, etc.). **+0** if no runner exists — absence of tests is neutral, not rewarded.
- **+15 points** if all tests pass, scaled by pass rate if some fail. If no runner exists, this half is **+0**.

This means projects with no test runner cap at 0/30 for this gate. If a project *should* have tests but doesn't, the score will honestly reflect that gap — and Phase 7 should nudge "add test infrastructure" as a follow-up goal.

### 6.3 Lint Verification
```bash
git diff --name-only HEAD~N 2>/dev/null | grep -E '\.(ts|tsx)$' | head -20
```
Then lint the changed files:
```bash
npx eslint --quiet <changed-files> 2>&1 | tail -20
```
Score: **+20 points** if no lint errors, scaled if some fail. If no ESLint configured, award **+10 points**.

### 6.4 Change Review
```bash
git diff HEAD~N 2>/dev/null | head -200
```
Review the diff:
- Does the code match the goal? +15 points if yes
- Any obvious bugs, missing imports, dead code? Deduct proportionally

### 6.5 Regression Check
Compare against Phase 3 baseline:
- Did TypeScript errors increase? Flag regression.
- Did test pass rate decrease? Flag regression.

### 6.6 Task Completion
Score: **+10 points** if all tasks completed, scaled by `TASKS_COMPLETED / TASKS_PLANNED`.

### 6.7 Compute Total
Sum all scores for a **Quality Score (0-100)**.

### 6.8 Record structural learnings (write-back to `harness-learnings.md`)

If this run discovered any **structural fact** about the codebase that future runs would need to know, append it to `docs/harness/harness-learnings.md`. Examples of structural facts worth capturing:

- A module, table, or feature existed that wasn't obvious from the file tree
- An architectural boundary (e.g. "X lives in the plugin layer, not core")
- A convention the code enforces but isn't documented (e.g. "all X types must derive Y")
- A constraint discovered the hard way (e.g. "Z must come before W in the init sequence")
- A "catalog vs runtime" distinction where a count looks bigger than it really is per execution

Do NOT capture:
- One-off bug fixes (that's what git log is for)
- Personal preferences unique to this run
- Transient state (in-progress branches, scratch files)
- Anything already documented elsewhere (check the file first)

Format: the file should have at least these three sections (add them if missing on first run):

```markdown
# {project} — harness learnings

## Structural facts
- **YYYY-MM-DD** — [fact, with file:line if applicable]

## Conventions enforced
- [convention discovered or established]

## Anti-patterns to avoid
- [pattern + the cost it incurred]

## Open follow-ups (from Run #N, YYYY-MM-DD)
- [thing the goal explicitly did not do, but that future runs need to know about]
```

Keep each bullet under 3 lines. Link to the file/line that surfaced the fact whenever possible.

**Why "Open follow-ups" matters**: every run will deliberately leave some work undone (out of scope, deferred, blocked). If those decisions aren't captured in the learnings file, the next run will either (a) re-flag them as new findings or (b) accidentally re-implement them in a slightly different way. A formal "Open follow-ups (from Run #N)" section keeps this list current and prevents both failure modes.

This step exists because structural facts discovered during implementation are otherwise lost — the next run will re-discover them from scratch. A small, disciplined write-back compounds into a living reference that shortens every future Phase 4.1.

### 6.8b Update goal judgment log (when Phase 2a was used)

If this run's goal was autonomously generated (Phase 2a), record the decision and outcome in `docs/harness/goal-judgments.md`. See Phase 2a Step 4 for the format. This file is the training data for improving autonomous goal selection over time — skip it only if the user explicitly provided the goal.

### 6.9 Record Brain Signal
```bash
curl -s -X POST http://localhost:3000/api/brain/signals \
  -H 'Content-Type: application/json' \
  -d '{
    "projectId": "PROJECT_ID",
    "signalType": "implementation",
    "data": {
      "requirementId": "GOAL_ID",
      "requirementName": "GOAL_TITLE",
      "success": QUALITY_SCORE >= 70,
      "filesCreated": ["list of created files"],
      "filesModified": ["list of modified files"],
      "filesDeleted": [],
      "executionTimeMs": DURATION_MINUTES * 60000
    }
  }'
```
Increment `API_CALLS`. **Note**: the brain API requires `requirementId` (string) — pass the goal ID from Phase 2 here. `requirementName` is optional metadata. If the request fails (e.g. schema mismatch), log the error and continue — brain signals are enhancement, not critical path.

---

## Phase 7: Report

Present a comprehensive achievement report with all tracked metrics.

```markdown
# Vibeman Pipeline Report

## Goal
**GOAL_TITLE**
Project: PROJECT_NAME | Quality: XX/100 | Grade: A/B/C/D/F

---

## Execution Summary

| Metric | Value |
|--------|-------|
| Tasks planned | TASKS_PLANNED |
| Tasks completed | TASKS_COMPLETED |
| Tasks failed | TASKS_FAILED |
| Completion rate | TASKS_COMPLETED/TASKS_PLANNED (XX%) |

## Code Changes

| Metric | Value |
|--------|-------|
| Files created | FILES_CREATED |
| Files modified | FILES_MODIFIED |
| Files deleted | FILES_DELETED |
| Files read | FILES_READ |
| Lines added | ~LINES_ADDED |
| Lines removed | ~LINES_REMOVED |
| Net change | +/- LINES |

## Already-existed catches (host-first rule payoff)

List each planned task or subtask that was caught during Phase 4.1b-d as already implemented (fully or mostly), so the scope was reduced or reframed:

- [if any] "Add X endpoint" → already exists at `file.ts:line` — rescoped to "extend existing endpoint"
- [if any] "Create Y table" → already in migrations as `y_table` — rescoped to "add column to existing table"
- [if none] No already-existed catches this run.

This section is not purely cosmetic — a high catch rate here is a signal that the goal was underspecified or that the project's context drifted since the last run. Consider updating `harness-learnings.md` when catches happen.

## Quality Gates

| Gate | Result | Score |
|------|--------|-------|
| TypeScript | 0 errors (N runs, M errors fixed) | 25/25 |
| Tests | TESTS_PASSED/TESTS_TOTAL passing | XX/30 |
| Lint | clean / N warnings | XX/20 |
| Review | matches goal / has issues | XX/15 |
| Completion | XX% tasks done | XX/10 |
| **Total** | | **XX/100** |

## Baseline Comparison

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| TypeScript errors | N | M | +/- |
| Tests passing | N/M | N/M | +/- |

## Tasks Detail

1. [completed] Task title
   - N files changed, ~M lines
   - Commit: abc1234

2. [completed] Task title
   - N files changed, ~M lines
   - Commit: def5678

3. [failed] Task title (if any)
   - Reason: description of failure

## Process Metrics

| Metric | Value |
|--------|-------|
| Duration | ~DURATION_MINUTES minutes |
| Git commits | COMMITS_MADE |
| tsc invocations | TSC_RUNS |
| TS errors fixed | TSC_ERRORS_FIXED |
| Vibeman API calls | API_CALLS |

## Files Changed

### Created
- path/to/new-file.ts

### Modified
- path/to/existing-file.ts

## Commits
- `abc1234` vibeman: task 1 title
- `def5678` vibeman: task 2 title
```

### Post-Report Actions

If **Quality Score >= 70**: Offer:
- "Run another goal on this project?"
- "Switch to a different project?"

If **Quality Score < 70**: Offer refinement:
- "Quality below threshold. Run a refinement pass to fix issues?"
- If yes, return to Phase 4 with focus on fixing the identified problems.

Update goal status if user agrees:
```bash
curl -s -X PUT http://localhost:3000/api/goals \
  -H 'Content-Type: application/json' \
  -d '{"id": "GOAL_ID", "status": "done"}'
```

---

# Pipeline B — Scan + Triage + Implementation

The audit pipeline. User picks a scan agent, a context scope, and the skill produces a triage INDEX over the codebase, then runs wave-based fix sessions until the user pauses. Battle-tested in the 2026-04-27 personas bug-hunt that closed 49 findings across 7 themed waves with 0 regressions.

Pipeline B counters track different things from Pipeline A. Maintain throughout:

- `SCAN_TYPE` — the agent prompt slug used (e.g. `bug-hunter`)
- `CONTEXTS_SCANNED` — number of contexts the scan covered
- `FILES_READ_SCAN` — approximate files read by all scan subagents combined
- `FINDINGS_TOTAL` / `FINDINGS_CRITICAL` / `FINDINGS_HIGH` / `FINDINGS_MEDIUM` / `FINDINGS_LOW`
- `WAVES_COMPLETED` — number of fix waves the user approved + completed
- `FIXES_COMMITTED` — total findings actually closed across all waves
- `FILES_MODIFIED_FIX` — number of unique source files touched
- `TSC_RUNS_FIX` / `TESTS_RUNS_FIX`
- `PATTERN_CATALOGUE_SIZE` — running count of durable patterns extracted across waves

## Phase B1: Scan Configuration

After Phase 1 (project selection), gather scan parameters.

### Scan-type registry

Discover available scan agents from the Vibeman prompts registry. This skill ships **inside the Vibeman repo** (`.claude/skills/vibeman/`), and the registry lives at `src/lib/prompts/registry/agents/*.ts` relative to that repo root — so when `/vibeman` is invoked from the Vibeman working directory the relative path resolves directly. **Do NOT hardcode a home-directory path** (`C:/Users/<name>/...`); it breaks on every other machine.

Prefer Glob (independent of cwd):

```
Glob: src/lib/prompts/registry/agents/*.ts
```

If that returns nothing (you're running from a different cwd), fall back to `Glob **/lib/prompts/registry/agents/*.ts`, then `ls src/lib/prompts/registry/agents/*.ts 2>/dev/null`. If still nothing, ask the user for the Vibeman repo path.

Read the `name` and `description` fields from each `.ts` file. Present them as a numbered list:

```
Available scan types:
1. bug-hunter — elite systems failure analyst (latent failures, race conditions,
   edge cases, silent failures)
2. <other-agents-as-discovered>
```

If `` was given (e.g. `/vibeman bug-hunter`), match it against agent slugs and skip the prompt.

### Context scope — coverage-driven (B1.5)

`$CTX_JSON` was resolved in Phase 1.5. Rank the contexts by staleness rather than asking the user
to pick blind:

```bash
node "$COV" plan \
  --vault "$VAULT" --project "$PROJECT_PATH" --contexts "$CTX_JSON" \
  --lens "<scan-slug>" --budget "<session context budget from config.md>"
```

The ranking is `lens gap + age + churn-since-last-same-lens-scan + open-finding pressure +
reach − yield decay` (formula and rationale: `SCAN-MEMORY.md`). The dominant term is churn: **a
context whose files have not changed since a scan with this same lens is near-zero value to
re-scan**, and the script says so in the `Why` column.

Present the ranked table and the selection, then ask:

```
Coverage plan — <scan-slug> over N contexts (budget: B)

  <the plan table: Context | Files | Chg | Last (this lens) | Open | Yield | Score | Why>

Selected (B): <names>
Skipped  (S): <names + why — mostly "unchanged since last scan">

Scope?
  a. Take the plan (recommended)
  b. All contexts — ignore coverage (full re-audit; say why, it is usually not what you want)
  c. Specific group(s) or context(s)
  d. Custom file globs (advanced)
```

Rules:
- **Default to (a).** "All contexts" is the old behaviour and is what produced five cold-start
  scans of ascent; keep it available but never silently.
- **Never truncate silently.** If the budget cuts the list, name the skipped contexts in the
  message and in the run note. A silent cap reads to the user as full coverage.
- If the user picks (b) with a large project, warn about the session-limit failure mode — that is
  exactly how ascent's 2026-07-16 run died at 31/44 — and offer to split across two runs, with the
  vault carrying the boundary.
- Store the selected contexts as `SCAN_CONTEXTS` and set `CONTEXTS_SCANNED` = its length.

For each context, ALSO ask scope-within-context:

```
Side scope (per context):
  i. Client-side only (descope src-tauri/) — typical for frontend audits
  ii. Backend only (src-tauri/ only) — for Rust audits
  iii. Both — full-stack audit
```

Store as `SCAN_SCOPE_FILTER` (a function that filters a context's `filePaths` to the requested side).

### Output directory

Create `PROJECT_PATH/docs/harness/<scan-slug>-<YYYY-MM-DD>/` (e.g. `bug-hunt-2026-04-27/`). Subagent reports go inside; `INDEX.md` and `FIXES-WAVE-N.md` files live alongside.

### Findings target

Ask the user (or default by scan type):

```
Findings target per context: [6-15 default]
Total expected across N contexts: ~N×10 findings.
```

Set `FINDINGS_TARGET_LO` / `FINDINGS_TARGET_HI` for the per-context-subagent prompt to reference.

## Phase B2: Health Snapshot

Same as Phase 3 of Pipeline A: capture `tsc --noEmit` error count, `vitest run` pass count, `eslint` error count. Store as baseline for Phase B7's regression check.

## Phase B3: Parallel Scan Dispatch

The core of the pipeline.

**Write the shared brief once.** Everything identical across contexts — the role prompt, the
weighting rules, the output format, the READ-ONLY rules — goes into `<output-dir>/_SCAN-BRIEF.md`,
and each subagent is told to read it. Only the per-context parts go in the prompt. (Earlier runs
invented this file mid-flight because pasting a 3 KB role prompt 44 times is untenable; it is now
part of the procedure.)

**Build the prior-coverage digest per context — this is the step that stops rescanning.**

```bash
node "$COV" digest \
  --vault "$VAULT" --project "$PROJECT_PATH" --contexts "$CTX_JSON" \
  --slug "<context-slug>" --lens "<scan-slug>"
```

Paste the output **verbatim, above the role prompt** in that context's subagent prompt. It carries
already-fixed findings (so they are not re-reported), the user's rejections **in the user's own
words** (so they are not re-proposed), open findings with a confirm-or-retire contract, known-clean
paths, the project's pattern catalogue, and the list of files that changed since the last same-lens
scan. Never paraphrase it and never drop the rejected block.

For each context in scope, spawn a `general-purpose` subagent with:

- **Prior-coverage digest**: the `coverage.mjs digest` output, verbatim, first in the prompt
- **Role prompt**: via `_SCAN-BRIEF.md` — the chosen agent's role/expertiseAreas/focusAreas/dontInstructions (read from the `.ts` registry file)
- **Project context**: project name, tech stack, working directory
- **Context name + description**: from the Vibeman API response
- **Scope filter**: the `filePaths` from the context, run through `SCAN_SCOPE_FILTER` so src-tauri/ is dropped if user picked client-side-only
- **Findings target**: `FINDINGS_TARGET_LO`–`FINDINGS_TARGET_HI` — **for NEW ground only.** Confirming an open finding does not count toward it, and a context with no churn since its last scan is expected to come back under target. Say so explicitly, or the agent pads.
- **Output path**: `<output-dir>/<context-slug>.md`
- **Output format**: structured markdown with `## N. <title>`, `- **Severity**:`, `- **Category**:`, `- **File**:`, `- **Scenario**:`, `- **Root cause**:`, `- **Impact**:`, `- **Fix sketch**:`
- **Reply format**: under 150 words — file slug used, total findings, severity breakdown, 1-line summary of the most critical, approx files read, **plus two mandatory lines**:
  ```
  Confirmed open: #11, #14      (or "none")
  Retired: #09                  (or "none")
  ```
  These let the orchestrator update the ledger without reading the report.

**Wave size**: max 8 parallel subagents. Group contexts into waves of ≤8. After each wave completes, dispatch the next.

**Why this shape works**: each subagent runs in isolation, writes one file, replies with terse stats. The orchestrator (this skill) doesn't read the per-context reports during scanning — only the reply summaries — keeping orchestrator context manageable across 17+ scans.

**Track dispatch state in the run note after every wave** — `dispatched / returned / failed / pending`, by context slug, plus a refreshed `next:`. A session that dies mid-scan must be resumable to the context, not to the run. Do not defer this to the end; the deferral is the bug.

After every wave returns, accumulate `FILES_READ_SCAN` and findings-count stats from the replies,
and apply the `Confirmed open` / `Retired` lines to the ledgers: confirmed rows get their date
bumped, retired rows move to Fixed with the note `retired — no longer present` (no SHA).

## Phase B4: Triage Compilation (INDEX.md)

Once all subagents have completed, produce the triage `INDEX.md`.

### Verify findings counts two ways

1. Grep `^> Total:` headers across all `*.md` files in the output dir. Sum.
2. Grep `^- \*\*Severity\*\*:` bullets across all `*.md` files. Count.

Both numbers must match. If they don't, surface the discrepancy and ask the user before continuing — likely indicates a malformed report.

### Reconcile against the ledger (new vs known)

Before building the INDEX, classify every finding against its context ledger:

- **New** — no ledger row describes this defect. Allocate the next `#NN` from the ledger's
  `next_id` and append it under `## Open / deferred` with status `open`.
- **Known-open** — matches an existing open row. Bump its date; do **not** count it as new.
- **Regression** — matches a `Fixed` row. This is a high-signal event: something shipped and came
  back, or the fix was incomplete. Flag it prominently in the INDEX with the original commit SHA;
  regressions outrank same-severity new findings in wave planning.
- **Should-have-been-suppressed** — matches a `Rejected` row. The digest failed. Drop the finding,
  do not show it to the user, and note the leak in the run note — it means the digest needs the
  rejected item's root cause, not just its title.

Match on meaning, not string equality: ascent's `global-error` defect was phrased three different
ways across three months and would have escaped any exact-match rule. Report the tallies:
`N findings — X new, Y confirming known-open, Z regressions, W suppressed`.

### Build INDEX.md

The INDEX has these sections in order:

```markdown
# <ScanType> Scan — <Project>, <Date>

> <One-line description of scan>
> <N> parallel subagent runs, batched in waves of <wave-size>.

---

## Totals

| | Critical | High | Medium | Low | **Total** |
|---|---:|---:|---:|---:|---:|
| Across N contexts | C | H | M | L | **T** |
| Share | C/T% | H/T% | M/T% | L/T% | 100% |

---

## Per-context breakdown

(Sorted by criticals desc, then by total)

| # | Context | Critical | High | Medium | Low | Total | Report |
| ... |

---

## All N critical findings — one-line summary

Sorted into themes for triage. Each item links to its full entry in the per-context report.

### A. <Theme name detected from grouping>
1. **<Context> — <Title>** — <one-line scenario summary>. `<file:line>`
...

---

## Triage themes

11+ themes detected by clustering finding categories + descriptions. Format:

| Theme | Approx count | Why this is a wave, not just individual fixes |
|---|---:|---|

---

## Suggested next-phase split

A 5-7 wave plan organising the findings by theme. Each wave should be sessionable
(roughly 5-7 fixes) and share a mental model so the fixes compound.

---

## How this scan was run

(Provenance: scanner prompt id, date, scope, method, file-read counts, verification)
```

The themes are detected by clustering on the `Category:` field across reports plus keyword similarity in titles/scenarios. Common buckets seen in practice: stale-closure-during-async, optimistic-update-without-rollback, cleanup-gap, silent-success-theater, race-window, time/timezone, divide-by-zero, secret-leak.

## Phase B5: Approval Gate

Display the INDEX summary to the user, **led by the memory delta** — it is the fastest way for
them to see the scan was not a repeat:

```
Scan complete. <N> findings across <M> contexts.
  <X> new · <Y> confirming known-open · <Z> REGRESSIONS · <W> suppressed as previously-rejected
  Contexts skipped as unchanged since their last <lens> scan: <S>

  Critical: <C>    High: <H>    Medium: <Med>    Low: <L>

Regressions (previously fixed, back again):
  1. <one-liner> — originally fixed in <sha>

Top criticals:
  1. <one-liner>
  2. <one-liner>
  ...

Themes (suggested fix-wave split):
  Wave 1 — <theme> (<count> findings)
  Wave 2 — <theme> (<count> findings)
  ...

Proceed with Wave 1 now? Or pause for review?
```

**Capture rejection reasons here.** If the user declines findings at this gate, ask **once, in one
batched question**, why — per-item or one overall reason, with `skip` allowed. Write each declined
finding to its ledger's `## Rejected` section with the user's own words as the `>` annotation.
These reasons are the highest-value bytes in the vault: they are what stops the next scan
re-proposing the same thing, and a rejection recorded without a reason is nearly worthless
(`coverage.mjs verify` flags reasonless rejections).

If user pauses, write the INDEX, flush the ledgers and the run note's `next:`, and stop. A future
session resumes from Phase 1.5's recall, not from a re-scan.

## Phase B6: Wave-Based Implementation Loop

The user-driven fix loop. Each wave is one focused session (5-7 findings, single mental model).

For each wave:

### B6.1 — Wave planning

Ask user (or recommend based on the INDEX):

- **Scope**: pick a theme | pick severity (e.g. all criticals) | pick specific finding ids
- **Size**: recommend 5-7 findings per wave; warn if user picks >10 (context exhaustion risk)

Create a TaskCreate entry per planned fix.

### B6.2 — Per-fix loop

For each finding:

1. **Read the source finding** from the per-context report file (grep the heading `^## N\. ` to find the right one; read the surrounding 10-15 lines).
2. **Read the target source file(s)** at the line-range given in the finding.
3. **Apply the fix** with Edit/Write following the `Fix sketch` as guidance.
4. **Run `npx tsc --noEmit`** and grep for errors in the changed files. If any, fix-forward in the same task; do NOT move on with TS errors.
5. **Atomically commit** with this message structure:

```
fix(<scope>): <one-line summary>

<2-4 sentence body explaining the scenario, the root cause, and what the fix
does. Reference what the prior buggy behaviour was so future readers can recover
the context without re-running the scan.>

Refs: docs/harness/<scan-slug>-<date>/<context-slug>.md finding #N

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

6. **Move the ledger row to `## Fixed` with the commit SHA, in the same turn as the commit.**
   One line in `$VAULT/Scan/contexts/<slug>.md`; the `#NN` id never changes. Doing this per-fix
   rather than per-wave is deliberate — a session killed mid-wave otherwise loses the record of
   fixes that are already on disk, and the next scan re-reports them.

7. **Mark the TaskUpdate completed** and move to the next.

### B6.3 — Wave verification

After all fixes in the wave are committed:

1. Full `npx tsc --noEmit` — must be 0 errors (matches Phase B2 baseline).
2. Full `npx vitest run` — pass count must match Phase B2 baseline. If a single test fails, re-run once to check for flake; if it persists, investigate.
3. Optional `npm run lint` if the wave touched many files.

Surface any regressions; fix-forward before declaring the wave done.

### B6.4 — Wave summary doc

Write `<output-dir>/FIXES-WAVE-<N>.md` with:

```markdown
# <Scan> Fix Wave <N> — <Theme name>

> <X> commits, <Y> findings closed.
> Baseline preserved: <prior counts> → <after counts>.

## Commits

| # | Commit | Findings closed | Severity | Files |
| ... |

## What was fixed (grouped by sub-pattern)

1. **<Title>** — <2-3 sentence narrative including the bug + the fix.>
...

## Verification table (before/after counters)

## Cumulative status (across all waves so far)

## Patterns established (additions to the catalogue, items <X-Y>)

<New durable patterns discovered. Each is one short paragraph: name + when-it-bites + how-to-fix.>

## What remains

<Brief — what themes are still open per the INDEX.>
```

Commit the summary doc as a separate `docs(harness): wave-N fix summary` commit.

### B6.5 — Pattern catalogue accumulation

Each wave should extract 2-5 durable patterns. The catalogue is the most valuable artefact across
multiple waves — it lets future audits grep proactively for known shapes instead of re-deriving
them. Append to the wave summary doc **and** to `$VAULT/Scan/patterns.md`, which is the copy that
survives the run and gets injected into future scanner prompts by `coverage.mjs digest`. A
catalogue that lives only in the run directory dies with it — that is what happened to every
catalogue built before this vault existed.

Vault row: `| P<N> | <pattern name> | <when it bites> | <fix shape> | <contexts seen in> |`.
Promote a pattern to the digest only after it has been observed in **2+ contexts** — a
single-sighting "pattern" is a finding wearing a hat, and it dilutes the prompt.

### B6.6 — Continue or pause

After each wave: ask the user "continue with next wave (suggest: <theme>) or pause?". On pause, the INDEX + per-wave docs are durable artefacts; a future session resumes by reading them.

## Phase B7: Cumulative Status + Final Summary

When the user pauses (or the user explicitly ends the session), produce a cumulative status block:

```
Cumulative status (waves 1-N):
  <N> findings closed in <K> atomic commits across <N> themed waves.

  | Wave | Theme | Closed |
  | ... |

  Pattern catalogue: <SIZE> items.

  Remaining: <one-line summary of what's still open per INDEX themes>.
```

Recommend the next wave or note clean handoff points for future sessions.

## Phase B8: Persist to the vault

Runs at session end — including interrupted sessions. Most of the writing already happened
incrementally (ledger rows per fix, dispatch state per wave); this phase closes the books.

1. **Per-context ledger frontmatter** — append this run's scan entry to every context scanned:
   `- { date: <today>, lens: "<scan-slug>", sha: <HEAD sha at scan time>, surfaced: N, actioned: M }`.
   The SHA is what makes the *next* run's churn calculation work; a scan recorded without one is
   invisible to `coverage.mjs` and the context will look never-scanned. Capture it at dispatch
   time (`git -C "$PROJECT_PATH" rev-parse --short HEAD`), not after the fixes land.
   Also add any path a scanner traced and found healthy to `## Known clean`, and update `next_id`.

2. **`coverage.md`** — one row per touched context: lenses scanned, last scan + SHA, open / fixed /
   rejected counts, and yield (`actioned / surfaced` across the last 3 scans).

3. **`patterns.md`** — promote patterns seen in 2+ contexts (B6.5).

4. **`lenses/<scan-slug>.md`** — what this lens learned here: which categories produced findings
   the user actioned, which produced noise, and any prompt adjustment worth carrying forward. A
   category that has surfaced findings across two runs with zero actioned belongs in
   *Categories with zero yield* so the next run's role prompt deprioritizes it.

5. **`config.md → ## Skill improvement log`** — 2-4 bullets: what dragged, what the user
   overrode, what the next round should change. This is the input to `/vibeman reflect`.

6. **`Scan.md`** — refresh the headline (contexts with ledgers, open / rejected / fixed totals,
   last run) and the `next:` pointer.

7. **`runs/<date>.md`** — close the run note: contexts scanned vs skipped (with reasons), findings
   new/known/regression/suppressed, waves completed, commits, gate results, and a final
   `next: <the exact instruction for the session that picks this up>`.

8. **Verify** — `node tools/coverage.mjs verify --vault "$VAULT" --contexts "$CTX_JSON"`. It
   catches duplicate ids, a `next_id` that would collide, fixed rows with no SHA, scans with no
   SHA, and **rejected rows with no reason**. Fix what it reports before ending the session; a
   corrupt ledger is worse than no ledger because it is trusted.

9. `harness-learnings.md` keeps its Pipeline A role for structural facts — the vault does not
   replace it. Cross-link rather than duplicating.

---

## Pipeline B — Anti-patterns

Discovered during the 2026-04-27 personas run and the 2026-07 ascent rescan audit; codify here so future runs don't relearn:

- **Don't dispatch a scanner without its prior-coverage digest.** Telling a subagent "this codebase has been audited before" without the data is not an instruction, it's a wish — ascent's hand-written brief did exactly that and the same defects came back in new words across three scans.
- **Don't scan a context whose files haven't changed since its last same-lens scan.** It is the clearest waste in the whole pipeline and `coverage.mjs plan` labels it explicitly.
- **Don't defer vault writes to session end.** Ledger rows are written per fix, dispatch state per wave. The one run that batched its state into a hand-written file at the end lost 13 contexts' worth of dispatch information when the session hit its limit.
- **Don't record a rejection without the reason.** The reason is the entire value of the row; the title alone won't stop a differently-phrased re-proposal.
- **Don't let a finding's id change.** Ids are permanent across status transitions — renumbering breaks every cross-reference in the run notes and commit trailers.

- **Don't read the per-context reports during scanning.** The orchestrator should only read terse subagent replies. Reading reports inflates context and prevents 17+ scans from fitting in one session.
- **Don't commit a single mega-commit at end of wave.** Every fix is its own atomic commit with a finding reference. This makes `git revert` per-bug-fix work and lets future readers `git log` to recover the why.
- **Don't bundle fixes across themes in one wave.** A wave with one mental model is 3-5x more efficient than a wave that hops between themes — the per-fix context remains warm.
- **Don't trust counts from a single source.** Always verify findings two ways (header sum + bullet count) — discrepancies indicate malformed reports that would corrupt the INDEX.
- **Don't skip the wave verification.** If TS errors crept in mid-wave, find and fix before writing the summary doc — otherwise the doc lies about regressions.
- **Don't let a wave exceed 7 fixes without a strong reason.** Past 7 fixes per session, context budget tightens and quality degrades. Pause and let the user start a fresh session for the next wave.

## Pipeline B — When to use this vs Pipeline A

- **Use Pipeline A** when the user knows what they want built. Goal is a feature or an enhancement.
- **Use Pipeline B** when the user wants to discover problems they don't yet know about. Goal is reliability/security/quality remediation. Common triggers: "audit the auth flow", "find race conditions", "check for memory leaks", "do a security review of the credential code".
- Pipeline B can be re-run with a different scan agent to layer audits (e.g. bug-hunter + security-review + performance-audit on the same codebase, each producing its own INDEX).

---

# Pipeline C — Scan and Decide

The "decide-for-me" pipeline. The user picks ONE context group and nothing else; the skill inspects the group, autonomously chooses which in-app **Idea scanner(s)** fit it, runs them to produce a tight backlog (≤5 ideas per scanner), walks the user through accept/reject on each idea, then implements only the approved scope.

**How this differs from Pipeline B:** Pipeline B uses *subagent role-prompts* (`bug-hunter`, etc. from `src/lib/prompts/registry/agents/`) that write markdown findings reports, and the user drives wave-based fixes. Pipeline C uses Vibeman's *in-app Idea scanners* — the `AGENT_REGISTRY` scan types (`zen_architect`, `bug_hunter`, `ui_perfectionist`, …) — which persist structured **ideas** into Vibeman's database via `/api/ideas`, and then implements the accepted ones. Use Pipeline C when the user wants "look at this part of the app, decide what's worth doing, and do it."

Pipeline C counters (maintain throughout):
- `GROUP_SCANNED` — the context group name
- `SCANNERS_CHOSEN` — which Idea scanners were auto-selected (+ one-line rationale each)
- `IDEAS_GENERATED` — total ideas created across all scanners
- `IDEAS_ACCEPTED` / `IDEAS_REJECTED` — outcome of the review handshake
- `IDEAS_IMPLEMENTED` — accepted ideas that shipped and passed verification
- plus the standard Pipeline A code counters (`FILES_*`, `TSC_*`, `COMMITS_MADE`) for Phase C5

## Phase C1: Context-group selection

After Phase 1 (project selection), fetch the project's context groups:

```bash
curl -s "http://localhost:3000/api/context-groups?projectId=PROJECT_ID" 2>/dev/null
```
Increment `API_CALLS`. Response shape: `{ "success": true, "data": [ { "id", "name", "color", "icon", ... } ] }`.

- If `data` is empty, the project has no context groups. Pipeline C scans a *group*, not the whole project — tell the user to create one in the Contexts module first, and offer to fall back to Pipeline A or B. Stop Pipeline C.
- Otherwise, for each group fetch its contexts so the choice is meaningful:

```bash
curl -s "http://localhost:3000/api/contexts?groupId=GROUP_ID" 2>/dev/null
```
Response: `{ "success": true, "data": [ { "id", "name", "description", "file_paths", ... } ] }`. Present a numbered list with the count of contexts and a one-line gist per group:

```
Which context group should I scan? (pick ONE)
  1. Server & API (6 contexts) — routes, db repositories, scan queue
  2. Brain & Memory (4 contexts) — signals, insights, reflection
  3. UI Shell (5 contexts) — navigation, layouts, shared components
```

The user picks exactly one. Store `GROUP_ID`, `GROUP_NAME`, and the group's contexts (names + descriptions + file paths) — you need them in C2. This is the ONLY thing Pipeline C asks the user up front; everything else is decided for them until the review gate.

## Phase C2: Scanner auto-selection (the skill decides)

This is the "decide" half. Using the group's contexts (names, descriptions, and the kinds of files in `file_paths`), choose **1–3 Idea scanners** that best fit what the group actually is. Do NOT run all scanners — a focused 1–3 produces a reviewable backlog; running ten produces noise nobody triages.

Idea-scanner registry (these are the `scan_type` values `/api/ideas/claude` accepts):

| Category | Scanner `scan_type` | Pick it when the group is about… |
|---|---|---|
| technical | `bug_hunter` | logic, async, data flow — anything that can break at runtime |
| technical | `security_protector` | auth, input handling, file/path access, external calls, secrets |
| technical | `perf_optimizer` | hot paths, lists, queries, rendering, large data |
| technical | `zen_architect` | tangled structure, oversized files, unclear boundaries |
| technical | `code_refactor` | duplication, dead code, consolidation opportunities |
| technical | `data_flow_optimizer` | API response shapes, caching, normalization |
| technical | `dev_experience_engineer` | types, tooling, the DX of a library/util layer |
| technical | `observability_scout` | logging, health checks, error surfacing |
| technical | `insight_synth` | cross-cutting unification across several contexts |
| user | `ui_perfectionist` | components, layout, visual/loading/empty states |
| user | `delight_designer` | interactions, transitions, micro-delight |
| user | `user_empathy_champion` | accessibility, error messaging, validation UX |
| business | `feature_scout` | a feature area missing obvious capabilities |
| business | `business_visionary` | monetization, growth, strategic surface |

(The live registry is `src/app/features/Ideas/lib/agentRegistry.ts` in the Vibeman repo — read it if you need the full 23-scanner set or fresh descriptions; the table above is the common subset.)

**Selection rules:**
- Match scanner category to the group's nature: a server/data group → technical scanners (`bug_hunter` + `security_protector`, maybe `perf_optimizer`); a UI group → user scanners (`ui_perfectionist` + `user_empathy_champion`); an architecture/shared group → `zen_architect` + `code_refactor`.
- Default to the **single best-fit scanner.** Add a second/third only when the group clearly spans two concerns (e.g. an API group with both security and performance surface).
- Never exceed 3 scanners in one Pipeline C run.
- **Consult memory before choosing** (`$VAULT/Scan/lenses/*.md`, `config.md → ## Do-not-suggest`
  and `## User taste`, and the group's context ledgers). A scanner whose last run on this group
  produced ideas the user rejected wholesale is the wrong pick — choose a different lens or say
  out loud why this one deserves another turn. Prefer a lens with a **coverage gap** in this group
  over one that ran recently with low yield.
- Run `coverage.mjs plan --lens <scan_type>` over the group's contexts to see which are stale and
  which have not changed since that lens last looked. If every context in the group is unchanged
  since the last run of the best-fit scanner, **say so and offer a different lens or a different
  group** rather than generating a backlog of near-duplicates.

Show the decision — it's autonomous, but the user should see the reasoning and get a cheap override (this is NOT a second blocking prompt; proceed on "ok" or no objection):

```
Scanning "Server & API" with:
  • bug_hunter — 6 contexts of route handlers + repositories; runtime-failure surface is the priority
  • security_protector — routes parse external input and touch the filesystem

(≤5 ideas per scanner. Reply "ok" to run, or name scanners to add/drop.)
```

Record `SCANNERS_CHOSEN` with the one-line rationale per scanner.

## Phase C3: Apply — run the chosen scanners

`/api/ideas/claude` does NOT run a scan — it returns a `requirementContent` *prompt* that an agent then carries out by analyzing the group's files and POSTing ideas back to Vibeman. (This is exactly why the old "Mini" panel always reported "0 ideas": it called this endpoint and read a non-existent `ideasGenerated` field instead of executing the returned prompt.)

For each chosen scanner:

1. Build the requirement for the group + scanner:
```bash
curl -s -X POST http://localhost:3000/api/ideas/claude \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"PROJECT_ID","projectName":"PROJECT_NAME","projectPath":"PROJECT_PATH","scanType":"<scan_type>","groupId":"GROUP_ID"}'
```
Increment `API_CALLS`. The response includes `requirementContent` — a full analysis-and-save prompt scoped to this group's files.

2. **Execute the requirement.** Spawn one `general-purpose` subagent per scanner (run them in parallel when there are 2–3), handing it the `requirementContent` as its instructions plus this hard cap:

   > Generate **at most 5 ideas** — only the highest-value findings. Follow the requirement's two-step save flow exactly: first `POST /api/scans` to create a scan record, then `POST /api/ideas` for each idea using the returned `scan.id`. Every idea must include `effort`, `impact`, `risk` (1–10) and the most relevant `context_id` from the group. Reply with the `scan.id` you created and the count + titles of the ideas you saved. Do NOT modify the target project's code.

   **Prepend the prior-coverage digest for each context in the group** (`coverage.mjs digest`,
   one per context, concatenated) above the requirement content, plus `config.md → ## Do-not-suggest`.
   Auto-generated ideas are *more* prone than hand-written goals to re-propose something already
   built, already shipped, or already declined — this is the same failure the digest solves for
   Pipeline B, and it is why C4's rejections were worthless until now: they were written to the DB
   and never read back.

   Running scans as subagents keeps the orchestrator's context clean (it sees only the terse reply, not the per-file analysis) — same discipline as Pipeline B's dispatch.

   **Handing the prompt to the subagent:** `requirementContent` is large (~30 KB). Prefer passing it inline in the subagent's prompt. If you must stage it to a file for handoff, write it under `PROJECT_PATH` (e.g. `PROJECT_PATH/.vibeman-scan-tmp/<scan_type>.txt`) or an OS temp dir, then delete it after the run — **never write it into the Vibeman repo / skill cwd** (a stray `.tmp_*` dir in the Vibeman working tree is the classic leak). The subagent itself analyzes `PROJECT_PATH` read-only and only POSTs to Vibeman's API; it must not write into either repo.

3. Collect each subagent's reply: the `scan.id` and the idea count/titles. Sum into `IDEAS_GENERATED` and keep the list of `scan.id`s — you need them in C4. If a scanner saved 0 ideas, note it (the group may be clean on that dimension) and continue.

## Phase C4: Backlog review (the handshake)

Fetch this run's freshly generated backlog and walk the user through it. Pull pending ideas for the project:

```bash
curl -s "http://localhost:3000/api/ideas?projectId=PROJECT_ID&status=pending" 2>/dev/null
```
Increment `API_CALLS`. **Filter to the ideas whose `scan_id` matches the scan ids created in C3** — `status=pending` returns ALL pending ideas, and without this filter the review would mix in stale backlog. Group by scanner, ≤5 each, and present:

```
Backlog from this scan — accept/reject each:

bug_hunter (4 ideas)
  1. <title> — <one-line description>  [effort 3 · impact 7 · risk 2]
  2. ...
security_protector (3 ideas)
  5. <title> — ...

Reply with your decisions, e.g.:  accept 1,2,5   reject 3,4
```

This is the **handshake** — no code is written until the user has ruled on each idea. Apply the decisions:

```bash
# accept
curl -s -X PATCH http://localhost:3000/api/ideas -H 'Content-Type: application/json' \
  -d '{"id":"IDEA_ID","status":"accepted"}'
# reject (capture the reason if the user gave one, so future scans can learn)
curl -s -X PATCH http://localhost:3000/api/ideas -H 'Content-Type: application/json' \
  -d '{"id":"IDEA_ID","status":"rejected","user_feedback":"<reason if given>"}'
```
Increment `API_CALLS` per call. Tally `IDEAS_ACCEPTED` / `IDEAS_REJECTED`.

**Mirror every decision into the vault in the same turn** — the DB row is the app's state, the
ledger row is the skill's memory, and only the ledger is read at the next dispatch:

- Rejected → `$VAULT/Scan/contexts/<slug>.md → ## Rejected` with the user's reason as the `>`
  annotation. If the user rejected without saying why, ask once, batched across all rejections,
  `skip` allowed. A rejection with no reason will not reliably suppress a re-proposal.
- If a rejection is about the *whole category* rather than this instance ("we're never doing
  design-system work until the Tauri shell lands"), promote it to `config.md → ## Do-not-suggest`
  so it suppresses across every context, not just this one.
- Accepted → append under `## Open / deferred` so an interrupted C5 doesn't lose the scope.

The accepted set is the **handshaked scope** for C5. If nothing was accepted, still write the
rejections and the run note before stopping — a run that generates 5 ideas and gets all 5 rejected
is one of the most informative runs there is, and it used to leave no trace.

## Phase C5: Execute the handshaked scope

Implement only the accepted ideas. This **reuses Pipeline A's machinery — do not invent a new flow:**

1. Capture a baseline first (Phase 3): `tsc --noEmit` error count and `vitest run` pass count, for the Phase 6 regression check.
2. Treat each accepted idea as a task; order by dependency / shared files so related ideas batch together. Set `TASKS_PLANNED` = accepted count.
3. For each idea, run the **Phase 4.1b–4.1d host-first / already-existed greps** before writing code — auto-generated ideas are *more* likely than user goals to propose something that already exists, so if 50%+ already exists, rescope or drop it and tell the user. Then implement per the **Phase 5** rules (respect implied target files, follow existing patterns, add types, handle errors, honor the Phase 5 non-goals list and the security check on privileged surfaces).
4. After each idea: `npm --prefix "$PROJECT_PATH" run typecheck` (or `npx tsc --noEmit -p "$PROJECT_PATH"`) (increment `TSC_RUNS`), fix-forward any errors, then commit atomically **to the target repo** (branch off the project's default branch first, as in Phase 5):
```bash
git -C "$PROJECT_PATH" add <changed-files>
git -C "$PROJECT_PATH" commit -m "vibeman(scan-decide): <idea title>"
```
Increment `COMMITS_MADE`, then mark the idea implemented:
```bash
curl -s -X PATCH http://localhost:3000/api/ideas -H 'Content-Type: application/json' \
  -d '{"id":"IDEA_ID","status":"implemented"}'
```
Increment `IDEAS_IMPLEMENTED`.
5. After all ideas, run the **Phase 6 verification** (`tsc` + `next build` for Next.js + tests + lint + regression vs. the C5 baseline) and compute the quality score. Record a brain signal per **Phase 6.9** (pass `requirementId` = the goal id the ideas were tied to, or the originating idea id).
6. Produce a compact report reusing the Phase 7 template, led by a one-line funnel headline: **"Scan-and-decide: N generated → A accepted → I implemented (group: GROUP_NAME, scanners: …)."**

## Phase C6: Persist to the vault

Run **Phase B8** — it is pipeline-agnostic. The Pipeline C specifics:

- Ledger rows for implemented ideas move to `## Fixed` with their commit SHA, per idea, at commit
  time (same rule as B6.2 step 6).
- The scan entry's `lens` is the `scan_type` (e.g. `bug_hunter`), so future `coverage.mjs plan
  --lens bug_hunter` sees this run. Record the HEAD SHA from *before* the fixes landed.
- `lenses/<scan_type>.md` gets the acceptance rate for this group. A scanner whose ideas are
  consistently rejected on a given group should not be auto-selected there again — record that
  explicitly rather than leaving C2 to rediscover it.

## Pipeline C — When to use this vs A / B

- **Pipeline A** — the user knows the goal. Plan → implement.
- **Pipeline B** — the user wants a deep audit + findings report and will drive wave-based fixes themselves.
- **Pipeline C** — the user wants to point at one area and have the skill *decide and do*: "scan this group and just handle what's worth handling." Lowest-input pipeline; the only required input is the context group. The ≤5-per-scanner cap and the per-idea accept/reject gate keep it from running away.

---

## Error Handling

- **Vibeman not running**: If any API call to localhost:3000 fails, inform the user and suggest starting Vibeman. Continue pipeline without API features.
- **No projects found**: Tell the user to add a project through the Vibeman UI first.
- **Build fails persistently**: After 3 failed fix attempts on the same error, stop and present the error to the user for guidance. Increment `TASKS_FAILED`.
- **API errors**: Log the error but don't block the pipeline — API integration is enhancement, not critical path.
- **Partial completion**: If interrupted, still produce the Phase 7 report with whatever data was collected.

---

## Skill Iteration Log

Moved to [`ITERATION-LOG.md`](./ITERATION-LOG.md) — the record of *why* each non-obvious rule
here exists. **Before deleting a rule that looks redundant, check that file**; the reason may
still apply. Append a new entry there at the end of every run that changes this skill.

Companion files in this directory:

| File | Read it when |
|---|---|
| `SCAN-MEMORY.md` | Phase 1.5 (Recall), Phase B8 / C6 (Persist) — the vault schema, note templates, digest format, staleness formula |
| `tools/coverage.mjs` | invoked by Phase 1.5 / B1.5 / B3 — computes the scan plan and the prior-coverage digest |
| `ITERATION-LOG.md` | before removing or overriding a rule; append to it after a run that changes the skill |
| `AUTONOMOUS_EVAL.md` | Pipeline A autonomous-goal evaluation protocol |
