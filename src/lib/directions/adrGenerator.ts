/**
 * Architecture Decision Record (ADR) Generator
 *
 * Auto-generates structured ADRs when directions are accepted.
 * Sections: Context, Decision, Alternatives Considered, Expected Consequences.
 */

export type AdrStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded';

export interface DecisionRecord {
  title: string;
  status: AdrStatus;
  date: string;
  context: string;
  decision: string;
  alternativesConsidered: string;
  expectedConsequences: string;
  supersededBy: string | null;
}

/**
 * Generate an ADR for a single (non-paired) direction acceptance.
 */
export function generateAdr(params: {
  summary: string;
  direction: string;
  contextMapTitle: string;
  problemStatement: string | null;
}): DecisionRecord {
  const context = params.problemStatement
    ? `${params.problemStatement}\n\nContext area: ${params.contextMapTitle}`
    : `This decision addresses a strategic direction identified within the "${params.contextMapTitle}" context area.`;

  return {
    title: params.summary,
    status: 'accepted',
    date: new Date().toISOString().split('T')[0],
    context,
    decision: params.direction,
    alternativesConsidered: 'No alternative variants were generated for this direction.',
    expectedConsequences: deriveConsequences(params.direction),
    supersededBy: null,
  };
}

/**
 * Generate an ADR for a paired direction acceptance (A vs B).
 * Includes the rejected alternative's details.
 */
export function generatePairedAdr(params: {
  summary: string;
  direction: string;
  contextMapTitle: string;
  problemStatement: string | null;
  rejectedSummary: string;
  rejectedDirection: string;
  selectedVariant: 'A' | 'B';
}): DecisionRecord {
  const context = params.problemStatement
    ? `${params.problemStatement}\n\nContext area: ${params.contextMapTitle}`
    : `This decision addresses a strategic direction identified within the "${params.contextMapTitle}" context area.`;

  const alternativesConsidered = `### Rejected Variant ${params.selectedVariant === 'A' ? 'B' : 'A'}: ${params.rejectedSummary}\n\n${params.rejectedDirection}`;

  return {
    title: params.summary,
    status: 'accepted',
    date: new Date().toISOString().split('T')[0],
    context,
    decision: params.direction,
    alternativesConsidered,
    expectedConsequences: deriveConsequences(params.direction),
    supersededBy: null,
  };
}

/**
 * Render a DecisionRecord to readable markdown for display.
 */
export function renderAdrMarkdown(adr: DecisionRecord): string {
  const statusBadge = adr.status.toUpperCase();
  const lines = [
    `# ADR: ${adr.title}`,
    '',
    `**Status**: ${statusBadge}  `,
    `**Date**: ${adr.date}`,
    adr.supersededBy ? `**Superseded by**: ${adr.supersededBy}` : '',
    '',
    '## Context',
    '',
    adr.context,
    '',
    '## Decision',
    '',
    adr.decision,
    '',
    '## Alternatives Considered',
    '',
    adr.alternativesConsidered,
    '',
    '## Expected Consequences',
    '',
    adr.expectedConsequences,
  ].filter((line) => line !== undefined);

  return lines.join('\n');
}

/**
 * Derive expected consequences from the direction text.
 * Extracts bullet points that mention outcomes, or provides a generic statement.
 */
function deriveConsequences(directionText: string): string {
  // Look for sections that discuss impact, results, benefits, tradeoffs
  const lines = directionText.split('\n');
  const consequenceKeywords = /\b(result|impact|benefit|tradeoff|trade-off|consequence|outcome|improve|reduce|increase|enable|allow|risk)\b/i;
  const relevant = lines.filter((l) => consequenceKeywords.test(l) && l.trim().length > 10);

  if (relevant.length >= 2) {
    return relevant.map((l) => l.trim().replace(/^[-*]\s*/, '- ')).join('\n');
  }

  return 'Consequences will be evaluated after implementation. Track outcomes via the direction outcome system.';
}
