import * as fs from 'fs';
import * as path from 'path';

/**
 * Claude Code folder structure management
 * Handles .claude folder initialization, settings, and requirement files
 */

export interface ClaudeFolderStructure {
  scripts: string;
  commands: string;
  agents: string;
  skills: string;
  settingsFile: string;
  claudeMdFile: string;
}

export interface ClaudeSettings {
  projectName?: string;
  createdAt?: string;
  updatedAt?: string;
  customConfig?: Record<string, any>;
}

/**
 * Get the .claude folder path for a project
 */
export function getClaudeFolderPath(projectPath: string): string {
  return path.join(projectPath, '.claude');
}

/**
 * Get the full folder structure paths for .claude directory
 */
export function getClaudeFolderStructure(projectPath: string): ClaudeFolderStructure {
  const claudePath = getClaudeFolderPath(projectPath);

  return {
    scripts: path.join(claudePath, 'scripts'),
    commands: path.join(claudePath, 'commands'),
    agents: path.join(claudePath, 'agents'),
    skills: path.join(claudePath, 'skills'),
    settingsFile: path.join(claudePath, 'settings.json'),
    claudeMdFile: path.join(claudePath, 'CLAUDE.md'),
  };
}

/**
 * Check if .claude folder exists in the project
 */
export function claudeFolderExists(projectPath: string): boolean {
  const claudePath = getClaudeFolderPath(projectPath);

  try {
    return fs.existsSync(claudePath) && fs.statSync(claudePath).isDirectory();
  } catch (error) {    return false;
  }
}

/**
 * Check if .claude folder is properly initialized with all subdirectories
 */
export function isClaudeFolderInitialized(projectPath: string): {
  initialized: boolean;
  missing: string[];
} {
  if (!claudeFolderExists(projectPath)) {
    return { initialized: false, missing: ['main .claude folder'] };
  }

  const structure = getClaudeFolderStructure(projectPath);
  const missing: string[] = [];

  // Check each required subdirectory
  if (!fs.existsSync(structure.scripts)) {
    missing.push('scripts');
  }
  if (!fs.existsSync(structure.commands)) {
    missing.push('commands');
  }
  if (!fs.existsSync(structure.agents)) {
    missing.push('agents');
  }
  if (!fs.existsSync(structure.settingsFile)) {
    missing.push('settings.json');
  }

  return {
    initialized: missing.length === 0,
    missing,
  };
}

/**
 * Initialize .claude folder structure with all subdirectories
 */
export function initializeClaudeFolder(
  projectPath: string,
  projectName?: string
): { success: boolean; error?: string; structure?: ClaudeFolderStructure } {
  try {
    const claudePath = getClaudeFolderPath(projectPath);
    const structure = getClaudeFolderStructure(projectPath);

    // Create main .claude folder
    if (!fs.existsSync(claudePath)) {
      fs.mkdirSync(claudePath, { recursive: true });
    }

    // Create subdirectories
    const subdirs = [structure.scripts, structure.commands, structure.agents];
    for (const dir of subdirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Create settings.json if it doesn't exist
    if (!fs.existsSync(structure.settingsFile)) {
      const defaultSettings: ClaudeSettings = {
        projectName: projectName || path.basename(projectPath),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customConfig: {},
      };
      fs.writeFileSync(
        structure.settingsFile,
        JSON.stringify(defaultSettings, null, 2),
        'utf-8'
      );
    }

    // Create CLAUDE.md template if it doesn't exist
    if (!fs.existsSync(structure.claudeMdFile)) {
      const claudeMdTemplate = `# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

${projectName || 'Project'} - Add your project description here.

## Common Commands

### Development
\`\`\`bash
# Add your common development commands here
npm run dev
npm run build
npm run test
\`\`\`

## Architecture Overview

Add information about your project architecture, key patterns, and conventions.

## Important Conventions

Document your coding standards, naming conventions, and best practices.
`;
      fs.writeFileSync(structure.claudeMdFile, claudeMdTemplate, 'utf-8');
    }

    return { success: true, structure };
  } catch (error) {    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new requirement file in .claude/commands directory
 * Requirements are markdown files that Claude Code can execute
 */
export function createRequirement(
  projectPath: string,
  requirementName: string,
  content: string,
  overwrite: boolean = false
): { success: boolean; error?: string; filePath?: string } {
  try {
    const structure = getClaudeFolderStructure(projectPath);

    // Ensure .claude folder is initialized
    if (!claudeFolderExists(projectPath)) {
      const initResult = initializeClaudeFolder(projectPath);
      if (!initResult.success) {
        return { success: false, error: 'Failed to initialize .claude folder' };
      }
    }

    // Sanitize requirement name to be filesystem-safe
    const sanitizedName = requirementName
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const fileName = `${sanitizedName}.md`;
    const filePath = path.join(structure.commands, fileName);

    // Check if file already exists (unless overwrite is true)
    if (fs.existsSync(filePath) && !overwrite) {
      return {
        success: false,
        error: `Requirement "${fileName}" already exists`,
      };
    }

    // Write the requirement file (will overwrite if overwrite=true)
    fs.writeFileSync(filePath, content, 'utf-8');

    return { success: true, filePath };
  } catch (error) {    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Read an existing requirement file
 */
export function readRequirement(
  projectPath: string,
  requirementName: string
): { success: boolean; content?: string; error?: string } {
  try {
    const structure = getClaudeFolderStructure(projectPath);
    const fileName = requirementName.endsWith('.md') ? requirementName : `${requirementName}.md`;
    const filePath = path.join(structure.commands, fileName);

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `Requirement "${fileName}" not found`,
      };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update an existing requirement file
 */
export function updateRequirement(
  projectPath: string,
  requirementName: string,
  content: string
): { success: boolean; error?: string } {
  try {
    const structure = getClaudeFolderStructure(projectPath);
    const fileName = requirementName.endsWith('.md') ? requirementName : `${requirementName}.md`;
    const filePath = path.join(structure.commands, fileName);

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `Requirement "${fileName}" not found`,
      };
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List all requirement files in .claude/commands
 */
export function listRequirements(projectPath: string): {
  success: boolean;
  requirements?: string[];
  error?: string;
} {
  try {
    const structure = getClaudeFolderStructure(projectPath);

    if (!fs.existsSync(structure.commands)) {
      return { success: true, requirements: [] };
    }

    const files = fs.readdirSync(structure.commands);
    const requirements = files
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.replace(/\.md$/, ''));

    return { success: true, requirements };
  } catch (error) {    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a requirement file exists
 */
export function requirementExists(
  projectPath: string,
  requirementName: string
): boolean {
  try {
    const structure = getClaudeFolderStructure(projectPath);
    const fileName = requirementName.endsWith('.md') ? requirementName : `${requirementName}.md`;
    const filePath = path.join(structure.commands, fileName);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Delete a requirement file
 */
export function deleteRequirement(
  projectPath: string,
  requirementName: string
): { success: boolean; error?: string } {
  try {
    const structure = getClaudeFolderStructure(projectPath);
    const fileName = requirementName.endsWith('.md') ? requirementName : `${requirementName}.md`;
    const filePath = path.join(structure.commands, fileName);

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `Requirement "${fileName}" not found`,
      };
    }

    fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update settings.json
 */
export function updateClaudeSettings(
  projectPath: string,
  updates: Partial<ClaudeSettings>
): { success: boolean; error?: string } {
  try {
    const structure = getClaudeFolderStructure(projectPath);

    let currentSettings: ClaudeSettings = {};

    // Read existing settings if available
    if (fs.existsSync(structure.settingsFile)) {
      const content = fs.readFileSync(structure.settingsFile, 'utf-8');
      currentSettings = JSON.parse(content);
    }

    // Merge updates
    const newSettings: ClaudeSettings = {
      ...currentSettings,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Write back to file
    fs.writeFileSync(
      structure.settingsFile,
      JSON.stringify(newSettings, null, 2),
      'utf-8'
    );

    return { success: true };
  } catch (error) {    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Read current Claude settings
 */
export function readClaudeSettings(projectPath: string): {
  success: boolean;
  settings?: ClaudeSettings;
  error?: string;
} {
  try {
    const structure = getClaudeFolderStructure(projectPath);

    if (!fs.existsSync(structure.settingsFile)) {
      return { success: true, settings: {} };
    }

    const content = fs.readFileSync(structure.settingsFile, 'utf-8');
    const settings = JSON.parse(content);

    return { success: true, settings };
  } catch (error) {    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create context scan requirement file with project-specific configuration
 */
export function createContextScanRequirement(
  projectPath: string,
  projectId: string,
  projectName?: string
): { success: boolean; error?: string; filePath?: string } {
  try {
    // Import the requirement generator (dynamic import to avoid circular deps)
    const {
      generateContextScanRequirement,
      getContextScanRequirementFileName,
    } = require('../../api/claude-code/initialize/contextScanRequirement');

    const requirementContent = generateContextScanRequirement({
      projectId,
      projectName: projectName || path.basename(projectPath),
      projectPath,
    });

    const fileName = getContextScanRequirementFileName();

    // Create the requirement using existing createRequirement function
    return createRequirement(projectPath, fileName.replace('.md', ''), requirementContent);
  } catch (error) {    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create structure rules file based on project type
 */
export function createStructureRulesFile(
  projectPath: string,
  projectType: 'nextjs' | 'fastapi' | 'other'
): { success: boolean; error?: string; filePath?: string } {
  try {
    if (projectType === 'other') {
      // No structure rules for unknown project types
      return { success: true };
    }

    // Import the structure rules generator
    const { generateStructureRules } = require('../../api/claude-code/initialize/structureRulesTemplate');

    const rulesContent = generateStructureRules(projectType);

    const structure = getClaudeFolderStructure(projectPath);
    const rulesFilePath = path.join(structure.commands, 'structure-rules.md');

    // Write the structure rules file
    fs.writeFileSync(rulesFilePath, rulesContent, 'utf-8');
    return {
      success: true,
      filePath: rulesFilePath,
    };
  } catch (error) {    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Default skills to copy to new projects
 * These are copied from the vibeman .claude/skills/ directory
 */
const DEFAULT_SKILLS_TO_COPY = [
  'context-map-generator.md',
  'brain-training.md',
];

/**
 * Get the source skills directory path (vibeman's .claude/skills/)
 * This assumes vibeman is running from its own project directory
 */
function getSourceSkillsPath(): string {
  return path.join(process.cwd(), '.claude', 'skills');
}

/**
 * Copy default skills from vibeman to a target project's .claude/skills/ folder
 *
 * @param projectPath - The target project path
 * @param skillsToCopy - Optional array of skill filenames to copy (defaults to DEFAULT_SKILLS_TO_COPY)
 * @returns Result with success status, copied files list, and any errors
 */
export function copyDefaultSkills(
  projectPath: string,
  skillsToCopy: string[] = DEFAULT_SKILLS_TO_COPY
): {
  success: boolean;
  copied: string[];
  skipped: string[];
  errors: Array<{ file: string; error: string }>;
} {
  const copied: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  try {
    const claudePath = getClaudeFolderPath(projectPath);
    const targetSkillsDir = path.join(claudePath, 'skills');
    const sourceSkillsDir = getSourceSkillsPath();

    // Create skills directory if it doesn't exist
    if (!fs.existsSync(targetSkillsDir)) {
      fs.mkdirSync(targetSkillsDir, { recursive: true });
    }

    // Check if source skills directory exists
    if (!fs.existsSync(sourceSkillsDir)) {
      return {
        success: false,
        copied: [],
        skipped: [],
        errors: [{ file: '*', error: 'Source skills directory not found' }],
      };
    }

    // Copy each skill
    for (const skillFile of skillsToCopy) {
      const sourcePath = path.join(sourceSkillsDir, skillFile);
      const targetPath = path.join(targetSkillsDir, skillFile);

      try {
        // Check if source file exists
        if (!fs.existsSync(sourcePath)) {
          errors.push({ file: skillFile, error: 'Source file not found' });
          continue;
        }

        // Skip if target already exists (don't overwrite)
        if (fs.existsSync(targetPath)) {
          skipped.push(skillFile);
          continue;
        }

        // Copy the file
        const content = fs.readFileSync(sourcePath, 'utf-8');
        fs.writeFileSync(targetPath, content, 'utf-8');
        copied.push(skillFile);
      } catch (fileError) {
        errors.push({
          file: skillFile,
          error: fileError instanceof Error ? fileError.message : 'Unknown error',
        });
      }
    }

    return {
      success: errors.length === 0,
      copied,
      skipped,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      copied,
      skipped,
      errors: [{
        file: '*',
        error: error instanceof Error ? error.message : 'Unknown error',
      }],
    };
  }
}
