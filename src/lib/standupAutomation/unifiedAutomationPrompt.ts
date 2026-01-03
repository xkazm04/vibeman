/**
 * Unified Automation Prompt
 * Single Claude Code session that handles everything:
 * - Evaluates current goals with evidence
 * - Analyzes inputs (ideas, tech debt)
 * - Creates new goals directly via API
 * - Generates implementation plans for each goal
 */

import type { DbGoal, DbIdea } from '@/app/db/models/types';
import type { GoalHypothesis } from '@/app/db/models/goal-hub.types';
import type { GoalStrategy, AutonomyLevel } from './types';

const API_BASE_URL = 'http://localhost:3000';

export interface UnifiedAutomationContext {
  sessionId: string;
  projectId: string;
  projectPath: string;
  projectName: string;
  strategy: GoalStrategy;
  autonomyLevel: AutonomyLevel;

  // Current state
  goals: Array<DbGoal & { hypotheses?: GoalHypothesis[] }>;
  pendingIdeas: DbIdea[];
  techDebtItems: Array<{ id: string; title: string; severity: string; description?: string }>;

  // Recent activity
  recentImplementations: Array<{ title: string; filesChanged: string[] }>;
}

/**
 * Build the unified automation prompt for a single comprehensive Claude Code session
 */
export function buildUnifiedAutomationPrompt(context: UnifiedAutomationContext): string {
  const {
    sessionId,
    projectId,
    projectPath,
    projectName,
    strategy,
    autonomyLevel,
    goals,
    pendingIdeas,
    techDebtItems,
    recentImplementations,
  } = context;

  const openGoals = goals.filter(g => g.status === 'open' || g.status === 'in_progress');
  const completedGoals = goals.filter(g => g.status === 'done').slice(0, 5);

  const openGoalsList = openGoals.map(g => {
    const hypothesesInfo = g.hypotheses?.length
      ? `(${g.hypotheses.filter(h => h.status === 'verified').length}/${g.hypotheses.length} hypotheses verified)`
      : '';
    return `  - [${g.status}] ${g.title} ${hypothesesInfo}
    ID: ${g.id}
    ${g.description || 'No description'}`;
  }).join('\n\n');

  const completedGoalsList = completedGoals
    .map(g => `  - ${g.title}`)
    .join('\n') || '  None recently';

  const ideasList = pendingIdeas.slice(0, 15).map(idea =>
    `  - [${idea.scan_type || 'general'}] ${idea.title}`
  ).join('\n') || '  No pending ideas';

  const techDebtList = techDebtItems.slice(0, 10).map(td =>
    `  - [${td.severity}] ${td.title}`
  ).join('\n') || '  No tech debt items';

  const recentWorkList = recentImplementations.slice(0, 5).map(impl =>
    `  - ${impl.title}`
  ).join('\n') || '  No recent implementations';

  const strategyGuidance = strategy === 'build'
    ? `**BUILD MODE - Growth Strategist**

Focus on EXPANDING capabilities and reach:
- Goals should open new possibilities for users
- Prioritize user-facing value creation
- Think: "What can we do that we couldn't before?"
- Preferred themes: user_experience, innovation, scalability

Example strategic goal: "Enable real-time collaborative editing across all document types"`
    : `**POLISH MODE - Excellence Strategist**

Focus on STRENGTHENING foundations:
- Goals should improve what already exists
- Prioritize reliability and maintainability
- Think: "How do we do what we do, but better?"
- Preferred themes: technical_excellence, reliability, security, velocity

Example strategic goal: "Achieve zero-downtime deployments with automatic rollback"`;

  const autonomyGuidance = {
    suggest: 'Only suggest changes, do not execute any modifications.',
    cautious: 'Create goals and plans, but wait for user approval before major actions.',
    autonomous: 'Execute the full workflow autonomously, creating goals and plans directly.',
  }[autonomyLevel];

  return `# Unified Goal Automation Session

You are performing a comprehensive goal management automation for a software project.

**CRITICAL**: This is a SINGLE SESSION. Do NOT create any .claude/commands/*.md files or child tasks. All work happens HERE in this session through direct API calls.

## What You Will Do (ALL in this session):
1. Explore the codebase to understand current state
2. Evaluate existing goals and update their status
3. Create new goals based on ideas/tech debt
4. Create hypotheses for each goal (testable success criteria)
5. Report completion

## Project Information
- **Name**: ${projectName}
- **Path**: ${projectPath}
- **Session ID**: ${sessionId}
- **Project ID**: ${projectId}

## Strategy
${strategyGuidance}

**Autonomy Level**: ${autonomyGuidance}

---

## PHASE 1: Explore the Codebase (Progress: 0-20%)

Explore the project to understand its current state:

1. Read README.md and package.json for project overview
2. Explore src/ directory structure
3. Look at main entry points and core modules
4. Take notes on architecture and patterns used

Report progress after exploration:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/progress" -H "Content-Type: application/json" -d '{"sessionId":"${sessionId}","type":"progress","data":{"progress":20,"message":"Codebase exploration complete","phase":"exploring"}}'
\`\`\`

---

## PHASE 2: Evaluate Existing Goals (Progress: 20-50%)

### Current Open Goals
${openGoalsList || '  No open goals - skip to Phase 3'}

### Recently Completed Goals (for context)
${completedGoalsList}

For EACH open goal above:
1. Search the codebase for evidence of implementation
2. Determine current progress percentage (0-100)
3. Update the goal status if needed

**To update a goal's status/progress:**
\`\`\`bash
curl -X PUT "${API_BASE_URL}/api/goals" -H "Content-Type: application/json" -d '{"id":"GOAL_ID_HERE","status":"in_progress","progress":50}'
\`\`\`

Valid statuses: "open", "in_progress", "done", "blocked"

**To verify a hypothesis (if goal has hypotheses):**
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/goal-hub/hypotheses/verify" -H "Content-Type: application/json" -d '{"id":"HYPOTHESIS_ID","evidence":"Found in src/file.ts:45-60","evidenceType":"code"}'
\`\`\`

Report progress:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/progress" -H "Content-Type: application/json" -d '{"sessionId":"${sessionId}","type":"progress","data":{"progress":50,"message":"Goal evaluation complete","phase":"evaluating"}}'
\`\`\`

---

## PHASE 3: Define Strategic Goals (Progress: 50-70%)

You are now a **Master Strategist**. Step back from individual issues and think about the project's trajectory.

### Strategic Thinking Framework

Before creating goals, answer these questions:
1. **Vision**: Where should this project be in 6 months?
2. **Gaps**: What capabilities are missing to get there?
3. **Leverage**: What small investments yield large returns?
4. **Risks**: What could derail progress if unaddressed?

### Goal Hierarchy - Think in Layers

- **Strategic Goal** (what you create): "Achieve enterprise-grade API performance"
- **Tactical Goals** (become hypotheses): "Implement caching", "Add CDN", "Optimize queries"
- **Tasks** (future work): Individual PRs and tickets

You create the TOP layer only. Each strategic goal should:
- Take 2-8 weeks to fully realize
- Encompass multiple related improvements
- Have outcome-based success criteria
- Connect to business or user value

### Strategic Themes

| Theme | Focus | Example Goal |
|-------|-------|--------------|
| user_experience | Delight & usability | "Deliver instant, intuitive interactions" |
| technical_excellence | Code quality | "Establish maintainable, testable codebase" |
| velocity | Dev speed | "Enable daily deployments with confidence" |
| reliability | Uptime | "Achieve 99.9% uptime with graceful degradation" |
| security | Protection | "Build defense-in-depth security posture" |
| scalability | Growth | "Support 10x load without rearchitecture" |
| developer_experience | Team productivity | "Create self-documenting systems" |
| innovation | New capabilities | "Pioneer AI-assisted workflows" |

### Inputs to Synthesize

**Pending Ideas:**
${ideasList}

**Technical Debt:**
${techDebtList}

**Recent Work:**
${recentWorkList}

### Synthesis Process

1. **CLUSTER**: Group related items by underlying theme
2. **ABSTRACT**: Identify the strategic need each cluster represents
3. **ENVISION**: Describe the ideal end state, not the work to do
4. **PRIORITIZE**: Rank by business impact and urgency

### Transformation Examples

| Tactical Inputs | Strategic Goal |
|-----------------|----------------|
| 5 auth improvement ideas | "Build zero-trust authentication architecture" |
| 3 test-related tech debt | "Achieve comprehensive automated quality assurance" |
| Performance complaints | "Deliver consistently fast user experiences (<100ms)" |
| Security vulnerabilities | "Establish proactive security with automated scanning" |

### Anti-Patterns - AVOID These

❌ **Too Tactical**: "Add input validation to user form"
✅ **Strategic**: "Establish bulletproof data integrity across all inputs"

❌ **Too Tactical**: "Fix N+1 query in user list"
✅ **Strategic**: "Achieve database query efficiency at scale"

❌ **Too Tactical**: "Update dependencies to latest versions"
✅ **Strategic**: "Maintain evergreen, secure dependency ecosystem"

### Goal Validation Checklist

Before creating a goal, verify it passes these tests:
1. **"So What?" test** - Does it connect to business/user value?
2. **"Too Specific?" test** - Could it be a single PR? (If yes, it's too tactical)
3. **"Inspiring?" test** - Would the team want to achieve this?
4. **"Measurable?" test** - Is there a clear definition of done?
5. **"Stable?" test** - Would it remain valid if implementation details change?

### Create 1-3 Strategic Goals

**To create a strategic goal:**
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/goals" -H "Content-Type: application/json" -d '{"projectId":"${projectId}","title":"Strategic vision-level title","description":"Description of the END STATE, not the work. What does success look like?","status":"open"}'
\`\`\`

**IMPORTANT**: After creating each goal, note the returned goal ID - you'll need it for Phase 4.

Report progress:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/progress" -H "Content-Type: application/json" -d '{"sessionId":"${sessionId}","type":"progress","data":{"progress":70,"message":"Strategic goals defined","phase":"generating"}}'
\`\`\`

---

## PHASE 4: Create Hypotheses for Goals (Progress: 70-95%)

For EACH goal (both existing open goals and newly created ones), create 2-4 testable hypotheses.

Hypotheses are specific, verifiable statements that define success criteria for the goal.

**To create a hypothesis:**
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/goal-hub/hypotheses" -H "Content-Type: application/json" -d '{"goalId":"GOAL_ID","projectId":"${projectId}","title":"Short title","statement":"When X happens, Y should occur","reasoning":"Why this matters","category":"behavior","priority":8,"agentSource":"automation"}'
\`\`\`

**Categories:** behavior, performance, security, accessibility, ux, integration, edge_case, data, error
**Priority:** 1-10 (10 = most critical)

Example hypotheses for a "User Authentication" goal:
- "Login form validates email format before submission" (category: behavior)
- "Password is hashed using bcrypt before storage" (category: security)
- "Failed login attempts are rate-limited" (category: security)
- "Session expires after 24 hours of inactivity" (category: behavior)

Report progress:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/progress" -H "Content-Type: application/json" -d '{"sessionId":"${sessionId}","type":"progress","data":{"progress":95,"message":"Hypotheses created","phase":"generating"}}'
\`\`\`

---

## PHASE 5: Report Completion (Progress: 100%)

Summarize what was accomplished:
- Goals evaluated: X
- Goals updated: X
- New goals created: X
- Hypotheses created: X

Then mark session complete:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/progress" -H "Content-Type: application/json" -d '{"sessionId":"${sessionId}","type":"progress","data":{"progress":100,"message":"Automation complete","phase":"complete"}}'
\`\`\`

---

## RULES

1. **NO CHILD TASKS**: Do NOT create any .claude/commands/*.md files. Do NOT call /api/goal-hub/breakdown. All work happens in THIS session.
2. **USE CURL**: All database updates happen via curl API calls shown above.
3. **ESCAPE JSON**: When using curl, ensure JSON strings are properly escaped.
4. **BE SPECIFIC**: When creating hypotheses, make them testable and specific.
5. **REPORT PROGRESS**: Call the progress API after each phase.

## Quick API Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Update Goal | PUT | /api/goals |
| Create Goal | POST | /api/goals |
| Create Hypothesis | POST | /api/goal-hub/hypotheses |
| Verify Hypothesis | POST | /api/goal-hub/hypotheses/verify |
| Report Progress | POST | /api/standup/automation/progress |

Begin with PHASE 1: Explore the codebase.`;
}

/**
 * Build a minimal prompt for quick goal status sync
 */
export function buildQuickSyncPrompt(params: {
  sessionId: string;
  projectId: string;
  projectPath: string;
  goals: DbGoal[];
}): string {
  const { sessionId, projectId, projectPath, goals } = params;

  const openGoals = goals.filter(g => g.status === 'open' || g.status === 'in_progress');

  if (openGoals.length === 0) {
    return `# Quick Sync - No Open Goals

No open goals to evaluate. Consider creating new goals based on the codebase state.

Project: ${projectPath}
Session: ${sessionId}`;
  }

  const goalsList = openGoals.map(g => `- ${g.title} (${g.status}) - ID: ${g.id}`).join('\n');

  return `# Quick Goal Status Sync

Check the current status of these goals and update if needed:

${goalsList}

For each goal, search for evidence and update via:

\`\`\`bash
curl -X PUT "${API_BASE_URL}/api/goals" \\
  -H "Content-Type: application/json" \\
  -d '{"id": "goal-id", "status": "new-status", "progress": 0-100}'
\`\`\`

Report completion:
\`\`\`bash
curl -X POST "${API_BASE_URL}/api/standup/automation/progress" \\
  -H "Content-Type: application/json" \\
  -d '{"sessionId": "${sessionId}", "type": "progress", "data": {"progress": 100, "phase": "complete"}}'
\`\`\``;
}
