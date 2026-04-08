/**
 * Insight Fusion
 *
 * Detects semantic convergence events (multiple contexts converging on
 * the same concept) and crystallizes them into palace insights via API,
 * without requiring a full reflection cycle.
 */

import type { ConvergenceEvent } from './types';

interface FusedInsight {
  concept: string[];
  contextNames: string[];
  signalIds: string[];
  strength: number;
}

// Track which convergence events have already been fused to avoid duplicates
const fusedConceptCache = new Set<string>();

/**
 * Determine which convergence events are novel and worth crystallizing.
 * Returns only events that haven't been fused yet and meet the strength threshold.
 */
export function filterNovelConvergences(
  events: ConvergenceEvent[],
  minStrength: number = 0.4,
): FusedInsight[] {
  const novel: FusedInsight[] = [];

  for (const event of events) {
    if (event.strength < minStrength) continue;

    // Create a stable key from sorted concept + context names
    const key = [
      ...event.concept.sort(),
      '::',
      ...event.contextNames.sort(),
    ].join('|');

    if (fusedConceptCache.has(key)) continue;

    novel.push({
      concept: event.concept,
      contextNames: event.contextNames,
      signalIds: event.signalIds,
      strength: event.strength,
    });
  }

  return novel;
}

/**
 * Crystallize convergence events into palace insights by posting to the
 * brain insights ingest API. Marks them as fused to prevent duplicates.
 */
export async function crystallizeInsights(
  insights: FusedInsight[],
  projectId: string,
): Promise<number> {
  if (insights.length === 0) return 0;

  let crystallized = 0;

  for (const insight of insights) {
    const key = [
      ...insight.concept.sort(),
      '::',
      ...insight.contextNames.sort(),
    ].join('|');

    try {
      const title = `Convergence: ${insight.concept.join(', ')}`;
      const description = `Semantic convergence detected across contexts [${insight.contextNames.join(', ')}]. ` +
        `${insight.signalIds.length} signals share conceptual similarity ` +
        `(strength: ${(insight.strength * 100).toFixed(0)}%). ` +
        `This pattern emerged organically from signal clustering without a reflection cycle.`;

      const response = await fetch('/api/brain/insights/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          insights: [{
            type: 'cross_cutting_pattern',
            title,
            description,
            confidence: Math.min(0.95, insight.strength + 0.2),
            evidence: insight.signalIds.map(id => ({ type: 'signal', id })),
          }],
          source: 'semantic_clustering',
        }),
      });

      if (response.ok) {
        fusedConceptCache.add(key);
        crystallized++;
      }
    } catch {
      // Non-critical — insight crystallization is best-effort
    }
  }

  return crystallized;
}

/**
 * Clear the fusion cache (e.g., on project change).
 */
export function clearFusionCache(): void {
  fusedConceptCache.clear();
}
