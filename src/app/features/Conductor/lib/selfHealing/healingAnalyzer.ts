/**
 * Healing Analyzer — LLM-based failure pattern analysis
 *
 * Takes grouped error classifications and uses an LLM to analyze
 * recurring patterns and suggest prompt/config modifications.
 */

import type { ErrorClassification, HealingPatch, HealingTargetType, ErrorType } from '../types';
import { groupErrorsByType, getErrorDescription } from './errorClassifier';
import { env } from '@/lib/config/envConfig';

interface HealingSuggestion {
  targetType: HealingTargetType;
  targetId: string;
  suggestedPatch: string;
  reason: string;
  errorPattern: string;
}

/**
 * Analyze error patterns and generate healing suggestions.
 *
 * Uses LLM to analyze recurring errors and propose prompt amendments
 * or config adjustments that could prevent future failures.
 */
export async function analyzeErrors(
  errors: ErrorClassification[],
  pipelineRunId: string
): Promise<HealingPatch[]> {
  const grouped = groupErrorsByType(errors);
  const patches: HealingPatch[] = [];

  for (const [errorType, typeErrors] of grouped) {
    // Only trigger healing for recurring errors
    const totalOccurrences = typeErrors.reduce((sum, e) => sum + e.occurrenceCount, 0);
    if (totalOccurrences < 2) continue;

    try {
      const suggestions = await generateHealingSuggestions(errorType, typeErrors);

      for (const suggestion of suggestions) {
        patches.push({
          id: `patch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          pipelineRunId,
          targetType: suggestion.targetType,
          targetId: suggestion.targetId,
          originalValue: '',
          patchedValue: suggestion.suggestedPatch,
          reason: suggestion.reason,
          errorPattern: suggestion.errorPattern,
          appliedAt: new Date().toISOString(),
          reverted: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    } catch (error) {
      console.error(`[healing] Failed to analyze ${errorType} errors:`, error);
    }
  }

  return patches;
}

/**
 * Generate healing suggestions for a specific error type.
 *
 * Uses pattern matching for common fixes. For complex cases,
 * delegates to LLM analysis via the /api/llm/generate endpoint.
 */
async function generateHealingSuggestions(
  errorType: string,
  errors: ErrorClassification[]
): Promise<HealingSuggestion[]> {
  const errorDescription = getErrorDescription(errorType as ErrorType);
  const errorMessages = errors.map((e) => e.errorMessage).slice(0, 5);
  const stages = [...new Set(errors.map((e) => e.stage))];

  // Rule-based healing for common patterns
  const ruleSuggestions = applyRuleBasedHealing(errorType, errors);
  if (ruleSuggestions.length > 0) {
    return ruleSuggestions;
  }

  // LLM-based analysis for complex patterns
  try {
    return await llmBasedHealing(errorType, errorDescription, errorMessages, stages);
  } catch {
    // Fallback to generic suggestion
    return [
      {
        targetType: 'prompt',
        targetId: `healing_${errorType}`,
        suggestedPatch: `\n\n## Known Issue: ${errorDescription}\nPrevious attempts failed with: ${errorMessages[0]}\nPlease ensure you handle this case carefully and avoid the same error.`,
        reason: `Recurring ${errorType} errors (${errors.length} occurrences)`,
        errorPattern: errorMessages[0] || errorType,
      },
    ];
  }
}

/**
 * Rule-based healing for common, well-understood error patterns.
 */
function applyRuleBasedHealing(
  errorType: string,
  errors: ErrorClassification[]
): HealingSuggestion[] {
  const errorMsg = errors[0]?.errorMessage || '';

  switch (errorType) {
    case 'timeout': {
      return [
        {
          targetType: 'config',
          targetId: 'maxBatchSize',
          suggestedPatch: 'Reduce maxBatchSize to decrease per-task complexity',
          reason: 'Tasks are timing out — likely too complex for single execution',
          errorPattern: errorMsg,
        },
        {
          targetType: 'prompt',
          targetId: 'healing_timeout',
          suggestedPatch: '\n\n## Execution Constraint\nKeep changes focused and minimal. If the task seems too large, implement only the most critical part and document remaining work as TODO comments.',
          reason: 'Previous tasks timed out — adding scope constraint to prompts',
          errorPattern: errorMsg,
        },
      ];
    }

    case 'missing_context': {
      return [
        {
          targetType: 'prompt',
          targetId: 'healing_missing_context',
          suggestedPatch: '\n\n## File Discovery\nBefore modifying any file, first use the Read tool to verify it exists and understand its current content. If a file is not found, search for alternative locations using Glob.',
          reason: 'Tasks failed due to missing file context — adding file discovery instructions',
          errorPattern: errorMsg,
        },
      ];
    }

    case 'tool_failure': {
      return [
        {
          targetType: 'prompt',
          targetId: 'healing_tool_failure',
          suggestedPatch: '\n\n## Edit Safety\nWhen using the Edit tool, ensure old_string matches exactly (including whitespace). If an edit fails, re-read the file and retry with the correct content. Never use Edit on files you haven\'t read first.',
          reason: 'CLI tool operations are failing — adding safety instructions',
          errorPattern: errorMsg,
        },
      ];
    }

    case 'dependency_missing': {
      return [
        {
          targetType: 'prompt',
          targetId: 'healing_dependency',
          suggestedPatch: '\n\n## Dependency Awareness\nBefore importing or using any package, verify it exists in package.json. Do not add new dependencies unless explicitly required. Use existing utilities and patterns from the codebase.',
          reason: 'Missing dependency errors — adding import verification instructions',
          errorPattern: errorMsg,
        },
      ];
    }

    case 'invalid_output': {
      // Zero ideas generated — healing focuses on improving scan prompts
      const isZeroIdeas = errorMsg.toLowerCase().includes('0 ideas') || errorMsg.toLowerCase().includes('zero ideas');
      if (isZeroIdeas) {
        return [
          {
            targetType: 'prompt',
            targetId: 'healing_zero_ideas',
            suggestedPatch: '\n\n## Idea Generation Recovery\nPrevious scan attempts generated zero ideas. To fix this:\n1. Make sure to call the Vibeman API at the correct URL to save ideas\n2. Read at least 5-10 source files before generating ideas\n3. Generate at least 3 ideas even if they are minor improvements\n4. Verify each API call succeeds by checking the response',
            reason: 'Scout produced 0 ideas — adding explicit generation instructions',
            errorPattern: errorMsg,
          },
          {
            targetType: 'config',
            targetId: 'scanStrategy',
            suggestedPatch: 'Consider switching scan strategy or scan types if current combination produces no results',
            reason: 'Zero ideas may indicate incompatible scan types for this project',
            errorPattern: errorMsg,
          },
        ];
      }
      return [
        {
          targetType: 'prompt',
          targetId: 'healing_invalid_output',
          suggestedPatch: '\n\n## Output Validation\nEnsure all outputs match the expected format. Verify API responses before proceeding to the next step.',
          reason: 'Invalid output detected — adding validation instructions',
          errorPattern: errorMsg,
        },
      ];
    }

    default:
      return [];
  }
}

/**
 * LLM-based healing analysis for complex error patterns.
 */
async function llmBasedHealing(
  errorType: string,
  errorDescription: string,
  errorMessages: string[],
  stages: string[]
): Promise<HealingSuggestion[]> {
  const prompt = buildHealingAnalysisPrompt(errorType, errorDescription, errorMessages, stages);

  const response = await fetch(`${getBaseUrl()}/api/llm/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      taskType: 'healing_analysis',
      maxTokens: 500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.userMessage || errorData.error || `LLM analysis failed: ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const suggestion = data.content || data.text || '';

  if (!suggestion) {
    throw new Error('Empty LLM response');
  }

  return [
    {
      targetType: 'prompt',
      targetId: `healing_${errorType}_llm`,
      suggestedPatch: `\n\n## Auto-Healing Note\n${suggestion}`,
      reason: `LLM analysis of recurring ${errorType} errors in ${stages.join(', ')} stages`,
      errorPattern: errorMessages[0] || errorType,
    },
  ];
}

function buildHealingAnalysisPrompt(
  errorType: string,
  errorDescription: string,
  errorMessages: string[],
  stages: string[]
): string {
  return `You are analyzing recurring errors in an autonomous development pipeline.

Error Type: ${errorType}
Description: ${errorDescription}
Affected Stages: ${stages.join(', ')}

Recent Error Messages:
${errorMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Based on these patterns, write a concise instruction (2-3 sentences) that should be added to the task prompt to prevent this error from recurring. Focus on actionable guidance, not explanations.

Write ONLY the instruction text, nothing else.`;
}

function getBaseUrl(): string {
  return env.appUrl();
}
