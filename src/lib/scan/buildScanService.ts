/**
 * BuildScanService
 *
 * Build command detection, error parsing (TypeScript, ESLint, Webpack, Next.js),
 * and build execution. Extracted from /api/file-fixer route.
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';
import { deduplicateBuildErrors } from '@/lib/deduplication';
import { generateId } from '@/lib/idGenerator';

// --- Types ---

export interface BuildError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  type: 'typescript' | 'eslint' | 'webpack' | 'nextjs' | 'unknown';
  rule?: string;
}

export interface BuildResult {
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

// Track running build processes for cleanup
const runningProcesses = new Map<string, any>();

// --- Build command detection ---

export async function detectBuildCommand(projectPath?: string): Promise<string> {
  try {
    const workingDir = projectPath || process.cwd();
    const packageJsonPath = path.join(workingDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    const scripts = packageJson.scripts || {};
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const hasPnpmLock = await fs.access(path.join(workingDir, 'pnpm-lock.yaml')).then(() => true).catch(() => false);
    const hasYarnLock = await fs.access(path.join(workingDir, 'yarn.lock')).then(() => true).catch(() => false);
    const packageManager = hasPnpmLock ? 'pnpm' : hasYarnLock ? 'yarn' : 'npm';

    if (dependencies.next && dependencies.typescript) {
      if (scripts['type-check']) return `${packageManager} run type-check`;
      if (scripts['typecheck']) return `${packageManager} run typecheck`;
      return 'npx tsc --noEmit --skipLibCheck';
    }

    const buildCommands = [
      'type-check', 'typecheck', 'lint', 'compile', 'tsc',
      'build:check', 'build:types', 'build', 'build:prod', 'build:production'
    ];

    for (const cmd of buildCommands) {
      if (scripts[cmd]) return `${packageManager} run ${cmd}`;
    }

    if (dependencies.typescript) return 'npx tsc --noEmit --skipLibCheck';
    if (dependencies.vite) return `${packageManager} run build`;
    if (dependencies.webpack) return `${packageManager} run build`;

    return `${packageManager} run build`;
  } catch (error) {
    logger.error('Error detecting build command:', { error });
    return 'npx tsc --noEmit --skipLibCheck';
  }
}

// --- Error parsers ---

export function parseTypeScriptErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];

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

export function parseESLintErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];

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

export function parseWebpackErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];

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

export function parseNextJSErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];

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

export function parseGenericErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];

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

// --- Build execution ---

export async function executeBuildCommand(command: string, projectPath?: string): Promise<BuildResult> {
  const startTime = Date.now();
  const processId = generateId('build');

  return new Promise(async (resolve) => {
    const workingDir = projectPath || process.cwd();
    logger.info(`Executing build command in separate process: ${command} (ID: ${processId})`);
    logger.info(`Working directory: ${workingDir}`);

    let finalCommand = command;
    if (command.includes('tsc') && !command.includes('--noEmit')) {
      finalCommand = command.includes('--noEmit') ? command : `${command} --noEmit --skipLibCheck`;
    }

    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/bash';
    const shellArgs = isWindows ? ['/c', finalCommand] : ['-c', finalCommand];

    const buildProcess = spawn(shell, shellArgs, {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      windowsHide: true
    });

    runningProcesses.set(processId, buildProcess);

    let stdout = '';
    let stderr = '';

    buildProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    buildProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    buildProcess.on('close', (code) => {
      const executionTime = Date.now() - startTime;
      const rawOutput = stdout + stderr;

      runningProcesses.delete(processId);

      logger.info(`Build command completed with exit code: ${code} (ID: ${processId})`);
      logger.info(`Execution time: ${executionTime}ms`);
      logger.info(`Command executed: ${finalCommand}`);

      try {
        const allErrors = [
          ...parseTypeScriptErrors(rawOutput),
          ...parseESLintErrors(rawOutput),
          ...parseWebpackErrors(rawOutput),
          ...parseNextJSErrors(rawOutput),
          ...parseGenericErrors(rawOutput)
        ];

        const uniqueErrors = deduplicateBuildErrors(allErrors);

        const errors = uniqueErrors.filter(e => e.severity === 'error');
        const warnings = uniqueErrors.filter(e => e.severity === 'warning');

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

    buildProcess.on('error', (error) => {
      const executionTime = Date.now() - startTime;

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
    }, 300000);
  });
}

// --- Process cleanup ---

export function cleanupRunningProcesses(): void {
  logger.info(`Cleaning up ${runningProcesses.size} running build processes...`);

  for (const [processId, proc] of runningProcesses.entries()) {
    try {
      if (!proc.killed) {
        logger.info(`Terminating build process: ${processId}`);
        proc.kill('SIGTERM');

        setTimeout(() => {
          if (!proc.killed) {
            logger.info(`Force killing build process: ${processId}`);
            proc.kill('SIGKILL');
          }
        }, 5000);
      }
    } catch (error) {
      logger.error(`Error cleaning up process ${processId}:`, { error });
    }
  }

  runningProcesses.clear();
}
