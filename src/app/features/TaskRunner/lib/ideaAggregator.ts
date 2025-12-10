/**
 * Idea Aggregator - Combines multiple idea-gen files for the same agent role
 * into a single aggregated requirement file
 */

import * as fs from 'fs';
import * as path from 'path';

// Agent roles that should be aggregated
export const AGGREGATABLE_ROLES = [
  'ambiguity',           // Ambiguity Guardian
  'bug_hunter',          // Bug Hunter
  'perf_optimizer',      // Performance Optimizer
  'security_protector',  // Security Protector
  'zen_architect',       // Zen Architect
  'dev_experience',      // Dev Experience Engineer
  'code_refactor',       // Code Refactor
  'user_empathy',        // User Empathy Champion
] as const;

export type AggregatableRole = typeof AGGREGATABLE_ROLES[number];

// Map role slug to display name
export const ROLE_DISPLAY_NAMES: Record<AggregatableRole, string> = {
  ambiguity: 'Ambiguity Guardian',
  bug_hunter: 'Bug Hunter',
  perf_optimizer: 'Performance Optimizer',
  security_protector: 'Security Protector',
  zen_architect: 'Zen Architect',
  dev_experience: 'Dev Experience Engineer',
  code_refactor: 'Code Refactor',
  user_empathy: 'User Empathy Champion',
};

export interface IdeaFile {
  fileName: string;
  filePath: string;
  role: string;
  roleSlug: AggregatableRole | string;
  contextId: string;
  contextName: string;
  timestamp: string;
}

export interface AggregationGroup {
  role: AggregatableRole;
  roleDisplayName: string;
  files: IdeaFile[];
  canAggregate: boolean; // true if 2+ files with same role
}

export interface AggregationCheckResult {
  canAggregate: boolean;
  groups: AggregationGroup[];
  totalFiles: number;
  aggregatableFiles: number;
}

export interface AggregationResult {
  success: boolean;
  role: AggregatableRole;
  newFileName: string;
  deletedFiles: string[];
  error?: string;
}

/**
 * Parse an idea-gen filename to extract metadata
 * Format: idea-gen-{role}-ctx-{context_prefix}-{timestamp}.md
 */
function parseIdeaFileName(fileName: string): { role: string; contextPrefix: string; timestamp: string } | null {
  // Match pattern: idea-gen-{role}-ctx-{context_prefix}-{timestamp}
  const match = fileName.match(/^idea-gen-([^-]+(?:_[^-]+)*)-ctx-([^-]+(?:_[^-]+)*)-(\d+)$/);
  if (!match) return null;

  return {
    role: match[1],
    contextPrefix: match[2],
    timestamp: match[3],
  };
}

/**
 * Extract role from file content by looking at the header
 * Pattern: "Your role is: **{Role Name}**"
 */
function extractRoleFromContent(content: string): string | null {
  const match = content.match(/Your role is:\s*\*\*([^*]+)\*\*/);
  return match ? match[1].trim() : null;
}

/**
 * Extract context ID from file content
 * Pattern: "- Context ID: ctx_..."
 */
function extractContextIdFromContent(content: string): string | null {
  const match = content.match(/Context ID:\s*(ctx_[^\s\n]+)/);
  return match ? match[1].trim() : null;
}

/**
 * Extract context name from file content
 * Pattern: "- Context Name: ..."
 */
function extractContextNameFromContent(content: string): string | null {
  const match = content.match(/Context Name:\s*([^\n]+)/);
  return match ? match[1].trim() : null;
}

/**
 * Normalize role name to slug format
 */
function normalizeRoleSlug(role: string): string {
  return role.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Check if a role slug is aggregatable
 */
function isAggregatableRole(roleSlug: string): roleSlug is AggregatableRole {
  return AGGREGATABLE_ROLES.includes(roleSlug as AggregatableRole);
}

/**
 * List all idea-gen files in a commands directory
 */
export function listIdeaGenFiles(commandsPath: string): IdeaFile[] {
  if (!fs.existsSync(commandsPath)) {
    return [];
  }

  const files = fs.readdirSync(commandsPath);
  const ideaFiles: IdeaFile[] = [];

  for (const file of files) {
    if (!file.startsWith('idea-gen-') || !file.endsWith('.md')) {
      continue;
    }

    const baseName = file.replace('.md', '');
    const parsed = parseIdeaFileName(baseName);
    if (!parsed) continue;

    const filePath = path.join(commandsPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const roleFromContent = extractRoleFromContent(content);
    const contextId = extractContextIdFromContent(content) || '';
    const contextName = extractContextNameFromContent(content) || '';

    const role = roleFromContent || parsed.role;
    const roleSlug = normalizeRoleSlug(role);

    ideaFiles.push({
      fileName: baseName,
      filePath,
      role,
      roleSlug,
      contextId,
      contextName,
      timestamp: parsed.timestamp,
    });
  }

  return ideaFiles;
}

/**
 * Check if aggregation is possible for files in a commands directory
 */
export function checkAggregation(commandsPath: string): AggregationCheckResult {
  const ideaFiles = listIdeaGenFiles(commandsPath);

  // Group files by aggregatable role
  const roleGroups = new Map<AggregatableRole, IdeaFile[]>();

  for (const file of ideaFiles) {
    if (isAggregatableRole(file.roleSlug)) {
      const existing = roleGroups.get(file.roleSlug) || [];
      existing.push(file);
      roleGroups.set(file.roleSlug, existing);
    }
  }

  const groups: AggregationGroup[] = [];
  let aggregatableFiles = 0;

  for (const role of AGGREGATABLE_ROLES) {
    const files = roleGroups.get(role) || [];
    const canAggregate = files.length >= 2;

    if (files.length > 0) {
      groups.push({
        role,
        roleDisplayName: ROLE_DISPLAY_NAMES[role],
        files,
        canAggregate,
      });

      if (canAggregate) {
        aggregatableFiles += files.length;
      }
    }
  }

  return {
    canAggregate: aggregatableFiles > 0,
    groups,
    totalFiles: ideaFiles.length,
    aggregatableFiles,
  };
}

/**
 * Extract reusable parts from an idea-gen file content
 * Returns: { header, mission, analysisPrompt, contextInfo, process, savingInstructions }
 */
function extractFileParts(content: string): {
  header: string;
  targetContext: string;
  analysisPrompt: string;
  contextInfo: string;
  existingIdeas: string;
  process: string;
  savingInstructions: string;
} {
  // Split by major sections
  const parts = {
    header: '',
    targetContext: '',
    analysisPrompt: '',
    contextInfo: '',
    existingIdeas: '',
    process: '',
    savingInstructions: '',
  };

  // Extract header (title and mission)
  const headerMatch = content.match(/^(# .+?\n\n## Mission\n.+?)(?=\n## Target Context|\n## Analysis Prompt)/s);
  if (headerMatch) parts.header = headerMatch[1].trim();

  // Extract target context section
  const contextMatch = content.match(/## Target Context\n(.+?)(?=\n## Analysis Prompt)/s);
  if (contextMatch) parts.targetContext = contextMatch[1].trim();

  // Extract analysis prompt
  const analysisMatch = content.match(/## Analysis Prompt\n(.+?)(?=\n## Context Information)/s);
  if (analysisMatch) parts.analysisPrompt = analysisMatch[1].trim();

  // Extract context information
  const infoMatch = content.match(/## Context Information\n(.+?)(?=\n## Existing Ideas|\n## Your Process)/s);
  if (infoMatch) parts.contextInfo = infoMatch[1].trim();

  // Extract existing ideas section
  const existingMatch = content.match(/## Existing Ideas\n(.+?)(?=\n---|\n## Your Process)/s);
  if (existingMatch) parts.existingIdeas = existingMatch[1].trim();

  // Extract process section
  const processMatch = content.match(/## Your Process\n(.+?)(?=\n---\n\n## Saving Ideas)/s);
  if (processMatch) parts.process = processMatch[1].trim();

  // Extract saving instructions
  const savingMatch = content.match(/## Saving Ideas to Database\n(.+)$/s);
  if (savingMatch) parts.savingInstructions = savingMatch[1].trim();

  return parts;
}

/**
 * Aggregate multiple idea-gen files into a single file
 */
export function aggregateFiles(
  commandsPath: string,
  role: AggregatableRole
): AggregationResult {
  const checkResult = checkAggregation(commandsPath);
  const group = checkResult.groups.find(g => g.role === role);

  if (!group || !group.canAggregate) {
    return {
      success: false,
      role,
      newFileName: '',
      deletedFiles: [],
      error: `Cannot aggregate role "${role}": need at least 2 files`,
    };
  }

  try {
    // Sort files by timestamp (oldest first)
    const sortedFiles = [...group.files].sort((a, b) =>
      parseInt(a.timestamp) - parseInt(b.timestamp)
    );

    // Read first file to get the template structure
    const firstFileContent = fs.readFileSync(sortedFiles[0].filePath, 'utf-8');
    const templateParts = extractFileParts(firstFileContent);

    // Collect all context information from all files
    const allContexts: Array<{
      contextId: string;
      contextName: string;
      contextInfo: string;
      files: string[];
    }> = [];

    for (const file of sortedFiles) {
      const content = fs.readFileSync(file.filePath, 'utf-8');
      const parts = extractFileParts(content);

      // Check if context already exists
      const existingCtx = allContexts.find(c => c.contextId === file.contextId);
      if (existingCtx) {
        existingCtx.files.push(file.fileName);
      } else {
        allContexts.push({
          contextId: file.contextId,
          contextName: file.contextName,
          contextInfo: parts.contextInfo,
          files: [file.fileName],
        });
      }
    }

    // Build aggregated context section
    const aggregatedContextSection = allContexts.map((ctx, idx) => `
### Context ${idx + 1}: ${ctx.contextName}
- Context ID: ${ctx.contextId}

${ctx.contextInfo}
`).join('\n---\n');

    // Build the aggregated file content
    const timestamp = Date.now();
    const newFileName = `idea-gen-${role}-aggregated-${timestamp}`;
    const newFilePath = path.join(commandsPath, `${newFileName}.md`);

    const aggregatedContent = `# 💡 Claude Code Idea Generation: ${ROLE_DISPLAY_NAMES[role]} (Aggregated)

## Mission
You are tasked with generating high-quality backlog ideas for the project.
Your role is: **${ROLE_DISPLAY_NAMES[role]}**

This is an **aggregated requirement** combining ${sortedFiles.length} contexts for comprehensive analysis.

## Target Contexts (${allContexts.length} contexts)

${allContexts.map(ctx => `- **${ctx.contextName}** (${ctx.contextId})`).join('\n')}

## Analysis Prompt

${templateParts.analysisPrompt}

## Context Information (Aggregated)

${aggregatedContextSection}

## Existing Ideas

Check existing ideas for ALL contexts before generating new ones to avoid duplicates.

${templateParts.process}

---

${templateParts.savingInstructions ? `## Saving Ideas to Database\n\n${templateParts.savingInstructions}` : ''}

---

## Aggregation Metadata

- **Role**: ${ROLE_DISPLAY_NAMES[role]}
- **Files Aggregated**: ${sortedFiles.length}
- **Contexts Included**: ${allContexts.length}
- **Created**: ${new Date().toISOString()}
- **Source Files**:
${sortedFiles.map(f => `  - ${f.fileName}.md`).join('\n')}
`;

    // Write the new aggregated file
    fs.writeFileSync(newFilePath, aggregatedContent, 'utf-8');

    // Delete the old files
    const deletedFiles: string[] = [];
    for (const file of sortedFiles) {
      try {
        fs.unlinkSync(file.filePath);
        deletedFiles.push(file.fileName);
      } catch (err) {
        console.error(`Failed to delete ${file.fileName}:`, err);
      }
    }

    return {
      success: true,
      role,
      newFileName,
      deletedFiles,
    };
  } catch (error) {
    return {
      success: false,
      role,
      newFileName: '',
      deletedFiles: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Aggregate all eligible roles at once
 */
export function aggregateAllRoles(commandsPath: string): AggregationResult[] {
  const checkResult = checkAggregation(commandsPath);
  const results: AggregationResult[] = [];

  for (const group of checkResult.groups) {
    if (group.canAggregate) {
      const result = aggregateFiles(commandsPath, group.role);
      results.push(result);
    }
  }

  return results;
}
