# Conductor v3: Run Report + Decision Feedback Loop

## Feature 1: Run Report (Markdown)

### Concept
After a v3 run completes (or while viewing history), a **"View Report"** button in the toolbar opens a full markdown report rendered via the existing `MarkdownViewer` component. The report is generated server-side from DB data and returned as a markdown string.

### Data Sources (all already in `conductor_runs` table)
- `metrics` → V3Metrics JSON (planned/completed/failed/cycles/cost)
- `process_log` → V3ProcessLogEntry[] (timestamped event stream)
- `reflection_history` → ReflectOutput[] per cycle (status, summary, nextTasks, brainFeedback, lessonsLearned)
- `stages_state` → Per-phase state with details (dispatch tasks with status/provider)
- `config_snapshot` → Settings used for this run
- `error_message`, `error_classifications` → Failure info
- `brain_qa` → Pre-cycle Brain Q&A

### Report Markdown Template

```markdown
# Conductor Run Report

**Goal:** {goalTitle}
**Status:** {status} | **Cycles:** {totalCycles} | **Duration:** {formatted}
**Cost:** ${estimatedCost} | **Started:** {startedAt}

---

## Summary

- **Tasks planned:** {tasksPlanned}
- **Tasks completed:** {tasksCompleted} ({successRate}%)
- **Tasks failed:** {tasksFailed}
- **LLM calls:** {llmCallCount}
- **Healing patches applied:** {healingPatchesApplied}

---

## Cycle Details

### Cycle 1

#### Plan Phase
{planOutput — tasks planned with titles, complexity, target files}

#### Dispatch Phase
| Task | Status | Provider | Duration | Files Changed |
|------|--------|----------|----------|---------------|
| {title} | completed | claude/opus | 45s | src/foo.ts |

#### Reflect Phase
- **Decision:** {status: done|continue|needs_input}
- **Summary:** {reflection summary text}
- **Lessons Learned:**
  - {lesson 1}
  - {lesson 2}
- **Brain Feedback:** {brainFeedback}

{repeat for each cycle...}

---

## Decisions & Directions

These are the major decisions the pipeline made. Rate them to improve future runs.

| # | Decision | Context | Rating |
|---|----------|---------|--------|
| 1 | {task title / approach} | {why it was chosen} | ⭐⭐⭐⭐⭐ |
| 2 | {task title / approach} | {from reflection rationale} | ⭐⭐⭐⭐⭐ |

:::info
Rate decisions 1-5 stars. Low-rated decisions (1-2 stars) can be packaged as redesign commands.
:::

---

## Error Summary

{if errors exist}
| Error Type | Count | Stage | Message |
|------------|-------|-------|---------|
| timeout | 2 | dispatch | Task exceeded 100min |

---

## Process Log (collapsed)

<details>
<summary>Full process log ({n} entries)</summary>

| Time | Phase | Event | Message |
|------|-------|-------|---------|
| 10:32:01 | plan | started | Cycle 1: Planning... |
| ... | ... | ... | ... |

</details>
```

### Implementation Plan

#### Backend: Report Generator API

**New file:** `src/app/api/conductor/report/route.ts`

- `GET /api/conductor/report?runId=xxx`
- Loads full run from `conductor_runs` via `conductorRepository.getRunById()`
- Also loads goal title/description from `goals` table
- Passes to new `generateV3Report()` function
- Returns `{ success: true, markdown: "..." }`

**New file:** `src/app/features/Conductor/lib/v3/reportGenerator.ts`

- `generateV3Report(run, goal)` → string (markdown)
- Extracts decisions from:
  - Plan phase task list (each task = a decision about what to build)
  - Reflect phase summaries (each reflection = a decision about direction)
  - Task results (succeeded vs failed = signal about decision quality)
- Returns `decisions[]` array embedded in report with IDs for rating

#### Frontend: Report Button + Modal

**Edit:** `PipelineControls.tsx`
- Add `FileText` icon button after Settings, enabled when `currentRun && isTerminal`
- Also add `onViewReport` prop that ConductorView wires up

**Edit:** `ConductorView.tsx`
- Add `reportOpen` state
- Add `RunReportModal` component render
- Wire `onViewReport={() => setReportOpen(true)}` to PipelineControls

**New file:** `src/app/features/Conductor/components/RunReportModal.tsx`

- Uses `UniversalModal` (already in codebase) with `maxWidth="max-w-4xl"`
- Fetches `/api/conductor/report?runId=xxx` on open
- Renders response via `<MarkdownViewer content={markdown} />`
- Footer has: "Export .md" button + "Rate Decisions" button

#### RunHistoryTimeline Enhancement

**Edit:** `RunHistoryTimeline.tsx`
- Add click handler on run cards → opens report for that historical run
- Need to store `runId` (already in PipelineRunSummary)

---

## Feature 2: Decision Feedback → `.claude/commands` Redesign

### Concept
The "Decisions & Directions" section of the report shows major decisions the pipeline made. Users rate each 1-5 stars. Decisions rated 1-2 stars get a "Generate Redesign" button that creates a `.claude/commands/redesign-{id}.md` file — a structured prompt telling Claude Code to rethink that specific decision.

### Decision Extraction Logic

Decisions come from 3 sources:

1. **Task-level decisions** (from plan phase):
   - "Chose to implement X by modifying files Y, Z"
   - Context: task description, complexity rating, target files

2. **Architectural decisions** (from reflect phase):
   - "Decided to continue with modified approach"
   - "Identified lesson: {lesson}"
   - Context: reflection summary, lessons learned

3. **Routing decisions** (from dispatch results):
   - "Routed task X to claude/opus (complexity 3)"
   - Context: provider, model, success/failure, duration

### Rating Storage

**New DB column** on `conductor_runs`:
- `decision_ratings` TEXT (JSON) — `Record<string, { rating: number; comment?: string }>`
- Migration: `addColumnIfNotExists('conductor_runs', 'decision_ratings', 'TEXT')`

**API endpoint:** `POST /api/conductor/report/rate`
- Body: `{ runId, decisionId, rating, comment? }`
- Updates the `decision_ratings` JSON column

### Redesign Command Generation

**API endpoint:** `POST /api/conductor/report/redesign`
- Body: `{ runId, decisionIds: string[] }` (the low-rated ones)
- For each decision, generates a `.claude/commands/redesign-{shortId}.md` file

**Redesign command template:**

```markdown
Redesign and reimplement the following approach that was attempted by the Conductor pipeline but rated poorly by the developer.

## Original Decision

**Task:** {task title}
**What was done:** {task description}
**Files affected:** {targetFiles}
**Result:** {completed|failed} — {error if failed}

## Why It Was Rated Poorly

**Rating:** {1-2}/5
**Developer comment:** {comment if provided}

## Context From Pipeline

**Goal:** {goalTitle} — {goalDescription}
**Reflection summary:** {reflect output summary}
**Lessons learned:**
{lessons from reflect phase}

## Instructions

1. Read the affected files and understand the current state
2. Evaluate what went wrong with the original approach
3. Design a better solution — consider:
   - Different architectural approach
   - Better file organization
   - More robust error handling
   - Simpler implementation
4. Implement the redesign
5. Verify with `npx tsc --noEmit`
6. Commit with message: `fix(conductor-redesign): {brief description}`

## Project Path
`{projectPath}`
```

### UI: Rating Interaction

In `RunReportModal`, after the markdown renders:

1. **Inline rating widget** — 5-star row next to each decision in the table
   - This requires a hybrid approach: render markdown, then overlay React components at decision anchors
   - Simpler alternative: **Separate "Rate Decisions" panel** below the markdown with the decision list + star ratings + optional comment field

2. **"Generate Redesign Commands" button** — appears when any decisions are rated 1-2 stars
   - Calls `POST /api/conductor/report/redesign` with low-rated decision IDs
   - Shows toast: "Created {n} redesign command(s) in .claude/commands/"
   - Commands immediately appear in TaskRunner's requirement list

### Implementation Plan

#### Phase A — Report (do first)

| # | Task | File |
|---|------|------|
| 1 | Create `generateV3Report()` markdown builder | `lib/v3/reportGenerator.ts` (new) |
| 2 | Create `GET /api/conductor/report` route | `api/conductor/report/route.ts` (new) |
| 3 | Create `RunReportModal` component | `components/RunReportModal.tsx` (new) |
| 4 | Add report button to `PipelineControls` | `components/PipelineControls.tsx` (edit) |
| 5 | Wire modal in `ConductorView` | `components/ConductorView.tsx` (edit) |
| 6 | Add click-to-report on `RunHistoryTimeline` cards | `components/RunHistoryTimeline.tsx` (edit) |

#### Phase B — Decision Rating + Redesign (do second)

| # | Task | File |
|---|------|------|
| 7 | Migration: add `decision_ratings` column | `db/migrations/` (new) |
| 8 | Decision extraction logic | `lib/v3/decisionExtractor.ts` (new) |
| 9 | `POST /api/conductor/report/rate` endpoint | `api/conductor/report/route.ts` (edit) |
| 10 | `POST /api/conductor/report/redesign` endpoint | `api/conductor/report/redesign/route.ts` (new) |
| 11 | Redesign command template builder | `lib/v3/redesignTemplate.ts` (new) |
| 12 | Rating UI panel in RunReportModal | `components/RunReportModal.tsx` (edit) |
| 13 | "Generate Redesign" button + toast | `components/RunReportModal.tsx` (edit) |

---

## Key Design Decisions

1. **Markdown-first report** — rendered by existing `MarkdownViewer`, no new rendering infra needed
2. **Server-generated markdown** — keeps logic testable, client just fetches and renders
3. **Decisions as first-class objects** — extracted with IDs so they can be rated and referenced
4. **`.claude/commands` integration** — reuses existing `createRequirement()` from `claudeCodeManager` for file creation
5. **Rating stored per-run** — `decision_ratings` JSON column on `conductor_runs`, not a separate table
6. **Hybrid modal** — Markdown report at top, interactive rating panel at bottom (avoids complex markdown-React interop)
