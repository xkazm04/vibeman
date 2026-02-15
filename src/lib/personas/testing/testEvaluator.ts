/**
 * Persona Design Test Evaluator
 *
 * Two evaluation engines:
 *  1. evaluateStructural() - deterministic checks against expectations
 *  2. evaluateSemantic()   - LLM-based quality evaluation via Claude CLI
 *
 * Follows the same CLI spawning and stream-json parsing patterns as designEngine.ts.
 */

import type { DesignAnalysisResult } from '@/app/features/Personas/lib/designTypes';
import type {
  StructuralExpectation,
  StructuralEvaluation,
  StructuralCheck,
  SemanticEvaluation,
  SemanticDimension,
  DesignTestCase,
} from './testTypes';

// ============================================================================
// Structural Evaluation
// ============================================================================

/**
 * Deterministic evaluation of a design result against structural expectations.
 * Each check has a weight; the final score is the weighted percentage of passed
 * checks (only counting checks whose expectations were actually specified).
 * Pass threshold: score >= 80.
 */
export function evaluateStructural(
  result: DesignAnalysisResult,
  expectations: StructuralExpectation
): StructuralEvaluation {
  const checks: StructuralCheck[] = [];

  // ---- 1. toolCount (weight: 10) ----
  if (expectations.minTools !== undefined || expectations.maxTools !== undefined) {
    const actual = result.suggested_tools.length;
    const min = expectations.minTools ?? 0;
    const max = expectations.maxTools ?? Infinity;
    const passed = actual >= min && actual <= max;
    checks.push({
      name: 'toolCount',
      passed,
      expected: `${min}-${max === Infinity ? 'unlimited' : max}`,
      actual,
      weight: 10,
      message: passed
        ? `Tool count ${actual} is within [${min}, ${max === Infinity ? 'unlimited' : max}]`
        : `Tool count ${actual} is outside expected range [${min}, ${max === Infinity ? 'unlimited' : max}]`,
    });
  }

  // ---- 2. requiredConnectors (weight: 20) ----
  if (expectations.requiredConnectors && expectations.requiredConnectors.length > 0) {
    const actualNames = (result.suggested_connectors ?? []).map((c) =>
      c.name.toLowerCase()
    );
    const missing: string[] = [];
    for (const expected of expectations.requiredConnectors) {
      if (!actualNames.includes(expected.toLowerCase())) {
        missing.push(expected);
      }
    }
    const passed = missing.length === 0;
    checks.push({
      name: 'requiredConnectors',
      passed,
      expected: expectations.requiredConnectors,
      actual: actualNames,
      weight: 20,
      message: passed
        ? `All required connectors found: ${expectations.requiredConnectors.join(', ')}`
        : `Missing connectors: ${missing.join(', ')}`,
    });
  }

  // ---- 3. requiredTriggerTypes (weight: 15) ----
  if (expectations.requiredTriggerTypes && expectations.requiredTriggerTypes.length > 0) {
    const actualTypes = result.suggested_triggers.map((t) => t.trigger_type);
    const missing: string[] = [];
    for (const expected of expectations.requiredTriggerTypes) {
      if (!actualTypes.includes(expected)) {
        missing.push(expected);
      }
    }
    const passed = missing.length === 0;
    checks.push({
      name: 'requiredTriggerTypes',
      passed,
      expected: expectations.requiredTriggerTypes,
      actual: actualTypes,
      weight: 15,
      message: passed
        ? `All required trigger types found: ${expectations.requiredTriggerTypes.join(', ')}`
        : `Missing trigger types: ${missing.join(', ')}`,
    });
  }

  // ---- 4. notificationChannels (weight: 10) ----
  if (
    expectations.requiredNotificationChannels &&
    expectations.requiredNotificationChannels.length > 0
  ) {
    const actualChannels = (result.suggested_notification_channels ?? []).map(
      (ch) => ch.type.toLowerCase()
    );
    const missing: string[] = [];
    for (const expected of expectations.requiredNotificationChannels) {
      if (!actualChannels.includes(expected.toLowerCase())) {
        missing.push(expected);
      }
    }
    const passed = missing.length === 0;
    checks.push({
      name: 'notificationChannels',
      passed,
      expected: expectations.requiredNotificationChannels,
      actual: actualChannels,
      weight: 10,
      message: passed
        ? `All required notification channels found: ${expectations.requiredNotificationChannels.join(', ')}`
        : `Missing notification channels: ${missing.join(', ')}`,
    });
  }

  // ---- 5. eventSubscriptions (weight: 10) ----
  if (expectations.requireEventSubscriptions !== undefined) {
    if (expectations.requireEventSubscriptions) {
      const hasSubs =
        Array.isArray(result.suggested_event_subscriptions) &&
        result.suggested_event_subscriptions.length > 0;
      checks.push({
        name: 'eventSubscriptions',
        passed: hasSubs,
        expected: 'at least 1 event subscription',
        actual: result.suggested_event_subscriptions?.length ?? 0,
        weight: 10,
        message: hasSubs
          ? `Event subscriptions present (${result.suggested_event_subscriptions!.length})`
          : 'No event subscriptions found but requireEventSubscriptions is true',
      });
    } else {
      // requireEventSubscriptions === false means we check it exists but don't require
      checks.push({
        name: 'eventSubscriptions',
        passed: true,
        expected: 'event subscriptions not required',
        actual: result.suggested_event_subscriptions?.length ?? 0,
        weight: 10,
        message: 'Event subscriptions not required (pass)',
      });
    }
  }

  // ---- 6. promptCompleteness (weight: 15) ----
  {
    const sp = result.structured_prompt;
    const sections: Array<{ key: string; value: string }> = [
      { key: 'identity', value: sp.identity },
      { key: 'instructions', value: sp.instructions },
      { key: 'toolGuidance', value: sp.toolGuidance },
      { key: 'examples', value: sp.examples },
      { key: 'errorHandling', value: sp.errorHandling },
    ];
    const empty = sections.filter(
      (s) => typeof s.value !== 'string' || s.value.trim().length === 0
    );
    const passed = empty.length === 0;
    checks.push({
      name: 'promptCompleteness',
      passed,
      expected: 'all prompt sections non-empty',
      actual: passed
        ? 'all sections populated'
        : `empty sections: ${empty.map((s) => s.key).join(', ')}`,
      weight: 15,
      message: passed
        ? 'All structured prompt sections are populated'
        : `Empty prompt sections: ${empty.map((s) => s.key).join(', ')}`,
    });
  }

  // ---- 7. markdownPresent (weight: 5) ----
  {
    const hasMarkdown =
      typeof result.full_prompt_markdown === 'string' &&
      result.full_prompt_markdown.length > 100;
    checks.push({
      name: 'markdownPresent',
      passed: hasMarkdown,
      expected: 'full_prompt_markdown length > 100',
      actual: result.full_prompt_markdown?.length ?? 0,
      weight: 5,
      message: hasMarkdown
        ? `Markdown present (${result.full_prompt_markdown.length} chars)`
        : `Markdown missing or too short (${result.full_prompt_markdown?.length ?? 0} chars)`,
    });
  }

  // ---- 8. summaryPresent (weight: 5) ----
  {
    const hasSummary =
      typeof result.summary === 'string' && result.summary.trim().length > 0;
    checks.push({
      name: 'summaryPresent',
      passed: hasSummary,
      expected: 'non-empty summary',
      actual: result.summary ?? '',
      weight: 5,
      message: hasSummary
        ? `Summary present: "${result.summary.slice(0, 80)}"`
        : 'Summary is missing or empty',
    });
  }

  // ---- 9. feasibility (weight: 10) ----
  if (expectations.expectedFeasibility) {
    const actualFeasibility = result.feasibility?.overall_feasibility ?? null;
    const passed = actualFeasibility === expectations.expectedFeasibility;
    checks.push({
      name: 'feasibility',
      passed,
      expected: expectations.expectedFeasibility,
      actual: actualFeasibility,
      weight: 10,
      message: passed
        ? `Feasibility matches: ${actualFeasibility}`
        : `Feasibility mismatch: expected "${expectations.expectedFeasibility}", got "${actualFeasibility}"`,
    });
  }

  // ---- Score calculation ----
  // Sum(passedWeight) / Sum(applicableWeight) * 100
  const applicableWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const passedWeight = checks
    .filter((c) => c.passed)
    .reduce((sum, c) => sum + c.weight, 0);
  const score = applicableWeight > 0 ? Math.round((passedWeight / applicableWeight) * 100) : 100;

  return {
    passed: score >= 80,
    score,
    checks,
  };
}

// ============================================================================
// Semantic Evaluation
// ============================================================================

/**
 * Build the evaluation prompt for the LLM-based quality assessment.
 */
function buildSemanticPrompt(
  result: DesignAnalysisResult,
  testCase: DesignTestCase
): string {
  const parts: string[] = [];

  parts.push('You are a QA engineer evaluating an AI-generated persona design.');
  parts.push('');
  parts.push('# Use Case');
  parts.push(`Name: ${testCase.name}`);
  parts.push(`Description: ${testCase.description}`);
  parts.push(`Original Instruction: ${testCase.instruction}`);
  parts.push('');

  parts.push('# Generated Design');
  parts.push(`Identity: ${result.structured_prompt.identity}`);
  parts.push(`Instructions: ${result.structured_prompt.instructions}`);
  parts.push(`Tool Guidance: ${result.structured_prompt.toolGuidance}`);
  parts.push(`Examples: ${result.structured_prompt.examples}`);
  parts.push(`Error Handling: ${result.structured_prompt.errorHandling}`);
  parts.push(`Suggested Tools: ${result.suggested_tools.join(', ')}`);
  parts.push(`Suggested Triggers: ${JSON.stringify(result.suggested_triggers)}`);
  parts.push(`Summary: ${result.summary}`);
  parts.push('');

  parts.push('# Expected Behavior');
  if (
    testCase.expectations.semantic.behaviorRequirements &&
    testCase.expectations.semantic.behaviorRequirements.length > 0
  ) {
    testCase.expectations.semantic.behaviorRequirements.forEach((r, i) => {
      parts.push(`${i + 1}. ${r}`);
    });
  } else {
    parts.push('No specific behavior requirements listed.');
  }
  parts.push('');

  parts.push('# Expected Error Handling');
  if (
    testCase.expectations.semantic.errorHandlingCoverage &&
    testCase.expectations.semantic.errorHandlingCoverage.length > 0
  ) {
    testCase.expectations.semantic.errorHandlingCoverage.forEach((e, i) => {
      parts.push(`${i + 1}. ${e}`);
    });
  } else {
    parts.push('No specific error handling coverage listed.');
  }
  parts.push('');

  parts.push('# Task');
  parts.push(
    'Evaluate this persona design on the following 5 dimensions, scoring each 0-100.'
  );
  parts.push('');
  parts.push('IMPORTANT: For each dimension, the "feedback" field MUST be a bullet-point list of specific observations.');
  parts.push('Use "\\n" to separate each bullet. Start each bullet with "- " or "+ " (positive) or "! " (issue).');
  parts.push('');
  parts.push('Output a single valid JSON object (no markdown fences):');
  parts.push(`{
  "dimensions": [
    {"name": "Identity Clarity", "score": 85, "feedback": "+ Clearly defines the persona as an email management assistant\\n+ Specifies communication style (concise summaries)\\n- Missing expertise boundaries"},
    {"name": "Behavioral Coverage", "score": 80, "feedback": "+ Covers email reading and filtering\\n+ Includes categorization logic\\n! Missing: explicit handling for empty inbox scenario"},
    {"name": "Tool Usage Appropriateness", "score": 90, "feedback": "+ Correct tools selected for gmail operations\\n+ Tool guidance includes specific API patterns\\n+ Rate limiting mentioned"},
    {"name": "Error Handling", "score": 75, "feedback": "+ Covers API timeout scenarios\\n+ Has retry logic guidance\\n! Missing: handling for invalid credentials\\n! No fallback for quota exhaustion"},
    {"name": "Example Quality", "score": 70, "feedback": "+ Includes realistic email filtering example\\n- Examples lack edge cases\\n- No negative examples showing what NOT to do"}
  ],
  "overallScore": 80,
  "llmReasoning": "Overall assessment in 1-2 sentences..."
}`);
  parts.push('');
  parts.push('Scoring guide:');
  parts.push(
    '- Identity Clarity: Does the identity clearly define role, expertise, and communication style?'
  );
  parts.push(
    '- Behavioral Coverage: Are ALL expected behaviors from the list above addressed in instructions?'
  );
  parts.push(
    '- Tool Usage Appropriateness: Are the right tools suggested? Is the tool guidance specific and actionable?'
  );
  parts.push(
    '- Error Handling: Does the error handling section cover the expected failure modes?'
  );
  parts.push(
    '- Example Quality: Are the examples concrete, realistic, and helpful?'
  );

  return parts.join('\n');
}

/**
 * Extract assistant text content from Claude stream-json output.
 * Mirrors the extractAssistantText function from designEngine.ts.
 */
function extractAssistantText(rawOutput: string): string {
  const textParts: string[] = [];

  for (const line of rawOutput.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      // Handle assistant message with content blocks
      if (parsed.type === 'assistant' && parsed.message?.content) {
        for (const block of parsed.message.content) {
          if (block.type === 'text' && block.text) {
            textParts.push(block.text);
          }
        }
      }
      // Handle content_block_delta (streaming chunks)
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        textParts.push(parsed.delta.text);
      }
      // Handle result event that may contain the final text
      if (parsed.type === 'result' && parsed.result?.text) {
        textParts.push(parsed.result.text);
      }
    } catch {
      // Not JSON -- could be raw text output
      if (line.trim().startsWith('{') || line.trim().startsWith('"')) {
        textParts.push(line.trim());
      }
    }
  }

  if (textParts.length > 0) {
    return textParts.join('');
  }

  // Fallback: return raw output for the extractor to try
  return rawOutput;
}

/**
 * Extract the semantic evaluation JSON from the LLM response text.
 * Uses 4 extraction strategies (same pattern as designEngine.ts):
 *  1. Direct JSON.parse
 *  2. Extract from markdown code fence
 *  3. Find `{"dimensions"` key start
 *  4. Find first `{` to last `}`
 */
function extractSemanticResult(rawText: string): SemanticEvaluation | null {
  if (!rawText.trim()) return null;

  // Strategy 1: Direct parse
  try {
    const parsed = JSON.parse(rawText.trim());
    if (Array.isArray(parsed.dimensions) && typeof parsed.overallScore === 'number') {
      return toSemanticEvaluation(parsed);
    }
  } catch {
    /* continue */
  }

  // Strategy 2: Extract from markdown code fence
  const fenceMatch = rawText.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (Array.isArray(parsed.dimensions) && typeof parsed.overallScore === 'number') {
        return toSemanticEvaluation(parsed);
      }
    } catch {
      /* continue */
    }
  }

  // Strategy 3: Find `{"dimensions"` key start
  const startIdx = rawText.indexOf('{"dimensions"');
  if (startIdx >= 0) {
    let depth = 0;
    for (let i = startIdx; i < rawText.length; i++) {
      if (rawText[i] === '{') depth++;
      if (rawText[i] === '}') depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(rawText.slice(startIdx, i + 1));
          if (Array.isArray(parsed.dimensions) && typeof parsed.overallScore === 'number') {
            return toSemanticEvaluation(parsed);
          }
        } catch {
          /* continue */
        }
        break;
      }
    }
  }

  // Strategy 4: Find first `{` to last `}`
  const braceStart = rawText.indexOf('{');
  const braceEnd = rawText.lastIndexOf('}');
  if (braceStart >= 0 && braceEnd > braceStart) {
    try {
      const parsed = JSON.parse(rawText.slice(braceStart, braceEnd + 1));
      if (Array.isArray(parsed.dimensions)) {
        return toSemanticEvaluation(parsed);
      }
    } catch {
      /* continue */
    }
  }

  return null;
}

/**
 * Convert a raw parsed JSON object into a typed SemanticEvaluation.
 */
function toSemanticEvaluation(parsed: {
  dimensions: Array<{ name: string; score: number; feedback: string }>;
  overallScore: number;
  llmReasoning: string;
}): SemanticEvaluation {
  const dimensions: SemanticDimension[] = parsed.dimensions.map((d) => ({
    name: d.name,
    score: typeof d.score === 'number' ? d.score : 0,
    feedback: d.feedback ?? '',
  }));

  const overallScore =
    typeof parsed.overallScore === 'number' ? parsed.overallScore : 0;

  return {
    passed: overallScore >= 70,
    overallScore,
    dimensions,
    llmReasoning: parsed.llmReasoning ?? '',
  };
}

/**
 * LLM-based semantic evaluation of a design result.
 * Spawns Claude CLI to assess prompt quality across 5 dimensions.
 * Returns null on failure (timeout, parse error, CLI not found).
 */
export async function evaluateSemantic(
  result: DesignAnalysisResult,
  testCase: DesignTestCase
): Promise<SemanticEvaluation | null> {
  const { spawn } = require('child_process');
  const os = require('os');

  const prompt = buildSemanticPrompt(result, testCase);
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'claude.cmd' : 'claude';
  const args = [
    '-p',
    '-',
    '--output-format',
    'stream-json',
    '--verbose',
    '--dangerously-skip-permissions',
  ];

  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  return new Promise<SemanticEvaluation | null>((resolve) => {
    try {
      const childProcess = spawn(command, args, {
        cwd: os.tmpdir(),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: isWindows,
        env,
      });

      // Pipe prompt to stdin
      childProcess.stdin.write(prompt);
      childProcess.stdin.end();

      let fullOutput = '';

      childProcess.stdout.on('data', (data: Buffer) => {
        fullOutput += data.toString();
      });

      childProcess.stderr.on('data', () => {
        // Ignore stderr for evaluation -- errors are handled on close
      });

      childProcess.on('close', (code: number) => {
        if (code === 0) {
          const assistantText = extractAssistantText(fullOutput);
          const evaluation = extractSemanticResult(assistantText);
          resolve(evaluation);
        } else {
          resolve(null);
        }
      });

      childProcess.on('error', () => {
        resolve(null);
      });

      // 2-minute timeout
      const timeout = setTimeout(() => {
        if (!childProcess.killed) {
          childProcess.kill();
        }
        resolve(null);
      }, 2 * 60 * 1000);

      childProcess.on('close', () => clearTimeout(timeout));
    } catch {
      resolve(null);
    }
  });
}
