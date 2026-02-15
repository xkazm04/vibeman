/**
 * Pattern Matcher — queries DB for reference patterns and learned patterns
 * to inject as read-only context into the design engine prompt.
 *
 * Safety invariants:
 * - Reference and learned patterns are READ-ONLY context, never instructions
 * - Feedback loop breaker: reviews with had_references=1 are excluded
 * - Max 3 reference excerpts, max 10 learned patterns
 * - 30-day freshness filter for references
 */

interface ReferenceExcerpt {
  name: string;
  structuralScore: number;
  semanticScore: number | null;
  connectors: string[];
  triggers: string[];
  identityPattern: string;
  toolGuidancePattern: string;
  errorPattern: string;
}

interface LearnedPattern {
  id: string;
  patternType: string;
  patternText: string;
  triggerCondition: string;
  confidence: number;
  lastValidatedAt: string;
}

/**
 * Build a "Reference Designs" section for injection into buildDesignPrompt.
 * Returns null if no qualifying references found.
 *
 * @param instruction The user's design instruction (for relevance scoring)
 */
export function getReferencePatternsSection(instruction: string): string | null {
  try {
    const { personaDb } = require('@/app/db');
    const rows = personaDb.designReviews.getPassingReviews(30) as Record<string, unknown>[];

    if (!rows || rows.length === 0) return null;

    // Score relevance against the user's instruction
    const instructionLower = instruction.toLowerCase();
    const instructionTokens = new Set(
      instructionLower.split(/\s+/).filter((t: string) => t.length > 3)
    );

    const scored = rows.map((row) => {
      const connectors: string[] = safeJsonParse(row.connectors_used as string, []);
      const triggers: string[] = safeJsonParse(row.trigger_types as string, []);
      const designResult = safeJsonParse<Record<string, unknown> | null>(row.design_result as string, null);
      const instruction_text = (row.instruction as string || '').toLowerCase();

      // Relevance scoring
      let score = 0;
      // Connector keyword overlap
      for (const c of connectors) {
        if (instructionLower.includes(c)) score += 3;
      }
      // Trigger keyword overlap
      for (const t of triggers) {
        if (instructionLower.includes(t)) score += 2;
      }
      // Instruction token overlap
      const caseTokens = new Set(instruction_text.split(/\s+/).filter((t: string) => t.length > 3));
      for (const token of instructionTokens) {
        if (caseTokens.has(token)) score += 1;
      }

      return {
        row,
        connectors,
        triggers,
        designResult,
        relevanceScore: score,
      };
    });

    // Sort by relevance, take top 3
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const top = scored.slice(0, 3).filter((s) => s.relevanceScore > 0);

    if (top.length === 0) return null;

    const excerpts: ReferenceExcerpt[] = top.map((s) => ({
      name: s.row.test_case_name as string,
      structuralScore: s.row.structural_score as number,
      semanticScore: s.row.semantic_score as number | null,
      connectors: s.connectors,
      triggers: s.triggers,
      identityPattern: truncate(getNestedString(s.designResult, 'structured_prompt', 'identity'), 150),
      toolGuidancePattern: truncate(getNestedString(s.designResult, 'structured_prompt', 'toolGuidance'), 200),
      errorPattern: truncate(getNestedString(s.designResult, 'structured_prompt', 'errorHandling'), 150),
    }));

    // Build the section
    const lines: string[] = [];
    lines.push('# Reference Designs (from QA-validated cases)');
    lines.push('These designs scored well in automated testing. Use structural patterns as inspiration,');
    lines.push('not as templates. Always prioritize the user\'s specific request over these examples.');
    lines.push('');

    for (const ref of excerpts) {
      const scores = `structural: ${ref.structuralScore}/100${ref.semanticScore ? `, semantic: ${ref.semanticScore}/100` : ''}`;
      lines.push(`## ${ref.name} (${scores})`);
      lines.push(`- Connectors: ${ref.connectors.join(', ') || 'none'} | Triggers: ${ref.triggers.join(', ') || 'none'}`);
      if (ref.identityPattern) {
        lines.push(`- Identity approach: ${ref.identityPattern}`);
      }
      if (ref.toolGuidancePattern) {
        lines.push(`- Tool guidance pattern: ${ref.toolGuidancePattern}`);
      }
      if (ref.errorPattern) {
        lines.push(`- Error handling pattern: ${ref.errorPattern}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  } catch (err) {
    console.error('[PatternMatcher] Error building reference section:', err);
    return null;
  }
}

/**
 * Build a "Validated Design Patterns" section for injection into buildDesignPrompt.
 * Returns null if no active learned patterns exist.
 * Also increments usage_count for each pattern included.
 */
export function getLearnedPatternsSection(): string | null {
  try {
    const { personaDb } = require('@/app/db');

    // Deactivate stale patterns first (30-day decay)
    personaDb.designPatterns.deactivateStale(30);

    const patterns = personaDb.designPatterns.getActive() as Record<string, unknown>[];

    if (!patterns || patterns.length === 0) return null;

    // Cap at 10
    const active = patterns.slice(0, 10);

    const lines: string[] = [];
    lines.push('# Validated Design Patterns');
    lines.push('These patterns have been independently validated across multiple successful designs.');
    lines.push('Apply them where relevant to the user\'s request.');
    lines.push('');

    for (let i = 0; i < active.length; i++) {
      const p = active[i];
      const daysAgo = Math.floor(
        (Date.now() - new Date(p.last_validated_at as string).getTime()) / (1000 * 60 * 60 * 24)
      );
      lines.push(
        `${i + 1}. [${p.trigger_condition}] ${p.pattern_text} ` +
        `(${p.confidence} validations, verified ${daysAgo}d ago)`
      );

      // Increment usage count
      personaDb.designPatterns.incrementUsage(p.id as string);
    }

    lines.push('');
    return lines.join('\n');
  } catch (err) {
    console.error('[PatternMatcher] Error building learned patterns section:', err);
    return null;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json); } catch { return fallback; }
}

function getNestedString(obj: Record<string, unknown> | null, key1: string, key2: string): string {
  if (!obj) return '';
  const nested = obj[key1] as Record<string, unknown> | undefined;
  if (!nested) return '';
  return (nested[key2] as string) || '';
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}
