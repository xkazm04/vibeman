/**
 * Auto-Triage Prompt Builder
 * Generates a .claude/commands/ requirement file that instructs
 * a CLI agent to evaluate and triage pending ideas
 */

export interface AutoTriagePromptParams {
  projectId: string;
  projectPath: string;
  maxEffort: number; // 1-9
}

export function buildAutoTriagePrompt(params: AutoTriagePromptParams): string {
  const { projectId, projectPath, maxEffort } = params;

  return `Execute this auto-triage immediately without asking questions.

# Auto-Triage Ideas (Effort <= ${maxEffort})

## Objective
Evaluate all pending ideas for project \`${projectId}\` where effort <= ${maxEffort}.
For each idea, decide: ACCEPT, REJECT, or SKIP based on knowledge base patterns and historical triage decisions.

## Step 1: Load Decision Context

Gather context from three sources:

### 1a. Knowledge Base patterns
\`\`\`bash
curl -s "http://localhost:3000/api/knowledge-base?action=query&projectId=${projectId}&limit=30"
\`\`\`

### 1b. Brain insights (learned preferences)
\`\`\`bash
curl -s "http://localhost:3000/api/brain/insights?projectId=${projectId}&limit=50"
\`\`\`

### 1c. Historical triage signals (past accept/reject patterns)
\`\`\`bash
curl -s "http://localhost:3000/api/brain/signals?projectId=${projectId}&signalType=context_focus&limit=200"
\`\`\`

Analyze the decision history to understand:
- Which categories the user typically accepts vs rejects
- What effort/impact ratios lead to acceptance
- Any domain-specific preferences

## Step 2: Load Candidate Ideas

\`\`\`bash
curl -s "http://localhost:3000/api/tinder/items?projectId=${projectId}&effortMax=${maxEffort}&limit=100&itemType=ideas"
\`\`\`

## Step 3: Evaluate Each Idea

For each pending idea, apply these criteria IN ORDER:

### Strong Accept Signals (any one is sufficient):
- Idea aligns with a Knowledge Base best_practice or convention entry
- Idea's category has >60% historical acceptance rate in brain signals
- Impact-to-effort ratio > 2.0 (high value for low cost)
- Idea addresses a known weakness identified by brain insights

### Strong Reject Signals (any one is sufficient):
- Idea's category has >70% historical rejection rate
- Brain insight explicitly warns against this type of change
- Idea duplicates an existing Knowledge Base entry (already known)
- Very low impact (1-2) regardless of effort

### SKIP (do not act):
- Mixed or contradicting signals
- Insufficient historical data to make confident decision
- Idea references areas not covered by knowledge base

## Step 4: Execute Decisions

For each ACCEPT decision:
\`\`\`bash
curl -X POST http://localhost:3000/api/tinder/actions \\
  -H "Content-Type: application/json" \\
  -d '{"itemType": "idea", "itemId": "IDEA_ID", "action": "accept", "projectPath": "${projectPath}"}'
\`\`\`

For each REJECT decision:
\`\`\`bash
curl -X POST http://localhost:3000/api/tinder/actions \\
  -H "Content-Type: application/json" \\
  -d '{"itemType": "idea", "itemId": "IDEA_ID", "action": "reject", "metadata": {"rejectionReason": "Auto-triage: REASON_HERE"}}'
\`\`\`

## Step 5: Report Summary

After processing all ideas, output a clear summary:
- Total ideas evaluated
- Accepted: count + list of titles
- Rejected: count + list of titles with reasons
- Skipped: count (insufficient confidence)

## Constraints
- Never accept more than 20 ideas in a single run
- Never reject ideas with effort=null or impact=null (skip them)
- If knowledge base is empty, rely solely on brain insights and impact/effort ratio
- Log each decision with reasoning before executing
- All API calls must include Content-Type: application/json header
`;
}
