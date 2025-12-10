import { spawn, execFile } from 'child_process';
import { validateArgs, validateSafeArgument, type ValidationResult } from './shellEscape';

/**
 * Result from a command execution
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Options for command execution
 */
export interface CommandOptions {
  /** Working directory for the command */
  cwd: string;
  /**
   * Use shell to run the command (default: false for security)
   * WARNING: Setting this to true can enable command injection attacks.
   * Only use shell: true when absolutely necessary and ensure all arguments
   * are properly validated.
   */
  shell?: boolean;
  /** Timeout in milliseconds (default: no timeout) */
  timeout?: number;
  /** Number of retry attempts on failure (default: 0) */
  retries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Accept non-zero exit codes without throwing (default: false) */
  acceptNonZero?: boolean;
  /** Environment variables to set/override */
  env?: Record<string, string>;
  /**
   * Custom argument validator function (default: validateSafeArgument)
   * Set to null to skip argument validation (use with caution)
   */
  argValidator?: ((arg: string) => ValidationResult) | null;
}

/**
 * Error thrown when a command execution fails
 */
export class CommandExecutionError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly args: string[],
    public readonly result: CommandResult
  ) {
    super(message);
    this.name = 'CommandExecutionError';
  }
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a single command attempt using execFile (safer, no shell by default)
 */
function executeOnceSecure(
  command: string,
  args: string[],
  options: CommandOptions
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    // Use execFile for security - it doesn't spawn a shell by default
    const proc = execFile(command, args, {
      cwd: options.cwd,
      env: options.env ? { ...process.env, ...options.env } : process.env,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: options.timeout
    }, (error, stdout, stderr) => {
      if (error && 'killed' in error && error.killed) {
        reject(new Error(`Command timed out after ${options.timeout}ms`));
        return;
      }

      // execFile callback receives the exit code in the error object
      const exitCode = error ? (error as NodeJS.ErrnoException & { code?: number }).code ?? 1 : 0;

      resolve({
        stdout: stdout?.toString() ?? '',
        stderr: stderr?.toString() ?? '',
        exitCode: typeof exitCode === 'number' ? exitCode : 1
      });
    });

    // Handle spawn errors (command not found, etc.)
    proc.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Execute a single command attempt using spawn with shell
 * WARNING: Only use this when shell: true is explicitly required
 */
function executeOnceWithShell(
  command: string,
  args: string[],
  options: CommandOptions
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: options.cwd,
      shell: true,
      env: options.env ? { ...process.env, ...options.env } : process.env
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let timeoutHandle: NodeJS.Timeout | undefined;

    if (options.timeout && options.timeout > 0) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
      }, options.timeout);
    }

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (timedOut) {
        reject(new Error(`Command timed out after ${options.timeout}ms`));
        return;
      }

      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 0
      });
    });

    proc.on('error', (error) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      reject(error);
    });
  });
}

/**
 * Execute a single command attempt
 * Uses execFile by default (safer), falls back to spawn with shell only when explicitly requested
 */
function executeOnce(
  command: string,
  args: string[],
  options: CommandOptions
): Promise<CommandResult> {
  // Default to secure execution (no shell)
  if (options.shell === true) {
    return executeOnceWithShell(command, args, options);
  }
  return executeOnceSecure(command, args, options);
}

/**
 * Execute a shell command with standardized error handling, retries, and output parsing.
 *
 * @param command - The command to execute (e.g., 'npm', 'git', 'gh')
 * @param args - Arguments to pass to the command
 * @param options - Execution options
 * @returns Promise resolving to the command result
 * @throws CommandExecutionError if command fails and acceptNonZero is false
 *
 * @example
 * // Simple execution
 * const result = await executeCommand('npm', ['install'], { cwd: '/path/to/project' });
 *
 * @example
 * // With retries for flaky commands
 * const result = await executeCommand('npm', ['ci'], {
 *   cwd: '/path/to/project',
 *   retries: 3,
 *   retryDelay: 2000
 * });
 *
 * @example
 * // Accept non-zero exit codes (e.g., npm audit returns non-zero when vulnerabilities found)
 * const result = await executeCommand('npm', ['audit', '--json'], {
 *   cwd: '/path/to/project',
 *   acceptNonZero: true
 * });
 */
export async function executeCommand(
  command: string,
  args: string[],
  options: CommandOptions
): Promise<CommandResult> {
  const maxAttempts = (options.retries ?? 0) + 1;
  const retryDelay = options.retryDelay ?? 1000;

  // Validate arguments unless validation is explicitly disabled
  // When shell: false (default), arguments are passed directly to execFile
  // which provides some protection, but we still validate for defense in depth
  if (options.argValidator !== null) {
    const validator = options.argValidator ?? validateSafeArgument;
    const validation = validateArgs(args, validator);
    if (!validation.valid) {
      throw new CommandExecutionError(
        `Argument validation failed: ${validation.errors.join('; ')}`,
        command,
        args,
        { stdout: '', stderr: validation.errors.join('\n'), exitCode: -1 }
      );
    }
  }

  let lastError: Error | undefined;
  let lastResult: CommandResult | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await executeOnce(command, args, options);
      lastResult = result;

      // If exit code is non-zero and we don't accept it, treat as failure
      if (result.exitCode !== 0 && !options.acceptNonZero) {
        throw new CommandExecutionError(
          `Command '${command} ${args.join(' ')}' failed with exit code ${result.exitCode}`,
          command,
          args,
          result
        );
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this was the last attempt, don't sleep
      if (attempt < maxAttempts) {
        await sleep(retryDelay);
      }
    }
  }

  // All attempts failed
  if (lastResult) {
    throw new CommandExecutionError(
      `Command '${command} ${args.join(' ')}' failed after ${maxAttempts} attempts`,
      command,
      args,
      lastResult
    );
  }

  throw lastError ?? new Error(`Command '${command} ${args.join(' ')}' failed unexpectedly`);
}

/**
 * Execute a command and measure its duration.
 * Useful for test/build commands where timing is important.
 *
 * @param command - The command to execute
 * @param args - Arguments to pass to the command
 * @param options - Execution options
 * @returns Promise with result and duration in milliseconds
 */
export async function executeCommandWithTiming(
  command: string,
  args: string[],
  options: CommandOptions
): Promise<CommandResult & { duration: number }> {
  const startTime = Date.now();
  const result = await executeCommand(command, args, { ...options, acceptNonZero: true });
  const duration = Date.now() - startTime;

  return { ...result, duration };
}

/**
 * Execute a command and parse the output as JSON.
 *
 * @param command - The command to execute
 * @param args - Arguments to pass to the command
 * @param options - Execution options
 * @returns Promise with parsed JSON output
 * @throws Error if JSON parsing fails
 */
export async function executeCommandWithJsonOutput<T>(
  command: string,
  args: string[],
  options: CommandOptions
): Promise<{ data: T; result: CommandResult }> {
  const result = await executeCommand(command, args, options);

  try {
    const data = JSON.parse(result.stdout) as T;
    return { data, result };
  } catch (parseError) {
    throw new Error(
      `Failed to parse JSON output from '${command} ${args.join(' ')}': ${parseError}`
    );
  }
}
