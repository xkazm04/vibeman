---
name: vibeman
description: Run a Vibeman pipeline on a project. Two modes — (A) goal-based development (PLAN > IMPLEMENT > VERIFY > REPORT) or (B) audit-driven scan + triage + wave-based fix implementation. Both run with quality gates, brain-signal recording, and structured per-wave/per-phase reporting.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node *), Bash(npx *), Bash(curl *), Bash(git *)
argument-hint: [project-name-or-goal?]
---

# Vibeman Pipeline — Autonomous Development Cycle

Vibeman offers two pipelines on a project. Pick one at Phase 0 based on what the user wants:

- **Pipeline A — Goal-based development** (the original): user defines a goal, the skill plans → implements → verifies → reports. Best when the user knows what to build.
- **Pipeline B — Scan + Triage + Implementation** (the audit pipeline): user picks a scan agent (e.g. `bug-hunter`) and a context scope; the skill runs parallel per-context audits, compiles a triage INDEX, and then offers wave-based fix sessions until the user pauses. Best when the user wants to discover and remediate problems they don't yet know about.

Both pipelines use the same quality gates (TypeScript / lint / tests) and the same baseline-comparison discipline. Phases 1-7 below are Pipeline A; Pipeline B's phases (B1-B7) live further down before "Error Handling".

**Prerequisite**: Vibeman must be running at `http://localhost:3000`. If not, tell the user to start it first.

## Phase 0: Pipeline Selection

If the user invocation makes the pipeline obvious (e.g. they explicitly say "run a bug hunter scan" or "implement this goal"), skip the prompt and proceed.

Otherwise, ask:

```
What pipeline?
  A. Goal-based development — define a goal, plan, implement, verify, report.
  B. Scan + Triage + Implementation — audit the codebase with a chosen agent
     (bug-hunter, security review, etc.), compile a triage INDEX, then run
     wave-based fix sessions until you pause.
```

Both pipelines start with the same Phase 1 (project selection). Pipeline A continues to Phase 2 (goal definition); Pipeline B jumps to Phase B1 (scan configuration).

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

5. **Commit** after each successful task:
```bash
git add <changed-files>
git commit -m "vibeman: <task title>"
```
Increment `COMMITS_MADE`. Mark task as `TASKS_COMPLETED`.

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

Discover available scan agents from the prompts registry:

```bash
ls C:/Users/kazda/kiro/vibeman/src/lib/prompts/registry/agents/*.ts 2>/dev/null
```

Read the `name` and `description` fields from each `.ts` file. Present them as a numbered list:

```
Available scan types:
1. bug-hunter — elite systems failure analyst (latent failures, race conditions,
   edge cases, silent failures)
2. <other-agents-as-discovered>
```

If `` was given (e.g. `/vibeman bug-hunter`), match it against agent slugs and skip the prompt.

### Context scope

Fetch contexts via `GET /api/contexts?projectId=PROJECT_ID`. Increment `API_CALLS`. Group by `groupName`. Present:

```
This project has N contexts in M groups:
  Group: Agents & Personas (4 contexts)
  Group: Credential Vault (3 contexts)
  ...

Scope?
  a. All contexts (recommended — full coverage)
  b. Specific group(s)
  c. Specific context(s)
  d. Custom file globs (advanced)
```

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

For each context in scope, spawn a `general-purpose` subagent with:

- **Role prompt**: the chosen agent's role/expertiseAreas/focusAreas/dontInstructions (read from the `.ts` registry file)
- **Project context**: project name, tech stack, working directory
- **Context name + description**: from the Vibeman API response
- **Scope filter**: the `filePaths` from the context, run through `SCAN_SCOPE_FILTER` so src-tauri/ is dropped if user picked client-side-only
- **Findings target**: `FINDINGS_TARGET_LO`–`FINDINGS_TARGET_HI`
- **Output path**: `<output-dir>/<context-slug>.md`
- **Output format**: structured markdown with `## N. <title>`, `- **Severity**:`, `- **Category**:`, `- **File**:`, `- **Scenario**:`, `- **Root cause**:`, `- **Impact**:`, `- **Fix sketch**:`
- **Reply format**: under 150 words, must include the file slug used, total findings, severity breakdown, 1-line summary of most critical, approx files read

**Wave size**: max 8 parallel subagents. Group contexts into waves of ≤8. After each wave completes, dispatch the next.

**Why this shape works**: each subagent runs in isolation, writes one file, replies with terse stats. The orchestrator (this skill) doesn't read the per-context reports during scanning — only the reply summaries — keeping orchestrator context manageable across 17+ scans.

After every wave returns, accumulate `FILES_READ_SCAN` and findings-count stats from the replies.

## Phase B4: Triage Compilation (INDEX.md)

Once all subagents have completed, produce the triage `INDEX.md`.

### Verify findings counts two ways

1. Grep `^> Total:` headers across all `*.md` files in the output dir. Sum.
2. Grep `^- \*\*Severity\*\*:` bullets across all `*.md` files. Count.

Both numbers must match. If they don't, surface the discrepancy and ask the user before continuing — likely indicates a malformed report.

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

Display the INDEX summary to the user:

```
Scan complete. <N> findings across <M> contexts.

  Critical: <C>    High: <H>    Medium: <Med>    Low: <L>

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

If user pauses, write the INDEX and stop. Future sessions can resume by reading the INDEX and picking up at Phase B6.

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

6. **Mark the TaskUpdate completed** and move to the next.

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

Each wave should extract 2-5 durable patterns and append them to a running catalogue. The catalogue is the most valuable artefact across multiple waves — it lets future audits grep proactively for known shapes instead of re-scanning. Catalogue entries are concise: `<N>. **<Pattern name>** — <when it bites> <how to fix>.`

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

---

## Pipeline B — Anti-patterns

Discovered during the 2026-04-27 personas run; codify here so future runs don't relearn:

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

## Error Handling

- **Vibeman not running**: If any API call to localhost:3000 fails, inform the user and suggest starting Vibeman. Continue pipeline without API features.
- **No projects found**: Tell the user to add a project through the Vibeman UI first.
- **Build fails persistently**: After 3 failed fix attempts on the same error, stop and present the error to the user for guidance. Increment `TASKS_FAILED`.
- **API errors**: Log the error but don't block the pipeline — API integration is enhancement, not critical path.
- **Partial completion**: If interrupted, still produce the Phase 7 report with whatever data was collected.

---

## Skill Iteration Log

This section records *why* each non-obvious rule exists. When a rule looks redundant on a future read, check here before removing — the reason may still apply.

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
