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

1. Read `PROJECT_PATH/package.json` to understand the tech stack
2. Read `PROJECT_PATH/tsconfig.json` if it exists
3. Use Glob to discover the project structure:
   - `src/**/*.ts` and `src/**/*.tsx` for source files
   - `tests/**/*.test.ts` for test patterns
4. If target files were specified in Phase 2, read those files in full
5. Otherwise, read key entry points (main layouts, app entry, API routes relevant to the goal)
6. Check for accumulated learnings: read `docs/harness/harness-learnings.md` if it exists

Track all files read in `FILES_READ`.

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

### 6.8 Record Brain Signal
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
