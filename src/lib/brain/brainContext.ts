/**
 * Brain Context Utility
 *
 * Reads and formats brain-guide.md for injection into prompts.
 * Provides philosophical context, not filtering rules.
 * Also provides observability context for usage-aware direction generation.
 */

import fs from 'fs';
import path from 'path';
import { observabilityDb } from '@/app/db';

export interface BrainContext {
  exists: boolean;
  content: string | null;
  philosophy: string | null;
  examples: string | null;
}

/**
 * Get the brain context for a project
 * Returns the brain-guide.md content formatted for prompt injection
 */
export function getBrainContext(projectPath: string): BrainContext {
  const brainGuidePath = path.join(projectPath, '.claude', 'skills', 'brain-guide.md');

  if (!fs.existsSync(brainGuidePath)) {
    return {
      exists: false,
      content: null,
      philosophy: null,
      examples: null,
    };
  }

  try {
    const content = fs.readFileSync(brainGuidePath, 'utf-8');

    // Extract philosophy section (Vision + Development Philosophy)
    const philosophyMatch = content.match(/## Vision[\s\S]*?(?=## Aesthetic Sensibilities|## What Makes Ideas Resonate|$)/);
    const philosophy = philosophyMatch ? philosophyMatch[0] : null;

    // Extract learning examples if they exist
    const examplesMatch = content.match(/## Learning From Decisions[\s\S]*?(?=## How to Use This Guide|---\s*$|$)/);
    const examples = examplesMatch ? examplesMatch[0] : null;

    return {
      exists: true,
      content,
      philosophy,
      examples,
    };
  } catch {
    return {
      exists: false,
      content: null,
      philosophy: null,
      examples: null,
    };
  }
}

/**
 * Format brain context for direction generation prompt
 * Provides philosophical guidance, not filtering rules
 */
export function formatBrainForDirections(brain: BrainContext): string {
  if (!brain.exists || !brain.content) {
    return '';
  }

  // Extract key sections for concise injection
  const visionMatch = brain.content.match(/\*\*What Vibeman is becoming:\*\*[\s\S]*?(?=\*\*What matters most)/);
  const vision = visionMatch ? visionMatch[0].trim() : '';

  const mattersMatch = brain.content.match(/\*\*What matters most:\*\*[\s\S]*?(?=---)/);
  const matters = mattersMatch ? mattersMatch[0].trim() : '';

  const architectureMatch = brain.content.match(/### On Architecture[\s\S]*?(?=### On Quality|---)/);
  const architecture = architectureMatch ? architectureMatch[0].trim() : '';

  const qualityMatch = brain.content.match(/### On Quality[\s\S]*?(?=### On Value|---)/);
  const quality = qualityMatch ? qualityMatch[0].trim() : '';

  return `
---

## User's Development Philosophy

The following context helps you understand what resonates with this user. Use it as philosophical guidance, not as filtering rules. **Creativity is valued** - novel ideas are welcome when they solve real problems.

### Vision

${vision}

${matters}

${architecture}

${quality}

### What Makes Ideas Resonate

Ideas tend to resonate when they:
- Address a current pain point (not speculative future needs)
- Show thoughtful understanding of the existing architecture
- Deliver clear, visible value

Ideas tend to raise concerns when they:
- Use buzzwords without demonstrating substance
- Would create ongoing maintenance obligations
- Don't connect to a current need

**Note:** These are observations about past decisions, not rules. A well-designed feature can always be compelling regardless of category.

${brain.examples ? `
### Learning From Past Decisions

${brain.examples}
` : ''}

### How to Apply This

When generating directions:
1. **Be creative** - don't constrain yourself to "safe" ideas
2. **Solve real problems** - focus on current needs, not speculative value
3. **Consider the CLI preference** - for LLM features, could this work through Claude Code CLI?
4. **Show your thinking** - if an idea might raise concerns, acknowledge them honestly

When uncertain about whether an idea would resonate, **present it anyway** with an honest assessment of potential concerns.

---
`;
}

/**
 * Get compact brain context for token-sensitive prompts
 * Returns just the essential philosophy
 */
export function getCompactBrainContext(projectPath: string): string {
  const brain = getBrainContext(projectPath);

  if (!brain.exists) {
    return '';
  }

  return `
## User Philosophy (brief)

**Vision**: Autonomous parallel development tool - idea generation through deployment.

**Values**: User benefit > architectural fit > code quality. Creativity welcomed.

**Architecture note**: Prefers Claude Code CLI for LLM logic over new API services.

**Quality bar**: "Never be satisfied - features can always look or perform better."

When uncertain, present ideas with honest assessment rather than filtering them out.
`;
}

// ===== Observability Context =====

export interface ObservabilityContext {
  hasData: boolean;
  topEndpoints: Array<{
    endpoint: string;
    method: string;
    calls: number;
  }>;
  highErrorEndpoints: Array<{
    endpoint: string;
    method: string;
    errorRate: number;
  }>;
  trends: Array<{
    endpoint: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
  }>;
}

/**
 * Get observability context for a project
 * Returns API usage patterns for intelligent direction generation
 */
export function getObservabilityContext(projectId: string, days: number = 7): ObservabilityContext {
  try {
    const hasData = observabilityDb.hasData(projectId);

    if (!hasData) {
      return {
        hasData: false,
        topEndpoints: [],
        highErrorEndpoints: [],
        trends: []
      };
    }

    // Get top endpoints
    const topEndpoints = observabilityDb.getTopEndpoints(projectId, 10, days).map(ep => ({
      endpoint: ep.endpoint,
      method: ep.method,
      calls: ep.total_calls
    }));

    // Get high error endpoints
    const highErrorEndpoints = observabilityDb.getHighErrorEndpoints(projectId, 5, days).map(ep => ({
      endpoint: ep.endpoint,
      method: ep.method,
      errorRate: ep.error_rate
    }));

    // Get trends
    const rawTrends = observabilityDb.getUsageTrends(projectId, days);
    const trends = rawTrends
      .filter(t => t.direction !== 'stable')
      .slice(0, 5)
      .map(t => ({
        endpoint: t.endpoint,
        direction: t.direction,
        changePercent: t.change_percent
      }));

    return {
      hasData: true,
      topEndpoints,
      highErrorEndpoints,
      trends
    };
  } catch (error) {
    console.error('[Brain] Failed to get observability context:', error);
    return {
      hasData: false,
      topEndpoints: [],
      highErrorEndpoints: [],
      trends: []
    };
  }
}

/**
 * Format observability context for direction generation prompts
 * Provides usage data to inform priorities
 */
export function formatObservabilityForBrain(obs: ObservabilityContext): string {
  if (!obs.hasData) {
    return '';
  }

  const topEndpointsSection = obs.topEndpoints.length > 0
    ? obs.topEndpoints.map(e => `- \`${e.method} ${e.endpoint}\`: ${e.calls.toLocaleString()} calls/week`).join('\n')
    : 'No usage data available';

  const errorSection = obs.highErrorEndpoints.length > 0
    ? obs.highErrorEndpoints.map(e => `- \`${e.endpoint}\`: ${e.errorRate.toFixed(1)}% error rate`).join('\n')
    : 'All endpoints are healthy (< 5% error rate)';

  const trendsSection = obs.trends.length > 0
    ? obs.trends.map(t => {
        const icon = t.direction === 'increasing' ? '↑' : '↓';
        return `- \`${t.endpoint}\`: ${icon} ${Math.abs(t.changePercent).toFixed(0)}% ${t.direction}`;
      }).join('\n')
    : 'No significant usage trends';

  return `
---

## Current Usage Patterns

The following data shows actual API usage in this project. Consider this when prioritizing improvements.

### Most Used Endpoints (by call count)

${topEndpointsSection}

### Reliability Concerns

${errorSection}

### Usage Trends (compared to previous period)

${trendsSection}

### How to Apply This Data

**Consider this data when prioritizing suggestions:**
- Heavily-used endpoints deserve more attention for performance/UX improvements
- High-error endpoints may indicate bugs, missing validation, or incomplete features
- Growing endpoints may need optimization before they become problems
- Declining endpoints may indicate features that need improvement or deprecation

**Note:** Usage data informs priorities but doesn't filter ideas. A low-usage feature might still need improvement if it's important for the user experience.

---
`;
}
