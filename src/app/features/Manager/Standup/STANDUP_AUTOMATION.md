# Standup Automation System

This document describes the automated standup system that uses Claude (Anthropic) to continuously evaluate goals, update statuses, and generate new goals.

## Overview

The Standup Automation system runs at configurable intervals (1h, 2h, 4h, or 8h) and performs the following tasks:

1. **Goal Evaluation** - Analyzes existing goals based on recent activity
2. **Status Updates** - Automatically updates goal statuses based on evidence
3. **Goal Generation** - Creates new goal candidates based on project analysis
4. **Task Creation** - Generates Claude Code analysis tasks for review

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    STANDUP AUTOMATION ENGINE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Trigger    │───▶│   Analyzer   │───▶│   Executor   │       │
│  │   Service    │    │   (Claude)   │    │   Service    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Scheduler   │    │  Anthropic   │    │ Goal Updates │       │
│  │  (Interval)  │    │    Client    │    │ Task Creation│       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration Options

### Interval
How often the automation runs:
- **1h** - Every hour (frequent monitoring)
- **2h** - Every 2 hours (balanced)
- **4h** - Every 4 hours (moderate)
- **8h** - Every 8 hours (daily check-in)

### Autonomy Level

| Level | Icon | Description |
|-------|------|-------------|
| **Suggest** | 💡 | Only generate suggestions, no auto-changes |
| **Cautious** | 🛡️ | Auto-apply obvious changes (high confidence), suggest others |
| **Autonomous** | 🚀 | Full automation with logging |

### Strategy

| Strategy | Icon | Focus Areas |
|----------|------|-------------|
| **Build** | 🔨 | New features, capabilities, integrations, enhancements |
| **Polish** | ✨ | Refactoring, testing, docs, performance, security |

## Data Flow

```
1. TRIGGER (Scheduler or Manual)
   │
   ▼
2. COLLECT DATA (per project)
   ├── Current goals + hypotheses
   ├── Implementation logs (last N hours)
   ├── Ideas (pending/implemented)
   ├── Context changes
   └── Previous standup insights
   │
   ▼
3. ANTHROPIC CLAUDE EVALUATION
   ├── Goal status recommendations
   ├── Progress estimates
   ├── Blocker detection
   └── New goal suggestions (based on strategy)
   │
   ▼
4. EXECUTE CHANGES
   ├── Update goal statuses (if autonomy allows)
   ├── Create goal candidates (if enabled)
   ├── Generate Claude Code tasks (if enabled)
   └── Log all changes
   │
   ▼
5. NOTIFY & STORE
   ├── Save automation cycle result
   └── UI notification (if configured)
```

## Goal Evaluation Process

When evaluating goals, the system considers:

1. **Hypotheses Status** - How many hypotheses are verified vs pending
2. **Related Implementations** - Recent code changes related to the goal
3. **Related Ideas** - Ideas that map to the goal's context
4. **Activity Metrics** - Files changed, commits, last activity date
5. **Period Stats** - Implementations and ideas in the current period

### Status Transition Rules

| Current | New Status | Condition |
|---------|------------|-----------|
| `open` | `in_progress` | Work has started (implementations, verified hypotheses, significant activity) |
| `in_progress` | `done` | All hypotheses verified OR clear evidence of completion |
| `in_progress` | `blocked` | Explicit blockers identified, no recent progress |
| `blocked` | `in_progress` | Blockers resolved, work resumed |

## Goal Generation Process

Based on the selected **strategy**, the system generates goals from:

### Build Strategy
- Clusters of related pending ideas
- Feature requests and enhancements
- Integration opportunities
- User experience improvements

### Polish Strategy
- Tech debt items that accumulate risk
- Code quality improvements
- Testing gaps
- Documentation needs
- Performance optimizations

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/standup/automation` | GET | Get current status and config |
| `/api/standup/automation` | POST | Start automation with config |
| `/api/standup/automation` | PUT | Update configuration |
| `/api/standup/automation` | DELETE | Stop automation |
| `/api/standup/automation/run` | POST | Trigger immediate run |
| `/api/standup/automation/history` | GET | Get cycle history |

## Files Structure

```
src/lib/standupAutomation/
├── index.ts                    # Main exports
├── automationEngine.ts         # Core orchestrator
├── goalEvaluator.ts            # Goal status evaluation (Anthropic)
├── goalGenerator.ts            # New goal generation (Anthropic)
├── taskCreator.ts              # Claude Code task creation
├── automationScheduler.ts      # Background scheduler
└── types.ts                    # TypeScript interfaces

src/app/features/Manager/Standup/
├── StandupWizard.tsx           # Main stepper component
├── ProjectGoalReview.tsx       # Per-project goal review
├── components/
│   └── AutomationPanel.tsx     # Compact automation controls
└── STANDUP_AUTOMATION.md       # This documentation
```

## UI Controls

The AutomationPanel provides a compact single-row configuration:

```
[Bot] [Play/Stop] [Refresh] | [1h 2h 4h 8h] | [💡 🛡️ 🚀] Cautious | [🔨 ✨] Build | Stats | Next: 45m
```

- **Bot Icon**: Status indicator (green when active)
- **Play/Stop**: Toggle automation on/off
- **Refresh**: Run cycle immediately
- **Interval Buttons**: Select check frequency
- **Autonomy Icons**: Select automation aggressiveness
- **Strategy Icons**: Select goal focus (Build vs Polish)
- **Stats**: Quick view of evaluations, updates, and tasks
- **Next Run**: Countdown to next scheduled run

## Best Practices

1. **Start with Cautious** - Let the system prove itself before going autonomous
2. **Use Build for new projects** - Focus on feature development first
3. **Use Polish for mature projects** - Prioritize code quality and maintenance
4. **Review generated goals** - Even in autonomous mode, periodically review generated goals
5. **Check task queue** - Claude Code tasks may need manual triggering

## Troubleshooting

### Automation not running
- Check if ANTHROPIC_API_KEY is set in environment
- Verify the automation is started (green bot icon)
- Check browser console for errors

### No goals being generated
- Ensure there are pending ideas or tech debt items
- Try switching strategy (Build vs Polish)
- Check if project has sufficient data

### Status not updating
- Verify autonomy level allows auto-updates
- Check confidence thresholds in cautious mode
- Review evaluation evidence in cycle history
