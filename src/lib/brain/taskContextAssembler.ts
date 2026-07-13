/**
 * Task-Aware Context Assembler
 * Analyzes requirement content, matches to relevant contexts/knowledge,
 * and produces a task-specific knowledge section for injection into execution prompts.
 */

import { brainInsightRepository } from '@/app/db/repositories/brain-insight.repository';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { implementationLogRepository } from '@/app/db/repositories/implementation-log.repository';
import { behavioralSignalRepository } from '@/app/db/repositories/behavioral-signal.repository';
import type { DbContext } from '@/app/db/models/types';
import type { ImplementationLogMetadata } from '@/app/db/models/types';
import type { CliMemorySignalData } from '@/app/db/models/brain.types';
import { safeParseJson } from '@/lib/json-utils';
import { SignalType } from '@/types/signals';
import {
  CLI_MEMORY_ASSEMBLER_MAX_ENTRIES,
  CLI_MEMORY_ASSEMBLER_MAX_CHARS,
} from '@/lib/brain/config';

// ── Signal extraction regexes ────────────────────────────────────────

const CATEGORY_RE = /\b(performance|security|refactor|ui|api|database|testing|migration|auth|infrastructure|bugfix|feature)\b/gi;
const FILE_PATH_RE = /(?:src|lib|app|components|pages|packages)\/[\w\-\/\.]+/g;
const TECH_RE = /\b(react|zustand|sqlite|better-sqlite3|prisma|tailwind|nextjs|next\.js|framer|typescript|zod|vitest|jest|express|fastify|drizzle|trpc)\b/gi;

interface TaskSignals {
  categories: string[];
  filePaths: string[];
  technologies: string[];
  allTerms: string[];
}

interface MatchedContext {
  context: DbContext;
  score: number;
  keywords: string[];
  entryPoints: Array<{ path: string; type: string }>;
  dbTables: string[];
  crossRefs: Array<{ contextId: string; relationship: string }>;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Assemble task-specific context for injection into an execution prompt.
 * Returns a formatted markdown section (~500 tokens max) or empty string.
 */
export function assembleTaskContext(config: {
  projectId: string;
  requirementContent: string;
  contextId?: string;
}): string {
  const { projectId, requirementContent, contextId } = config;

  try {
    // 1. Extract signals from requirement content
    const signals = extractTaskSignals(requirementContent);

    // 2. Gather recent cli_memory for this context — the fleet's cross-run memory
    //    ("last run here failed on X"). Always gathered, even when the requirement
    //    yields no extractable terms, so prior outcomes still surface.
    const cliMemory = gatherRecentCliMemory(projectId, contextId);

    // Nothing to say if we have neither matchable terms nor prior run memory.
    if (signals.allTerms.length === 0 && cliMemory.length === 0) return '';

    // 3-4. Term-based enrichment (context match + best practices). Isolated in its
    //      own try so a failure here never discards the cli_memory we already have.
    let matchedContexts: MatchedContext[] = [];
    let practices: Array<{ title: string; description: string }> = [];
    if (signals.allTerms.length > 0) {
      try {
        matchedContexts = matchContexts(projectId, signals);
        practices = gatherBestPractices(projectId, signals.categories);
      } catch {
        // Term enrichment is best-effort; cli_memory still surfaces below.
      }
    }

    // 5. Gather past implementation patterns
    const pastPatterns = gatherPastPatterns(contextId || matchedContexts[0]?.context.id);

    // 6. Format output
    return formatTaskContext(signals, matchedContexts, practices, pastPatterns, cliMemory);
  } catch {
    return ''; // Assembly must never break execution
  }
}

// ── CLI run memory ───────────────────────────────────────────────────
// Reads recent cli_memory signals (produced at task completion/failure) so the
// execution prompt carries lessons from prior runs. Hard-bounded on both entry
// count and per-entry chars to keep the injected section token-cheap.

/**
 * Fetch recent cli_memory messages for a project, preferring the task's own
 * context but falling back to project-wide memory. Returns bounded, de-duped
 * message lines newest-first.
 */
function gatherRecentCliMemory(projectId: string, contextId?: string): string[] {
  try {
    const limit = CLI_MEMORY_ASSEMBLER_MAX_ENTRIES;
    // Context-scoped first (most relevant), then top up with project-wide memory.
    const scoped = contextId
      ? behavioralSignalRepository.getByProject(projectId, {
          signalType: SignalType.CLI_MEMORY,
          contextId,
          limit,
        })
      : [];
    const needed = limit - scoped.length;
    const projectWide = needed > 0
      ? behavioralSignalRepository.getByProject(projectId, {
          signalType: SignalType.CLI_MEMORY,
          limit: limit + scoped.length,
        })
      : [];

    const seen = new Set(scoped.map(s => s.id));
    const rows = [...scoped, ...projectWide.filter(s => !seen.has(s.id))].slice(0, limit);

    const messages: string[] = [];
    const seenMsgs = new Set<string>();
    for (const row of rows) {
      let msg = '';
      try {
        const parsed = JSON.parse(row.data || '{}') as Partial<CliMemorySignalData>;
        msg = (parsed.message || '').trim();
      } catch {
        continue;
      }
      if (!msg) continue;
      const bounded = msg.length > CLI_MEMORY_ASSEMBLER_MAX_CHARS
        ? `${msg.slice(0, CLI_MEMORY_ASSEMBLER_MAX_CHARS - 1)}…`
        : msg;
      if (seenMsgs.has(bounded)) continue;
      seenMsgs.add(bounded);
      messages.push(bounded);
    }
    return messages;
  } catch {
    return [];
  }
}

// ── Signal extraction ────────────────────────────────────────────────

function extractTaskSignals(content: string): TaskSignals {
  const categories = [...new Set(
    (content.match(CATEGORY_RE) || []).map(c => c.toLowerCase())
  )];

  const filePaths = [...new Set(
    (content.match(FILE_PATH_RE) || [])
  )];

  const technologies = [...new Set(
    (content.match(TECH_RE) || []).map(t => t.toLowerCase())
  )];

  const allTerms = [...categories, ...technologies, ...filePaths.map(fp => {
    const parts = fp.split('/');
    return parts[parts.length - 1]?.replace(/\.\w+$/, '') || '';
  }).filter(Boolean)];

  return { categories, filePaths, technologies, allTerms };
}

// ── Context matching ─────────────────────────────────────────────────

function matchContexts(projectId: string, signals: TaskSignals): MatchedContext[] {
  const contexts = contextRepository.getContextsByProject(projectId);
  const results: MatchedContext[] = [];

  for (const ctx of contexts) {
    let keywords: string[] = [];
    let entryPoints: Array<{ path: string; type: string }> = [];
    let dbTables: string[] = [];
    let crossRefs: Array<{ contextId: string; relationship: string }> = [];

    keywords = safeParseJson(ctx.keywords, []);
    entryPoints = safeParseJson(ctx.entry_points, []);
    dbTables = safeParseJson(ctx.db_tables, []);
    crossRefs = safeParseJson(ctx.cross_refs, []);

    // Score by keyword overlap
    let score = 0;
    const lowerKeywords = keywords.map(k => k.toLowerCase());

    for (const term of signals.allTerms) {
      const lowerTerm = term.toLowerCase();
      if (lowerKeywords.some(kw => kw.includes(lowerTerm) || lowerTerm.includes(kw))) {
        score++;
      }
    }

    // Bonus for file path overlap
    if (ctx.file_paths) {
      try {
        const ctxFiles: string[] = JSON.parse(ctx.file_paths);
        for (const fp of signals.filePaths) {
          if (ctxFiles.some(cf => cf.includes(fp) || fp.includes(cf))) {
            score += 2;
          }
        }
      } catch {}
    }

    // Bonus for context name match
    const ctxNameLower = (ctx.name || '').toLowerCase();
    for (const term of signals.allTerms) {
      if (ctxNameLower.includes(term.toLowerCase())) {
        score += 1;
      }
    }

    if (score > 0) {
      results.push({ context: ctx, score, keywords, entryPoints, dbTables, crossRefs });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}

// ── Knowledge gathering ──────────────────────────────────────────────

function gatherBestPractices(
  projectId: string,
  categories: string[]
): Array<{ title: string; description: string }> {
  try {
    const allInsights = brainInsightRepository.getAllInsights(projectId, 50);
    const practices = allInsights
      .filter(i => i.type === 'best_practice')
      .filter(i => {
        if (categories.length === 0) return true;
        const descLower = i.description.toLowerCase();
        return categories.some(cat => descLower.includes(cat));
      })
      .slice(0, 5)
      .map(i => ({ title: i.title, description: i.description }));
    return practices;
  } catch {
    return [];
  }
}

function gatherPastPatterns(
  contextId: string | undefined
): Array<{ title: string; patterns: string[]; decisions: string[] }> {
  if (!contextId) return [];

  try {
    const logs = implementationLogRepository.getLogsByContext(contextId);
    return logs
      .filter(log => log.metadata)
      .slice(0, 5)
      .map(log => {
        let patterns: string[] = [];
        let decisions: string[] = [];
        try {
          const meta: ImplementationLogMetadata = JSON.parse(log.metadata!);
          patterns = meta.patterns_applied || [];
          decisions = meta.key_decisions || [];
        } catch {}
        return { title: log.title, patterns, decisions };
      })
      .filter(p => p.patterns.length > 0 || p.decisions.length > 0);
  } catch {
    return [];
  }
}

// ── Formatting ───────────────────────────────────────────────────────

function formatTaskContext(
  signals: TaskSignals,
  matchedContexts: MatchedContext[],
  practices: Array<{ title: string; description: string }>,
  pastPatterns: Array<{ title: string; patterns: string[]; decisions: string[] }>,
  cliMemory: string[] = []
): string {
  const sections: string[] = [];
  const categoryLabel = signals.categories.length > 0
    ? signals.categories.slice(0, 3).join(', ')
    : 'general';

  // Recent CLI run history — cross-run memory from prior task outcomes.
  if (cliMemory.length > 0) {
    const memLines = cliMemory.map(m => `- ${m}`).join('\n');
    sections.push(`### Recent CLI Run History\n${memLines}`);
  }

  // Best practices section
  if (practices.length > 0) {
    const practiceLines = practices
      .map(p => `- **${p.title}**: ${p.description.slice(0, 200)}`)
      .join('\n');
    sections.push(`### Best Practices (${categoryLabel})\n${practiceLines}`);
  }

  // Past implementation patterns
  if (pastPatterns.length > 0) {
    const patternLines = pastPatterns
      .slice(0, 3)
      .map(p => {
        const pStr = p.patterns.length > 0 ? p.patterns.join(', ') : 'no patterns recorded';
        const dStr = p.decisions.length > 0 ? ` — ${p.decisions[0]}` : '';
        return `- ${p.title}: ${pStr}${dStr}`;
      })
      .join('\n');
    sections.push(`### Past Implementations in This Area\n${patternLines}`);
  }

  // Context architecture
  if (matchedContexts.length > 0) {
    const archLines: string[] = [];
    const ctx = matchedContexts[0];
    if (ctx.entryPoints.length > 0) {
      archLines.push(`- Entry points: ${ctx.entryPoints.slice(0, 3).map(e => e.path).join(', ')}`);
    }
    if (ctx.dbTables.length > 0) {
      archLines.push(`- DB tables: ${ctx.dbTables.slice(0, 5).join(', ')}`);
    }
    if (ctx.crossRefs.length > 0) {
      archLines.push(`- Related: ${ctx.crossRefs.slice(0, 3).map(r => r.relationship).join(', ')}`);
    }
    if (archLines.length > 0) {
      sections.push(`### Context Architecture (${ctx.context.name})\n${archLines.join('\n')}`);
    }
  }

  if (sections.length === 0) return '';

  return `## Relevant Knowledge for This Task\n\n${sections.join('\n\n')}`;
}
