/**
 * InsightDeduplicator — Single owner of insight deduplication logic.
 *
 * Consolidates canonical hash matching, fuzzy token overlap fallback,
 * confidence evolution heuristics, and relationship ID resolution
 * that were previously split across brainService.deduplicateInsights()
 * and brainInsightRepository.createBatch().
 */

import { generateInsightHash } from './insightId';
import { tokenOverlap, DEDUP_THRESHOLD } from './insightSimilarity';
import type { LearningInsight, DbBrainInsight } from '@/app/db/models/brain.types';

const INSIGHT_TYPES = ['preference_learned', 'pattern_detected', 'warning', 'recommendation', 'best_practice'] as const;

/** Minimum fields needed for dedup matching and relationship resolution. */
export interface InsightRecord {
  id: string;
  type: string;
  title: string;
  confidence: number;
}

export class InsightDeduplicator {
  private readonly canonicalMap = new Map<string, InsightRecord>();
  private readonly titleMap = new Map<string, InsightRecord>();

  constructor(
    private readonly projectId: string,
    private readonly existingInsights: InsightRecord[],
  ) {
    for (const insight of existingInsights) {
      const hash = generateInsightHash(insight.type, insight.title, projectId);
      // Keep most recent (last wins since existing are ordered by created_at DESC)
      if (!this.canonicalMap.has(hash)) {
        this.canonicalMap.set(hash, insight);
      }
      if (!this.titleMap.has(insight.title)) {
        this.titleMap.set(insight.title, insight);
      }
    }
  }

  /**
   * Find existing insight by canonical hash (O(1) lookup).
   */
  findByCanonical(type: string, title: string): InsightRecord | undefined {
    const hash = generateInsightHash(type, title, this.projectId);
    return this.canonicalMap.get(hash);
  }

  /**
   * Find existing insight by fuzzy token overlap (O(n), same type required).
   */
  findByFuzzy(type: string, title: string): InsightRecord | undefined {
    return this.existingInsights.find(existing => {
      if (existing.type !== type) return false;
      return tokenOverlap(title, existing.title) >= DEDUP_THRESHOLD;
    });
  }

  /**
   * Find existing insight by exact title match.
   */
  findByTitle(title: string): InsightRecord | undefined {
    return this.titleMap.get(title);
  }

  /**
   * Find best match: canonical hash first, then fuzzy fallback.
   */
  findMatch(type: string, title: string): InsightRecord | undefined {
    return this.findByCanonical(type, title) ?? this.findByFuzzy(type, title);
  }

  /**
   * Core dedup pipeline: filter new insights against existing,
   * with confidence evolution when new confidence > existing + 10.
   */
  deduplicate(newInsights: LearningInsight[]): LearningInsight[] {
    if (this.existingInsights.length === 0) return newInsights;

    const result: LearningInsight[] = [];

    for (const insight of newInsights) {
      const match = this.findMatch(insight.type, insight.title);

      if (!match) {
        result.push(insight);
      } else if (insight.confidence > match.confidence + 10) {
        // Higher confidence → evolution of existing insight
        result.push({ ...insight, evolves: match.title });
      }
      // else: duplicate with similar confidence → skip
    }

    return result;
  }

  /**
   * Resolve evolves_from_id via canonical hash, falling back to exact title.
   */
  resolveEvolvesFromId(insightType: string, evolvesTitle: string): string | null {
    const byCanonical = this.findByCanonical(insightType, evolvesTitle);
    if (byCanonical) return byCanonical.id;

    const byTitle = this.findByTitle(evolvesTitle);
    return byTitle?.id ?? null;
  }

  /**
   * Resolve conflict_with_id: tries all insight types for canonical match,
   * falls back to exact title.
   */
  resolveConflictWithId(conflictTitle: string): string | null {
    for (const type of INSIGHT_TYPES) {
      const byCanonical = this.findByCanonical(type, conflictTitle);
      if (byCanonical) return byCanonical.id;
    }

    const byTitle = this.findByTitle(conflictTitle);
    return byTitle?.id ?? null;
  }
}
