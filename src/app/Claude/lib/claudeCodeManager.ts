import * as fs from 'fs';
import * as path from 'path';

/**
 * Manages Claude Code automation folder structure
 * Provides functions to check, initialize, and manage .claude folders in projects
 */

export interface ClaudeFolderStructure {
  scripts: string;
  commands: string;
  agents: string;
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
  } catch (error) {
    console.error('Error checking .claude folder:', error);
    return false;
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
  } catch (error) {
    console.error('Error initializing .claude folder:', error);
    return {
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
  content: string
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

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      return {
        success: false,
        error: `Requirement "${fileName}" already exists`,
      };
    }

    // Write the requirement file
    fs.writeFileSync(filePath, content, 'utf-8');

    return { success: true, filePath };
  } catch (error) {
    console.error('Error creating requirement:', error);
    return {
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
  } catch (error) {
    console.error('Error reading requirement:', error);
    return {
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
  } catch (error) {
    console.error('Error listing requirements:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
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
  } catch (error) {
    console.error('Error deleting requirement:', error);
    return {
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
  } catch (error) {
    console.error('Error updating Claude settings:', error);
    return {
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
  } catch (error) {
    console.error('Error reading Claude settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute a requirement using Claude Code CLI
 * Uses headless mode with streaming JSON output
 */
export async function executeRequirement(
  projectPath: string,
  requirementName: string
): Promise<{ success: boolean; output?: string; error?: string; sessionLimitReached?: boolean }> {
  try {
    // First, verify the requirement exists
    const readResult = readRequirement(projectPath, requirementName);
    if (!readResult.success) {
      return {
        success: false,
        error: readResult.error || 'Requirement not found',
      };
    }

    const requirementContent = readResult.content || '';
    const { execSync } = require('child_process');

    return new Promise((resolve) => {
      try {
        // Try to execute with Claude Code CLI
        // Using execSync with stdio:'pipe' to capture output
        const result = execSync(
          `claude -p "${requirementContent.replace(/"/g, '\\"')}" --output-format stream-json`,
          {
            encoding: 'utf-8',
            stdio: 'pipe',
            cwd: projectPath,
            timeout: 300000, // 5 minute timeout
          }
        );

        resolve({
          success: true,
          output: result || 'Requirement executed successfully',
        });
      } catch (execError: any) {
        // Check if it's a Claude Code CLI not found error
        if (execError.code === 'ENOENT' || execError.message?.includes('not found')) {
          // Fallback to simulation if Claude CLI not installed
          console.warn('Claude CLI not found, using simulation mode');

          setTimeout(() => {
            resolve({
              success: true,
              output: `[SIMULATION MODE - Claude CLI not installed]\n\nRequirement: /${requirementName}\n\nTask Description:\n${requirementContent.substring(0, 300)}${requirementContent.length > 300 ? '...' : ''}\n\n✓ Simulated execution completed\n\nTo enable real execution:\n1. Install Claude Code CLI: npm install -g @anthropic/claude-code\n2. Or use: claude auth login\n3. Restart the server\n\nThe requirement file is ready at:\n${projectPath}/.claude/commands/${requirementName}.md`,
            });
          }, 1500); // Shorter simulation time
        } else {
          // Check for session limit errors
          const errorOutput = (execError.stderr || execError.message || '').toLowerCase();
          const isSessionLimit =
            errorOutput.includes('session limit') ||
            errorOutput.includes('rate limit') ||
            errorOutput.includes('usage limit') ||
            errorOutput.includes('quota exceeded') ||
            errorOutput.includes('too many requests') ||
            errorOutput.includes('subscription plan');

          if (isSessionLimit) {
            // Session limit reached
            resolve({
              success: false,
              error: `Session limit reached. Your Claude Code subscription plan has reached its usage limit.\n\nPlease:\n1. Wait for the limit to reset\n2. Or upgrade your subscription plan\n3. Check your usage at https://claude.ai/settings\n\nOriginal error:\n${execError.stderr || execError.message}`,
              sessionLimitReached: true,
            });
          } else {
            // Real execution error (not session limit)
            resolve({
              success: false,
              error: `Execution failed: ${execError.message}\n\nStderr: ${execError.stderr || 'None'}`,
            });
          }
        }
      }
    });
  } catch (error) {
    console.error('Error executing requirement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
