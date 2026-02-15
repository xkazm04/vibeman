/**
 * Adjustment Suggester — generates deterministic instruction improvement hints
 * when design reviews fail structural checks.
 *
 * Safety: These are SUGGESTIONS displayed in the UI. They are NEVER auto-applied.
 * The user must review and explicitly accept before re-running.
 */

import type { StructuralCheck } from './testTypes';

interface AdjustmentSuggestion {
  original: string;
  suggestion: string;
  reason: string;
  appliedFixes: string[];
}

/**
 * Analyze failed structural checks and suggest instruction improvements.
 * Returns null if no actionable suggestions can be made.
 */
export function suggestAdjustment(
  instruction: string,
  failedChecks: StructuralCheck[],
  adjustmentGeneration: number
): AdjustmentSuggestion | null {
  // Safety cap: stop suggesting after 3 failed cycles
  if (adjustmentGeneration >= 3) {
    return null;
  }

  const fixes: string[] = [];
  const reasons: string[] = [];
  let adjusted = instruction;

  for (const check of failedChecks) {
    if (check.passed) continue;

    switch (check.name) {
      case 'requiredTriggerTypes': {
        const missing = extractMissing(check);
        for (const trigger of missing) {
          const hint = TRIGGER_HINTS[trigger];
          if (hint && !adjusted.toLowerCase().includes(trigger)) {
            adjusted = appendHint(adjusted, hint);
            fixes.push(`Added explicit ${trigger} trigger mention`);
            reasons.push(`Missing trigger type: ${trigger}`);
          }
        }
        break;
      }

      case 'requiredConnectors': {
        const missing = extractMissing(check);
        for (const connector of missing) {
          const hint = CONNECTOR_HINTS[connector];
          if (hint && !adjusted.toLowerCase().includes(connector)) {
            adjusted = appendHint(adjusted, hint);
            fixes.push(`Added ${connector} connector reference`);
            reasons.push(`Missing connector: ${connector}`);
          }
        }
        break;
      }

      case 'promptCompleteness': {
        const emptyStr = String(check.actual);
        const emptySections = emptyStr.includes('empty sections:')
          ? emptyStr.replace('empty sections: ', '').split(', ')
          : [];
        for (const section of emptySections) {
          const hint = SECTION_HINTS[section];
          if (hint) {
            adjusted = appendHint(adjusted, hint);
            fixes.push(`Added context for ${section} section`);
            reasons.push(`Empty prompt section: ${section}`);
          }
        }
        break;
      }

      case 'eventSubscriptions': {
        if (!adjusted.toLowerCase().includes('event') && !adjusted.toLowerCase().includes('subscribe')) {
          adjusted = appendHint(adjusted, 'Subscribe to relevant events from other agents or webhooks for reactive behavior.');
          fixes.push('Added event subscription context');
          reasons.push('Missing event subscriptions');
        }
        break;
      }

      case 'notificationChannels': {
        const missing = extractMissing(check);
        for (const channel of missing) {
          if (!adjusted.toLowerCase().includes(channel)) {
            adjusted = appendHint(adjusted, `Send notifications via ${channel} when important events occur.`);
            fixes.push(`Added ${channel} notification mention`);
            reasons.push(`Missing notification channel: ${channel}`);
          }
        }
        break;
      }

      // toolCount, markdownPresent, summaryPresent, feasibility
      // -> no instruction adjustment can fix these (engine-level issues)
      default:
        break;
    }
  }

  if (fixes.length === 0 || adjusted === instruction) {
    return null;
  }

  return {
    original: instruction,
    suggestion: adjusted,
    reason: reasons.join('; '),
    appliedFixes: fixes,
  };
}

// ============================================================================
// Hint templates
// ============================================================================

const TRIGGER_HINTS: Record<string, string> = {
  webhook: 'Use a webhook trigger to receive incoming requests from external services.',
  schedule: 'Run on a scheduled basis (e.g., daily, hourly, or at a specific cron interval).',
  polling: 'Periodically poll for new data at a configurable interval.',
  manual: 'Allow manual execution on demand.',
};

const CONNECTOR_HINTS: Record<string, string> = {
  gmail: 'Integrate with Gmail for email reading, sending, or monitoring.',
  slack: 'Send notifications or summaries to Slack channels.',
  github: 'Integrate with GitHub for repository, PR, or issue operations.',
  google_calendar: 'Read or manage Google Calendar events.',
  http: 'Make HTTP API calls to external services.',
  telegram: 'Send notifications via Telegram.',
};

const SECTION_HINTS: Record<string, string> = {
  examples: 'Include specific examples of expected input/output interactions.',
  errorHandling: 'Define how to handle errors, retries, and failure scenarios.',
  toolGuidance: 'Specify when and how to use each tool with parameter guidance.',
  identity: 'Define a clear role and expertise for this agent.',
  instructions: 'Provide detailed step-by-step behavioral instructions.',
};

// ============================================================================
// Helpers
// ============================================================================

function extractMissing(check: StructuralCheck): string[] {
  // Check message format: "Missing X: a, b, c"
  const msg = check.message;
  const match = msg.match(/Missing [^:]+: (.+)/);
  if (match) {
    return match[1].split(', ').map((s) => s.trim());
  }
  return [];
}

function appendHint(instruction: string, hint: string): string {
  // Add hint as a new sentence at the end
  const trimmed = instruction.trimEnd();
  const separator = trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?')
    ? ' '
    : '. ';
  return trimmed + separator + hint;
}
