/**
 * AI Orchestrator
 *
 * Makes every AI interaction in Vibeman context-aware by providing
 * a simple interface for injecting architectural context into prompts.
 *
 * Usage:
 *   import { aiOrchestrator } from '@/lib/ai/aiOrchestrator';
 *
 *   // For scans: get enriched ContextGroupInfo
 *   const contextGroupInfo = aiOrchestrator.buildScanContext(projectId, groupId, filePaths);
 *
 *   // For any prompt: get the full architectural section
 *   const section = aiOrchestrator.getProjectArchitectureSection(projectId);
 *
 *   // For group-focused prompts: get scoped architecture section
 *   const section = aiOrchestrator.getGroupArchitectureSection(projectId, groupId);
 */

import {
  assembleContextGraph,
  assembleGroupContextGraph,
  formatContextGraphForPrompt,
  formatGroupContextForPrompt,
} from './contextGraphAssembler';
import type { ContextGroupInfo } from '@/app/features/Context/sub_ContextGroups/lib/baseScanPrompt';

// ── In-memory cache ─────────────────────────────────────────────────────────
// Context graphs are expensive to assemble. Cache them briefly.

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 30_000; // 30 seconds
const graphCache = new Map<string, CacheEntry<ReturnType<typeof assembleContextGraph>>>();

function getCachedGraph(projectId: string) {
  const entry = graphCache.get(projectId);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

function setCachedGraph(projectId: string, graph: ReturnType<typeof assembleContextGraph>) {
  graphCache.set(projectId, { data: graph, timestamp: Date.now() });

  // Evict old entries if cache grows too large
  if (graphCache.size > 20) {
    const now = Date.now();
    for (const [key, val] of graphCache.entries()) {
      if (now - val.timestamp > CACHE_TTL_MS) {
        graphCache.delete(key);
      }
    }
  }
}

/**
 * Invalidate the cached graph for a project.
 * Call this when contexts, groups, or relationships are modified.
 */
export function invalidateGraphCache(projectId: string) {
  graphCache.delete(projectId);
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export const aiOrchestrator = {
  /**
   * Build an enriched ContextGroupInfo for scan prompts.
   * This replaces the file-path-only heuristic with real metadata.
   */
  buildScanContext: (
    projectId: string,
    groupId: string,
    filePaths: string[]
  ): ContextGroupInfo => {
    try {
      const groupGraph = assembleGroupContextGraph(projectId, groupId);
      const { group, adjacentGroups, crossContextRefs } = groupGraph;

      // Build enriched context names with descriptions
      const contextNames = group.contexts.map(c => {
        if (c.businessFeature) return `${c.name} (${c.businessFeature})`;
        return c.name;
      });

      // Build enriched patterns from actual metadata
      const detectedPatterns: string[] = [];

      // Extract tech stack patterns
      const techStacks = new Set<string>();
      group.contexts.forEach(c => c.techStack.forEach(t => techStacks.add(t)));
      if (techStacks.size > 0) {
        detectedPatterns.push(`Technologies: ${Array.from(techStacks).join(', ')}`);
      }

      // Extract DB table usage
      const dbTables = new Set<string>();
      group.contexts.forEach(c => c.dbTables.forEach(t => dbTables.add(t)));
      if (dbTables.size > 0) {
        detectedPatterns.push(`Database tables: ${Array.from(dbTables).join(', ')}`);
      }

      // Extract API surface patterns
      const apiPaths: string[] = [];
      group.contexts.forEach(c => {
        c.apiSurface.forEach(a => apiPaths.push(`${a.methods} ${a.path}`));
      });
      if (apiPaths.length > 0) {
        detectedPatterns.push(`API endpoints: ${apiPaths.slice(0, 8).join('; ')}`);
      }

      // Extract entry point patterns
      const entryPointTypes = new Set<string>();
      group.contexts.forEach(c => {
        c.entryPoints.forEach(e => entryPointTypes.add(e.type));
      });
      if (entryPointTypes.size > 0) {
        detectedPatterns.push(`Entry point types: ${Array.from(entryPointTypes).join(', ')}`);
      }

      // Cross-context dependencies
      if (crossContextRefs.length > 0) {
        detectedPatterns.push(`Cross-context deps: ${crossContextRefs.slice(0, 4).map(
          r => `${r.from} ${r.relationship.replace('_', ' ')} ${r.to}`
        ).join('; ')}`);
      }

      // Adjacent group awareness
      if (adjacentGroups.length > 0) {
        detectedPatterns.push(`Connected groups: ${adjacentGroups.map(g => g.name).join(', ')}`);
      }

      // Categorize files (preserve the existing behavior as a base)
      const filesByCategory = categorizeFilePaths(filePaths);

      // Build group description from context metadata
      const descriptions = group.contexts
        .filter(c => c.description)
        .map(c => c.description!)
        .slice(0, 3);
      const groupDescription = descriptions.length > 0
        ? `This group contains: ${descriptions.join('. ')}`
        : undefined;

      return {
        filesByCategory,
        groupDescription,
        contextNames,
        detectedPatterns,
      };
    } catch (error) {
      console.error('[AIOrchestrator] Failed to build scan context:', error);
      // Fallback to file-path-only analysis
      return {
        filesByCategory: categorizeFilePaths(filePaths),
        detectedPatterns: detectFilePatterns(filePaths),
      };
    }
  },

  /**
   * Get a full project architecture section for prompt injection.
   * Returns a markdown section ready to embed in any prompt.
   */
  getProjectArchitectureSection: (projectId: string): string => {
    try {
      let graph = getCachedGraph(projectId);
      if (!graph) {
        graph = assembleContextGraph(projectId);
        setCachedGraph(projectId, graph);
      }

      if (graph.stats.totalContexts === 0) return '';

      return formatContextGraphForPrompt(graph);
    } catch (error) {
      console.error('[AIOrchestrator] Failed to build project architecture section:', error);
      return '';
    }
  },

  /**
   * Get a group-scoped architecture section for prompt injection.
   * More focused than the full project view — ideal for scans.
   */
  getGroupArchitectureSection: (projectId: string, groupId: string): string => {
    try {
      const groupGraph = assembleGroupContextGraph(projectId, groupId);
      if (groupGraph.group.contexts.length === 0) return '';

      return formatGroupContextForPrompt(groupGraph);
    } catch (error) {
      console.error('[AIOrchestrator] Failed to build group architecture section:', error);
      return '';
    }
  },

  /**
   * Get the raw context graph data (for API responses).
   */
  getContextGraph: (projectId: string) => {
    let graph = getCachedGraph(projectId);
    if (!graph) {
      graph = assembleContextGraph(projectId);
      setCachedGraph(projectId, graph);
    }
    return graph;
  },
};

// ── File categorization (preserves existing behavior) ───────────────────────

function categorizeFilePaths(filePaths: string[]): ContextGroupInfo['filesByCategory'] {
  return {
    ui: filePaths.filter(f =>
      f.includes('/components/') || f.includes('/features/') ||
      (f.endsWith('.tsx') && !f.includes('/api/'))
    ),
    lib: filePaths.filter(f =>
      f.includes('/lib/') || f.includes('/hooks/') ||
      f.includes('/utils/') || f.includes('/helpers/')
    ),
    api: filePaths.filter(f =>
      f.includes('/api/') || f.includes('route.ts')
    ),
    data: filePaths.filter(f =>
      f.includes('/db/') || f.includes('/models/') ||
      f.includes('/repositories/') || f.includes('schema.')
    ),
    config: filePaths.filter(f =>
      f.includes('/config/') || f.includes('.config.') ||
      f.includes('tsconfig') || f.includes('next.config')
    ),
    test: filePaths.filter(f =>
      f.includes('.test.') || f.includes('.spec.') ||
      f.includes('__tests__')
    ),
  };
}

function detectFilePatterns(filePaths: string[]): string[] {
  const patterns: string[] = [];
  if (filePaths.some(f => f.includes('/hooks/'))) patterns.push('React custom hooks');
  if (filePaths.some(f => f.includes('Store.ts') || f.includes('store.ts'))) patterns.push('Zustand stores');
  if (filePaths.some(f => f.includes('/api/') && f.includes('route.ts'))) patterns.push('Next.js API routes');
  if (filePaths.some(f => f.includes('/repositories/'))) patterns.push('Repository pattern');
  if (filePaths.some(f => f.includes('/components/'))) patterns.push('React components');
  return patterns;
}
