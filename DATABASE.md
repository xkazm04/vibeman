# Vibeman Database Schema Documentation

This document provides comprehensive documentation of the SQLite database schema used by Vibeman.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Tables](#core-tables)
- [Feature-Specific Tables](#feature-specific-tables)
- [Relationships & Foreign Keys](#relationships--foreign-keys)
- [Patterns & Conventions](#patterns--conventions)
- [Data Flow Examples](#data-flow-examples)

---

## Architecture Overview

### Technology Stack

| Component | Technology |
|-----------|------------|
| Primary Database | SQLite with WAL mode (better-sqlite3) |
| Alternative | PostgreSQL with connection pooling |
| Driver Selection | Runtime via `DB_DRIVER` environment variable |
| ORM Pattern | Repository pattern with driver abstraction |

### Key Directories

```
src/app/db/
├── drivers/           # SQLite and PostgreSQL adapters
├── models/types.ts    # TypeScript interfaces (DbXxx types)
├── repositories/      # CRUD operations per entity
├── migrations/        # Schema evolution scripts
├── schema.ts          # Core table definitions
└── index.ts           # Exports (contextDb, goalsDb, etc.)
```

### Design Principles

1. **Driver Abstraction**: Never import `better-sqlite3` directly; use `getDbDriver()`
2. **Repository Pattern**: Each entity has a dedicated repository with standardized CRUD methods
3. **Auto-Initialization**: Databases created automatically on first application start
4. **Idempotent Migrations**: All use `CREATE TABLE IF NOT EXISTS` pattern

---

## Core Tables

### Projects & Contexts

#### `contexts`
Code organization units representing features, business domains, or architectural components.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Parent project reference |
| `group_id` | TEXT FK | Reference to context_groups |
| `name` | TEXT | Context name |
| `description` | TEXT | Context description |
| `file_paths` | TEXT | JSON array of file paths |
| `has_context_file` | INTEGER | Boolean (0/1) |
| `context_file_path` | TEXT | Path to context markdown file |
| `preview` | TEXT | Preview image path |
| `test_scenario` | TEXT | Testing steps |
| `target` | TEXT | Goal/target functionality |
| `target_fulfillment` | TEXT | Progress toward target |
| `target_rating` | INTEGER | 1-5 rating |
| `implemented_tasks` | INTEGER | Counter of completed tasks |
| `created_at`, `updated_at` | TEXT | ISO timestamps |

#### `context_groups`
Visual organization of contexts into architectural layers (pages, client, server, external).

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Parent project reference |
| `name` | TEXT | Group name |
| `color` | TEXT | Hex color code |
| `accent_color` | TEXT | Optional gradient accent |
| `position` | INTEGER | Ordering index |
| `type` | TEXT | 'pages', 'client', 'server', 'external', or null |
| `icon` | TEXT | Icon name for UI |

#### `context_group_relationships`
Graph connections between context groups for Architecture Explorer.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Parent project reference |
| `source_group_id` | TEXT FK | Source context group |
| `target_group_id` | TEXT FK | Target context group |

---

### Goals & Planning

#### `goals`
Development objectives and milestones.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Parent project reference |
| `context_id` | TEXT FK | Optional context association |
| `order_index` | INTEGER | Ordering within project |
| `title` | TEXT | Goal title |
| `description` | TEXT | Goal description |
| `status` | TEXT | 'open', 'in_progress', 'done', 'rejected', 'undecided' |
| `progress` | INTEGER | Percentage complete |
| `hypotheses_total` | INTEGER | Total hypothesis count |
| `hypotheses_verified` | INTEGER | Verified hypothesis count |
| `target_date` | TEXT | Target completion date |
| `started_at`, `completed_at` | TEXT | Lifecycle timestamps |
| `github_item_id` | TEXT | GitHub integration |

#### `goal_hypotheses`
Testable conditions for goal completion (breakdown system).

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `goal_id` | TEXT FK | Parent goal (CASCADE) |
| `project_id` | TEXT | Project reference |
| `title` | TEXT | Hypothesis title |
| `statement` | TEXT | Testable assertion |
| `reasoning` | TEXT | Why this hypothesis matters |
| `category` | TEXT | 'behavior', 'performance', 'security', 'ux', etc. |
| `priority` | INTEGER | Priority ordering |
| `status` | TEXT | 'unverified', 'in_progress', 'verified', 'disproven', 'completed' |
| `verification_method` | TEXT | 'manual', 'automated', 'test', 'review' |
| `evidence` | TEXT | Proof of verification |
| `evidence_type` | TEXT | 'pr', 'commit', 'test_result', 'screenshot', etc. |

#### `goal_candidates`
AI-generated goal suggestions awaiting user action.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Project reference |
| `context_id` | TEXT FK | Optional context association |
| `title`, `description` | TEXT | Goal details |
| `priority_score` | INTEGER | 0-100 priority |
| `source` | TEXT | 'repository_scan', 'git_issues', 'pull_requests', etc. |
| `source_metadata` | TEXT | JSON with source info |
| `user_action` | TEXT | 'accepted', 'rejected', 'tweaked', 'pending' |
| `goal_id` | TEXT FK | Created goal if accepted |

---

### Ideas & Implementation

#### `scans`
LLM analysis runs with token tracking for cost analysis.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Project reference |
| `scan_type` | TEXT | Type of scan performed |
| `timestamp` | TEXT | When scan ran |
| `summary` | TEXT | Scan result summary |
| `input_tokens` | INTEGER | LLM input tokens used |
| `output_tokens` | INTEGER | LLM output tokens used |

#### `ideas`
LLM-generated improvement suggestions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `scan_id` | TEXT FK | Parent scan reference |
| `project_id` | TEXT | Project reference |
| `context_id` | TEXT FK | Optional context association |
| `scan_type` | TEXT | Type of scan that generated |
| `category` | TEXT | IdeaCategory enum value |
| `title` | TEXT | Idea title |
| `description` | TEXT | Full description |
| `reasoning` | TEXT | Why this is recommended |
| `status` | TEXT | 'pending', 'accepted', 'rejected', 'implemented' |
| `user_feedback` | TEXT | User comments |
| `effort` | INTEGER | 1-10 scale (hours to implement) |
| `impact` | INTEGER | 1-10 scale (effectiveness) |
| `risk` | INTEGER | 1-10 scale (implementation risk) |
| `requirement_id` | TEXT | Claude Code requirement file name |
| `goal_id` | TEXT FK | Associated goal |
| `implemented_at` | TEXT | When implemented |

#### `implementation_log`
Track executed Claude Code requirements.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Project reference |
| `context_id` | TEXT FK | Context association |
| `requirement_name` | TEXT | Requirement file name |
| `title` | TEXT | Implementation title |
| `overview` | TEXT | Summary text |
| `overview_bullets` | TEXT | Newline-separated bullets |
| `tested` | INTEGER | Boolean (0/1) |
| `screenshot` | TEXT | Relative path to image |

---

### Background Processing

#### `scan_queue`
Job queue for background scans with progress tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Project reference |
| `scan_type` | TEXT | Type of scan |
| `context_id` | TEXT FK | Optional context |
| `trigger_type` | TEXT | 'manual', 'git_push', 'file_change', 'scheduled' |
| `trigger_metadata` | TEXT | JSON metadata |
| `status` | TEXT | 'queued', 'running', 'completed', 'failed', 'cancelled' |
| `priority` | INTEGER | Higher = processed first |
| `progress` | INTEGER | 0-100 percentage |
| `progress_message` | TEXT | Current status message |
| `current_step` | TEXT | Step name |
| `total_steps` | INTEGER | Total steps |
| `scan_id` | TEXT FK | Completed scan reference |
| `result_summary` | TEXT | Summary of results |
| `error_message` | TEXT | Error if failed |
| `auto_merge_enabled` | INTEGER | Boolean (0/1) |
| `auto_merge_status` | TEXT | Merge status |

#### `scan_notifications`
Event notifications for scan lifecycle.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `queue_item_id` | TEXT FK | Scan queue item (CASCADE) |
| `project_id` | TEXT | Project reference |
| `notification_type` | TEXT | 'scan_started', 'scan_completed', 'scan_failed', etc. |
| `title`, `message` | TEXT | Notification content |
| `data` | TEXT | JSON payload |
| `read` | INTEGER | Boolean (0/1) |

#### `file_watch_config`
Configuration for automatic scan triggering on file changes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Project reference |
| `enabled` | INTEGER | Boolean (0/1) |
| `watch_patterns` | TEXT | JSON array of glob patterns |
| `ignore_patterns` | TEXT | JSON array of patterns to skip |
| `scan_types` | TEXT | JSON array of scan types to trigger |
| `debounce_ms` | INTEGER | Milliseconds to wait |

---

### Technical Debt

#### `tech_debt`
Track, score, and remediate technical debt items.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Project reference |
| `scan_id` | TEXT FK | Originating scan |
| `category` | TEXT | 'code_quality', 'security', 'performance', etc. |
| `title` | TEXT | Debt item title |
| `description` | TEXT | Full description |
| `severity` | TEXT | 'critical', 'high', 'medium', 'low' |
| `risk_score` | INTEGER | 0-100 calculated score |
| `estimated_effort_hours` | REAL | Time estimate |
| `impact_scope` | TEXT | JSON array of affected areas |
| `technical_impact` | TEXT | Technical consequences |
| `business_impact` | TEXT | Business consequences |
| `detected_by` | TEXT | 'automated_scan', 'manual_entry', 'ai_analysis' |
| `file_paths` | TEXT | JSON array of files |
| `status` | TEXT | 'detected', 'acknowledged', 'planned', etc. |
| `remediation_plan` | TEXT | JSON structured plan |
| `remediation_steps` | TEXT | JSON array of steps |
| `backlog_item_id` | TEXT FK | Linked backlog item |
| `goal_id` | TEXT FK | Linked goal |

---

### Testing Infrastructure

#### `test_selectors`
UI element selectors for automated testing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `context_id` | TEXT FK | Parent context (CASCADE) |
| `data_testid` | TEXT | Test ID attribute |
| `title` | TEXT | 1-4 word description |
| `filepath` | TEXT | Source file path |

#### `test_case_scenarios`
Named test scenarios for contexts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `context_id` | TEXT FK | Parent context (CASCADE) |
| `name` | TEXT | Scenario name |
| `description` | TEXT | Scenario description |

#### `test_case_steps`
Non-technical steps within test scenarios.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `scenario_id` | TEXT FK | Parent scenario (CASCADE) |
| `step_order` | INTEGER | Step ordering |
| `step_name` | TEXT | Step description |
| `expected_result` | TEXT | Expected outcome |
| `test_selector_id` | TEXT FK | Optional selector reference |

#### `test_scenarios`
AI-generated Playwright test scenarios.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Project reference |
| `context_id` | TEXT FK | Context association |
| `name` | TEXT | Scenario name |
| `description` | TEXT | Scenario description |
| `user_flows` | TEXT | JSON: UserFlowStep[] |
| `component_tree` | TEXT | JSON: ComponentNode |
| `test_skeleton` | TEXT | Playwright code |
| `data_testids` | TEXT | JSON: string[] |
| `status` | TEXT | 'pending', 'generated', 'ready', etc. |
| `ai_confidence_score` | REAL | Confidence 0-1 |
| `created_by` | TEXT | 'ai' or 'manual' |

#### `test_executions`
Results from running test scenarios.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `scenario_id` | TEXT FK | Test scenario reference |
| `project_id` | TEXT | Project reference |
| `status` | TEXT | 'queued', 'running', 'passed', 'failed', 'skipped' |
| `execution_time_ms` | INTEGER | Duration |
| `error_message` | TEXT | Error if failed |
| `console_output` | TEXT | Console logs |
| `screenshots` | TEXT | JSON: ScreenshotMetadata[] |
| `coverage_data` | TEXT | JSON coverage data |

#### `visual_diffs`
Screenshot comparison and visual regression detection.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `execution_id` | TEXT FK | Test execution reference |
| `baseline_screenshot` | TEXT | Baseline image path |
| `current_screenshot` | TEXT | Current image path |
| `diff_screenshot` | TEXT | Diff image path |
| `diff_percentage` | REAL | Percentage different |
| `has_differences` | INTEGER | Boolean (0/1) |
| `step_name` | TEXT | Step that produced diff |
| `reviewed`, `approved` | INTEGER | Boolean flags |

---

### Security

#### `security_scans`
Vulnerability scan results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Project reference |
| `scan_date` | TEXT | When scan ran |
| `total_vulnerabilities` | INTEGER | Total count |
| `critical_count`, `high_count`, `medium_count`, `low_count` | INTEGER | By severity |
| `scan_output` | TEXT | JSON of audit output |
| `status` | TEXT | Lifecycle status |

#### `security_patches`
Proposed fixes for vulnerabilities.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `scan_id` | TEXT FK | Parent scan |
| `vulnerability_id` | TEXT | CVE or package ID |
| `package_name` | TEXT | Affected package |
| `current_version`, `fixed_version` | TEXT | Version info |
| `severity` | TEXT | 'critical', 'high', 'medium', 'low' |
| `description` | TEXT | Vulnerability description |
| `ai_analysis`, `patch_proposal` | TEXT | AI recommendations |
| `patch_applied` | INTEGER | Boolean (0/1) |

---

### Events & Backlog

#### `events`
System event logging and notifications.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Project reference |
| `title` | TEXT | Event title |
| `description` | TEXT | Event description |
| `type` | TEXT | 'info', 'warning', 'error', 'success', etc. |
| `agent` | TEXT | Which agent created event |
| `message` | TEXT | Additional message |
| `context_id` | TEXT FK | Optional context |

#### `backlog_items`
Proposals and custom tasks.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Project reference |
| `goal_id` | TEXT FK | Associated goal |
| `agent` | TEXT | 'developer', 'mastermind', 'tester', 'artist', 'custom' |
| `title` | TEXT | Item title |
| `description` | TEXT | Full description |
| `status` | TEXT | 'pending', 'accepted', 'rejected', 'in_progress' |
| `type` | TEXT | 'proposal' or 'custom' |
| `impacted_files` | TEXT | JSON array of ImpactedFile objects |

---

### Conversations (Voice Assistant)

#### `conversations`
Voice conversation sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `project_id` | TEXT | Project reference |
| `title` | TEXT | Optional session name |

#### `messages`
Individual messages in conversations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID identifier |
| `conversation_id` | TEXT FK | Parent conversation (CASCADE) |
| `role` | TEXT | 'user', 'assistant', 'system' |
| `content` | TEXT | Message content |
| `memory_type` | TEXT | Categorization |
| `metadata` | TEXT | JSON metadata |

---

## Feature-Specific Tables

### Adaptive Learning & Scoring

| Table | Purpose |
|-------|---------|
| `idea_execution_outcomes` | Track actual vs. predicted effort/impact |
| `scoring_weights` | Adaptive scoring weights per category |
| `scoring_thresholds` | Auto-accept/reject thresholds |

### Debt Prediction & Prevention

| Table | Purpose |
|-------|---------|
| `debt_patterns` | Learned patterns that predict technical debt |
| `debt_predictions` | Real-time predictions for current code |
| `complexity_history` | Track code metrics over time |
| `opportunity_cards` | Real-time refactoring guidance cards |
| `prevention_actions` | Track proactive debt prevention |
| `code_change_events` | Track code changes for pattern detection |

### Marketplace & Pattern Sharing

| Table | Purpose |
|-------|---------|
| `marketplace_users` | Contributor profiles |
| `refactoring_patterns` | Shareable code patterns |
| `pattern_versions` | Version history |
| `pattern_ratings` | User reviews |
| `pattern_applications` | Track when patterns applied |
| `badges` | Achievement system |
| `pattern_favorites` | User's starred patterns |
| `pattern_collections` | User-created collections |

### Developer Personalization

| Table | Purpose |
|-------|---------|
| `developer_profiles` | Developer preferences |
| `developer_decisions` | Accept/reject patterns |
| `learning_insights` | AI-detected insights |
| `code_pattern_usage` | Pattern familiarity |
| `consistency_rules` | Code style enforcement |
| `skill_tracking` | Skill development areas |

### Claude Code Sessions

| Table | Purpose |
|-------|---------|
| `claude_code_sessions` | Session management with --resume |
| `session_tasks` | Task execution tracking |

### Additional Feature Tables

- **Strategic Roadmap**: `strategic_initiatives`, `roadmap_milestones`, `impact_predictions`
- **Hypothesis Testing**: `hypotheses`, `invariants`, `fuzz_sessions`, `property_tests`
- **Red Team Testing**: `red_team_sessions`, `red_team_attacks`, `red_team_vulnerabilities`
- **Architecture Graph**: `architecture_nodes`, `architecture_edges`, `architecture_drift`
- **Focus Mode**: `focus_sessions`, `focus_breaks`, `focus_stats`
- **Autonomous CI**: `ci_pipelines`, `build_executions`, `ci_predictions`, `flaky_tests`
- **ROI Simulator**: `refactoring_economics`, `roi_simulations`, `portfolio_optimizations`
- **Observatory**: `analysis_snapshots`, `prediction_outcomes`, `execution_outcomes`

---

## Relationships & Foreign Keys

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              PROJECTS                                    │
│                         (implicit - no table)                           │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ├──────────────────┬──────────────────┬──────────────────┐
         ▼                  ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐
│  context_groups │ │      scans      │ │      goals      │ │   events    │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘ └─────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    contexts     │ │      ideas      │ │goal_hypotheses  │
└────────┬────────┘ └─────────────────┘ └─────────────────┘
         │
    ┌────┴────┬────────────┬────────────┬────────────────┐
    ▼         ▼            ▼            ▼                ▼
┌────────┐ ┌────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────┐
│  ideas │ │tech_   │ │implementa- │ │test_       │ │test_case_   │
│        │ │debt    │ │tion_log    │ │selectors   │ │scenarios    │
└────────┘ └────────┘ └────────────┘ └────────────┘ └──────┬──────┘
                                                          │
                                                          ▼
                                                   ┌─────────────┐
                                                   │test_case_   │
                                                   │steps        │
                                                   └─────────────┘
```

### Foreign Key Cascade Rules

| Relationship | On Delete |
|--------------|-----------|
| `contexts` → `context_groups` | SET NULL |
| `ideas` → `scans` | CASCADE |
| `ideas` → `contexts` | SET NULL |
| `goal_hypotheses` → `goals` | CASCADE |
| `test_selectors` → `contexts` | CASCADE |
| `test_case_scenarios` → `contexts` | CASCADE |
| `test_case_steps` → `test_case_scenarios` | CASCADE |
| `scan_notifications` → `scan_queue` | CASCADE |
| `messages` → `conversations` | CASCADE |
| `pattern_versions` → `refactoring_patterns` | CASCADE |

---

## Patterns & Conventions

### Primary Keys
- All tables use `TEXT` primary keys containing UUIDs
- Generated via `crypto.randomUUID()` or similar

### Timestamps
```sql
created_at TEXT DEFAULT (datetime('now'))
updated_at TEXT -- manually set on updates
```

### Boolean Fields
SQLite uses INTEGER (0/1) for booleans:
- `has_context_file`, `tested`, `success`, `read`, `enabled`, etc.

### JSON Storage
Many columns store JSON for flexible schemas:
- Arrays: `file_paths`, `tags`, `impacted_files`
- Objects: `metadata`, `config`, `detection_rules`

### Status Enums
Most tables have a `status` column with CHECK constraints:

```sql
-- Goals
status TEXT CHECK (status IN ('open', 'in_progress', 'done', 'rejected', 'undecided'))

-- Ideas
status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented'))

-- Tech Debt
status TEXT CHECK (status IN ('detected', 'acknowledged', 'planned', 'in_progress', 'resolved', 'dismissed'))

-- Scan Queue
status TEXT CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled'))
```

### Indexes
Created for:
- All `project_id` columns (filtering by project)
- All `status` columns (filtering by state)
- All foreign keys (JOIN performance)
- Timestamp columns (sorting/filtering)

### Token Tracking
For LLM cost analysis:
```sql
-- scans table
input_tokens INTEGER
output_tokens INTEGER
```

---

## Data Flow Examples

### Idea Generation & Implementation Flow

```
1. User triggers scan
   └── INSERT INTO scans (project_id, scan_type, ...)

2. LLM generates ideas
   └── INSERT INTO ideas (scan_id, category, effort, impact, ...)

3. User accepts idea
   └── UPDATE ideas SET status = 'accepted'

4. Claude Code executes
   └── INSERT INTO implementation_log (requirement_name, ...)

5. Track outcome
   └── INSERT INTO idea_execution_outcomes (actual_effort, actual_impact, ...)

6. Update scoring weights
   └── UPDATE scoring_weights SET ... WHERE category = ?
```

### Goal Breakdown Flow

```
1. Create goal
   └── INSERT INTO goals (title, description, status = 'open')

2. AI generates hypotheses
   └── INSERT INTO goal_hypotheses (goal_id, statement, category, ...)

3. Work on hypothesis
   └── UPDATE goal_hypotheses SET status = 'in_progress'

4. Verify hypothesis
   └── UPDATE goal_hypotheses SET status = 'verified', evidence = ?

5. Update goal progress
   └── UPDATE goals SET hypotheses_verified = hypotheses_verified + 1
```

### Context & Testing Flow

```
1. Create context
   └── INSERT INTO contexts (name, file_paths, ...)

2. Generate test selectors
   └── INSERT INTO test_selectors (context_id, data_testid, ...)

3. Create test scenario
   └── INSERT INTO test_scenarios (context_id, user_flows, ...)

4. Execute tests
   └── INSERT INTO test_executions (scenario_id, status, ...)

5. Capture visual diffs
   └── INSERT INTO visual_diffs (execution_id, diff_percentage, ...)
```

### Background Scan Flow

```
1. Queue scan
   └── INSERT INTO scan_queue (scan_type, status = 'queued', priority)

2. Worker picks up
   └── UPDATE scan_queue SET status = 'running', started_at = ?

3. Progress updates
   └── UPDATE scan_queue SET progress = ?, progress_message = ?

4. Create notification
   └── INSERT INTO scan_notifications (notification_type = 'scan_started')

5. Complete scan
   └── UPDATE scan_queue SET status = 'completed', scan_id = ?

6. Final notification
   └── INSERT INTO scan_notifications (notification_type = 'scan_completed')
```

---

## Total Table Count

| Category | Count |
|----------|-------|
| Core Schema | ~13 |
| Migrations (028-048) | ~80 |
| **Total** | **~93 tables** |

---

## Quick Reference

### Common Queries

```sql
-- Get all ideas for a project
SELECT * FROM ideas WHERE project_id = ? ORDER BY created_at DESC;

-- Get pending scan queue items
SELECT * FROM scan_queue
WHERE project_id = ? AND status = 'queued'
ORDER BY priority DESC, created_at ASC;

-- Get contexts with their groups
SELECT c.*, cg.name as group_name, cg.color
FROM contexts c
LEFT JOIN context_groups cg ON c.group_id = cg.id
WHERE c.project_id = ?;

-- Get goal with hypothesis counts
SELECT g.*,
  COUNT(gh.id) as total_hypotheses,
  SUM(CASE WHEN gh.status = 'verified' THEN 1 ELSE 0 END) as verified_count
FROM goals g
LEFT JOIN goal_hypotheses gh ON g.id = gh.goal_id
WHERE g.project_id = ?
GROUP BY g.id;
```

### Repository Pattern Usage

```typescript
// Import from db index
import { contextDb, goalsDb, ideasDb } from '@/app/db';

// CRUD operations
const contexts = contextDb.getByProjectId(projectId);
const goal = goalsDb.getById(goalId);
await ideasDb.updateStatus(ideaId, 'accepted');
```

---

## Migration Notes

All migrations use the `safeMigration()` wrapper for idempotent execution:

1. Check if table/column already exists
2. Create if missing
3. Log success/errors
4. Continue even if migration partially fails

This allows safe schema evolution without downtime.
