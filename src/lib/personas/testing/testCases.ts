import type { DesignTestCase } from './testTypes';

// ============================================================================
// Predefined Test Cases for Design Engine Evaluation
// ============================================================================

export const TEST_CASES: DesignTestCase[] = [
  // --------------------------------------------------------------------------
  // 1. Gmail Smart Filter
  // --------------------------------------------------------------------------
  {
    id: 'gmail-smart-filter',
    name: 'Gmail Smart Filter',
    description:
      'Tests email monitoring with polling trigger, multi-tool Gmail usage, ' +
      'domain filtering, importance categorization, and Slack delivery.',
    instruction:
      'Create a Gmail assistant that checks for unread emails every 30 minutes, ' +
      'categorizes them by importance (urgent/normal/low priority), and sends me a ' +
      'Slack summary with the top 5 urgent emails. It should filter by work-related ' +
      'emails from @company.com domains and mark processed emails as read.',
    mode: 'create',
    mockContext: {
      personaName: 'Gmail Work Assistant',
      personaDescription: 'Monitors and categorizes work emails',
      availableTools: ['gmail_read', 'gmail_search', 'gmail_mark_read', 'http_request'],
    },
    expectations: {
      structural: {
        minTools: 2,
        maxTools: 5,
        requiredConnectors: ['gmail', 'slack'],
        requiredTriggerTypes: ['polling'],
        expectedFeasibility: 'ready',
      },
      semantic: {
        identityKeywords: ['email', 'assistant', 'categorize'],
        behaviorRequirements: [
          'Reads unread emails',
          'Filters by domain',
          'Categorizes by importance',
          'Sends Slack summary',
          'Marks as read',
        ],
      },
    },
  },

  // --------------------------------------------------------------------------
  // 2. GitHub PR Reviewer
  // --------------------------------------------------------------------------
  {
    id: 'github-pr-reviewer',
    name: 'GitHub PR Reviewer',
    description:
      'Tests webhook-driven workflow with GitHub integration, code review logic, ' +
      'comment posting via API, and Slack notification for flagged PRs.',
    instruction:
      'Build a GitHub PR reviewer that listens for new pull requests via webhook, ' +
      'reviews the code changes, checks for common issues (missing tests, large files, ' +
      'security concerns), and posts a summary comment on the PR. Send a Slack ' +
      'notification for PRs that need attention.',
    mode: 'create',
    mockContext: {
      personaName: 'PR Review Bot',
      personaDescription: 'Automated code review for pull requests',
      availableTools: ['http_request'],
    },
    expectations: {
      structural: {
        minTools: 1,
        maxTools: 3,
        requiredConnectors: ['github'],
        requiredTriggerTypes: ['webhook'],
        expectedFeasibility: 'ready',
      },
      semantic: {
        identityKeywords: ['code', 'review', 'pull request'],
        behaviorRequirements: [
          'Listens for new PRs',
          'Reviews code changes',
          'Checks for missing tests',
          'Posts summary comment',
          'Sends Slack notification',
        ],
      },
    },
  },

  // --------------------------------------------------------------------------
  // 3. Daily Calendar Digest
  // --------------------------------------------------------------------------
  {
    id: 'daily-calendar-digest',
    name: 'Daily Calendar Digest',
    description:
      'Tests scheduled trigger (cron), Google Calendar read via API, conflict ' +
      'detection logic, and formatted email delivery via gmail_send.',
    instruction:
      'Create a daily morning briefing bot that runs at 8 AM, reads today\'s ' +
      'calendar events, identifies conflicts or back-to-back meetings, and sends me ' +
      'a formatted digest via email with preparation notes for each meeting.',
    mode: 'create',
    mockContext: {
      personaName: 'Morning Briefing Bot',
      personaDescription: 'Daily calendar digest and meeting preparation',
      availableTools: ['http_request', 'gmail_send'],
    },
    expectations: {
      structural: {
        minTools: 1,
        maxTools: 3,
        requiredConnectors: ['google_calendar'],
        requiredTriggerTypes: ['schedule'],
        expectedFeasibility: 'ready',
      },
      semantic: {
        identityKeywords: ['calendar', 'briefing', 'morning'],
        behaviorRequirements: [
          'Runs on schedule',
          'Reads calendar events',
          'Identifies conflicts',
          'Sends formatted digest',
          'Includes preparation notes',
        ],
      },
    },
  },

  // --------------------------------------------------------------------------
  // 4. Webhook Data Processor
  // --------------------------------------------------------------------------
  {
    id: 'webhook-data-processor',
    name: 'Webhook Data Processor',
    description:
      'Tests webhook ingestion with signature verification, payload validation, ' +
      'data transformation, API forwarding, retry logic, and event subscriptions.',
    instruction:
      'Build a webhook receiver that accepts incoming data from external services, ' +
      'validates the payload structure, transforms the data into a standardized ' +
      'format, and forwards it to our internal API. It should handle webhook ' +
      'signature verification and retry on failure.',
    mode: 'create',
    mockContext: {
      personaName: 'Webhook Processor',
      personaDescription: 'Receives and transforms webhook payloads',
      availableTools: ['http_request'],
    },
    expectations: {
      structural: {
        minTools: 1,
        maxTools: 2,
        requiredConnectors: ['http'],
        requiredTriggerTypes: ['webhook'],
        requireEventSubscriptions: true,
        expectedFeasibility: 'ready',
      },
      semantic: {
        identityKeywords: ['webhook', 'processor', 'data'],
        behaviorRequirements: [
          'Receives webhook data',
          'Validates payload',
          'Transforms data',
          'Forwards to API',
          'Handles retries',
        ],
        errorHandlingCoverage: [
          'Invalid payload',
          'API timeout',
          'Signature mismatch',
        ],
      },
    },
  },

  // --------------------------------------------------------------------------
  // 5. Multi-Agent Coordinator
  // --------------------------------------------------------------------------
  {
    id: 'multi-agent-coordinator',
    name: 'Multi-Agent Coordinator',
    description:
      'Tests event-bus-driven persona with execution_completed subscriptions, ' +
      'result aggregation, pattern detection, health report emission, and user messaging.',
    instruction:
      'Create a coordinator agent that subscribes to execution_completed events ' +
      'from other personas, aggregates their results, detects patterns (repeated ' +
      'failures, performance degradation), and emits a consolidated health_report ' +
      'event. It should send a user message summary when issues are detected.',
    mode: 'create',
    mockContext: {
      personaName: 'Agent Coordinator',
      personaDescription: 'Monitors and coordinates other persona agents',
      availableTools: ['http_request'],
    },
    expectations: {
      structural: {
        minTools: 0,
        maxTools: 2,
        requiredConnectors: [],
        requireEventSubscriptions: true,
        expectedFeasibility: 'ready',
      },
      semantic: {
        identityKeywords: ['coordinator', 'monitor', 'health'],
        behaviorRequirements: [
          'Subscribes to execution events',
          'Aggregates results',
          'Detects failure patterns',
          'Emits health report',
          'Sends user messages on issues',
        ],
      },
    },
  },
];

// ============================================================================
// Access Helpers
// ============================================================================

/**
 * Returns test cases, optionally filtered by IDs.
 * If no IDs provided, returns all test cases.
 * Unknown IDs are silently skipped.
 */
export function getTestCases(ids?: string[]): DesignTestCase[] {
  if (!ids || ids.length === 0) {
    return TEST_CASES;
  }

  const idSet = new Set(ids);
  return TEST_CASES.filter((tc) => idSet.has(tc.id));
}

/**
 * Creates ad-hoc test cases from plain instruction strings.
 * These have generic expectations since we can't know what the user intends.
 */
export function createCustomTestCases(instructions: string[]): DesignTestCase[] {
  return instructions.map((instruction, index) => {
    const id = `custom-${Date.now()}-${index}`;
    const name = instruction.length > 60
      ? instruction.slice(0, 57) + '...'
      : instruction;
    return {
      id,
      name,
      description: 'Custom user-provided test case',
      instruction,
      mode: 'create' as const,
      expectations: {
        structural: {
          minTools: 0,
          maxTools: 10,
        },
        semantic: {
          behaviorRequirements: [],
        },
      },
      mockContext: {
        personaName: 'Custom Agent',
        personaDescription: 'User-defined persona',
        availableTools: ['http_request', 'gmail_read', 'gmail_send', 'gmail_search', 'gmail_mark_read', 'file_read', 'file_write'],
      },
    };
  });
}
