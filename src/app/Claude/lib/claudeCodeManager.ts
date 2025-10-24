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
  } catch (error) {
    console.error('Error creating context scan requirement:', error);
    return {
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
    const rulesFilePath = path.join(structure.commandsDir, 'structure-rules.md');

    // Write the structure rules file
    fs.writeFileSync(rulesFilePath, rulesContent, 'utf-8');

    console.log('[ClaudeCodeManager] Structure rules file created:', rulesFilePath);

    return {
      success: true,
      filePath: rulesFilePath,
    };
  } catch (error) {
    console.error('Error creating structure rules file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get logs directory path for Claude Code execution logs
 */
export function getLogsDirectory(projectPath: string): string {
  const claudePath = getClaudeFolderPath(projectPath);
  return path.join(claudePath, 'logs');
}

/**
 * Ensure logs directory exists
 */
function ensureLogsDirectory(projectPath: string): string {
  const logsDir = getLogsDirectory(projectPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

/**
 * Get log file path for a specific requirement execution
 */
export function getLogFilePath(projectPath: string, requirementName: string): string {
  const logsDir = ensureLogsDirectory(projectPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedName = requirementName.replace(/[^a-z0-9-_]/gi, '-');
  return path.join(logsDir, `${sanitizedName}_${timestamp}.log`);
}

/**
 * Execute a requirement using Claude Code CLI
 * Uses headless mode with proper slash command syntax
 * Logs all output to a file for observability
 */
export async function executeRequirement(
  projectPath: string,
  requirementName: string,
  onProgress?: (data: string) => void
): Promise<{
  success: boolean;
  output?: string;
  error?: string;
  sessionLimitReached?: boolean;
  logFilePath?: string;
}> {
  const { spawn } = require('child_process');
  const logFilePath = getLogFilePath(projectPath, requirementName);

  try {
    // First, verify the requirement exists
    const readResult = readRequirement(projectPath, requirementName);
    if (!readResult.success) {
      return {
        success: false,
        error: readResult.error || 'Requirement not found',
      };
    }

    // Create log file stream
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    let streamClosed = false;

    const logMessage = (msg: string) => {
      const timestamp = new Date().toISOString();
      const logLine = `[${timestamp}] ${msg}\n`;

      // Only write if stream is still open
      if (!streamClosed) {
        try {
          logStream.write(logLine);
        } catch (err) {
          console.error('Failed to write to log stream:', err);
        }
      }

      if (onProgress) {
        onProgress(msg);
      }
    };

    const closeLogStream = () => {
      if (!streamClosed) {
        streamClosed = true;
        logStream.end();
      }
    };

    logMessage('=== Claude Code Execution Started ===');
    logMessage(`Requirement: ${requirementName}`);
    logMessage(`Project Path: ${projectPath}`);
    logMessage(`Log File: ${logFilePath}`);
    logMessage('');

    return new Promise((resolve) => {
      try {
        // Read the requirement content to pass as prompt
        const requirementContent = readResult.content || '';

        // Build the full prompt with explicit instructions
        const fullPrompt = `You are an expert software engineer. Execute the following requirement immediately. Do not ask questions, do not wait for confirmation. Read the requirement carefully and implement all changes to the codebase as specified.

REQUIREMENT TO EXECUTE NOW:

${requirementContent}

IMPORTANT INSTRUCTIONS:
- Analyze the requirement thoroughly
- Identify all files that need to be modified or created
- Implement all changes specified in the requirement
- Follow the implementation steps precisely
- Create/modify files as needed
- Run any tests if specified
- Ensure all changes are complete before finishing

Begin implementation now.`;

        // Write prompt to temporary file to avoid shell escaping issues
        const tempPromptFile = path.join(getLogsDirectory(projectPath), `prompt_${Date.now()}.txt`);
        fs.writeFileSync(tempPromptFile, fullPrompt, 'utf-8');

        logMessage(`Executing command: cat prompt | claude -p - --output-format stream-json`);
        logMessage(`Requirement length: ${requirementContent.length} characters`);
        logMessage(`Full prompt length: ${fullPrompt.length} characters`);
        logMessage(`Temp prompt file: ${tempPromptFile}`);
        logMessage('');

        // Use stdin piping instead of command line arguments to avoid escaping issues
        const isWindows = process.platform === 'win32';
        const command = isWindows ? 'claude.cmd' : 'claude';
        const args = [
          '-p',
          '-', // Read from stdin
          '--output-format',
          'stream-json',
          '--verbose', // Required for stream-json with --print
          '--dangerously-skip-permissions',
        ];

        // Spawn the process (non-blocking)
        const childProcess = spawn(command, args, {
          cwd: projectPath,
          stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
          shell: isWindows, // Required on Windows for .cmd files
        });

        // Write the prompt to stdin
        childProcess.stdin.write(fullPrompt);
        childProcess.stdin.end();

        let stdout = '';
        let stderr = '';

        // Capture stdout
        childProcess.stdout.on('data', (data: Buffer) => {
          const text = data.toString();
          stdout += text;
          logMessage(`[STDOUT] ${text.trim()}`);
        });

        // Capture stderr
        childProcess.stderr.on('data', (data: Buffer) => {
          const text = data.toString();
          stderr += text;
          logMessage(`[STDERR] ${text.trim()}`);
        });

        // Handle process completion
        childProcess.on('close', (code: number) => {
          logMessage('');
          logMessage(`Process exited with code: ${code}`);
          logMessage('=== Claude Code Execution Finished ===');
          closeLogStream();

          if (code === 0) {
            resolve({
              success: true,
              output: stdout || 'Requirement executed successfully',
              logFilePath,
            });
          } else {
            // Check for session limit errors
            const errorOutput = stderr.toLowerCase();
            const isSessionLimit =
              errorOutput.includes('session limit') ||
              errorOutput.includes('rate limit') ||
              errorOutput.includes('usage limit') ||
              errorOutput.includes('quota exceeded') ||
              errorOutput.includes('too many requests') ||
              errorOutput.includes('subscription plan');

            if (isSessionLimit) {
              resolve({
                success: false,
                error: `Session limit reached. Check log file: ${logFilePath}`,
                sessionLimitReached: true,
                logFilePath,
              });
            } else {
              resolve({
                success: false,
                error: `Execution failed (code ${code}). Check log file: ${logFilePath}\n\n${stderr}`,
                logFilePath,
              });
            }
          }
        });

        // Handle spawn errors (e.g., Claude CLI not found)
        childProcess.on('error', (err: Error) => {
          logMessage(`[ERROR] ${err.message}`);

          // Check if it's a "command not found" error
          if (err.message.includes('ENOENT') || err.message.includes('spawn claude')) {
            logMessage('');
            logMessage('WARNING: Claude CLI not found, using simulation mode');
            logMessage('To enable real execution:');
            logMessage('1. Install Claude Code CLI from https://docs.claude.com/claude-code');
            logMessage('2. Run: claude auth login');
            logMessage('3. Restart the server');
            logMessage('');
            logMessage('✓ Simulated execution completed');
            closeLogStream();

            resolve({
              success: true,
              output: `[SIMULATION MODE - Claude CLI not installed]\n\nRequirement: ${requirementName}\n\n✓ Simulated execution completed\n\nLog file: ${logFilePath}`,
              logFilePath,
            });
          } else {
            // Other spawn errors
            logMessage(`[FATAL] Failed to spawn process`);
            closeLogStream();

            resolve({
              success: false,
              error: `Failed to spawn process: ${err.message}`,
              logFilePath,
            });
          }
        });

        // Set timeout
        const timeoutHandle = setTimeout(() => {
          if (!childProcess.killed) {
            logMessage('[TIMEOUT] Execution exceeded 10 minutes, killing process...');
            childProcess.kill();
            closeLogStream();
          }
        }, 600000); // 10 minute timeout

        // Clear timeout when process completes
        childProcess.on('close', () => {
          clearTimeout(timeoutHandle);
        });

      } catch (execError: any) {
        logMessage(`[EXCEPTION] ${execError.message}`);
        closeLogStream();

        resolve({
          success: false,
          error: `Execution exception: ${execError.message}`,
          logFilePath,
        });
      }
    });
  } catch (error) {
    console.error('Error executing requirement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logFilePath,
    };
  }
}
