import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface BuildError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  type: 'typescript' | 'eslint' | 'webpack' | 'nextjs' | 'unknown';
  rule?: string;
}

interface ErrorGroup {
  file: string;
  errors: BuildError[];
  chunkIndex?: number;
  totalChunks?: number;
}

interface BuildFixerResult {
  success: boolean;
  totalErrors: number;
  totalWarnings: number;
  requirementFiles: string[];
  buildCommand: string;
  executionTime: number;
  error?: string;
}

// Configuration - Balance between Claude Code usage and file scope
const MAX_ERRORS_PER_GROUP = 150; // Allow more errors per group to reduce file count
const MAX_CHARS_PER_GROUP = 25000; // ~25KB per requirement file
const MAX_FILES_PER_GROUP = 10; // Max files to group together

/**
 * Detect the appropriate build command for the project
 */
async function detectBuildCommand(projectPath: string): Promise<string> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    const scripts = packageJson.scripts || {};
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Auto-detect package manager
    const hasPnpmLock = await fs.access(path.join(projectPath, 'pnpm-lock.yaml')).then(() => true).catch(() => false);
    const hasYarnLock = await fs.access(path.join(projectPath, 'yarn.lock')).then(() => true).catch(() => false);
    const packageManager = hasPnpmLock ? 'pnpm' : hasYarnLock ? 'yarn' : 'npm';

    // For Next.js projects, prioritize TypeScript checking
    if (dependencies.next && dependencies.typescript) {
      if (scripts['type-check']) return `${packageManager} run type-check`;
      if (scripts['typecheck']) return `${packageManager} run typecheck`;
      return 'npx tsc --noEmit --skipLibCheck';
    }

    // Check for type-check scripts
    const buildCommands = ['type-check', 'typecheck', 'lint', 'compile', 'tsc'];
    for (const cmd of buildCommands) {
      if (scripts[cmd]) return `${packageManager} run ${cmd}`;
    }

    // Fallback to TypeScript
    if (dependencies.typescript) {
      return 'npx tsc --noEmit --skipLibCheck';
    }

    return `${packageManager} run build`;
  } catch (error) {
    console.error('Error detecting build command:', error);
    return 'npx tsc --noEmit --skipLibCheck';
  }
}

/**
 * Parse TypeScript errors from build output
 */
function parseTypeScriptErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];

  // Pattern 1: src/file.ts(10,5): error TS2322: Message
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

  // Pattern 2: src/file.ts:10:5 - error TS2322: Message
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

/**
 * Parse ESLint errors from build output
 */
function parseESLintErrors(output: string): BuildError[] {
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

/**
 * Deduplicate errors based on file, line, column, and message
 */
function deduplicateErrors(errors: BuildError[]): BuildError[] {
  const seen = new Set<string>();
  return errors.filter(error => {
    const key = `${error.file}:${error.line}:${error.column}:${error.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Execute build command and capture output
 */
async function executeBuildCommand(command: string, projectPath: string): Promise<{ output: string; exitCode: number }> {
  return new Promise((resolve) => {
    console.log(`[BuildFixer] Executing: ${command} in ${projectPath}`);

    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/bash';
    const shellArgs = isWindows ? ['/c', command] : ['-c', command];

    const buildProcess = spawn(shell, shellArgs, {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    buildProcess.stdout?.on('data', (data) => { stdout += data.toString(); });
    buildProcess.stderr?.on('data', (data) => { stderr += data.toString(); });

    buildProcess.on('close', (code) => {
      resolve({ output: stdout + stderr, exitCode: code || 0 });
    });

    buildProcess.on('error', (error) => {
      resolve({ output: error.message, exitCode: 1 });
    });

    // 5 minute timeout
    setTimeout(() => {
      if (!buildProcess.killed) {
        buildProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!buildProcess.killed) buildProcess.kill('SIGKILL');
        }, 5000);
      }
    }, 300000);
  });
}

/**
 * Extract directory path from file path
 */
function getDirectory(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');

  // If file is in root, return 'root'
  if (parts.length === 1) return 'root';

  // Return the directory path (without filename)
  return parts.slice(0, -1).join('/');
}

/**
 * Group errors by directory for intelligent grouping
 */
function groupErrorsByDirectory(errors: BuildError[]): Map<string, Map<string, BuildError[]>> {
  const directoryGroups = new Map<string, Map<string, BuildError[]>>();

  for (const error of errors) {
    const dir = getDirectory(error.file);

    if (!directoryGroups.has(dir)) {
      directoryGroups.set(dir, new Map());
    }

    const fileMap = directoryGroups.get(dir)!;
    const existing = fileMap.get(error.file) || [];
    existing.push(error);
    fileMap.set(error.file, existing);
  }

  return directoryGroups;
}

/**
 * Create intelligent error groups by directory with smart splitting
 */
function createIntelligentErrorGroups(errors: BuildError[]): ErrorGroup[] {
  const directoryGroups = groupErrorsByDirectory(errors);
  const result: ErrorGroup[] = [];

  for (const [directory, fileMap] of directoryGroups.entries()) {
    const allErrorsInDir: BuildError[] = [];
    const filesInDir: string[] = [];

    // Collect all errors and files in this directory
    for (const [file, fileErrors] of fileMap.entries()) {
      allErrorsInDir.push(...fileErrors);
      filesInDir.push(file);
    }

    // Calculate group size
    const groupSize = JSON.stringify(allErrorsInDir).length;
    const errorCount = allErrorsInDir.length;
    const fileCount = filesInDir.length;

    // Decision: Can we fit this directory in one requirement file?
    const canFitInOne =
      errorCount <= MAX_ERRORS_PER_GROUP &&
      groupSize <= MAX_CHARS_PER_GROUP &&
      fileCount <= MAX_FILES_PER_GROUP;

    if (canFitInOne) {
      // Create one group for the entire directory
      result.push({
        file: directory,
        errors: allErrorsInDir,
        chunkIndex: undefined,
        totalChunks: undefined
      });
    } else {
      // Split by individual files if directory is too large
      const fileList = Array.from(fileMap.entries());

      // Sort files by error count (descending) to group heavy files
      fileList.sort((a, b) => b[1].length - a[1].length);

      let currentChunk: BuildError[] = [];
      let currentFiles: string[] = [];
      let currentSize = 0;

      for (const [file, fileErrors] of fileList) {
        const fileSize = JSON.stringify(fileErrors).length;
        const fileErrorCount = fileErrors.length;

        // Check if adding this file exceeds limits
        const wouldExceed =
          currentChunk.length + fileErrorCount > MAX_ERRORS_PER_GROUP ||
          currentSize + fileSize > MAX_CHARS_PER_GROUP ||
          currentFiles.length >= MAX_FILES_PER_GROUP;

        if (wouldExceed && currentChunk.length > 0) {
          // Create a group with current chunk
          result.push({
            file: currentFiles.length === 1 ? currentFiles[0] : directory,
            errors: currentChunk,
            chunkIndex: undefined,
            totalChunks: undefined
          });

          // Reset for next chunk
          currentChunk = [];
          currentFiles = [];
          currentSize = 0;
        }

        // Add current file to chunk
        currentChunk.push(...fileErrors);
        currentFiles.push(file);
        currentSize += fileSize;
      }

      // Add remaining chunk
      if (currentChunk.length > 0) {
        result.push({
          file: currentFiles.length === 1 ? currentFiles[0] : directory,
          errors: currentChunk,
          chunkIndex: undefined,
          totalChunks: undefined
        });
      }
    }
  }

  return result;
}

/**
 * Format errors for a requirement file
 */
function formatErrorGroup(group: ErrorGroup): string {
  const { file, errors } = group;

  // Check if this is a directory group or single file group
  const uniqueFiles = [...new Set(errors.map(e => e.file))];
  const isDirectoryGroup = uniqueFiles.length > 1;

  const header = isDirectoryGroup
    ? `# Fix Build Errors - ${file}/ (${uniqueFiles.length} files)`
    : `# Fix Build Errors - ${file}`;

  const intro = isDirectoryGroup
    ? `This requirement contains ${errors.length} build error${errors.length > 1 ? 's' : ''} across ${uniqueFiles.length} file${uniqueFiles.length > 1 ? 's' : ''} in the \`${file}/\` directory.`
    : `This requirement contains ${errors.length} build error${errors.length > 1 ? 's' : ''} in \`${file}\`.`;

  // Group errors by file for better organization
  const errorsByFile = new Map<string, BuildError[]>();
  for (const error of errors) {
    const fileErrors = errorsByFile.get(error.file) || [];
    fileErrors.push(error);
    errorsByFile.set(error.file, fileErrors);
  }

  // Create organized error list
  const errorSections: string[] = [];
  let globalIndex = 1;

  for (const [fileName, fileErrors] of errorsByFile.entries()) {
    if (isDirectoryGroup) {
      errorSections.push(`\n### ${fileName} (${fileErrors.length} errors)\n`);
    }

    const errorItems = fileErrors.map((error) => {
      const location = error.line ? `Line ${error.line}` : 'Unknown line';
      const ruleInfo = error.rule ? ` **[${error.rule}]**` : '';
      const item = `${globalIndex}. **${location}**: ${error.message}${ruleInfo}`;
      globalIndex++;
      return item;
    }).join('\n');

    errorSections.push(errorItems);
  }

  const errorList = errorSections.join('\n');

  const instructions = isDirectoryGroup
    ? `
## Instructions

This requirement groups related errors in the \`${file}/\` directory. Please fix all errors systematically:

1. Work through each file listed above
2. For each error, navigate to the specified line number
3. Understand the error message and apply the appropriate fix
4. Ensure fixes are consistent across related files
5. Run the type checker after fixing to verify

**Tip**: Many errors in the same directory may share common causes (e.g., missing imports, type definitions). Look for patterns to fix multiple errors efficiently.
`
    : `
## Instructions

Please review and fix all the errors listed above:

1. Navigate to each specified line number
2. Understand the error message and rule violation
3. Apply the appropriate fix
4. Ensure the fix doesn't introduce new errors
5. Run the type checker to verify the fixes
`;

  const errorDetails = `
## Error Details

\`\`\`
${errors.map(e => {
  const loc = e.line ? `${e.file}:${e.line}:${e.column || 0}` : e.file;
  const rule = e.rule ? ` [${e.rule}]` : '';
  return `${loc} - ${e.severity}${rule}: ${e.message}`;
}).join('\n')}
\`\`\`
`;

  return `${header}\n\n${intro}\n\n## Errors\n${errorList}\n${instructions}\n${errorDetails}`;
}

/**
 * Create a Claude Code requirement file using the official claudeCodeManager
 */
async function createRequirementFile(
  projectPath: string,
  requirementName: string,
  content: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    // Use the existing createRequirement function from claudeCodeManager
    const { createRequirement } = await import('@/app/Claude/lib/claudeCodeManager');
    const result = createRequirement(projectPath, requirementName, content);

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate a safe filename from a file or directory path
 */
function generateRequirementName(file: string): string {
  // Remove leading ./ or .\\
  let safeName = file.replace(/^\.[\\/]/, '');

  // Replace path separators and special chars with dashes
  safeName = safeName
    .replace(/[\\/]/g, '-')
    .replace(/[^a-zA-Z0-9-_.]/g, '_')
    .toLowerCase();

  // Prefix with build-fix
  return `build-fix-${safeName}`;
}

/**
 * Main POST handler - Run build scan and create requirement files
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { projectPath, buildCommand } = await request.json();

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    console.log('[BuildFixer] Starting build scan for:', projectPath);

    // Detect or use provided build command
    const command = buildCommand || await detectBuildCommand(projectPath);
    console.log('[BuildFixer] Using build command:', command);

    // Execute build command
    const { output, exitCode } = await executeBuildCommand(command, projectPath);
    console.log('[BuildFixer] Build completed with exit code:', exitCode);

    // Parse errors from output
    const allErrors = [
      ...parseTypeScriptErrors(output),
      ...parseESLintErrors(output)
    ];

    const uniqueErrors = deduplicateErrors(allErrors);
    const errors = uniqueErrors.filter(e => e.severity === 'error');
    const warnings = uniqueErrors.filter(e => e.severity === 'warning');

    console.log('[BuildFixer] Found', errors.length, 'errors and', warnings.length, 'warnings');

    if (errors.length === 0) {
      return NextResponse.json<BuildFixerResult>({
        success: true,
        totalErrors: 0,
        totalWarnings: warnings.length,
        requirementFiles: [],
        buildCommand: command,
        executionTime: Date.now() - startTime
      });
    }

    // Create intelligent error groups by directory
    const errorGroups = createIntelligentErrorGroups(errors);

    console.log('[BuildFixer] Created', errorGroups.length, 'error groups');

    // Create requirement files for each group
    const requirementFiles: string[] = [];

    for (const group of errorGroups) {
      const requirementName = generateRequirementName(group.file);
      const content = formatErrorGroup(group);

      const result = await createRequirementFile(projectPath, requirementName, content);

      if (result.success) {
        requirementFiles.push(requirementName);
        const uniqueFiles = [...new Set(group.errors.map(e => e.file))];
        console.log(
          `[BuildFixer] Created requirement: ${requirementName} (${group.errors.length} errors across ${uniqueFiles.length} file${uniqueFiles.length > 1 ? 's' : ''})`
        );
      } else {
        console.error('[BuildFixer] Failed to create requirement:', result.error);
      }
    }

    const executionTime = Date.now() - startTime;

    return NextResponse.json<BuildFixerResult>({
      success: true,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      requirementFiles,
      buildCommand: command,
      executionTime
    });

  } catch (error) {
    console.error('[BuildFixer] Error:', error);
    return NextResponse.json<BuildFixerResult>(
      {
        success: false,
        totalErrors: 0,
        totalWarnings: 0,
        requirementFiles: [],
        buildCommand: '',
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
