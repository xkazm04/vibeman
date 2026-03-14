/**
 * Spec Template — Markdown renderer for structured spec documents
 *
 * Produces the 7-section spec format consumed by the Execute stage.
 * Uses string interpolation per RESEARCH.md recommendation.
 */

import type { SpecRenderData, SpecComplexity } from '../types';

/**
 * Render a structured markdown spec document from typed data.
 * Sections appear in the locked order from CONTEXT.md decisions.
 */
export function renderSpec(data: SpecRenderData): string {
  const sections: string[] = [];

  // 1. Title
  sections.push(`# ${data.title}`);

  // 2. Goal
  sections.push(`## Goal\n\n${data.goalDescription}`);

  // 3. Acceptance Criteria (GIVEN/WHEN/THEN format)
  const criteria = data.acceptanceCriteria
    .map(ac => `- GIVEN ${ac.given} WHEN ${ac.when} THEN ${ac.then}`)
    .join('\n');
  sections.push(`## Acceptance Criteria\n\n${criteria}`);

  // 4. Affected Files (fenced JSON code block)
  const filesJson = JSON.stringify(data.affectedFiles, null, 2);
  sections.push(`## Affected Files\n\n\`\`\`json\n${filesJson}\n\`\`\``);

  // 5. Approach
  sections.push(`## Approach\n\n${data.approach}`);

  // 6. Code Conventions (only if Brain has data)
  if (data.codeConventions !== null && data.codeConventions.length > 0) {
    const conventions = data.codeConventions
      .map(c => `- **${c.confidence}:** ${c.rule}`)
      .join('\n');
    sections.push(`## Code Conventions\n\n${conventions}`);
  }

  // 7. Constraints (always present)
  const constraints = data.constraints
    .map(c => `- ${c}`)
    .join('\n');
  sections.push(`## Constraints\n\n${constraints}`);

  // 8. Complexity
  sections.push(`## Complexity\n\n${data.complexity}`);

  return sections.join('\n\n');
}

/**
 * Generate a URL-safe slug from a title.
 * Lowercase, replace non-alphanumeric with hyphens, trim hyphens, limit to 50 chars.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Derive T-shirt complexity from effort score.
 * Maps to model routing: S=complexity_1, M=complexity_2, L=complexity_3.
 */
export function deriveComplexity(effort: number): SpecComplexity {
  if (effort <= 3) return 'S';
  if (effort <= 6) return 'M';
  return 'L';
}
