/**
 * Conductor V4 Prompt Builder
 *
 * Assembles the master prompt from all DB sources for a single
 * Claude Code CLI session with 1M context window.
 */

import type { V4PreFlightData } from './types';

/**
 * Build the complete V4 master prompt.
 *
 * Includes: goal, context orientation, knowledge base, collective memory,
 * brain insights, existing ideas, and the V4 execution protocol.
 */
export function buildV4Prompt(data: V4PreFlightData): string {
  const sections: string[] = [];

  // ── GOAL ──
  sections.push(`# GOAL\n\n**${data.goal.title}**\n\n${data.goal.description || 'No additional description provided.'}`);

  // ── CONTEXT ORIENTATION ──
  if (data.contexts.length > 0) {
    const contextLines = data.contexts.map(ctx => {
      const filePaths = safeParseJSON(ctx.file_paths, []);
      const files = Array.isArray(filePaths) ? filePaths.slice(0, 20).join(', ') : '';
      return [
        `### ${ctx.name}${ctx.group_name ? ` (${ctx.group_name})` : ''}`,
        ctx.description ? ctx.description : '',
        ctx.target ? `**Target:** ${ctx.target}` : '',
        ctx.target_fulfillment ? `**Progress:** ${ctx.target_fulfillment}` : '',
        `**Implemented tasks:** ${ctx.implemented_tasks || 0}`,
        files ? `**Key files:** ${files}` : '',
      ].filter(Boolean).join('\n');
    });

    const scope = data.goal.contextId
      ? 'Focus on this specific context area:'
      : 'The app has the following context areas for orientation:';

    sections.push(`# CONTEXT ORIENTATION\n\n${scope}\n\n${contextLines.join('\n\n')}`);
  }

  // ── KNOWLEDGE BASE ──
  if (data.knowledge.length > 0) {
    const kbLines = data.knowledge.slice(0, 15).map(k => {
      let entry = `- **${k.title}** (${k.domain}/${k.layer}, ${k.pattern_type}, confidence: ${k.confidence}%)\n  ${k.pattern}`;
      if (k.code_example) {
        entry += `\n  Example: \`${k.code_example.substring(0, 200)}\``;
      }
      if (k.anti_pattern) {
        entry += `\n  Avoid: ${k.anti_pattern.substring(0, 150)}`;
      }
      return entry;
    });

    sections.push(`# KNOWLEDGE BASE\n\nProven patterns and conventions for this project:\n\n${kbLines.join('\n')}`);
  }

  // ── COLLECTIVE MEMORY ──
  if (data.memory.length > 0) {
    const memLines = data.memory.slice(0, 10).map(m =>
      `- **${m.title}** (${m.memory_type}, effectiveness: ${Math.round(m.effectiveness_score * 100)}%)\n  ${m.description}${m.code_pattern ? `\n  Pattern: \`${m.code_pattern.substring(0, 200)}\`` : ''}`
    );

    sections.push(`# COLLECTIVE MEMORY\n\nEffective approaches from past executions:\n\n${memLines.join('\n')}`);
  }

  // ── BRAIN INSIGHTS ──
  if (data.insights.length > 0) {
    const insightLines = data.insights.slice(0, 10).map(i =>
      `- [${i.insight_type}] **${i.title}** (confidence: ${i.confidence}%)\n  ${i.description}`
    );

    sections.push(`# BRAIN INSIGHTS\n\nLearned patterns and warnings for this project:\n\n${insightLines.join('\n')}`);
  }

  // ── EXISTING IDEAS ──
  if (data.existingIdeas.length > 0) {
    const ideaLines = data.existingIdeas.slice(0, 20).map(i =>
      `- [${i.status}] ${i.title} (${i.category})`
    );

    sections.push(`# EXISTING IDEAS\n\nThese ideas already exist — avoid duplicating them:\n\n${ideaLines.join('\n')}`);
  }

  // ── V4 EXECUTION PROTOCOL ──
  sections.push(buildV4Protocol(data.isNextJS));

  return sections.join('\n\n---\n\n');
}

/**
 * The V4 execution protocol embedded in the prompt.
 * Instructs Claude Code on the autonomous pipeline behavior.
 */
function buildV4Protocol(isNextJS: boolean): string {
  const testingInstructions = isNextJS
    ? `- You have browser access via --chrome. After implementing changes:
  - Start the dev server if not running
  - Navigate to pages affected by your changes
  - Verify they render correctly and key interactions work
  - Decide the scope of testing based on what you changed
  - If browser testing fails or is technically impossible, log the issue and continue — testing is non-blocking`
    : `- After implementing changes:
  - Write basic test coverage for new or modified functions
  - Run existing tests to verify no regressions
  - If tests can't run or fail for infrastructure reasons, log the reason and continue — testing is non-blocking`;

  return `# EXECUTION PROTOCOL (Conductor V4)

You are executing an autonomous development pipeline. Follow this protocol precisely.

## STEP 1 — ANALYZE & PLAN
- Read the relevant codebase files to understand the current state
- Use the CONTEXT ORIENTATION above to navigate the app structure
- Use the \`get_knowledge\` MCP tool if you need patterns for unfamiliar domains
- Use the \`get_memory\` MCP tool to check for known approaches and pitfalls
- Break the goal into concrete implementation requirements
- Call \`save_plan\` with your list of requirements (this persists them as Ideas for tracking)
- If save_plan says approval is required, STOP and wait — otherwise proceed immediately
- Call \`report_progress\` with phase="planning" and include your plan summary in the message

## STEP 2 — EXECUTE EACH REQUIREMENT
For each requirement in your plan:
  a) Implement the changes
  b) Call \`report_progress\` with phase="implementing", list files changed, and estimate percentage complete
  c) After completing each requirement, call \`log_implementation\` with:
     - requirementName: a descriptive slug (e.g., "add-user-auth-middleware")
     - title: brief 2-6 word summary
     - overview: 1-2 paragraphs describing what was done
     - overviewBullets: key changes separated by newlines
     - testResult: "passed", "failed", or "skipped" (from Step 3)
     - testDetails: what was tested or why it was skipped
  d) Continue to the next requirement

## STEP 3 — TEST (non-blocking, per requirement)
${testingInstructions}
- Record the test outcome when calling \`log_implementation\`:
  - testResult="passed" if tests/browser verification succeeded
  - testResult="failed" if tests broke (include details in testDetails)
  - testResult="skipped" if testing was not possible (include reason in testDetails)

## STEP 4 — FINALIZE
- Call \`report_progress\` with phase="validating" and percentage=100
- Ensure \`log_implementation\` was called for every completed requirement
- Provide a final summary of everything accomplished

## RULES
- Use \`get_knowledge\` tool when working in unfamiliar code areas
- Use \`get_memory\` tool to check for known patterns and pitfalls before major decisions
- Use \`save_plan\` after planning to persist your requirements as Ideas
- Use \`report_progress\` at each major milestone so the dashboard stays updated
- If you encounter rate limits, wait and retry — do NOT stop the pipeline
- If a requirement is blocked (missing dependency, unclear spec), skip it, log why via \`report_progress\`, and continue with the next one
- Testing is non-blocking: if impossible for any technical reason, document the reason and move on
- Do NOT ask the user questions — make reasonable decisions autonomously
- Commit your changes when you feel a logical unit of work is complete`;
}

function safeParseJSON(str: string, fallback: unknown): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
