# Goal Hub

Goal Hub is the central orchestration system for goal-driven development in Vibeman. It transforms abstract development goals into measurable, verifiable hypotheses through multi-agent AI analysis.

## Overview

The Goal Hub replaces the previous RedTeam and HypothesisTesting features with a unified, streamlined approach:

1. **Goals** - Sprint-like objectives (1-3 days) that represent what you want to achieve
2. **Hypotheses** - Testable conditions that prove goal completion
3. **Breakdowns** - Multi-agent AI analysis that generates hypotheses automatically

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Goal Hub                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   Goals     │───▶│ Hypotheses  │───▶│  Implementation     │ │
│  │  (Sprint)   │    │ (Testable)  │    │  (Claude Code)      │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                  ▲                                    │
│         │                  │                                    │
│         ▼                  │                                    │
│  ┌─────────────────────────┴───────────────────────────────────┐│
│  │              Multi-Agent Breakdown                          ││
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    ││
│  │  │ Arch   │ │ Bug    │ │ Perf   │ │Security│ │  UX    │    ││
│  │  │ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │    ││
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Goal Creation
```
User creates goal → API saves to `goals` table → Store updates UI
```

### 2. Hypothesis Generation (Manual)
```
User adds hypothesis → API saves to `goal_hypotheses` table → Store updates counts
```

### 3. Hypothesis Generation (AI Breakdown)
```
User clicks "Generate Breakdown"
    │
    ▼
Store generates prompt combining:
  - Goal title & description
  - Project context
  - Selected agents (from ScanIdeas prompts)
    │
    ▼
Prompt saved as Claude Code requirement
    │
    ▼
User runs requirement with Claude Code
    │
    ▼
Claude Code returns JSON with agent responses
    │
    ▼
User pastes result → API saves breakdown + creates hypotheses
```

### 4. Hypothesis Verification
```
User verifies hypothesis with evidence
    │
    ▼
API updates hypothesis status to 'verified'
    │
    ▼
API recalculates goal progress (% verified)
    │
    ▼
Store updates UI with new progress
```

## Database Schema

### Tables

**goal_hypotheses**
```sql
- id: TEXT PRIMARY KEY
- goal_id: TEXT (FK to goals)
- project_id: TEXT
- title: TEXT
- statement: TEXT (testable condition)
- reasoning: TEXT
- category: TEXT (behavior, performance, security, etc.)
- priority: INTEGER (1-10)
- agent_source: TEXT (which agent generated it)
- status: TEXT (unverified, in_progress, verified)
- verification_method: TEXT
- evidence: TEXT
- evidence_type: TEXT
- verified_at: TEXT
```

**goal_breakdowns**
```sql
- id: TEXT PRIMARY KEY
- goal_id: TEXT (FK to goals)
- project_id: TEXT
- prompt_used: TEXT
- model_used: TEXT
- input_tokens: INTEGER
- output_tokens: INTEGER
- agent_responses: TEXT (JSON array)
- hypotheses_generated: INTEGER
```

**goals (extended)**
```sql
+ progress: INTEGER (0-100)
+ hypotheses_total: INTEGER
+ hypotheses_verified: INTEGER
+ target_date: TEXT
+ started_at: TEXT
+ completed_at: TEXT
```

## Components

### GoalHubLayout (`GoalHubLayout.tsx`)
Main container that orchestrates the Goal Hub UI:
- Loads goals for active project
- Auto-selects first in-progress goal
- Manages tabs (Hypotheses, Breakdown, Activity)

### GoalPanel (`components/GoalPanel.tsx`)
Left sidebar showing all goals grouped by status:
- In Progress
- Open
- Completed

### HypothesisTracker (`components/HypothesisTracker.tsx`)
Kanban-style view of hypotheses:
- To Verify (unverified)
- In Progress
- Verified

### HypothesisCard (`components/HypothesisCard.tsx`)
Individual hypothesis with:
- Status indicators
- Category badges
- Expand/collapse details
- Verification form with evidence types

### BreakdownPanel (`components/BreakdownPanel.tsx`)
Multi-agent breakdown interface:
- Generate breakdown button
- Agent response accordion
- Recommendations and risks display

### ActivityFeed (`components/ActivityFeed.tsx`)
Shows recent implementation logs related to the project.

### GoalProgress (`components/GoalProgress.tsx`)
Visual progress indicator:
- Segmented bar (verified + in-progress)
- Stats pills

## Store (goalHubStore.ts)

Zustand store managing:
- Active goal selection
- Goals list
- Hypotheses for active goal
- Breakdown data
- Loading states

Key guards to prevent infinite loops:
- `setActiveGoal` - skips if same goal
- `loadGoals` - skips if already loading or same project
- `loadHypotheses` - skips if already loading
- `loadBreakdown` - skips if already generating

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/goal-hub/hypotheses` | GET | List hypotheses for goal |
| `/api/goal-hub/hypotheses` | POST | Create hypothesis |
| `/api/goal-hub/hypotheses` | PUT | Update hypothesis |
| `/api/goal-hub/hypotheses` | DELETE | Delete hypothesis |
| `/api/goal-hub/hypotheses/verify` | POST | Verify with evidence |
| `/api/goal-hub/breakdown` | GET | Get breakdown for goal |
| `/api/goal-hub/breakdown` | POST | Generate breakdown prompt |
| `/api/goal-hub/breakdown` | PUT | Save breakdown result |

## Multi-Agent Breakdown

The breakdown uses agents from `src/app/projects/ProjectAI/ScanIdeas/prompts`:

| Agent | Perspective |
|-------|-------------|
| 🧘 zen_architect | Architecture & design patterns |
| 🐛 bug_hunter | Bug detection & edge cases |
| ⚡ perf_optimizer | Performance optimization |
| 🛡️ security_protector | Security vulnerabilities |
| 🎨 dev_experience_engineer | Developer experience |
| 🔮 insight_synth | Cross-cutting insights |

Each agent provides:
- **Perspective**: How they view the goal
- **Recommendations**: Actionable suggestions
- **Risks**: Potential issues to watch
- **Hypotheses**: Testable conditions

## Hypothesis Categories

- `behavior` - Functional behavior verification
- `performance` - Speed, memory, scalability
- `security` - Vulnerabilities, auth, data protection
- `accessibility` - A11y compliance
- `ux` - User experience quality
- `integration` - Component/service integration
- `edge_case` - Boundary conditions
- `data` - Data integrity, validation
- `error` - Error handling coverage
- `custom` - User-defined

## Evidence Types

When verifying a hypothesis:
- `manual_note` - Text description
- `pr` - Pull request reference
- `test_result` - Test output
- `screenshot` - Visual evidence
- `implementation_log` - From implementation logs

## Future Development

### Planned Features
1. **Claude Code Integration** - Auto-execute breakdown prompts
2. **Hypothesis-to-Task Pipeline** - Generate Claude Code requirements from hypotheses
3. **Auto-verification** - Link to test results and PRs automatically
4. **Goal Templates** - Pre-defined goal structures for common scenarios
5. **Progress Notifications** - Alert when goals are blocked or stalled
6. **Goal Dependencies** - Link goals that depend on each other
7. **Metrics Dashboard** - Track velocity, completion rates, hypothesis accuracy

### Integration Points
- TaskRunner - Execute hypothesis implementations
- Implementation Logs - Auto-link evidence
- Context System - Associate goals with code contexts
- Ideas - Convert ideas to goal hypotheses

## Usage Example

1. **Create a Goal**
   ```
   Title: "Add user authentication with OAuth"
   Description: "Implement Google OAuth login with session management"
   Target Date: 3 days from now
   ```

2. **Generate Breakdown**
   - Click "Generate Breakdown" in Breakdown tab
   - Run the generated requirement with Claude Code
   - Paste the JSON result

3. **Review Hypotheses**
   Generated hypotheses might include:
   - "When user clicks login, OAuth flow initiates within 500ms"
   - "When invalid token received, user sees clear error message"
   - "When session expires, user is redirected to login"

4. **Verify Hypotheses**
   - Start working on a hypothesis (moves to "In Progress")
   - Implement the feature
   - Add evidence (PR link, test results, etc.)
   - Mark as verified

5. **Track Progress**
   - Progress bar updates as hypotheses are verified
   - Goal auto-completes when all hypotheses verified
