# Brain 2.0: Behavioral Learning & Autonomous Reflection

## Overview

Brain 2.0 is a self-improving system that actively observes user behavior, injects contextual awareness into AI generation, tracks implementation outcomes, and autonomously reflects on patterns to update its guidance.

**Key principle**: Claude Code remains the main LLM processor. Brain provides context and learns from outcomes.

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Signal Collector   │────>│  Behavioral Context  │────>│ Direction Generation│
│  (git, API, focus)  │     │  Injector            │     │ (+ Ideas, Goals)    │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
         │                           │                            │
         v                           v                            v
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│ behavioral_signals  │     │  brain-guide.md      │     │   directions table  │
│ table               │     │  (evolves over time) │     │   + outcomes        │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
                                     ^                            │
                                     │                            v
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Reflection Agent   │<────│  Pattern Analyzer    │<────│  Outcome Tracker    │
│  (Claude Code)      │     │                      │     │  (post-execution)   │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

---

## Components

### Database Layer

| File | Purpose |
|------|---------|
| `src/app/db/migrations/054_brain_v2.ts` | Schema: `behavioral_signals`, `direction_outcomes`, `brain_reflections` |
| `src/app/db/models/brain.types.ts` | TypeScript interfaces for all Brain entities |
| `src/app/db/repositories/behavioral-signal.repository.ts` | Signal CRUD + aggregation queries |
| `src/app/db/repositories/direction-outcome.repository.ts` | Outcome CRUD + statistics |
| `src/app/db/repositories/brain-reflection.repository.ts` | Reflection session management |

### Core Library

| File | Purpose |
|------|---------|
| `src/lib/brain/signalCollector.ts` | Captures behavioral signals (git, API, context, implementation) |
| `src/lib/brain/behavioralContext.ts` | Computes context from signals + formats for prompts |
| `src/lib/brain/outcomeTracker.ts` | Tracks direction implementation outcomes |
| `src/lib/brain/reflectionAgent.ts` | Orchestrates autonomous reflection sessions |
| `src/lib/brain/reflectionPromptBuilder.ts` | Builds Claude Code requirements for reflection |

### API Layer

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/brain/signals` | GET, POST | Record and query behavioral signals |
| `/api/brain/context` | GET | Get computed behavioral context |
| `/api/brain/outcomes` | GET | Get outcomes + statistics |
| `/api/brain/reflection` | GET, POST | Reflection status + manual trigger |
| `/api/brain/reflection/[id]/complete` | POST | Called by Claude Code when reflection finishes |
| `/api/directions/[id]/outcome` | GET, POST, PUT | Record/update direction outcomes |

### UI Layer

| File | Purpose |
|------|---------|
| `src/app/features/Brain/BrainLayout.tsx` | Main dashboard layout |
| `src/app/features/Brain/components/BehavioralFocusPanel.tsx` | Current user focus areas + API trends |
| `src/app/features/Brain/components/OutcomesSummary.tsx` | Implementation success/failure stats |
| `src/app/features/Brain/components/ReflectionStatus.tsx` | Reflection agent status + trigger button |
| `src/app/features/Brain/components/InsightsPanel.tsx` | Learning insights from reflections |
| `src/stores/brainStore.ts` | Zustand store for Brain UI state |

---

## How It Works

### 1. Signal Collection

Behavioral signals are recorded when users interact with the system. Each signal has a type, optional context association, JSON data payload, and a decay weight.

**Signal types**:
- `git_activity` - Commit messages, file changes, branch activity
- `api_focus` - Which API endpoints are used most
- `context_focus` - Which code areas the user is working on
- `implementation` - Claude Code execution results

### 2. Behavioral Context Injection

Before generating directions (or other AI output), the system computes a `BehavioralContext` from recent signals:

```typescript
interface BehavioralContext {
  currentFocus: {
    activeContexts: Array<{ id, name, activityScore }>;
    recentFiles: string[];
    recentCommitThemes: string[];
  };
  trending: {
    hotEndpoints: Array<{ path, trend, changePercent }>;
    activeFeatures: string[];
    neglectedAreas: string[];
  };
  patterns: {
    successRate: number;
    recentSuccesses: number;
    recentFailures: number;
    revertedCount: number;
    averageTaskDuration: number;
    preferredContexts: string[];
  };
}
```

This context is formatted into ~500 tokens and appended to generation prompts.

### 3. Outcome Tracking

After a direction is implemented, the system records:
- Execution success/failure
- Git commit SHA and files changed
- Lines added/removed
- Revert detection (periodic git log checks)
- User satisfaction rating (optional)

### 4. Autonomous Reflection

When enough decisions accumulate (default: 20), the reflection agent:
1. Gathers accepted/rejected directions with outcomes
2. Builds a Claude Code requirement analyzing patterns
3. Generates learning insights (preferences, patterns, warnings, recommendations)
4. Updates `brain-guide.md` with new examples and patterns
5. Records insights to the database

**Trigger conditions**:
- Primary: 20+ accept/reject decisions since last reflection
- Secondary: 7+ days without reflection
- Manual: Always available via API/UI
- Minimum gap: 24 hours between reflections

---

## Data Collection Events

The following table maps codebase events to Brain signal types. Each row is a proposed integration point where `signalCollector.record()` should be called.

### Signal Collection Points

| Event | Signal Type | Source File | Hook Point | Status |
|-------|-------------|-------------|------------|--------|
| Git commit/push | `git_activity` | `src/app/api/git/commit-and-push/route.ts` | After successful command execution | Planned |
| Claude Code executes with git | `git_activity` | `src/app/Claude/sub_ClaudeCodeManager/executionManager.ts` | On execution completion | Done |
| Any API call made | `api_focus` | `src/lib/observability/middleware.ts` | `logApiCall()` | Planned |
| Context created | `context_focus` | `src/app/api/contexts/route.ts` | After createContext() | Done |
| Context updated | `context_focus` | `src/app/api/contexts/route.ts` | After updateContext() | Done |
| Context deleted | `context_focus` | `src/app/api/contexts/route.ts` | After delete | Planned |
| Requirement queued | `implementation` | `src/app/Claude/lib/claudeExecutionQueue.ts` | addTask() | Planned |
| Requirement executing | `implementation` | `src/app/Claude/sub_ClaudeCodeManager/executionManager.ts` | Start/completion | Planned |
| Task runner batch start | `implementation` | `src/app/features/TaskRunner/store/useTaskRunnerHooks.ts` | useStartBatchExecution() | Planned |
| Implementation log created | `implementation` | `src/app/api/implementation-logs/route.ts` | POST handler | Done |
| Direction generated | `implementation` | `src/app/api/directions/generate/route.ts` | After generation | Planned |
| Direction accepted | `implementation` | `src/app/api/directions/[id]/accept/route.ts` | After acceptance | Done |
| Idea accepted | `implementation` | `src/app/api/ideas/tinder/accept/route.ts` | After status update | Done |
| Idea rejected | `implementation` | `src/app/api/ideas/tinder/reject/route.ts` | After status update | Done |
| Ideas generated | `implementation` | `src/app/api/ideas/generate/route.ts` | After generation | Planned |
| Goal created | `context_focus` | `src/app/api/goals/route.ts` | After creation | Done |
| File changes detected | `git_activity` | `src/app/Claude/lib/contextAutoUpdate.ts` | After detectFileChanges() | Done |
| Ideas browsed | `context_focus` | `src/app/api/ideas/tinder/route.ts` | GET handler | Planned |

### Priority for Integration

**Phase A (Core Loop)** - Collect immediately:
1. Direction accepted/rejected (drives reflection)
2. Requirement execution completion (outcomes)
3. Git commit after implementation (git_activity)
4. File changes detected (implementation confirmation)

**Phase B (Enrichment)** - Collect for context:
5. Context CRUD operations (context_focus)
6. Idea accept/reject (preference signals)
7. API call patterns (via existing observability)

**Phase C (Advanced)** - Nice to have:
8. Goal creation (strategic intent)
9. Blueprint scans (project evolution)
10. Batch execution patterns (workflow preferences)

---

## Brain Context Usage Opportunities

The following table maps locations where Brain behavioral context can be injected to improve AI-generated output.

| Location | File | Function | Brain Enhancement | Priority |
|----------|------|----------|-------------------|----------|
| Direction Generation | `src/app/api/directions/generate/route.ts` | `handlePost()` | Prioritize active areas, respect success patterns | **DONE** |
| Idea Generation | `src/app/projects/ProjectAI/ScanIdeas/generateIdeas.ts` | `buildIdeaGenerationPrompt()` | Filter agents by success patterns, target active contexts | HIGH |
| Goal Generation | `src/lib/goalGenerator.ts` | `buildUserPrompt()` | Weight sources by historical success, align with patterns | HIGH |
| Standup Automation | `src/lib/standupAutomation/automationPrompts.ts` | Multiple builders | Guide goal generation, weight evaluation confidence | MEDIUM-HIGH |
| Refactor Packages | `src/app/features/RefactorWizard/lib/packageGenerator.ts` | `buildStrategyPrompt()` | Prioritize packages in active contexts | MEDIUM-HIGH |
| Context Description | `src/app/api/contexts/generate-description/route.ts` | `buildContextDescriptionPrompt()` | Reference patterns from similar contexts | MEDIUM |
| Context Metadata | `src/app/api/contexts/generate-metadata/route.ts` | `buildMetadataPrompt()` | Suggest groups based on user's typical organizations | MEDIUM |
| Question Generation | `src/app/api/questions/generate/route.ts` | `buildQuestionRequirement()` | Focus questions on struggle areas | MEDIUM |
| Goal Evaluation | `src/lib/standupAutomation/goalEvaluator.ts` | `buildEvaluationPrompt()` | Adjust confidence by evaluation accuracy history | MEDIUM |
| Task Creator | `src/lib/standupAutomation/taskCreator.ts` | Multiple builders | Adjust scope by typical effort patterns | MEDIUM |
| Execution Prompt | `src/app/Claude/lib/executionPrompt.ts` | `buildExecutionPrompt()` | Add behavioral hints for Claude Code sessions | MEDIUM |
| Blueprint Scans | `src/app/features/Onboarding/sub_Blueprint/lib/` | Various adapters | Adapt scan depth by project complexity history | MEDIUM |
| Refactor Analysis | `src/app/api/refactor/analyze/route.ts` | `scanProjectFiles()` | Filter by categories user typically addresses | MEDIUM |

### Recommended Integration Sequence

1. **Quick Wins** (highest value per effort):
   - Idea Generation - inject active contexts + success patterns
   - Goal Generator - weight by behavioral history
   - Standup prompts - add behavioral awareness

2. **High-Impact** (deeper integration):
   - Refactor Package Generator - prioritize by activity
   - Context metadata - smarter grouping
   - Question Generation - focus on weak areas

3. **Comprehensive** (full coverage):
   - Task Creator templates
   - Blueprint scanning depth
   - Execution prompts with behavioral hints

---

## Reflection Process

### Trigger Logic

```
shouldReflect = (
  decisionsSinceLastReflection >= threshold (default: 20)
  OR daysSinceLastReflection >= 7
) AND hoursSinceLastReflection >= 24
```

### Reflection Flow

1. **Check trigger** - API call or manual button
2. **Gather data** - Recent accepted/rejected directions, outcomes, signals
3. **Build requirement** - Claude Code requirement file with analysis instructions
4. **Execute** - Claude Code session analyzes patterns
5. **Record results** - Insights stored in DB, guide updated
6. **Notify** - Status updated in UI

### Learning Insight Types

| Type | Meaning | Example |
|------|---------|---------|
| `preference_learned` | User consistently favors a pattern | "Prefers small, focused directions over broad refactors" |
| `pattern_detected` | Recurring behavior identified | "Most productive in TaskRunner context on Mondays" |
| `warning` | Concerning pattern | "3 of last 5 implementations were reverted" |
| `recommendation` | Suggested improvement | "Consider breaking up large directions (>500 lines)" |

---

## Cold Start Behavior

When no signals exist:
- Behavioral context returns `{ hasData: false }` - no injection
- Outcomes panel shows empty state
- Reflection requires minimum 10 decisions before triggering
- System falls back to existing `brain-guide.md` defaults
- All panels show helpful "get started" messages

---

## Configuration

### Defaults

| Setting | Value | Purpose |
|---------|-------|---------|
| Signal window | 7 days | How far back to look for signals |
| Context token cap | ~500 tokens | Max behavioral context in prompts |
| Reflection threshold | 20 decisions | Decisions before auto-reflection |
| Min reflection gap | 24 hours | Prevent reflection loops |
| Weekly fallback | 7 days | Reflect even without threshold |
| Signal decay | Weight-based | Newer signals weigh more |

---

## API Reference

### POST /api/brain/signals

Record a behavioral signal.

```json
{
  "projectId": "proj_123",
  "signalType": "git_activity",
  "contextId": "ctx_456",
  "contextName": "TaskRunner",
  "data": { "filesChanged": ["src/foo.ts"], "commitMessage": "Fix bug" },
  "weight": 1.0
}
```

### GET /api/brain/context?projectId=xxx

Returns computed behavioral context for prompt injection.

### GET /api/brain/outcomes?projectId=xxx&limit=10

Returns recent outcomes and statistics.

### GET /api/brain/reflection?projectId=xxx

Returns reflection status, last reflection, and trigger information.

### POST /api/brain/reflection

Trigger a manual reflection.

```json
{
  "projectId": "proj_123",
  "projectName": "My Project",
  "projectPath": "/path/to/project",
  "triggerType": "manual"
}
```

### POST /api/directions/[id]/outcome

Record an implementation outcome.

```json
{
  "projectId": "proj_123",
  "executionStartedAt": "2024-01-01T00:00:00Z"
}
```

### PUT /api/directions/[id]/outcome

Update outcome with results.

```json
{
  "executionSuccess": true,
  "commitSha": "abc123",
  "filesChanged": ["src/foo.ts"],
  "linesAdded": 50,
  "linesRemoved": 10
}
```

---

## UI Navigation

Access the Brain dashboard via **TopBar > Other > Brain**.

The dashboard shows 4 panels:
- **Behavioral Focus** (left) - Active contexts, commit themes, API trends
- **Outcomes Summary** (right top) - Success rate, recent outcomes
- **Reflection Status** (right middle) - Last reflection, trigger progress, manual button
- **Insights Panel** (bottom, full width) - Learning insights from reflections
