/**
 * Context Map Export — the always-present, git-committed project artifact.
 *
 * Builds a portable `context-map.json` from Vibeman's DB and writes it to the
 * target project root. This file is the SERVER-FREE read source: any Claude Code
 * CLI working in the repo can read it without Vibeman running. Vibeman keeps it
 * fresh by auto-exporting (debounced) on every context/group mutation.
 */

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import {
  contextQueries,
  contextGroupQueries,
  contextGroupRelationshipQueries,
} from '@/lib/queries/contextQueries';
import { projectDb } from '@/lib/project_database';
import { logger } from '@/lib/logger';
import { auditContexts, type ContextAuditReport } from './audit';

export interface ExportedContext {
  name: string;
  description: string | null;
  businessFeature: string | null;
  category: string | null;
  filePaths: string[];
  target: string | null;
  apiRoutes: string[];
  /** Per-context lineage: when this context was last (re)written. */
  lastWrittenAt: string | null;
}

export interface ExportedGroup {
  name: string;
  domain: string | null;
  type: 'pages' | 'client' | 'server' | 'external' | null;
  color: string;
  icon: string | null;
  contexts: ExportedContext[];
}

export interface ExportedRelationship {
  source: string;
  target: string;
  type: string | null;
}

export interface ContextMapExport {
  $schema: string;
  projectId: string;
  projectName: string;
  projectPath: string;
  generatedAt: string;
  /** Short content hash — a consumer can detect staleness without diffing. */
  revision: string;
  /** Lineage: the commit the map was derived at, so a reader can judge staleness
   * against current HEAD instead of guessing from a timestamp. */
  provenance: { gitCommit: string | null; gitCommitCount: number | null };
  version: string;
  groups: ExportedGroup[];
  ungrouped: ExportedContext[];
  relationships: ExportedRelationship[];
  /** Compact one-line-per-context index for fast CLI orientation. */
  index: string[];
  summary: {
    totalGroups: number;
    totalContexts: number;
    totalFiles: number;
    categories: Record<string, number>;
    domains: Record<string, number>;
  };
  /** Advisory balance + referential-integrity snapshot (see src/lib/contexts/audit.ts). */
  audit: {
    ok: boolean;
    tier: ContextAuditReport['tier'];
    warnings: number;
    /** Contexts whose every file is missing from disk. */
    staleContexts: number;
    /** Contexts with at least one missing file. */
    missingFiles: number;
    /** crossRefs pointing at a context that no longer exists. */
    unresolvedCrossRefs: number;
  };
  instructions: string;
}

/**
 * Best-effort git provenance for a project root: HEAD commit sha + commit count.
 * Returns nulls when the path isn't a git checkout. Bounded to two short calls.
 */
function gitProvenance(projectPath: string): { gitCommit: string | null; gitCommitCount: number | null } {
  const run = (args: string): string | null => {
    try {
      const out = execSync(`git ${args}`, { cwd: projectPath, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      return out || null;
    } catch {
      return null;
    }
  };
  const gitCommit = run('rev-parse HEAD');
  const countRaw = run('rev-list --count HEAD');
  const gitCommitCount = countRaw ? Number(countRaw) || null : null;
  return { gitCommit, gitCommitCount };
}

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === 'string' && v) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Build the context map object for a project (no file write).
 */
export async function buildContextMap(projectId: string): Promise<ContextMapExport | null> {
  const project = projectDb.getProject(projectId);
  if (!project) return null;

  const [contexts, groups, relationships] = await Promise.all([
    contextQueries.getContextsByProject(projectId),
    contextGroupQueries.getGroupsByProject(projectId),
    contextGroupRelationshipQueries.getByProject(projectId),
  ]);

  const categories: Record<string, number> = {};
  const domains: Record<string, number> = {};
  let totalFiles = 0;

  // Disk resolver so the exported map reflects reality (dangling files pruned;
  // audit reflects drift). Project-relative paths → absolute stat.
  const fileExists = project.path
    ? (filePath: string) => existsSync(path.join(project.path, filePath))
    : undefined;
  let prunedPaths = 0;

  const toExported = (c: (typeof contexts)[number]): ExportedContext => {
    const raw = c.filePaths || [];
    // Self-heal: a published map must not route a CLI to a file that isn't on
    // disk. Prune dangling paths from the exported contexts (the DB keeps the raw
    // paths; the audit below still reports the drift). Mirrors the Personas prune.
    const filePaths = fileExists ? raw.filter((f) => fileExists(f)) : raw;
    prunedPaths += raw.length - filePaths.length;
    totalFiles += filePaths.length;
    const cat = c.category || null;
    categories[cat || 'uncategorized'] = (categories[cat || 'uncategorized'] || 0) + 1;
    return {
      name: c.name,
      description: c.description || null,
      businessFeature: c.businessFeature || null,
      category: cat,
      filePaths,
      target: c.target || null,
      apiRoutes: asArray(c.apiRoutes),
      lastWrittenAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : null,
    };
  };

  const grouped = new Map<string, ExportedContext[]>();
  const ungrouped: ExportedContext[] = [];
  const index: string[] = [];

  for (const c of contexts) {
    const exported = toExported(c);
    index.push(`${c.groupName || 'ungrouped'} › ${exported.name} [${exported.category || '?'}] — ${exported.filePaths.length} files`);
    if (c.groupId) {
      if (!grouped.has(c.groupId)) grouped.set(c.groupId, []);
      grouped.get(c.groupId)!.push(exported);
    } else {
      ungrouped.push(exported);
    }
  }

  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
  const exportedGroups: ExportedGroup[] = groups.map((g) => {
    if (g.domain) domains[g.domain] = (domains[g.domain] || 0) + 1;
    return {
      name: g.name,
      domain: g.domain || null,
      type: g.type || null,
      color: g.color,
      icon: g.icon || null,
      contexts: grouped.get(g.id) || [],
    };
  });

  const exportedRelationships: ExportedRelationship[] = relationships.map((r) => ({
    source: groupNameById.get(r.sourceGroupId) || r.sourceGroupId,
    target: groupNameById.get(r.targetGroupId) || r.targetGroupId,
    type: r.relationshipType || null,
  }));

  const audit = auditContexts(
    contexts.map((c) => ({
      id: c.id,
      name: c.name,
      groupId: c.groupId,
      filePaths: c.filePaths,
      category: c.category,
      crossRefs: c.crossRefs,
    })),
    groups.map((g) => ({ id: g.id, name: g.name, domain: g.domain })),
    { fileExists },
  );

  const body = {
    $schema: 'https://vibeman.dev/schemas/context-map.json',
    projectId,
    projectName: project.name,
    projectPath: project.path,
    provenance: project.path ? gitProvenance(project.path) : { gitCommit: null, gitCommitCount: null },
    version: '2.0.0',
    groups: exportedGroups,
    ungrouped,
    relationships: exportedRelationships,
    index,
    summary: {
      totalGroups: groups.length,
      totalContexts: contexts.length,
      totalFiles,
      categories,
      domains,
    },
    audit: {
      ok: audit.ok,
      tier: audit.tier,
      warnings: audit.findings.filter((f) => f.severity === 'warn').length,
      staleContexts: audit.totals.staleContexts,
      missingFiles: audit.totals.missingFiles,
      unresolvedCrossRefs: audit.totals.unresolvedCrossRefs,
    },
    instructions:
      `Context map for ${project.name}. Each group is a business domain (domain field); each context is a feature ` +
      `with its files (filePaths) + a technical category. Read this to learn which files belong to which feature ` +
      `BEFORE editing. When you change a context's files, update them here (or run Vibeman's refresh) to keep this fresh.`,
  };

  if (prunedPaths > 0) {
    logger.info?.(`[contextMap] pruned ${prunedPaths} dangling file path(s) from ${project.name}'s exported map`);
  }

  // Revision = stable hash of the meaningful content (excludes generatedAt and
  // provenance — the commit sha changes every commit and would churn the hash;
  // per-context lastWrittenAt only moves when a context actually changed, so it
  // stays in the hash).
  const { provenance: _prov, ...hashable } = body;
  const revision = createHash('sha1').update(JSON.stringify(hashable)).digest('hex').slice(0, 12);

  return { ...body, generatedAt: new Date().toISOString(), revision };
}

/**
 * Write a context map to {projectPath}/context-map.json.
 */
export async function writeContextMap(projectPath: string, map: ContextMapExport): Promise<string> {
  const exportPath = path.join(projectPath, 'context-map.json');
  await fs.writeFile(exportPath, JSON.stringify(map, null, 2), 'utf-8');
  return exportPath;
}

/**
 * Build + write the map and refresh the project's CLAUDE.md pointer.
 * Best-effort: never throws.
 */
export async function exportAndWriteContextMap(projectId: string): Promise<void> {
  try {
    const map = await buildContextMap(projectId);
    if (!map || !map.projectPath) return;
    await writeContextMap(map.projectPath, map);
    try {
      const { ensureContextMapSection } = await import('@/app/Claude/sub_ClaudeCodeManager/folderManager');
      ensureContextMapSection(map.projectPath);
    } catch {
      /* CLAUDE.md update is best-effort */
    }
  } catch (e) {
    logger.warn?.(`[contextMap] auto-export failed for ${projectId}: ${e instanceof Error ? e.message : e}`);
  }
}

// ── Debounced fire-and-forget scheduler ───────────────────────────────────────
// Many contexts are created in one burst during generation; debounce so we write
// the file once per burst, not once per context. Survives Next.js HMR via globalThis.
const timers = ((globalThis as Record<string, unknown>).__contextMapExportTimers ??= new Map<string, NodeJS.Timeout>()) as Map<string, NodeJS.Timeout>;

export function scheduleContextMapExport(projectId: string, delayMs = 1500): void {
  if (!projectId) return;
  const existing = timers.get(projectId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    timers.delete(projectId);
    void exportAndWriteContextMap(projectId);
  }, delayMs);
  if (typeof t.unref === 'function') t.unref();
  timers.set(projectId, t);
}
