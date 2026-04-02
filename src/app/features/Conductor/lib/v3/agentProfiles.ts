/**
 * Agent Profiles — Conductor v3
 *
 * Provides specialized system prompt suffixes based on task file patterns.
 * Matched profiles inject domain-specific guidance into the dispatch prompt,
 * improving accuracy for frontend, API, testing, and infrastructure tasks.
 */

import type { V3Task } from './types';

// ============================================================================
// Types
// ============================================================================

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  systemPromptSuffix: string;
  filePatterns: RegExp[];
  priority: number; // Higher = matched first when multiple profiles match
}

// ============================================================================
// Profile Definitions
// ============================================================================

export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: 'frontend',
    name: 'Frontend Specialist',
    description: 'React components, hooks, CSS, client-side logic',
    priority: 10,
    filePatterns: [
      /\.tsx$/,
      /\.css$/,
      /\.scss$/,
      /components\//,
      /hooks\//,
      /features\/.*\/components\//,
      /stores\//,
    ],
    systemPromptSuffix: `You are a frontend specialist. Apply these principles:
- Follow React 19 patterns: prefer server components where possible, use 'use client' only when needed
- Use Tailwind CSS utility classes matching the project's existing design tokens
- Ensure accessibility: semantic HTML, ARIA attributes, keyboard navigation
- Follow existing component patterns in the project (check sibling components)
- Use Zustand stores for state management — match the persist middleware pattern used in the project
- Prefer Framer Motion for animations matching existing motion patterns
- Component files should be under 200 lines — extract sub-components if larger`,
  },
  {
    id: 'api',
    name: 'API & Backend Specialist',
    description: 'Route handlers, middleware, database operations, validation',
    priority: 20,
    filePatterns: [
      /app\/api\//,
      /route\.ts$/,
      /middleware/,
      /repositories?\//,
      /\.repository\./,
      /migrations?\//,
      /lib\/.*service/,
    ],
    systemPromptSuffix: `You are a backend API specialist. Apply these principles:
- Follow Next.js App Router conventions: export named functions (GET, POST, PUT, DELETE)
- Use the project's response format: { success: true, data } or { success: false, error }
- Wrap handlers with withObservability() from @/lib/observability/middleware
- Database access MUST use getDatabase() from @/app/db/connection, never direct Database()
- Use parameterized queries with ? placeholders — NEVER interpolate user input into SQL
- New migrations: wrap in runOnce(db, 'mXXX', fn), new columns must be nullable or have defaults
- Validate inputs with Zod schemas
- Include proper error handling with try/catch and meaningful error messages`,
  },
  {
    id: 'test-writer',
    name: 'Test Engineer',
    description: 'Unit tests, integration tests, E2E tests',
    priority: 30,
    filePatterns: [
      /\.test\.(ts|tsx)$/,
      /\.spec\.(ts|tsx)$/,
      /tests\//,
      /e2e\//,
      /__tests__\//,
    ],
    systemPromptSuffix: `You are a test engineering specialist. Apply these principles:
- Use Vitest with describe/it/expect — match the AAA pattern (Arrange, Act, Assert)
- For database tests: use getDatabase() which returns the test database in test environment
- For API tests: use testApiRoute() from @tests/setup/api-test-utils if available
- Use mock factories from @tests/setup/mock-factories when available
- Cover: happy path, edge cases (empty input, boundary values), error cases
- Test file naming: tests/unit/path/feature.test.ts or tests/integration/path/feature.test.ts
- Use descriptive test names that read as specifications
- For property-based tests: use fast-check`,
  },
  {
    id: 'infra',
    name: 'Infrastructure & Config Specialist',
    description: 'Build config, migrations, deployment, CI/CD',
    priority: 5,
    filePatterns: [
      /config\.(ts|js|json)$/,
      /\.config\.(ts|js)$/,
      /Dockerfile/,
      /\.github\//,
      /\.env/,
      /package\.json$/,
      /tsconfig/,
    ],
    systemPromptSuffix: `You are an infrastructure specialist. Apply these principles:
- Configuration changes must be backward-compatible
- Database migrations must be idempotent (use IF NOT EXISTS, runOnce wrapper)
- Never remove columns or tables — only add with nullable defaults
- Preserve existing build scripts and configurations
- Environment variables should have sensible defaults for local development
- Document any new configuration requirements`,
  },
];

// ============================================================================
// Profile Matching
// ============================================================================

/**
 * Match a task to the most appropriate agent profile based on its target files.
 * Returns the highest-priority profile that matches any target file pattern.
 * Returns null if no profile matches (task uses default generic prompt).
 */
export function matchAgentProfile(task: V3Task): AgentProfile | null {
  const scores = new Map<string, number>();

  for (const file of task.targetFiles) {
    const normalizedFile = file.replace(/\\/g, '/');
    for (const profile of AGENT_PROFILES) {
      for (const pattern of profile.filePatterns) {
        if (pattern.test(normalizedFile)) {
          scores.set(profile.id, (scores.get(profile.id) || 0) + 1);
        }
      }
    }
  }

  if (scores.size === 0) return null;

  // Find profile with highest match count, break ties by priority
  let bestProfile: AgentProfile | null = null;
  let bestScore = 0;

  for (const [profileId, score] of scores) {
    const profile = AGENT_PROFILES.find(p => p.id === profileId)!;
    if (score > bestScore || (score === bestScore && profile.priority > (bestProfile?.priority || 0))) {
      bestProfile = profile;
      bestScore = score;
    }
  }

  return bestProfile;
}

/**
 * Enrich a dispatch prompt with the matched agent profile's system prompt suffix.
 * Inserts the specialist guidance between the role definition and the task details.
 */
export function enrichPromptWithProfile(basePrompt: string, profile: AgentProfile): string {
  // Insert profile guidance after the first line (role definition)
  const firstNewline = basePrompt.indexOf('\n');
  if (firstNewline === -1) {
    return `${basePrompt}\n\n## Specialist Guidance (${profile.name})\n\n${profile.systemPromptSuffix}`;
  }

  const beforeFirstBreak = basePrompt.slice(0, firstNewline);
  const afterFirstBreak = basePrompt.slice(firstNewline);

  return `${beforeFirstBreak}\n\n## Specialist Guidance (${profile.name})\n\n${profile.systemPromptSuffix}${afterFirstBreak}`;
}
