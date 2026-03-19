/**
 * Knowledge Base Service
 *
 * Wraps the knowledge repository with higher-level operations:
 * - Relevance scoring for task-specific KB retrieval
 * - Insight graduation (brain_insights -> KB entries)
 * - Prompt formatting for LLM injection
 * - Domain inference from file paths
 */

import { knowledgeRepository } from '@/app/db/repositories/knowledge.repository';
import type {
  DbKnowledgeEntry,
  CreateKnowledgeEntryInput,
  KnowledgeQuery,
  KnowledgeDomain,
  KnowledgeExportEntry,
} from '@/app/db/models/knowledge.types';

// ---------------------------------------------------------------------------
// Domain inference from file paths
// ---------------------------------------------------------------------------

function inferDomains(filePaths: string[]): KnowledgeDomain[] {
  const domains = new Set<KnowledgeDomain>();
  for (const fp of filePaths) {
    if (fp.includes('/api/') || fp.includes('route.ts')) domains.add('api');
    if (fp.includes('/components/') || fp.includes('.tsx')) domains.add('ui');
    if (fp.includes('/stores/') || fp.includes('Store.ts') || fp.includes('store.ts')) domains.add('state_management');
    if (fp.includes('/db/') || fp.includes('.repository.') || fp.includes('migration')) domains.add('database');
    if (fp.includes('/tests/') || fp.includes('.test.') || fp.includes('.spec.')) domains.add('testing');
    if (fp.includes('/lib/') && !fp.includes('/db/')) domains.add('architecture');
  }
  return Array.from(domains);
}

// ---------------------------------------------------------------------------
// Keyword extraction for search matching
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
  'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
  'too', 'very', 'just', 'because', 'if', 'when', 'while', 'where',
  'how', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
  'those', 'it', 'its',
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParseJsonArray(json: string): string[] {
  try { return JSON.parse(json); } catch { return []; }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function inferDomainFromContent(title: string, description: string): KnowledgeDomain {
  const text = `${title} ${description}`.toLowerCase();
  if (text.match(/\b(component|ui|css|style|layout|render|button|modal|animation)\b/)) return 'ui';
  if (text.match(/\b(api|route|endpoint|request|response|middleware|handler)\b/)) return 'api';
  if (text.match(/\b(store|state|zustand|redux|context|persist)\b/)) return 'state_management';
  if (text.match(/\b(database|sqlite|migration|query|repository|table|column|index)\b/)) return 'database';
  if (text.match(/\b(test|spec|mock|fixture|coverage|vitest|jest)\b/)) return 'testing';
  if (text.match(/\b(performance|cache|lazy|virtual|optimize|bundle|speed)\b/)) return 'performance';
  if (text.match(/\b(security|auth|xss|injection|csrf|sanitize|encrypt)\b/)) return 'security';
  return 'architecture';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const knowledgeBaseService = {
  addEntry(input: CreateKnowledgeEntryInput): DbKnowledgeEntry {
    return knowledgeRepository.create(input);
  },

  query(q: KnowledgeQuery): DbKnowledgeEntry[] {
    return knowledgeRepository.query(q);
  },

  /**
   * Get KB entries most relevant to a task, using domain inference + keyword matching.
   * Scores entries on domain match, keyword overlap, confidence, recency, and track record.
   */
  getRelevantForTask(params: {
    taskTitle: string;
    taskDescription: string;
    targetFiles?: string[];
    projectId?: string;
    limit?: number;
  }): KnowledgeExportEntry[] {
    const { taskTitle, taskDescription, targetFiles = [], projectId, limit = 7 } = params;

    const domains = inferDomains(targetFiles);
    const keywords = extractKeywords(`${taskTitle} ${taskDescription}`);

    // Gather candidate entries from inferred domains
    let entries: DbKnowledgeEntry[] = [];

    if (domains.length > 0) {
      for (const domain of domains) {
        const domainEntries = knowledgeRepository.query({
          domain,
          min_confidence: 40,
          project_id: projectId,
          limit: limit * 2, // over-fetch for scoring
        });
        entries.push(...domainEntries);
      }
    }

    // Also search by keywords
    if (keywords.length > 0) {
      const searchTerm = keywords.slice(0, 5).join(' ');
      const searchEntries = knowledgeRepository.search(searchTerm, limit * 2);
      entries.push(...searchEntries);
    }

    // Deduplicate
    const seen = new Set<string>();
    entries = entries.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    // Score and sort
    const scored = entries.map(entry => {
      let score = 0;

      // Domain match (0.35)
      if (domains.includes(entry.domain)) score += 0.35;

      // Keyword overlap (0.25)
      const entryWords = extractKeywords(`${entry.title} ${entry.pattern} ${entry.rationale || ''}`);
      const overlap = keywords.filter(k => entryWords.includes(k)).length;
      score += Math.min(0.25, (overlap / Math.max(keywords.length, 1)) * 0.25);

      // Confidence (0.20)
      score += (entry.confidence / 100) * 0.20;

      // Recency bonus (0.10)
      if (entry.last_applied_at) {
        const daysSince = (Date.now() - new Date(entry.last_applied_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) score += 0.10;
        else if (daysSince < 30) score += 0.05;
      }

      // Application track record (0.10)
      if (entry.times_applied > 0) {
        const helpRate = entry.times_helpful / entry.times_applied;
        score += helpRate * 0.10;
      }

      return { entry, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ entry }) => ({
      domain: entry.domain,
      pattern_type: entry.pattern_type,
      title: entry.title,
      pattern: entry.pattern,
      rationale: entry.rationale || undefined,
      code_example: entry.code_example || undefined,
      anti_pattern: entry.anti_pattern || undefined,
      confidence: entry.confidence,
      tags: safeParseJsonArray(entry.tags),
      times_applied: entry.times_applied,
      times_helpful: entry.times_helpful,
    }));
  },

  /**
   * Format KB entries for prompt injection (~400 tokens max for 7 entries).
   * Returns compact markdown optimized for LLM consumption.
   */
  formatKBForPrompt(entries: KnowledgeExportEntry[]): string {
    if (entries.length === 0) return '';

    const lines = [
      '## Knowledge Base (Proven Patterns)\n',
      'Apply these cross-project patterns where relevant:\n',
    ];

    for (const entry of entries) {
      const typeLabel = entry.pattern_type.replace(/_/g, ' ');
      lines.push(`**[${entry.domain}] ${capitalize(typeLabel)}**: ${entry.title}`);
      lines.push(
        `  -> ${entry.pattern.slice(0, 150)}${entry.pattern.length > 150 ? '...' : ''}`
        + ` -- ${entry.confidence}% confidence`
        + (entry.times_applied > 0 ? `, applied ${entry.times_applied} times` : '')
      );
      if (entry.anti_pattern) {
        lines.push(`  Avoid: ${entry.anti_pattern.slice(0, 100)}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  },

  /**
   * Auto-graduate high-confidence brain insights to KB entries.
   * Called after brainService.completeReflection().
   *
   * Graduation criteria:
   * - confidence >= 75
   * - type is 'best_practice' or 'pattern_detected'
   * - not auto-pruned
   * - no unresolved conflicts
   */
  autoGraduateInsights(projectId: string): { graduated: number; skipped: number } {
    try {
      // Dynamic import to avoid circular dependencies
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { brainInsightRepository } = require('@/app/db/repositories/brain-insight.repository');

      const insights = brainInsightRepository.getByProject(projectId, 100);
      let graduated = 0;
      let skipped = 0;

      for (const insight of insights) {
        // Graduation criteria
        if (insight.confidence < 75) { skipped++; continue; }
        if (!['best_practice', 'pattern_detected'].includes(insight.type)) { skipped++; continue; }
        // auto_pruned is 0/1 in SQLite
        if (insight.auto_pruned === 1) { skipped++; continue; }
        // conflict_with_id present and not resolved
        if (insight.conflict_with_id && insight.conflict_resolved !== 1) { skipped++; continue; }

        // Infer domain from insight content
        const domain = inferDomainFromContent(insight.title, insight.description);

        // Map insight type to pattern type
        const patternType = insight.type === 'best_practice' ? 'best_practice' : 'convention';

        const entry = knowledgeRepository.create({
          domain,
          pattern_type: patternType,
          title: insight.title,
          pattern: insight.description,
          confidence: insight.confidence,
          source_project_id: projectId,
          source_type: 'insight_graduation',
          source_insight_id: insight.id,
          tags: extractKeywords(insight.title).slice(0, 5),
        });

        // If deduped (existing entry returned), it won't have our insight ID
        if (entry.source_insight_id !== insight.id) {
          skipped++;
        } else {
          graduated++;
        }
      }

      return { graduated, skipped };
    } catch (err) {
      console.warn('[KnowledgeBase] autoGraduateInsights failed:', err);
      return { graduated: 0, skipped: 0 };
    }
  },

  inferDomains,
  getStats: () => knowledgeRepository.getStats(),
};
