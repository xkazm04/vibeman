---
name: vibeman
description: Run the Vibeman autonomous development pipeline. Select a project, define a goal, and execute a PLAN > IMPLEMENT > VERIFY cycle with quality gates, brain signal recording, and detailed achievement reporting.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node *), Bash(npx *), Bash(curl *), Bash(git *)
argument-hint: [project-name-or-goal?]
---

# Vibeman Pipeline — Autonomous Development Cycle

Execute a full PLAN > IMPLEMENT > VERIFY > REPORT development cycle on a Vibeman-managed project. This skill mirrors the Conductor v3 pipeline but runs directly inside Claude Code, using your own tools to implement changes.

**Prerequisite**: Vibeman must be running at `http://localhost:3000`. If not, tell the user to start it first.

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

Identify what features would add the most value. Three input sources, checked in order:

**Source 1: Open follow-ups from harness-learnings.md**
These are known, vetted gaps left by previous runs. They're the highest-confidence source because a prior run already evaluated them and decided they were worth noting but out-of-scope. Parse the "Open follow-ups" section and treat each non-struck-through item as a candidate.

**Source 2: Vision-gap analysis**
If a `requirements/` or design document exists:
1. Read the document's table of contents / section headers
2. For each major section, grep the codebase to check if it's implemented
3. Identify the largest *implementable* gap (something that can ship in 3-8 tasks, not "build the entire backend")
4. Generate 1-2 goals that would close the most impactful gap

**Source 3: Domain research (web search)**
Search the web for best practices and common features in the project's domain:
- For `auto-invoicer`: search "invoice app essential features", "invoice UX best practices 2026", "open source invoice app features comparison"
- For a generic project: search "{project-type} common features checklist", "{domain} UX patterns"
- Extract 3-5 feature ideas that the project doesn't have yet
- Filter: only keep ideas that are feasible in one pipeline run (3-8 tasks)

**Important**: web research is a *supplement*, not a replacement for the first two sources. Open follow-ups and vision gaps are always higher-confidence because they're grounded in the specific project. Web research adds breadth but may suggest features that don't fit the project's scope or style.

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
1. **Confidence** — how sure are we this is the right thing to do? Follow-up items > vision gaps > research ideas > scan findings.
2. **Impact** — how much does this improve the user's experience or the code's health? Features users interact with > internal refactoring > cosmetic polish.
3. **Feasibility** — can this ship cleanly in one run? Goals that touch 3-5 files > goals that require new infrastructure > goals with unclear scope.
4. **Freshness** — prefer goals that build on recent work (the context is hot) over goals that touch cold code.

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
