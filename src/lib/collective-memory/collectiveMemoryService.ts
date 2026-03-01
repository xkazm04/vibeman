/**
 * Collective Memory Service
 * Extracts patterns from task executions and provides knowledge retrieval
 * for cross-session learning.
 */

import { collectiveMemoryDb } from '@/app/db';
import type {
  CollectiveMemoryType,
  CreateCollectiveMemoryInput,
  DbCollectiveMemoryEntry,
} from '@/app/db/models/collective-memory.types';

/**
 * Record a learning from a completed task execution.
 * Called after task completes (success or failure) to capture patterns.
 */
export function recordTaskLearning(params: {
  projectId: string;
  sessionId?: string;
  taskId?: string;
  requirementName: string;
  success: boolean;
  filesChanged?: string[];
  errorMessage?: string;
  toolCounts?: Record<string, number>;
  durationMs?: number;
}): DbCollectiveMemoryEntry | null {
  const { projectId, sessionId, taskId, requirementName, success, filesChanged, errorMessage, toolCounts, durationMs } = params;

  // Determine memory type and extract meaningful pattern
  let memoryType: CollectiveMemoryType;
  let title: string;
  let description: string;
  let codePattern: string | null = null;
  const tags: string[] = [];
  const filePatterns: string[] = [];

  if (!success && errorMessage) {
    memoryType = 'error_fix';
    title = extractErrorTitle(errorMessage);
    description = `Task "${requirementName}" failed: ${errorMessage.slice(0, 500)}`;
    codePattern = extractErrorPattern(errorMessage);
    tags.push('failure', 'error');
  } else if (success) {
    // Determine if this was a pattern, optimization, or general approach
    const reqLower = requirementName.toLowerCase();
    if (reqLower.includes('perf') || reqLower.includes('optim') || reqLower.includes('speed')) {
      memoryType = 'optimization';
      tags.push('performance');
    } else if (reqLower.includes('fix') || reqLower.includes('bug') || reqLower.includes('error')) {
      memoryType = 'error_fix';
      tags.push('bugfix');
    } else {
      memoryType = 'approach';
    }
    title = `Successful: ${requirementName}`;
    description = buildSuccessDescription(requirementName, filesChanged, toolCounts, durationMs);
    tags.push('success');
  } else {
    return null; // No error message and not success - skip
  }

  // Extract file patterns from changed files
  if (filesChanged && filesChanged.length > 0) {
    const patterns = extractFilePatterns(filesChanged);
    filePatterns.push(...patterns);
  }

  // Check for similar existing memories to avoid duplicates
  const existing = collectiveMemoryDb.search(projectId, title, 3);
  if (existing.length > 0) {
    // Update existing memory instead of creating duplicate
    const match = existing[0];
    if (success) {
      collectiveMemoryDb.incrementSuccess(match.id);
    } else {
      collectiveMemoryDb.incrementFailure(match.id);
    }
    collectiveMemoryDb.updateLastApplied(match.id);
    return match;
  }

  const id = `cm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return collectiveMemoryDb.create({
    id,
    project_id: projectId,
    session_id: sessionId,
    task_id: taskId,
    memory_type: memoryType,
    title,
    description,
    code_pattern: codePattern,
    tags,
    file_patterns: filePatterns,
  });
}

/**
 * Minimum effectiveness score for a memory to be injected into prompts.
 * Memories below this threshold are considered unproven or unreliable.
 * 0.5 is the initial score — only memories with at least one success are injected.
 */
const MIN_INJECTION_SCORE = 0.55;

/**
 * Get relevant knowledge for an upcoming task.
 * Matches based on requirement name, file patterns, and tags.
 * Only returns memories with proven effectiveness (score >= MIN_INJECTION_SCORE).
 */
export function getRelevantKnowledge(params: {
  projectId: string;
  requirementName: string;
  requirementContent?: string;
  filePatterns?: string[];
  limit?: number;
}): DbCollectiveMemoryEntry[] {
  const { projectId, requirementName, requirementContent, limit = 5 } = params;
  let { filePatterns = [] } = params;

  // Extract file patterns from requirement content if none provided
  if (filePatterns.length === 0 && requirementContent) {
    filePatterns = extractFilePatternsFromContent(requirementContent);
  }

  // Strategy 1: Search by requirement name keywords
  const keywords = extractKeywords(requirementName);
  const results: Map<string, DbCollectiveMemoryEntry> = new Map();

  for (const keyword of keywords.slice(0, 3)) {
    const matches = collectiveMemoryDb.search(projectId, keyword, limit * 2);
    for (const m of matches) {
      if (m.effectiveness_score >= MIN_INJECTION_SCORE && !results.has(m.id)) {
        results.set(m.id, m);
      }
    }
  }

  // Strategy 2: Search by keywords extracted from requirement content
  if (requirementContent) {
    const contentKeywords = extractKeywords(requirementContent).filter(k => !keywords.includes(k));
    for (const keyword of contentKeywords.slice(0, 3)) {
      const matches = collectiveMemoryDb.search(projectId, keyword, limit);
      for (const m of matches) {
        if (m.effectiveness_score >= MIN_INJECTION_SCORE && !results.has(m.id)) {
          results.set(m.id, m);
        }
      }
    }
  }

  // Strategy 3: Match by file patterns
  if (filePatterns.length > 0) {
    const tags = extractKeywords(requirementName);
    const similar = collectiveMemoryDb.findSimilar(projectId, filePatterns, tags, limit);
    for (const m of similar) {
      if (m.effectiveness_score >= MIN_INJECTION_SCORE && !results.has(m.id)) {
        results.set(m.id, m);
      }
    }
  }

  // Strategy 4: Add top effective patterns as fallback
  if (results.size < limit) {
    const topEffective = collectiveMemoryDb.getTopEffective(projectId, limit - results.size);
    for (const m of topEffective) {
      if (!results.has(m.id)) results.set(m.id, m);
    }
  }

  // Sort by effectiveness and return
  return Array.from(results.values())
    .sort((a, b) => b.effectiveness_score - a.effectiveness_score)
    .slice(0, limit);
}

/**
 * Format relevant knowledge for injection into task execution prompts.
 * Categorizes memories into warnings, patterns, and approaches for clarity.
 * Token-conscious: aims for ~300 tokens max.
 */
export function formatKnowledgeForPrompt(memories: DbCollectiveMemoryEntry[]): string {
  if (memories.length === 0) return '';

  // Categorize memories by type for structured injection
  const warnings: DbCollectiveMemoryEntry[] = [];
  const patterns: DbCollectiveMemoryEntry[] = [];
  const approaches: DbCollectiveMemoryEntry[] = [];

  for (const m of memories.slice(0, 7)) {
    if (m.memory_type === 'error_fix' || m.memory_type === 'conflict_resolution') {
      warnings.push(m);
    } else if (m.memory_type === 'pattern' || m.memory_type === 'optimization') {
      patterns.push(m);
    } else {
      approaches.push(m);
    }
  }

  const sections: string[] = [];

  if (warnings.length > 0) {
    const items = warnings.map(m => formatMemoryItem(m)).join('\n');
    sections.push(`**Warnings & Known Issues** (avoid these pitfalls):\n${items}`);
  }

  if (patterns.length > 0) {
    const items = patterns.map(m => formatMemoryItem(m)).join('\n');
    sections.push(`**Proven Patterns** (use these approaches):\n${items}`);
  }

  if (approaches.length > 0) {
    const items = approaches.map(m => formatMemoryItem(m)).join('\n');
    sections.push(`**Successful Approaches**:\n${items}`);
  }

  return `\n## Lessons Learned (Active Memory)\n\nThe following insights were learned from previous task executions in this project (${memories.length} relevant memories, sorted by effectiveness):\n\n${sections.join('\n\n')}\n\nApply these learnings proactively. Avoid repeating past mistakes.\n`;
}

function formatMemoryItem(m: DbCollectiveMemoryEntry): string {
  const score = Math.round(m.effectiveness_score * 100);
  const applied = m.success_count + m.failure_count;
  const desc = m.description.length > 150 ? m.description.slice(0, 147) + '...' : m.description;
  return `- [${score}% effective, ${applied} applications] **${m.title}**: ${desc}`;
}

/**
 * Get aggregate statistics for the collective memory system.
 */
export function getCollectiveStats(projectId: string) {
  const stats = collectiveMemoryDb.getStats(projectId);
  const recentApps = collectiveMemoryDb.getRecentApplications(projectId, 10);

  const pendingApps = recentApps.filter(a => a.outcome === 'pending').length;
  const successApps = recentApps.filter(a => a.outcome === 'success').length;
  const failureApps = recentApps.filter(a => a.outcome === 'failure').length;

  return {
    ...stats,
    recentApplications: {
      pending: pendingApps,
      success: successApps,
      failure: failureApps,
    },
  };
}

// --- Internal Helpers ---

function extractErrorTitle(errorMessage: string): string {
  // Extract first meaningful line
  const firstLine = errorMessage.split('\n')[0].trim();
  if (firstLine.length > 80) return firstLine.slice(0, 77) + '...';
  return firstLine || 'Unknown error';
}

function extractErrorPattern(errorMessage: string): string | null {
  // Look for common error patterns
  const patterns = [
    /TS\d{4,5}/,                          // TypeScript errors
    /Cannot find module '([^']+)'/,        // Module not found
    /Property '(\w+)' does not exist/,     // Missing property
    /Type '([^']+)' is not assignable/,    // Type mismatch
    /ENOENT|EACCES|EPERM/,               // File system errors
    /SyntaxError|ReferenceError|TypeError/, // JS runtime errors
  ];

  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function buildSuccessDescription(
  requirementName: string,
  filesChanged?: string[],
  toolCounts?: Record<string, number>,
  durationMs?: number
): string {
  const parts: string[] = [`Completed "${requirementName}".`];
  if (filesChanged && filesChanged.length > 0) {
    parts.push(`Modified ${filesChanged.length} files.`);
  }
  if (toolCounts) {
    const totalTools = Object.values(toolCounts).reduce((a, b) => a + b, 0);
    if (totalTools > 0) parts.push(`Used ${totalTools} tool calls.`);
  }
  if (durationMs && durationMs > 0) {
    const mins = Math.round(durationMs / 60000);
    if (mins > 0) parts.push(`Duration: ${mins}min.`);
  }
  return parts.join(' ');
}

function extractFilePatterns(files: string[]): string[] {
  const patterns = new Set<string>();
  for (const file of files) {
    // Extract directory pattern (e.g., "src/app/api/")
    const dir = file.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
    if (dir) patterns.add(dir);
    // Extract extension pattern
    const ext = file.split('.').pop();
    if (ext) patterns.add(`*.${ext}`);
  }
  return Array.from(patterns).slice(0, 10);
}

function extractKeywords(text: string): string[] {
  return text
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .map(w => w.toLowerCase())
    .filter(w => !['with', 'from', 'this', 'that', 'implementation', 'requirement', 'should', 'would', 'could', 'have', 'been', 'will', 'when', 'then', 'also', 'make', 'like', 'using', 'used'].includes(w))
    .slice(0, 8);
}

/**
 * Extract file path patterns from requirement/content text.
 * Scans for paths like `src/app/features/TaskRunner/lib/foo.ts` or `components/Button.tsx`
 * and extracts directory patterns for memory matching.
 */
function extractFilePatternsFromContent(content: string): string[] {
  const patterns = new Set<string>();

  // Match file paths referenced in the content (backtick-quoted or plain)
  const filePathRegex = /(?:`|'|"|^|\s)((?:src|app|lib|components|features|pages|api|hooks|stores|utils)\/[\w/.-]+\.(?:ts|tsx|js|jsx|css|json))/gm;
  let match: RegExpExecArray | null;
  while ((match = filePathRegex.exec(content)) !== null) {
    const filePath = match[1].replace(/\\/g, '/');
    // Extract directory pattern
    const dir = filePath.split('/').slice(0, -1).join('/');
    if (dir) patterns.add(dir);
  }

  // Match component/feature names like "TaskRunner", "BrainLayout" etc.
  const componentRegex = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/g;
  while ((match = componentRegex.exec(content)) !== null) {
    patterns.add(match[1]);
  }

  return Array.from(patterns).slice(0, 10);
}
