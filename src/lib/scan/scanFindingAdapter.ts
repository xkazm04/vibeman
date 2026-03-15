/**
 * Bidirectional adapter between ScanFinding and RefactorOpportunity.
 *
 * ScanFinding  (src/lib/scan/types.ts)          – generic scan output
 * RefactorOpportunity (src/stores/slices/refactor/types.ts) – refactor wizard input
 *
 * Use scanFindingToOpportunity() to feed scan results into the refactor wizard.
 * Use opportunityToScanFinding()  to surface refactor opportunities in scan reports.
 */

import type { ScanFinding } from './types';
import type { RefactorOpportunity } from '@/stores/slices/refactor/types';

// ─────────────────────────────────────────────────────────────────────────────
// Severity mappings
// ─────────────────────────────────────────────────────────────────────────────

function findingToOpportunitySeverity(
  severity: ScanFinding['severity']
): RefactorOpportunity['severity'] {
  switch (severity) {
    case 'error':   return 'critical';
    case 'warning': return 'medium';
    case 'info':    return 'low';
    default:        return 'low';
  }
}

function opportunityToFindingSeverity(
  severity: RefactorOpportunity['severity']
): ScanFinding['severity'] {
  switch (severity) {
    case 'critical': return 'error';
    case 'high':     return 'error';
    case 'medium':   return 'warning';
    case 'low':      return 'info';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Impact mappings
// ─────────────────────────────────────────────────────────────────────────────

function findingImpactToString(impact: ScanFinding['impact']): string {
  switch (impact) {
    case 'high':   return 'High impact on code quality and maintainability';
    case 'medium': return 'Moderate impact on code quality';
    case 'low':    return 'Low impact, cosmetic or minor improvement';
    default:       return 'Impact not specified';
  }
}

function impactStringToFindingImpact(impact: string): ScanFinding['impact'] {
  const lower = impact.toLowerCase();
  if (lower.includes('high') || lower.includes('critical') || lower.includes('significant')) {
    return 'high';
  }
  if (lower.includes('medium') || lower.includes('moderate')) {
    return 'medium';
  }
  return 'low';
}

// ─────────────────────────────────────────────────────────────────────────────
// ID generation
// ─────────────────────────────────────────────────────────────────────────────

function deriveId(finding: ScanFinding): string {
  if (finding.id) return finding.id;
  // Deterministic fallback from title + filePath so repeated calls are stable
  const base = `${finding.title}-${finding.filePath ?? 'unknown'}`;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a ScanFinding into a RefactorOpportunity so scan results can be
 * consumed by the refactor wizard.
 *
 * @param finding - The scan finding to convert.
 * @param category - Optional category override; defaults to 'code-quality'.
 */
export function scanFindingToOpportunity(
  finding: ScanFinding,
  category: RefactorOpportunity['category'] = 'code-quality'
): RefactorOpportunity {
  const files = finding.filePath ? [finding.filePath] : [];
  const lineNumbers: Record<string, number[]> | undefined =
    finding.filePath && finding.lineNumber !== undefined
      ? { [finding.filePath]: [finding.lineNumber] }
      : undefined;

  return {
    id: deriveId(finding),
    title: finding.title,
    description: finding.description,
    category,
    severity: findingToOpportunitySeverity(finding.severity),
    impact: findingImpactToString(finding.impact),
    effort: finding.effort ?? 'medium',
    files,
    ...(lineNumbers && { lineNumbers }),
    ...(finding.suggestion && { suggestedFix: finding.suggestion }),
    autoFixAvailable: false,
  };
}

/**
 * Convert an array of ScanFindings into RefactorOpportunities.
 *
 * @param findings - Findings to convert.
 * @param category - Optional category applied to all resulting opportunities.
 */
export function scanFindingsToOpportunities(
  findings: ScanFinding[],
  category?: RefactorOpportunity['category']
): RefactorOpportunity[] {
  return findings.map((f) => scanFindingToOpportunity(f, category));
}

/**
 * Convert a RefactorOpportunity back into a ScanFinding so refactor
 * opportunities can appear in generic scan reports.
 *
 * @param opportunity - The refactor opportunity to convert.
 */
export function opportunityToScanFinding(opportunity: RefactorOpportunity): ScanFinding {
  return {
    id: opportunity.id,
    title: opportunity.title,
    description: opportunity.description,
    severity: opportunityToFindingSeverity(opportunity.severity),
    impact: impactStringToFindingImpact(opportunity.impact),
    effort: opportunity.effort,
    filePath: opportunity.files[0],
    ...(opportunity.lineNumbers &&
      opportunity.files[0] &&
      opportunity.lineNumbers[opportunity.files[0]] && {
        lineNumber: opportunity.lineNumbers[opportunity.files[0]][0],
      }),
    ...(opportunity.suggestedFix && { suggestion: opportunity.suggestedFix }),
  };
}

/**
 * Convert an array of RefactorOpportunities into ScanFindings.
 *
 * @param opportunities - Opportunities to convert.
 */
export function opportunitiesToScanFindings(
  opportunities: RefactorOpportunity[]
): ScanFinding[] {
  return opportunities.map(opportunityToScanFinding);
}
