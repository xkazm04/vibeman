import { NextRequest, NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';
import { createErrorResponse, handleError, handleApiError, notFoundResponse } from '@/lib/api-helpers';
import { deduplicateBuildErrors } from '@/lib/deduplication';
import { generateId } from '@/lib/idGenerator';
import { withObservability } from '@/lib/observability/middleware';

const execAsync = promisify(exec);

// Track running build processes for cleanup
const runningProcesses = new Map<string, any>();

interface BuildError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  type: 'typescript' | 'eslint' | 'webpack' | 'nextjs' | 'unknown';
  rule?: string;
}

interface BuildResult {
  success: boolean;
  errors: BuildError[];
  warnings: BuildError[];
  totalErrors: number;
  totalWarnings: number;
  unparsedErrors: number;
  buildCommand: string;
  executionTime: number;
  rawOutput: string;
}

async function detectBuildCommand(projectPath?: string): Promise<string> {
  try {
    const workingDir = projectPath || process.cwd();
    const packageJsonPath = path.join(workingDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    const scripts = packageJson.scripts || {};
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Auto-detect package manager: pnpm > yarn > npm
    const hasPnpmLock = await fs.access(path.join(workingDir, 'pnpm-lock.yaml')).then(() => true).catch(() => false);
    const hasYarnLock = await fs.access(path.join(workingDir, 'yarn.lock')).then(() => true).catch(() => false);
    const packageManager = hasPnpmLock ? 'pnpm' : hasYarnLock ? 'yarn' : 'npm';
    
    // For Next.js projects, prioritize TypeScript checking over full build to avoid conflicts
    if (dependencies.next && dependencies.typescript) {
      // Check if there's a specific type-check script
      if (scripts['type-check']) {
        return `${packageManager} run type-check`;
      }
      if (scripts['typecheck']) {
        return `${packageManager} run typecheck`;
      }
      // Use direct TypeScript compilation (no emit, just checking)
      return 'npx tsc --noEmit --skipLibCheck';
    }
    
    // Priority order for build commands (avoid full builds that conflict with dev server)
    const buildCommands = [
      'type-check',
      'typecheck',
      'lint',
      'compile',
      'tsc',
      'build:check',
      'build:types',
      'build',
      'build:prod',
      'build:production'
    ];
    
    for (const cmd of buildCommands) {
      if (scripts[cmd]) {
        return `${packageManager} run ${cmd}`;
      }
    }
    
    // Framework-specific fallbacks
    if (dependencies.typescript) {
      return 'npx tsc --noEmit --skipLibCheck';
    }
    if (dependencies.vite) {
      return `${packageManager} run build`;
    }
    if (dependencies.webpack) {
      return `${packageManager} run build`;
    }
    
    // Last resort - full build (may conflict with dev server)
    return `${packageManager} run build`;
  } catch (error) {
    logger.error('Error detecting build command:', { error });
    return 'npx tsc --noEmit --skipLibCheck';
  }
}

function parseTypeScriptErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];
  
  // TypeScript error pattern: src/file.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
  const tsErrorRegex = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)$/gm;
  
  let match;
  while ((match = tsErrorRegex.exec(output)) !== null) {
    const [, file, line, column, severity, code, message] = match;
    errors.push({
      file: file.trim(),
      line: parseInt(line),
      column: parseInt(column),
      message: message.trim(),
      severity: severity as 'error' | 'warning',
      type: 'typescript',
      rule: `TS${code}`
    });
  }
  
  // Alternative TypeScript pattern: src/file.ts:10:5 - error TS2322: Message
  const tsErrorRegex2 = /^(.+?):(\d+):(\d+)\s+-\s+(error|warning)\s+TS(\d+):\s+(.+)$/gm;
  
  while ((match = tsErrorRegex2.exec(output)) !== null) {
    const [, file, line, column, severity, code, message] = match;
    errors.push({
      file: file.trim(),
      line: parseInt(line),
      column: parseInt(column),
      message: message.trim(),
      severity: severity as 'error' | 'warning',
      type: 'typescript',
      rule: `TS${code}`
    });
  }
  
  return errors;
}

function parseESLintErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];
  
  // ESLint error pattern: /path/to/file.js:10:5: error message (rule-name)
  const eslintRegex = /^(.+?):(\d+):(\d+):\s+(error|warning)\s+(.+?)\s+\((.+?)\)$/gm;
  
  let match;
  while ((match = eslintRegex.exec(output)) !== null) {
    const [, file, line, column, severity, message, rule] = match;
    errors.push({
      file: file.trim(),
      line: parseInt(line),
      column: parseInt(column),
      message: message.trim(),
      severity: severity as 'error' | 'warning',
      type: 'eslint',
      rule: rule.trim()
    });
  }
  
  return errors;
}

function parseWebpackErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];
  
  // Webpack error pattern: ERROR in ./src/file.js 10:5
  const webpackRegex = /ERROR in (.+?)\s+(\d+):(\d+)[\s\S]*?(.+?)(?=\n\n|\nERROR|\nWARNING|$)/g;
  
  let match;
  while ((match = webpackRegex.exec(output)) !== null) {
    const [, file, line, column, message] = match;
    errors.push({
      file: file.replace(/^\.\//, '').trim(),
      line: parseInt(line),
      column: parseInt(column),
      message: message.trim().replace(/\n/g, ' '),
      severity: 'error',
      type: 'webpack'
    });
  }
  
  // Webpack warning pattern
  const webpackWarningRegex = /WARNING in (.+?)\s+(\d+):(\d+)[\s\S]*?(.+?)(?=\n\n|\nERROR|\nWARNING|$)/g;
  
  while ((match = webpackWarningRegex.exec(output)) !== null) {
    const [, file, line, column, message] = match;
    errors.push({
      file: file.replace(/^\.\//, '').trim(),
      line: parseInt(line),
      column: parseInt(column),
      message: message.trim().replace(/\n/g, ' '),
      severity: 'warning',
      type: 'webpack'
    });
  }
  
  return errors;
}

function parseNextJSErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];
  
  // Next.js compilation error pattern
  const nextErrorRegex = /Failed to compile[\s\S]*?(.+?):(\d+):(\d+)[\s\S]*?Error: (.+?)(?=\n\n|$)/g;
  
  let match;
  while ((match = nextErrorRegex.exec(output)) !== null) {
    const [, file, line, column, message] = match;
    errors.push({
      file: file.trim(),
      line: parseInt(line),
      column: parseInt(column),
      message: message.trim(),
      severity: 'error',
      type: 'nextjs'
    });
  }
  
  return errors;
}

function parseGenericErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];
  
  // Generic error pattern: file.js:10:5: error: message
  const genericRegex = /^(.+?):(\d+):(\d+):\s*(error|warning):\s*(.+)$/gm;
  
  let match;
  while ((match = genericRegex.exec(output)) !== null) {
    const [, file, line, column, severity, message] = match;
    errors.push({
      file: file.trim(),
      line: parseInt(line),
      column: parseInt(column),
      message: message.trim(),
      severity: severity as 'error' | 'warning',
      type: 'unknown'
    });
  }
  
  return errors;
}

// deduplicateErrors is now imported from @/lib/deduplication as deduplicateBuildErrors

async function executeBuildCommand(command: string, projectPath?: string): Promise<BuildResult> {
  const startTime = Date.now();
  const processId = generateId('build');
  
  return new Promise(async (resolve) => {
    const workingDir = projectPath || process.cwd();
    logger.info(`Executing build command in separate process: ${command} (ID: ${processId})`);
    logger.info(`Working directory: ${workingDir}`);
    
    // If this is a TypeScript check command, ensure we use safe options
    let finalCommand = command;
    if (command.includes('tsc') && !command.includes('--noEmit')) {
      finalCommand = command.includes('--noEmit') ? command : `${command} --noEmit --skipLibCheck`;
    }
    
    // Parse command and arguments
    const [cmd, ...args] = finalCommand.split(' ');
    
    // Determine shell based on platform
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/bash';
    const shellArgs = isWindows ? ['/c', finalCommand] : ['-c', finalCommand];
    
    // Spawn the build command in a separate process
    const buildProcess = spawn(shell, shellArgs, {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false, // Keep attached to parent for cleanup
      windowsHide: true // Hide console window on Windows
    });
    
    // Track the process for cleanup
    runningProcesses.set(processId, buildProcess);
    
    let stdout = '';
    let stderr = '';
    
    // Collect stdout
    buildProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Collect stderr
    buildProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Handle process completion
    buildProcess.on('close', (code) => {
      const executionTime = Date.now() - startTime;
      const rawOutput = stdout + stderr;
      
      // Remove from tracking
      runningProcesses.delete(processId);
      
      logger.info(`Build command completed with exit code: ${code} (ID: ${processId})`);
      logger.info(`Execution time: ${executionTime}ms`);
      logger.info(`Command executed: ${finalCommand}`);
      
      try {
        // Parse errors from different sources
        const allErrors = [
          ...parseTypeScriptErrors(rawOutput),
          ...parseESLintErrors(rawOutput),
          ...parseWebpackErrors(rawOutput),
          ...parseNextJSErrors(rawOutput),
          ...parseGenericErrors(rawOutput)
        ];
        
        // Deduplicate errors
        const uniqueErrors = deduplicateBuildErrors(allErrors);
        
        // Separate errors and warnings
        const errors = uniqueErrors.filter(e => e.severity === 'error');
        const warnings = uniqueErrors.filter(e => e.severity === 'warning');
        
        // Count unparsed errors (rough estimate)
        const errorLines = rawOutput.split('\n').filter(line => 
          line.toLowerCase().includes('error') && 
          !uniqueErrors.some(e => rawOutput.includes(e.message))
        );
        
        resolve({
          success: code === 0 && errors.length === 0,
          errors,
          warnings,
          totalErrors: errors.length,
          totalWarnings: warnings.length,
          unparsedErrors: Math.max(0, errorLines.length - uniqueErrors.length),
          buildCommand: command,
          executionTime,
          rawOutput
        });
        
      } catch (parseError) {
        logger.error('Error parsing build output:', { error: parseError });
        resolve({
          success: false,
          errors: [{
            file: 'unknown',
            message: `Failed to parse build output: ${parseError}`,
            severity: 'error',
            type: 'unknown'
          }],
          warnings: [],
          totalErrors: 1,
          totalWarnings: 0,
          unparsedErrors: 0,
          buildCommand: command,
          executionTime,
          rawOutput
        });
      }
    });
    
    // Handle process errors
    buildProcess.on('error', (error) => {
      const executionTime = Date.now() - startTime;
      
      // Remove from tracking
      runningProcesses.delete(processId);
      
      logger.error(`Build process error (ID: ${processId}):`, { error });
      
      resolve({
        success: false,
        errors: [{
          file: 'unknown',
          message: `Build process failed: ${error.message}`,
          severity: 'error',
          type: 'unknown'
        }],
        warnings: [],
        totalErrors: 1,
        totalWarnings: 0,
        unparsedErrors: 0,
        buildCommand: command,
        executionTime,
        rawOutput: error.message
      });
    });
    
    // Set timeout to prevent hanging
    setTimeout(() => {
      if (!buildProcess.killed) {
        logger.info('Build command timeout, killing process...');
        buildProcess.kill('SIGTERM');
        
        setTimeout(() => {
          if (!buildProcess.killed) {
            buildProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    }, 300000); // 5 minutes timeout
  });
}

async function handlePost(request: NextRequest) {
  try {
    const { action, buildCommand, projectPath } = await request.json();
    
    switch (action) {
      case 'detect-build-command':
        const detectedCommand = await detectBuildCommand(projectPath);
        return NextResponse.json({ buildCommand: detectedCommand });
        
      case 'run-build-scan':
        const command = buildCommand || await detectBuildCommand(projectPath);
        const result = await executeBuildCommand(command, projectPath);
        return NextResponse.json(result);
        
      default:
        return createErrorResponse('Invalid action', 400);
    }
  } catch (error) {
    return handleApiError(error, 'File fixer');
  }
}

async function handleGet(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const projectPath = url.searchParams.get('projectPath');
    const buildCommand = await detectBuildCommand(projectPath || undefined);
    return NextResponse.json({ buildCommand });
  } catch (error) {
    return handleApiError(error, 'File fixer GET');
  }
}

export const POST = withObservability(handlePost, '/api/file-fixer');
export const GET = withObservability(handleGet, '/api/file-fixer');

// Cleanup function for running processes
function cleanupRunningProcesses(): void {
  logger.info(`Cleaning up ${runningProcesses.size} running build processes...`);
  
  for (const [processId, process] of runningProcesses.entries()) {
    try {
      if (!process.killed) {
        logger.info(`Terminating build process: ${processId}`);
        process.kill('SIGTERM');
        
        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (!process.killed) {
            logger.info(`Force killing build process: ${processId}`);
            process.kill('SIGKILL');
          }
        }, 5000);
      }
    } catch (error) {
      logger.error(`Error cleaning up process ${processId}:`, { error });
    }
  }
  
  runningProcesses.clear();
}

// Cleanup on process exit
process.on('exit', cleanupRunningProcesses);
process.on('SIGINT', cleanupRunningProcesses);
process.on('SIGTERM', cleanupRunningProcesses);