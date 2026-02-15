/**
 * Duplicate Detector — algorithmic similarity check for design review results.
 * Prevents saving semantically identical personas generated across test runs.
 *
 * Pure algorithmic comparison (no LLM calls). 4-dimension weighted scoring:
 * - Connectors (30%): Jaccard on suggested_connectors names
 * - Tools (25%): Jaccard on suggested_tools names
 * - Triggers (15%): Jaccard on trigger types
 * - Text (30%): Sorensen-Dice bigram on identity + summary
 */

import type { DesignAnalysisResult } from '@/app/features/Personas/lib/designTypes';
import type { TestCaseResult } from './testTypes';

// ============================================================================
// Configuration
// ============================================================================

export interface DuplicateDetectorConfig {
  /** Overall similarity threshold (0.0 - 1.0). Default: 0.85 */
  threshold: number;
  /** Weight for connector overlap. Default: 0.30 */
  connectorWeight: number;
  /** Weight for tool overlap. Default: 0.25 */
  toolWeight: number;
  /** Weight for trigger type overlap. Default: 0.15 */
  triggerWeight: number;
  /** Weight for text similarity. Default: 0.30 */
  textWeight: number;
}

export const DEFAULT_CONFIG: DuplicateDetectorConfig = {
  threshold: 0.85,
  connectorWeight: 0.30,
  toolWeight: 0.25,
  triggerWeight: 0.15,
  textWeight: 0.30,
};

// ============================================================================
// Result Types
// ============================================================================

export interface SimilarityBreakdown {
  connectorScore: number;
  toolScore: number;
  triggerScore: number;
  textScore: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  bestMatchId: string | null;
  bestMatchName: string | null;
  bestMatchScore: number;
  breakdown: SimilarityBreakdown | null;
}

// ============================================================================
// Stop Words
// ============================================================================

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'that', 'this', 'and', 'or', 'for',
  'to', 'of', 'in', 'with', 'from', 'by', 'on', 'at', 'be', 'as',
  'i', 'am', 'my', 'our', 'we', 'you', 'your', 'will', 'can', 'do',
  'has', 'have', 'been', 'are', 'was', 'were', 'not', 'but', 'if',
  'then', 'so', 'all', 'each', 'any', 'when', 'who', 'how', 'what',
]);

// ============================================================================
// Similarity Primitives
// ============================================================================

/** Normalize text: lowercase, strip punctuation, remove stop words */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .join(' ');
}

/** Extract character bigrams from text */
function getBigrams(text: string): Set<string> {
  const normalized = normalizeText(text);
  const bigrams = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i++) {
    bigrams.add(normalized.slice(i, i + 2));
  }
  return bigrams;
}

/** Jaccard similarity: |A ∩ B| / |A ∪ B| */
export function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a.map(s => s.toLowerCase()));
  const setB = new Set(b.map(s => s.toLowerCase()));
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  return intersection / (setA.size + setB.size - intersection);
}

/** Sorensen-Dice coefficient on character bigrams */
export function diceCoefficient(textA: string, textB: string): number {
  const bigramsA = getBigrams(textA);
  const bigramsB = getBigrams(textB);
  if (bigramsA.size === 0 && bigramsB.size === 0) return 1.0;
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0.0;
  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

// ============================================================================
// Core Comparison
// ============================================================================

/** Compare two DesignAnalysisResult objects and return a similarity score */
export function computeSimilarity(
  a: DesignAnalysisResult,
  b: DesignAnalysisResult,
  config?: Partial<DuplicateDetectorConfig>,
): { score: number; breakdown: SimilarityBreakdown } {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Connector overlap
  const connA = (a.suggested_connectors ?? []).map(c => typeof c === 'string' ? c : c.name);
  const connB = (b.suggested_connectors ?? []).map(c => typeof c === 'string' ? c : c.name);
  const connectorScore = jaccardSimilarity(connA, connB);

  // Tool overlap
  const toolScore = jaccardSimilarity(a.suggested_tools ?? [], b.suggested_tools ?? []);

  // Trigger type overlap
  const trigA = (a.suggested_triggers ?? []).map(t => t.trigger_type);
  const trigB = (b.suggested_triggers ?? []).map(t => t.trigger_type);
  const triggerScore = jaccardSimilarity(trigA, trigB);

  // Text similarity (identity + summary)
  const textA = `${a.structured_prompt?.identity ?? ''} ${a.summary ?? ''}`;
  const textB = `${b.structured_prompt?.identity ?? ''} ${b.summary ?? ''}`;
  const textScore = diceCoefficient(textA, textB);

  const score =
    cfg.connectorWeight * connectorScore +
    cfg.toolWeight * toolScore +
    cfg.triggerWeight * triggerScore +
    cfg.textWeight * textScore;

  return { score, breakdown: { connectorScore, toolScore, triggerScore, textScore } };
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Check if a test case result is a duplicate of any existing review in the DB.
 * Returns true if a match above the threshold is found.
 */
export function checkDuplicate(
  result: TestCaseResult,
  appendOutput?: (line: string) => void,
  config?: Partial<DuplicateDetectorConfig>,
): boolean {
  if (!result.designResult) return false;

  const cfg = { ...DEFAULT_CONFIG, ...config };
  const log = appendOutput ?? (() => {});

  // Fetch existing reviews with design data
  let existingRows: Record<string, unknown>[];
  try {
    const { personaDb } = require('@/app/db');
    existingRows = personaDb.designReviews.getWithDesignResult();
  } catch {
    return false; // DB not available, skip check
  }

  if (!existingRows || existingRows.length === 0) return false;

  let bestScore = 0;
  let bestMatch: { id: string; name: string; breakdown: SimilarityBreakdown } | null = null;

  for (const row of existingRows) {
    if (!row.design_result || typeof row.design_result !== 'string') continue;

    let existing: DesignAnalysisResult;
    try {
      existing = JSON.parse(row.design_result as string);
    } catch {
      continue; // Skip unparseable rows
    }

    const { score, breakdown } = computeSimilarity(result.designResult, existing, cfg);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        id: row.id as string,
        name: row.test_case_name as string,
        breakdown,
      };
    }
  }

  // Duplicate found
  if (bestScore >= cfg.threshold && bestMatch) {
    const pct = Math.round(bestScore * 100);
    const bd = bestMatch.breakdown;
    log(`  Duplicate: ${pct}% match with "${bestMatch.name}" (${bestMatch.id})`);
    log(`    Conn: ${bd.connectorScore.toFixed(2)} | Tools: ${bd.toolScore.toFixed(2)} | Trig: ${bd.triggerScore.toFixed(2)} | Text: ${bd.textScore.toFixed(2)}`);
    return true;
  }

  // Near-miss informational logging
  if (bestScore >= 0.70 && bestMatch) {
    const pct = Math.round(bestScore * 100);
    const threshPct = Math.round(cfg.threshold * 100);
    log(`  Duplicate check: ${pct}% similar to "${bestMatch.name}" (below ${threshPct}% threshold)`);
  }

  return false;
}
