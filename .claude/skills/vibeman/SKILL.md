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

1. Check for existing open goals:
```bash
curl -s "http://localhost:3000/api/goals?projectId=PROJECT_ID&status=open" 2>/dev/null
```
Increment `API_CALLS`.

2. If open goals exist, present them:
```
Existing open goals for PROJECT_NAME:
  a. Goal title — description snippet
  b. Another goal — description snippet
  
Pick an existing goal (a/b/...) or describe a NEW development goal:
```

3. If the user picks an existing goal, use its title and description. Store the `GOAL_ID`.

4. If the user describes a new goal, create it in Vibeman:
```bash
curl -s -X POST http://localhost:3000/api/goals \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"PROJECT_ID","title":"GOAL_TITLE","description":"GOAL_DESCRIPTION","status":"in_progress"}'
```
Store the returned `GOAL_ID`. Increment `API_CALLS`.

5. Ask the user if there are any constraints or target files to focus on. This is optional — if the user says no, proceed with the full project scope.

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
Increment `TSC_RUNS`. Score: **+25 points** if build passes, **0** if it fails.

### 6.2 Test Verification
```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```
Set `TESTS_RUN` to true. Record `TESTS_PASSED` and `TESTS_TOTAL`.
Score: **+30 points** if all tests pass, scaled by pass rate if some fail. If no test runner configured, award **+15 points**.

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

Format: append a dated bullet to an existing "Structural facts" section, or create one if missing. Keep each bullet under 3 lines. Link to the file/line that surfaced the fact.

This step exists because structural facts discovered during implementation are otherwise lost — the next run will re-discover them from scratch. A small, disciplined write-back compounds into a living reference that shortens every future Phase 4.1.

### 6.9 Record Brain Signal
```bash
curl -s -X POST http://localhost:3000/api/brain/signals \
  -H 'Content-Type: application/json' \
  -d '{
    "projectId": "PROJECT_ID",
    "signalType": "implementation",
    "data": {
      "requirementName": "GOAL_TITLE",
      "success": QUALITY_SCORE >= 70,
      "filesCreated": ["list of created files"],
      "filesModified": ["list of modified files"],
      "filesDeleted": [],
      "executionTimeMs": DURATION_MINUTES * 60000
    }
  }'
```
Increment `API_CALLS`.

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
