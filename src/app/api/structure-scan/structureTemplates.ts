/**
 * Structure Templates for Different Project Types
 *
 * Defines expected file/folder patterns and their purposes.
 * Rules are defined in separate files under ./rules/ for extensibility.
 * Users can provide custom rules via .structure-rules.json in project root.
 */

import { NEXTJS_RULES, NEXTJS_DIRECTORY_RULES, NEXTJS_ANTI_PATTERNS } from './rules/nextjs-rules';
import { FASTAPI_RULES } from './rules/fastapi-rules';
import { loadRules, type RulesetType } from './rules/loader';

/** A single rule defining an expected file/folder pattern in a project */
export interface StructureRule {
  pattern: string; // Glob pattern to match files
  description: string; // What should be in this location (for LLMs)
  required?: boolean; // Whether this structure is mandatory
  examples?: string[]; // Example file paths
  context?: boolean; // Whether this pattern defines a context (for scripted context scanning)
}

/** Template defining the expected structure for a specific project type */
export interface ProjectStructureTemplate {
  type: 'nextjs' | 'fastapi';
  name: string;
  description: string;
  rules: StructureRule[];
}

/** Directory-level enforcement rule defining allowed folders and files at a specific path */
export interface DirectoryRule {
  path: string; // Relative path (e.g., "src", "src/app", "src/app/features")
  description: string; // What this directory is for
  allowedFolders?: Array<{
    name: string; // Folder name or pattern (e.g., "api", "*-page", "sub_*")
    description: string;
    recursive?: boolean; // If true, any subdirectories are allowed
  }>;
  allowedFiles?: Array<{
    name: string; // File name or pattern (e.g., "*.tsx", "globals.css")
    description: string;
  }>;
  subdirectoryRules?: DirectoryRule[]; // Rules for subdirectories
  strictMode?: boolean; // If true, only explicitly allowed items are permitted
}

/** Enforced project structure with hierarchical directory rules and anti-pattern detection */
export interface EnforcedStructure {
  projectType: 'nextjs' | 'fastapi';
  name: string;
  description: string;
  directoryRules: DirectoryRule[];
  antiPatterns?: Array<{
    pattern: string;
    description: string;
    suggestedLocation: string;
  }>;
}

/**
 * NextJS Project Structure Template
 * Rules imported from ./rules/nextjs-rules.ts
 */
export const NEXTJS_STRUCTURE: ProjectStructureTemplate = {
  type: 'nextjs',
  name: 'Next.js 15 with App Router',
  description: 'Modern Next.js project structure with feature-based organization',
  rules: NEXTJS_RULES,
};

/**
 * Enforced NextJS Structure with Strict Rules
 * Directory rules and anti-patterns imported from ./rules/nextjs-rules.ts
 *
 * IMPORTANT: This structure assumes a Next.js project WITH a src/ folder.
 * For projects without src/ (where app/ is at root), use NEXTJS_ENFORCED_STRUCTURE_NO_SRC
 */
export const NEXTJS_ENFORCED_STRUCTURE: EnforcedStructure = {
  projectType: 'nextjs',
  name: 'Next.js 15 Enforced Structure (with src/)',
  description: 'Strict Next.js structure with explicit folder and file rules (assumes src/ folder exists)',
  directoryRules: NEXTJS_DIRECTORY_RULES,
  antiPatterns: NEXTJS_ANTI_PATTERNS,
};

/**
 * FastAPI Project Structure Template
 * Rules imported from ./rules/fastapi-rules.ts
 */
export const FASTAPI_STRUCTURE: ProjectStructureTemplate = {
  type: 'fastapi',
  name: 'FastAPI Project',
  description: 'Standard FastAPI project structure with clean architecture',
  rules: FASTAPI_RULES,
};

/**
 * Get structure template by project type (with custom rules support)
 * Server-side only — loads custom .structure-rules.json from project root.
 */
export async function getStructureTemplateWithCustom(
  type: RulesetType,
  projectRoot?: string,
): Promise<ProjectStructureTemplate> {
  const baseTemplate = getStructureTemplate(type);

  const { rules, isCustom } = await loadRules(type, projectRoot);
  if (isCustom) {
    return { ...baseTemplate, rules };
  }

  return baseTemplate;
}

/**
 * Get structure template by project type (default only)
 */
export function getStructureTemplate(type: 'nextjs' | 'fastapi'): ProjectStructureTemplate {
  switch (type) {
    case 'nextjs':
      return NEXTJS_STRUCTURE;
    case 'fastapi':
      return FASTAPI_STRUCTURE;
    default:
      throw new Error(`Unknown project type: ${type}`);
  }
}

/**
 * Get enforced structure by project type
 */
export function getEnforcedStructure(type: 'nextjs' | 'fastapi'): EnforcedStructure | null {
  switch (type) {
    case 'nextjs':
      return NEXTJS_ENFORCED_STRUCTURE;
    case 'fastapi':
      // FastAPI enforced structure not yet implemented
      return null;
    default:
      return null;
  }
}

/**
 * Get all available templates
 */
export function getAllTemplates(): ProjectStructureTemplate[] {
  return [NEXTJS_STRUCTURE, FASTAPI_STRUCTURE];
}

/**
 * Convert EnforcedStructure to human-readable guidelines
 * Used for generating dynamic documentation in requirement files
 */
export function generateGuidelinesFromEnforcedStructure(structure: EnforcedStructure): string {
  let guidelines = `### ${structure.name}\n\n`;
  guidelines += `${structure.description}\n\n`;

  // Process directory rules
  guidelines += `**Directory Structure:**\n\n`;

  function processDirectoryRule(rule: DirectoryRule, indent: number = 0): string {
    const indentStr = '  '.repeat(indent);
    let text = '';

    // Add directory description
    text += `${indentStr}- **\`${rule.path}/\`**: ${rule.description}\n`;

    // Add allowed folders
    if (rule.allowedFolders && rule.allowedFolders.length > 0) {
      text += `${indentStr}  - Allowed folders:\n`;
      for (const folder of rule.allowedFolders) {
        const folderDesc = folder.recursive ? ` (recursive)` : '';
        text += `${indentStr}    - \`${folder.name}\` - ${folder.description}${folderDesc}\n`;
      }
    }

    // Add allowed files
    if (rule.allowedFiles && rule.allowedFiles.length > 0) {
      text += `${indentStr}  - Allowed files:\n`;
      for (const file of rule.allowedFiles) {
        text += `${indentStr}    - \`${file.name}\` - ${file.description}\n`;
      }
    }

    // Add strict mode note
    if (rule.strictMode) {
      text += `${indentStr}  - ⚠️ **Strict mode**: Only explicitly listed items are allowed\n`;
    }

    // Process subdirectories
    if (rule.subdirectoryRules && rule.subdirectoryRules.length > 0) {
      for (const subRule of rule.subdirectoryRules) {
        text += processDirectoryRule(subRule, indent + 1);
      }
    }

    text += '\n';
    return text;
  }

  for (const rule of structure.directoryRules) {
    guidelines += processDirectoryRule(rule);
  }

  // Add anti-patterns section
  if (structure.antiPatterns && structure.antiPatterns.length > 0) {
    guidelines += `**Anti-Patterns (AVOID):**\n\n`;
    for (const antiPattern of structure.antiPatterns) {
      guidelines += `- ❌ \`${antiPattern.pattern}\` - ${antiPattern.description}\n`;
      guidelines += `  - Use instead: \`${antiPattern.suggestedLocation}\`\n`;
    }
    guidelines += '\n';
  }

  // Add key principles
  guidelines += `**Key Principles:**\n\n`;
  if (structure.projectType === 'nextjs') {
    guidelines += `1. **Strict src/ structure**: Only \`app\`, \`components\`, \`hooks\`, \`lib\`, \`stores\`, and \`types\` folders are allowed in \`src/\`\n`;
    guidelines += `2. **App Router structure**: Only \`api\`, \`features\`, and \`*-page\` folders allowed in \`src/app/\`, plus specific root files\n`;
    guidelines += `3. **Feature organization**: Use \`src/app/features/\` for shared feature logic with optional \`sub_*\` subfeatures (one level only)\n`;
    guidelines += `4. **No nested subfeatures**: Subfeatures (\`sub_*\`) cannot contain other subfeatures\n`;
    guidelines += `5. **Consistent naming**: Use \`src/lib/\` for all utilities (not \`utils/\` or \`helpers/\`)\n`;
  }

  return guidelines;
}
