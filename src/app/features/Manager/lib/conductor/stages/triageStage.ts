/**
 * Triage Stage — CLI-Evaluated Idea Scoring + Threshold Accept/Reject
 *
 * Uses a CLI/LLM session to evaluate ideas in context of the codebase
 * and brain behavioral patterns. The CLI scores each idea (effort, impact, risk)
 * via PATCH /api/ideas, then threshold logic accepts or rejects.
 *
 * Flow:
 * 1. Build triage evaluation prompt (ideas + brain context)
 * 2. Dispatch CLI execution with the prompt
 * 3. CLI analyzes codebase, scores ideas, updates via PATCH API
 * 4. Re-fetch ideas from DB (now with scores)
 * 5. Apply threshold logic from BalancingConfig
 * 6. Accept/reject via tinder APIs
 */

import type { BalancingConfig, TriageResult, ProcessLogEntry } from '../types';
import {
  startExecution,
  getExecution,
} from '@/lib/claude-terminal/cli-service';
import type { CLIProviderConfig, CLIModel } from '@/lib/claude-terminal/types';
import { ideaDb } from '@/app/db';
import { getBehavioralContext } from '@/lib/brain/behavioralContext';

interface IdeaForTriage {
  id: string;
  title: string;
  description?: string;
  reasoning?: string;
  category: string;
  scan_type?: string;
  effort: number | null;
  impact: number | null;
  risk: number | null;
}

interface TriageInput {
  ideas: IdeaForTriage[];
  config: BalancingConfig;
  projectId: string;
  projectPath: string;
  projectName?: string;
  abortSignal?: AbortSignal;
  onProgress?: (
    event: ProcessLogEntry['event'],
    message: string,
    extra?: Partial<Pick<ProcessLogEntry, 'itemsIn' | 'itemsOut' | 'durationMs' | 'error'>>
  ) => void;
}

/**
 * Execute the Triage stage: CLI-evaluate ideas, then apply thresholds.
 */
export async function executeTriageStage(input: TriageInput): Promise<TriageResult> {
  const { ideas, config, projectId, projectPath } = input;

  if (ideas.length === 0) {
    return { acceptedIds: [], rejectedIds: [], skippedIds: [] };
  }

  // Check which ideas need scoring (no effort/impact/risk)
  const unscoredIdeas = ideas.filter(
    (i) => i.effort == null || i.impact == null || i.risk == null
  );

  // If there are unscored ideas, dispatch CLI for evaluation
  let cliEvalRan = false;
  if (unscoredIdeas.length > 0) {
    input.onProgress?.('started', `Evaluating ${unscoredIdeas.length} unscored idea${unscoredIdeas.length !== 1 ? 's' : ''} via CLI`, {
      itemsIn: unscoredIdeas.length,
    });

    try {
      await evaluateIdeasViaCLI(unscoredIdeas, config, projectId, projectPath, input.projectName, input.abortSignal);
      cliEvalRan = true;

      input.onProgress?.('completed', `CLI evaluation finished for ${unscoredIdeas.length} idea${unscoredIdeas.length !== 1 ? 's' : ''}`);
    } catch (error) {
      input.onProgress?.('failed', `CLI evaluation failed: ${String(error)}`, {
        error: String(error),
      });
      // Continue with threshold logic using defaults for unscored ideas
    }
  }

  // Re-fetch ideas from DB only if CLI evaluation ran (it may have updated scores via PATCH API)
  const scoredIdeas = cliEvalRan
    ? ideas.map((idea) => {
        const fresh = ideaDb.getIdeaById(idea.id);
        if (fresh && (fresh.effort != null || fresh.impact != null || fresh.risk != null)) {
          return {
            ...idea,
            effort: fresh.effort ?? idea.effort,
            impact: fresh.impact ?? idea.impact,
            risk: fresh.risk ?? idea.risk,
          };
        }
        return idea;
      })
    : ideas;

  // Apply threshold logic
  const acceptedIds: string[] = [];
  const rejectedIds: string[] = [];
  const skippedIds: string[] = [];

  for (const idea of scoredIdeas) {
    const decision = evaluateIdea(idea, config);

    try {
      if (decision === 'accept') {
        await acceptIdea(idea.id, projectPath);
        acceptedIds.push(idea.id);
      } else if (decision === 'reject') {
        await rejectIdea(idea.id, 'auto_triage');
        rejectedIds.push(idea.id);
      } else {
        skippedIds.push(idea.id);
      }
    } catch (error) {
      console.error(`[triage] Failed to process idea ${idea.id}:`, error);
      skippedIds.push(idea.id);
    }
  }

  return { acceptedIds, rejectedIds, skippedIds };
}

/**
 * Dispatch a CLI execution to evaluate ideas in context of the codebase.
 * The CLI scores each idea and updates via PATCH /api/ideas.
 */
async function evaluateIdeasViaCLI(
  ideas: IdeaForTriage[],
  config: BalancingConfig,
  projectId: string,
  projectPath: string,
  projectName?: string,
  abortSignal?: AbortSignal
): Promise<void> {
  // Load brain context for behavioral patterns
  let brainSection = '';
  try {
    const brain = getBehavioralContext(projectId);
    if (brain.hasData) {
      const parts: string[] = [];
      if (brain.patterns.successRate > 0) {
        parts.push(`- Recent success rate: ${Math.round(brain.patterns.successRate * 100)}%`);
      }
      if (brain.currentFocus.activeContexts.length > 0) {
        parts.push(`- Active contexts: ${brain.currentFocus.activeContexts.map(c => c.name).join(', ')}`);
      }
      if (brain.trending.neglectedAreas.length > 0) {
        parts.push(`- Neglected areas (higher impact): ${brain.trending.neglectedAreas.join(', ')}`);
      }
      if (brain.trending.hotEndpoints.length > 0) {
        parts.push(`- Hot endpoints: ${brain.trending.hotEndpoints.join(', ')}`);
      }
      if (brain.currentFocus.recentCommitThemes.length > 0) {
        parts.push(`- Recent commit themes: ${brain.currentFocus.recentCommitThemes.join(', ')}`);
      }
      if (parts.length > 0) {
        brainSection = `\n## Brain Behavioral Context\n${parts.join('\n')}\n`;
      }
    }
  } catch {
    // Continue without brain context
  }

  // Build the idea list for the prompt
  const ideaList = ideas.map((idea, i) => {
    const parts = [`### Idea ${i + 1}: ${idea.title}`, `- **ID**: ${idea.id}`];
    if (idea.category) parts.push(`- **Category**: ${idea.category}`);
    if (idea.scan_type) parts.push(`- **Scan Type**: ${idea.scan_type}`);
    if (idea.description) parts.push(`- **Description**: ${idea.description}`);
    if (idea.reasoning) parts.push(`- **Reasoning**: ${idea.reasoning}`);
    return parts.join('\n');
  }).join('\n\n');

  const baseUrl = getBaseUrl();

  const prompt = `You are evaluating development ideas for an autonomous pipeline triage.
For each idea below, analyze the project codebase to determine:

- **Effort** (1-10): How much work is needed? Consider code complexity, files to change, testing.
- **Impact** (1-10): How much value does this add? User benefit, code quality, performance gains.
- **Risk** (1-10): How risky is this change? Breaking changes, side effects, complexity.

## Scoring Guidelines
- Ideas targeting neglected areas → higher impact
- Ideas in areas with high recent activity → lower effort (familiar code)
- Ideas that affect many files or core infrastructure → higher risk
- Simple cleanup/refactor tasks → low effort, moderate impact
- New features requiring new patterns → higher effort and risk
${brainSection}
## Ideas to Evaluate

${ideaList}

## Instructions

For EACH idea above, evaluate it by analyzing the codebase, then update its scores by running:

\`\`\`bash
curl -s -X PATCH ${baseUrl}/api/ideas -H 'Content-Type: application/json' -d '{"id":"IDEA_ID","effort":N,"impact":N,"risk":N}'
\`\`\`

Replace IDEA_ID with the actual idea ID, and N with your scores (1-10).
Evaluate ALL ${ideas.length} ideas. Do not skip any.`;

  // Dispatch CLI execution
  const providerConfig: CLIProviderConfig = {
    provider: config.triageProvider,
    model: (config.triageModel || undefined) as CLIModel | undefined,
  };

  const executionId = startExecution(
    projectPath,
    prompt,
    undefined,
    undefined,
    providerConfig,
    {
      VIBEMAN_PROJECT_ID: projectId,
      VIBEMAN_STAGE: 'triage',
    }
  );

  console.log(`[triage] Started CLI evaluation ${executionId} for ${ideas.length} ideas`);

  // Wait for CLI execution to complete (poll every 5s, max 8min)
  const maxWaitMs = 8 * 60 * 1000;
  const pollIntervalMs = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (abortSignal?.aborted) {
      throw new Error('Triage aborted by user');
    }

    const execution = getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status === 'completed') {
      break;
    }

    if (execution.status === 'error' || execution.status === 'aborted') {
      throw new Error(`CLI evaluation ${execution.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  const finalExec = getExecution(executionId);
  if (finalExec && finalExec.status === 'running') {
    throw new Error(`CLI evaluation timed out after ${maxWaitMs / 1000}s`);
  }

  console.log(`[triage] CLI evaluation finished for ${ideas.length} ideas`);
}

/**
 * Evaluate a single idea against triage thresholds.
 * Uses default scores (5) for any missing values.
 */
function evaluateIdea(
  idea: IdeaForTriage,
  config: BalancingConfig
): 'accept' | 'reject' | 'skip' {
  const { minImpact, maxEffort, maxRisk } = config;
  const effort = idea.effort ?? 5;
  const impact = idea.impact ?? 5;
  const risk = idea.risk ?? 5;

  // Hard reject: doesn't meet minimum thresholds
  if (impact < minImpact && effort > maxEffort) {
    return 'reject';
  }

  // Hard reject: too risky with low impact
  if (risk > maxRisk && impact < minImpact) {
    return 'reject';
  }

  // Accept: meets all thresholds
  if (impact >= minImpact && effort <= maxEffort && risk <= maxRisk) {
    return 'accept';
  }

  // Borderline: high impact compensates for moderate effort/risk
  if (impact >= minImpact + 2 && effort <= maxEffort + 2) {
    return 'accept';
  }

  // Borderline: low effort compensates for moderate risk
  if (effort <= 3 && risk <= maxRisk + 2) {
    return 'accept';
  }

  // Default: reject in autonomous mode
  return 'reject';
}

async function acceptIdea(ideaId: string, projectPath: string): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/tinder/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemType: 'idea', itemId: ideaId, action: 'accept', projectPath }),
  });

  if (!response.ok) {
    throw new Error(`Accept failed: ${response.status}`);
  }
}

async function rejectIdea(ideaId: string, reason: string): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/api/tinder/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemType: 'idea', itemId: ideaId, action: 'reject', metadata: { rejectionReason: reason } }),
  });

  if (!response.ok) {
    throw new Error(`Reject failed: ${response.status}`);
  }
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
