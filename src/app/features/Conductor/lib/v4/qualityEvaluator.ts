/**
 * Conductor V4 Quality Evaluator
 *
 * LLM-powered post-run quality evaluation that scores how well
 * run output satisfied the goal (0-100). When the score falls below
 * a configurable threshold, provides structured critique for refinement.
 *
 * Inspired by AutoResearch's train-evaluate-keep/discard-repeat loop.
 */

import { getDatabase } from '@/app/db/connection';
import {
  startExecution,
  getExecution,
} from '@/lib/claude-terminal/cli-service';
import type { CLIExecutionEvent } from '@/lib/claude-terminal/cli-service';
import type { CLIProviderConfig, CLIProvider, CLIModel } from '@/lib/claude-terminal/types';
import type { V4RunConfig, V4QualityEvaluation } from './types';
import { logger } from '@/lib/logger';

const EVAL_POLL_INTERVAL_MS = 3000;
const EVAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max for evaluation

interface ImplementationLog {
  id: string;
  requirement_name: string;
  title: string;
  overview: string;
  context_id: string | null;
}

/**
 * Evaluate the quality of a V4 run by comparing implementation logs against the goal.
 * Spawns a lightweight CLI session that produces a structured JSON evaluation.
 */
export async function evaluateRunQuality(
  runId: string,
  projectId: string,
  goalTitle: string,
  goalDescription: string | null,
  startedAt: string,
  projectPath: string,
  config: V4RunConfig,
): Promise<V4QualityEvaluation> {
  // 1. Gather implementation logs from this run
  const logs = getImplementationLogs(projectId, startedAt);

  if (logs.length === 0) {
    logger.warn(`[V4 QualityEval] No implementation logs found for run ${runId}`);
    return createFailedEvaluation('No implementation logs found — nothing to evaluate.');
  }

  // 2. Build evaluation prompt
  const evalPrompt = buildEvalPrompt(goalTitle, goalDescription, logs);

  // 3. Spawn evaluation CLI session
  logger.info(`[V4 QualityEval] Starting quality evaluation for run ${runId} (${logs.length} logs)`);

  const textChunks: string[] = [];

  const providerConfig: CLIProviderConfig = {
    provider: (config.provider || 'claude') as CLIProvider,
    model: config.model as CLIModel | undefined,
  };

  const onEvent = (event: CLIExecutionEvent) => {
    if (event.type === 'text' && event.data?.content) {
      textChunks.push(event.data.content as string);
    }
  };

  const executionId = startExecution(
    projectPath,
    evalPrompt,
    undefined,
    onEvent,
    providerConfig,
    {
      VIBEMAN_TASK_ID: `conductor-v4-eval-${runId}`,
    },
  );

  // 4. Wait for evaluation to complete
  const evaluation = await waitForEvaluation(executionId, textChunks);

  logger.info(`[V4 QualityEval] Run ${runId} scored ${evaluation.score}/100: ${evaluation.verdict}`);
  return evaluation;
}

/**
 * Build the evaluation prompt that instructs the LLM to score the run output.
 */
function buildEvalPrompt(
  goalTitle: string,
  goalDescription: string | null,
  logs: ImplementationLog[],
): string {
  const logSummaries = logs.map((log, i) =>
    `### Implementation ${i + 1}: ${log.title}\n- **Requirement:** ${log.requirement_name}\n- **Overview:** ${log.overview}`
  ).join('\n\n');

  return `You are a quality evaluator for an autonomous code generation pipeline. Your job is to evaluate how well the implementation output satisfied the original goal.

## ORIGINAL GOAL

**${goalTitle}**

${goalDescription || 'No additional description provided.'}

## IMPLEMENTATION OUTPUT

The pipeline produced ${logs.length} implementation(s):

${logSummaries}

## YOUR TASK

Evaluate the implementation against the original goal. Produce a JSON evaluation with these fields:

- **score** (0-100): Overall quality score. 90-100 = excellent, 70-89 = good, 50-69 = partial, below 50 = poor.
- **verdict**: One-sentence summary of the evaluation.
- **strengths**: Array of strings — what was done well.
- **gaps**: Array of strings — what's missing or falls short of the goal.
- **suggestions**: Array of strings — specific actionable improvements for a follow-up run.
- **dimensionScores**: Object with:
  - **completeness** (0-100): How much of the goal was addressed.
  - **correctness** (0-100): Whether the implementation is likely correct.
  - **codeQuality** (0-100): Code quality, patterns, maintainability.

## SCORING GUIDELINES

- Score each dimension independently based on the evidence in the implementation logs.
- **completeness**: Count how many distinct goal requirements are reflected in the logs. Missing requirements reduce this score.
- **correctness**: Look for red flags: does the approach make sense? Are there obvious logic errors in the described changes?
- **codeQuality**: Consider patterns, naming, structure described in the overviews.
- The overall **score** should be a weighted average: completeness (50%), correctness (30%), codeQuality (20%).
- Be critical but fair — the goal is to catch genuine gaps, not to penalize minor style choices.

## OUTPUT FORMAT

Output ONLY a JSON block wrapped in \`\`\`json ... \`\`\` fences. No other text before or after.

\`\`\`json
{
  "score": <number>,
  "verdict": "<string>",
  "strengths": ["<string>", ...],
  "gaps": ["<string>", ...],
  "suggestions": ["<string>", ...],
  "dimensionScores": {
    "completeness": <number>,
    "correctness": <number>,
    "codeQuality": <number>
  }
}
\`\`\``;
}

/**
 * Wait for the evaluation CLI session to complete, then parse the JSON result.
 */
async function waitForEvaluation(
  executionId: string,
  textChunks: string[],
): Promise<V4QualityEvaluation> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const execution = getExecution(executionId);

      // Timeout guard
      if (Date.now() - startTime > EVAL_TIMEOUT_MS) {
        clearInterval(interval);
        logger.warn(`[V4 QualityEval] Evaluation timed out after ${EVAL_TIMEOUT_MS / 1000}s`);
        resolve(createFailedEvaluation('Evaluation timed out.'));
        return;
      }

      if (!execution) {
        clearInterval(interval);
        resolve(createFailedEvaluation('Evaluation execution not found.'));
        return;
      }

      // Check for terminal status
      if (execution.status === 'completed' || execution.status === 'error' || execution.status === 'aborted') {
        clearInterval(interval);

        // Also collect text events from execution.events (in case onEvent missed some)
        for (const event of execution.events) {
          if (event.type === 'text' && event.data?.content) {
            const content = event.data.content as string;
            if (!textChunks.includes(content)) {
              textChunks.push(content);
            }
          }
        }

        const fullText = textChunks.join('');
        const parsed = parseEvaluationJson(fullText);
        resolve(parsed);
      }
    }, EVAL_POLL_INTERVAL_MS);
  });
}

/**
 * Parse the evaluation JSON from the LLM's text output.
 */
function parseEvaluationJson(text: string): V4QualityEvaluation {
  // Extract JSON from ```json ... ``` fences
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    // Try bare JSON object
    const bareMatch = text.match(/\{[\s\S]*"score"[\s\S]*"verdict"[\s\S]*\}/);
    if (!bareMatch) {
      logger.warn('[V4 QualityEval] Could not extract evaluation JSON from response');
      return createFailedEvaluation('Could not parse evaluation response.');
    }
    return validateAndNormalize(bareMatch[0]);
  }

  return validateAndNormalize(jsonMatch[1]);
}

/**
 * Validate and normalize the parsed JSON into a V4QualityEvaluation.
 */
function validateAndNormalize(jsonStr: string): V4QualityEvaluation {
  try {
    const raw = JSON.parse(jsonStr) as Record<string, unknown>;

    const score = clamp(Number(raw.score) || 0, 0, 100);
    const verdict = String(raw.verdict || 'No verdict provided.');
    const strengths = toStringArray(raw.strengths);
    const gaps = toStringArray(raw.gaps);
    const suggestions = toStringArray(raw.suggestions);

    const dims = (raw.dimensionScores || {}) as Record<string, unknown>;
    const dimensionScores = {
      completeness: clamp(Number(dims.completeness) || 0, 0, 100),
      correctness: clamp(Number(dims.correctness) || 0, 0, 100),
      codeQuality: clamp(Number(dims.codeQuality) || 0, 0, 100),
    };

    return { score, verdict, strengths, gaps, suggestions, dimensionScores };
  } catch (err) {
    logger.warn(`[V4 QualityEval] JSON parse error: ${err}`);
    return createFailedEvaluation('Evaluation JSON was malformed.');
  }
}

/**
 * Get implementation logs created during a run's time window.
 */
function getImplementationLogs(projectId: string, startedAt: string): ImplementationLog[] {
  const db = getDatabase();
  return db.prepare(
    `SELECT id, requirement_name, title, overview, context_id
     FROM implementation_log
     WHERE project_id = ? AND created_at >= ?
     ORDER BY created_at ASC`
  ).all(projectId, startedAt) as ImplementationLog[];
}

/**
 * Create a default failed evaluation (used for timeouts, parse errors, etc.)
 */
function createFailedEvaluation(reason: string): V4QualityEvaluation {
  return {
    score: 0,
    verdict: reason,
    strengths: [],
    gaps: [reason],
    suggestions: [],
    dimensionScores: { completeness: 0, correctness: 0, codeQuality: 0 },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}
