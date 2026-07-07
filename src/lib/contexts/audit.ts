/**
 * Context Balance Audit — advisory grader (NOT a save-time gate).
 *
 * Scores a project's contexts/groups against the granularity policy and the
 * categorization taxonomy, surfacing imbalances the hardened generation prompt
 * is supposed to prevent. Pure + DB-only (no filesystem scan), so it's cheap to
 * run on demand from an API route or MCP tool.
 */

import { getPolicy, type ProjectSizeTier } from './policy';
import { isContextCategory, isGroupDomain } from './taxonomy';

export interface AuditFinding {
  severity: 'warn' | 'info';
  code: string;
  message: string;
  contextId?: string;
  groupId?: string;
}

export interface ContextAuditReport {
  tier: ProjectSizeTier;
  totals: {
    groups: number;
    contexts: number;
    files: number;
    uncategorizedContexts: number;
    groupsMissingDomain: number;
    overlappingFiles: number;
    /** Contexts with at least one file missing from disk (includes staleContexts). */
    missingFiles: number;
    /** Contexts whose every file is missing from disk (deleted feature still tracked). */
    staleContexts: number;
    /** crossRefs entries pointing at a contextId that no longer exists. */
    unresolvedCrossRefs: number;
    /** Contexts whose mapped files changed on disk since the metadata was written. */
    contentStaleContexts: number;
  };
  findings: AuditFinding[];
  /** true when there are no warn-level findings. */
  ok: boolean;
}

export interface AuditContextInput {
  id: string;
  name: string;
  groupId: string | null;
  filePaths: string[];
  category?: string | null;
  /** Typed dependency edges to other contexts; each must resolve to a real context. */
  crossRefs?: Array<{ contextId: string; relationship?: string }> | null;
}

export interface AuditGroupInput {
  id: string;
  name: string;
  domain?: string | null;
}

const MAX_OVERLAP_FINDINGS = 20;
/** Cap on example missing paths carried in a single finding message. */
const MAX_MISSING_EXAMPLES = 5;

export interface AuditOptions {
  /** Used to pick the granularity policy tier; defaults to the total tracked file count. */
  sourceFileCount?: number;
  /**
   * Optional disk resolver: given a context's stored (project-relative) file path,
   * returns true if the file exists on disk. When provided, the audit emits
   * `stale_context` / `missing_files` findings for context-map drift. When omitted,
   * disk checks are skipped (keeping the audit DB-only / pure).
   */
  fileExists?: (filePath: string) => boolean;
  /**
   * Optional content-drift resolver: given a context's stored (project-relative)
   * file path, returns true if the file's CONTENT changed since the context's
   * metadata baseline was captured. When provided, the audit emits
   * `content_stale` findings. When omitted, content-freshness is skipped.
   */
  isStale?: (filePath: string) => boolean;
}

export function auditContexts(
  contexts: AuditContextInput[],
  groups: AuditGroupInput[],
  opts?: AuditOptions
): ContextAuditReport {
  const totalFiles = contexts.reduce((n, c) => n + (c.filePaths?.length ?? 0), 0);
  const sourceFileCount = opts?.sourceFileCount ?? totalFiles;
  const { tier, policy } = getPolicy(sourceFileCount);
  const findings: AuditFinding[] = [];
  const fileExists = opts?.fileExists;
  const isStale = opts?.isStale;
  let missingFiles = 0;
  let staleContexts = 0;
  let unresolvedCrossRefs = 0;
  let contentStaleContexts = 0;

  // Referential integrity: a crossRefs edge must point at a context that exists.
  const contextIds = new Set(contexts.map((c) => c.id));

  // ── Per-context: size, category, grouping ──────────────────────────────────
  for (const c of contexts) {
    const n = c.filePaths?.length ?? 0;
    if (n > policy.filesPerContext.hardMax) {
      findings.push({ severity: 'warn', code: 'context_too_large', contextId: c.id, message: `"${c.name}" has ${n} files (hard max ${policy.filesPerContext.hardMax}) — split it.` });
    } else if (n > policy.filesPerContext.max) {
      findings.push({ severity: 'info', code: 'context_oversized', contextId: c.id, message: `"${c.name}" has ${n} files (target ≤ ${policy.filesPerContext.max}) — consider splitting.` });
    } else if (n > 0 && n < policy.filesPerContext.min) {
      findings.push({ severity: 'info', code: 'context_undersized', contextId: c.id, message: `"${c.name}" has only ${n} files (target ≥ ${policy.filesPerContext.min}) — consider merging.` });
    }

    if (!c.category || !isContextCategory(c.category)) {
      findings.push({ severity: 'warn', code: 'context_uncategorized', contextId: c.id, message: `"${c.name}" has no valid category (ui|api|lib|data|test|config).` });
    }
    if (!c.groupId) {
      findings.push({ severity: 'warn', code: 'context_orphan', contextId: c.id, message: `"${c.name}" is not assigned to any group.` });
    }

    // Referential integrity: crossRefs must resolve to a real context.
    for (const ref of c.crossRefs ?? []) {
      if (ref?.contextId && !contextIds.has(ref.contextId)) {
        unresolvedCrossRefs++;
        findings.push({
          severity: 'warn',
          code: 'unresolved_cross_ref',
          contextId: c.id,
          message: `"${c.name}" has a crossRef to a context that no longer exists (${ref.contextId}).`,
        });
      }
    }

    // ── Disk drift: files[] that no longer exist on disk ──────────────────────
    if (fileExists && n > 0) {
      const missing = (c.filePaths ?? []).filter((f) => !fileExists(f));
      if (missing.length > 0) {
        missingFiles++;
        const examples = missing.slice(0, MAX_MISSING_EXAMPLES);
        const more = missing.length - examples.length;
        const exampleText = `${examples.join(', ')}${more > 0 ? `, +${more} more` : ''}`;
        if (missing.length === n) {
          // Every file is gone — a deleted feature still tracked as a context.
          staleContexts++;
          findings.push({
            severity: 'warn',
            code: 'stale_context',
            contextId: c.id,
            message: `"${c.name}" is stale — all ${n} files are missing from disk: ${exampleText}.`,
          });
        } else {
          findings.push({
            severity: 'warn',
            code: 'missing_files',
            contextId: c.id,
            message: `"${c.name}" references ${missing.length} of ${n} files that are missing from disk: ${exampleText}.`,
          });
        }
      }
    }

    // ── Content drift: mapped files changed since the metadata baseline ───────
    if (isStale && n > 0) {
      const changed = (c.filePaths ?? []).filter((f) => isStale(f));
      if (changed.length > 0) {
        contentStaleContexts++;
        const examples = changed.slice(0, MAX_MISSING_EXAMPLES);
        const more = changed.length - examples.length;
        findings.push({
          severity: 'info',
          code: 'content_stale',
          contextId: c.id,
          message: `"${c.name}" — ${changed.length} file(s) changed since its metadata was written: ${examples.join(', ')}${more > 0 ? `, +${more} more` : ''}. Consider regenerating.`,
        });
      }
    }
  }

  // ── Per-group: contexts-per-group, domain ───────────────────────────────────
  const contextsPerGroup = new Map<string, number>();
  for (const c of contexts) {
    if (c.groupId) contextsPerGroup.set(c.groupId, (contextsPerGroup.get(c.groupId) ?? 0) + 1);
  }
  for (const g of groups) {
    const count = contextsPerGroup.get(g.id) ?? 0;
    if (count > policy.contextsPerGroup.max) {
      findings.push({ severity: 'warn', code: 'group_too_many_contexts', groupId: g.id, message: `"${g.name}" has ${count} contexts (max ${policy.contextsPerGroup.max}) — split the group.` });
    } else if (count === 0) {
      findings.push({ severity: 'info', code: 'group_empty', groupId: g.id, message: `"${g.name}" has no contexts.` });
    } else if (count < policy.contextsPerGroup.min) {
      findings.push({ severity: 'info', code: 'group_too_few_contexts', groupId: g.id, message: `"${g.name}" has only ${count} contexts (target ≥ ${policy.contextsPerGroup.min}).` });
    }

    if (!g.domain || !isGroupDomain(g.domain)) {
      findings.push({ severity: 'warn', code: 'group_missing_domain', groupId: g.id, message: `"${g.name}" has no valid domain (feature|infrastructure|shared|integration|data).` });
    }
  }

  if (groups.length > policy.groupsPerProject.max) {
    findings.push({ severity: 'info', code: 'too_many_groups', message: `${groups.length} groups (target ≤ ${policy.groupsPerProject.max} for a ${tier} project).` });
  }

  // ── File overlap: a file claimed by more than one context ───────────────────
  const fileToContexts = new Map<string, string[]>();
  for (const c of contexts) {
    for (const f of c.filePaths ?? []) {
      const arr = fileToContexts.get(f) ?? [];
      arr.push(c.name);
      fileToContexts.set(f, arr);
    }
  }
  let overlappingFiles = 0;
  for (const [file, names] of fileToContexts) {
    if (names.length > 1) {
      overlappingFiles++;
      if (overlappingFiles <= MAX_OVERLAP_FINDINGS) {
        findings.push({ severity: 'warn', code: 'file_overlap', message: `"${file}" appears in ${names.length} contexts: ${names.join(', ')}.` });
      }
    }
  }
  if (overlappingFiles > MAX_OVERLAP_FINDINGS) {
    findings.push({ severity: 'warn', code: 'file_overlap_more', message: `…and ${overlappingFiles - MAX_OVERLAP_FINDINGS} more overlapping files.` });
  }

  const uncategorizedContexts = contexts.filter((c) => !c.category || !isContextCategory(c.category)).length;
  const groupsMissingDomain = groups.filter((g) => !g.domain || !isGroupDomain(g.domain)).length;

  return {
    tier,
    totals: {
      groups: groups.length,
      contexts: contexts.length,
      files: totalFiles,
      uncategorizedContexts,
      groupsMissingDomain,
      overlappingFiles,
      missingFiles,
      staleContexts,
      unresolvedCrossRefs,
      contentStaleContexts,
    },
    findings,
    ok: !findings.some((f) => f.severity === 'warn'),
  };
}
