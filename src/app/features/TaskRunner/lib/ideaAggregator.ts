/**
 * Idea Aggregator - Combines multiple idea-gen files for the same agent role
 * into a single aggregated requirement file
 */

import * as fs from 'fs';
import * as path from 'path';
import { ABBR_TO_SCAN_TYPE, ScanType, isValidScanType } from '@/app/features/Ideas/lib/scanTypes';

// Agent roles that should be aggregated
export const AGGREGATABLE_ROLES = [
  'ambiguity_guardian',           // Ambiguity Guardian
  'bug_hunter',          // Bug Hunter
  'perf_optimizer',      // Performance Optimizer
  'security_protector',  // Security Protector
  'zen_architect',       // Zen Architect
  'dev_experience_engineer',      // Dev Experience Engineer
  'code_refactor',       // Code Refactor
  'user_empathy',        // User Empathy Champion
  'data_flow_optimizer', // Data Flow Optimizer
] as const;

export type AggregatableRole = typeof AGGREGATABLE_ROLES[number];

// Map role slug to display name
export const ROLE_DISPLAY_NAMES: Record<AggregatableRole, string> = {
  ambiguity_guardian: 'Ambiguity Guardian',
  bug_hunter: 'Bug Hunter',
  perf_optimizer: 'Performance Optimizer',
  security_protector: 'Security Protector',
  zen_architect: 'Zen Architect',
  dev_experience_engineer: 'Dev Experience Engineer',
  code_refactor: 'Code Refactor',
  user_empathy: 'User Empathy Champion',
  data_flow_optimizer: 'Data Flow Optimizer',
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
 * New format: idea-gen-<timestamp>-<ctx_prefix|all>-<abbr>
 * Legacy format: idea-gen-{role}-ctx-{context_prefix}-{timestamp}
 */
function parseIdeaFileName(fileName: string): { role: string; roleSlug: ScanType | string; contextPrefix: string; timestamp: string } | null {
  // Try new format first: idea-gen-<timestamp>-<ctx_prefix|all>-<abbr>
  // Examples: idea-gen-1734567890123-ctx_abc1-za, idea-gen-1734567890123-all-za
  const newFormatMatch = fileName.match(/^idea-gen-(\d+)-([^-]+(?:_[^-]*)?)-([a-z]{2,3})$/);
  if (newFormatMatch) {
    const timestamp = newFormatMatch[1];
    const contextPrefix = newFormatMatch[2]; // 'all' or 'ctx_xxxxx'
    const abbr = newFormatMatch[3];
    const scanType = ABBR_TO_SCAN_TYPE[abbr];

    if (scanType) {
      return {
        role: scanType,
        roleSlug: scanType,
        contextPrefix,
        timestamp,
      };
    }
  }

  // Fall back to legacy format: idea-gen-{role}-ctx-{context_prefix}-{timestamp}
  const legacyMatch = fileName.match(/^idea-gen-([^-]+(?:_[^-]+)*)-ctx-([^-]+(?:_[^-]+)*)-(\d+)$/);
  if (legacyMatch) {
    return {
      role: legacyMatch[1],
      roleSlug: normalizeRoleSlug(legacyMatch[1]),
      contextPrefix: legacyMatch[2],
      timestamp: legacyMatch[3],
    };
  }

  return null;
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

    // For new filename format, we already have the roleSlug from the abbreviation
    // Only read file content for legacy files or to get context details
    let role = parsed.role;
    let roleSlug = parsed.roleSlug;
    let contextId = '';
    let contextName = '';

    // Read content only for context details (or legacy role extraction if needed)
    const content = fs.readFileSync(filePath, 'utf-8');

    // If roleSlug wasn't determined from filename (legacy format), try content
    if (!isValidScanType(roleSlug as string)) {
      const roleFromContent = extractRoleFromContent(content);
      if (roleFromContent) {
        role = roleFromContent;
        roleSlug = normalizeRoleSlug(roleFromContent);
      }
    }

    // Always extract context info from content
    contextId = extractContextIdFromContent(content) || '';
    contextName = extractContextNameFromContent(content) || '';

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

    // Verify the new file was created
    if (!fs.existsSync(newFilePath)) {
      return {
        success: false,
        role,
        newFileName,
        deletedFiles: [],
        error: 'Failed to create aggregated file',
      };
    }

    // Delete the old files
    const deletedFiles: string[] = [];
    const failedDeletes: string[] = [];

    for (const file of sortedFiles) {
      try {
        // Check if file exists before attempting deletion
        if (fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath);
          // Verify deletion
          if (!fs.existsSync(file.filePath)) {
            deletedFiles.push(file.fileName);
          } else {
            failedDeletes.push(file.fileName);
            console.error(`File still exists after unlink: ${file.fileName}`);
          }
        } else {
          // File already doesn't exist, count as deleted
          deletedFiles.push(file.fileName);
        }
      } catch (err) {
        failedDeletes.push(file.fileName);
        console.error(`Failed to delete ${file.fileName}:`, err);
      }
    }

    // Log results
    console.log(`[Aggregator] Role ${role}: Created ${newFileName}, deleted ${deletedFiles.length}/${sortedFiles.length} files`);
    if (failedDeletes.length > 0) {
      console.warn(`[Aggregator] Failed to delete: ${failedDeletes.join(', ')}`);
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
