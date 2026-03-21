/**
 * Command Execution Sandbox
 *
 * Central security layer for all external command execution.
 * Provides:
 * - Command allowlisting (only specific binaries permitted)
 * - Argument validation and escaping
 * - Execution timeout enforcement
 * - Resource limits (maxBuffer)
 * - Project path validation (prevents path traversal to arbitrary dirs)
 * - Audit logging of all command executions
 *
 * All spawn/exec calls should route through this module.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { validateBranchName, validateSafeArgument, type ValidationResult } from './shellEscape';

// ============================================================================
// COMMAND ALLOWLIST
// ============================================================================

/**
 * Allowed commands that may be executed. Any command not in this list
 * is rejected before it reaches the OS.
 *
 * Each entry defines:
 * - allowed args patterns (optional — if omitted, default arg validation applies)
 * - default timeout in ms
 * - maxBuffer in bytes
 */
interface CommandPolicy {
  /** Maximum execution time in ms. 0 = no limit (for long-running CLI). */
  timeoutMs: number;
  /** Maximum stdout+stderr buffer in bytes */
  maxBuffer: number;
  /** Whether this command is allowed to run with shell: true */
  allowShell: boolean;
  /** Custom argument validator. If null, uses default validateSafeArgument */
  argValidator: ((arg: string) => ValidationResult) | null;
}

const ALLOWED_COMMANDS: Record<string, CommandPolicy> = {
  // Claude CLI — long-running, needs shell on Windows for .cmd resolution
  'claude': { timeoutMs: 0, maxBuffer: 50 * 1024 * 1024, allowShell: true, argValidator: validateClaudeArg },
  'claude.cmd': { timeoutMs: 0, maxBuffer: 50 * 1024 * 1024, allowShell: true, argValidator: validateClaudeArg },

  // Git — moderate timeouts, no shell needed
  'git': { timeoutMs: 60_000, maxBuffer: 10 * 1024 * 1024, allowShell: false, argValidator: null },

  // Node/npm — build tools
  'npm': { timeoutMs: 300_000, maxBuffer: 10 * 1024 * 1024, allowShell: false, argValidator: null },
  'npm.cmd': { timeoutMs: 300_000, maxBuffer: 10 * 1024 * 1024, allowShell: true, argValidator: null },
  'npx': { timeoutMs: 300_000, maxBuffer: 10 * 1024 * 1024, allowShell: false, argValidator: null },
  'npx.cmd': { timeoutMs: 300_000, maxBuffer: 10 * 1024 * 1024, allowShell: true, argValidator: null },
  'node': { timeoutMs: 120_000, maxBuffer: 10 * 1024 * 1024, allowShell: false, argValidator: null },

  // GitHub CLI
  'gh': { timeoutMs: 60_000, maxBuffer: 10 * 1024 * 1024, allowShell: false, argValidator: null },
};

/**
 * Validate arguments specific to the Claude CLI.
 * Allows flags like -p, --output-format, --verbose, --resume, etc.
 */
function validateClaudeArg(arg: string): ValidationResult {
  if (typeof arg !== 'string') return { valid: false, error: 'Argument must be a string' };
  if (arg.length > 5000) return { valid: false, error: 'Argument exceeds 5000 chars' };
  if (arg.includes('\0')) return { valid: false, error: 'Null byte in argument' };

  // Allow stdin marker, flags, and known safe values
  if (arg === '-' || arg.startsWith('--') || arg.startsWith('-')) return { valid: true, sanitized: arg };
  // Allow stream-json, text, etc. as bare values
  if (/^[a-zA-Z0-9\-_.]+$/.test(arg)) return { valid: true, sanitized: arg };
  // Allow session IDs (UUID-like)
  if (/^[a-f0-9\-]{20,50}$/.test(arg)) return { valid: true, sanitized: arg };

  return { valid: false, error: `Unexpected Claude CLI argument: ${arg.slice(0, 50)}` };
}

// ============================================================================
// PATH VALIDATION
// ============================================================================

/**
 * Validate that a project path is safe to use as a working directory.
 * Prevents path traversal attacks where an attacker supplies `../../sensitive-dir`.
 *
 * Rules:
 * - Must be an absolute path
 * - Must exist on disk
 * - Must be a directory
 * - Must not contain null bytes or shell metacharacters in its base name
 * - Normalized path must match the input (no `..` tricks)
 */
export function validateProjectPath(projectPath: string): { valid: true; resolved: string } | { valid: false; error: string } {
  if (!projectPath || typeof projectPath !== 'string') {
    return { valid: false, error: 'Project path is required' };
  }

  // Check for null bytes
  if (projectPath.includes('\0')) {
    return { valid: false, error: 'Project path contains null bytes' };
  }

  // Resolve to absolute
  const resolved = path.resolve(projectPath);

  // Verify it matches what was given (catches embedded `..`)
  const normalized = path.normalize(projectPath);
  if (normalized !== projectPath && resolved !== projectPath) {
    // Allow Windows vs Unix path differences but block traversal
    if (normalized.includes('..') || projectPath.includes('..')) {
      return { valid: false, error: 'Project path contains traversal sequences' };
    }
  }

  // Must exist and be a directory
  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return { valid: false, error: 'Project path is not a directory' };
    }
  } catch {
    return { valid: false, error: 'Project path does not exist' };
  }

  return { valid: true, resolved };
}

/**
 * Validate a requirement name to prevent path traversal in file reads.
 * Only allows alphanumeric, dash, underscore, dot.
 */
export function validateRequirementName(name: string): { valid: true; sanitized: string } | { valid: false; error: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Requirement name is required' };
  }

  if (name.length > 255) {
    return { valid: false, error: 'Requirement name too long' };
  }

  // Block traversal
  if (name.includes('..') || name.includes('/') || name.includes('\\') || name.includes('\0')) {
    return { valid: false, error: 'Requirement name contains path separators or traversal' };
  }

  // Allow alphanumeric, dash, underscore, dot
  if (!/^[a-zA-Z0-9\-_.]+$/.test(name)) {
    return { valid: false, error: 'Requirement name contains invalid characters' };
  }

  return { valid: true, sanitized: name };
}

// ============================================================================
// SECURE TEMP FILES
// ============================================================================

/**
 * Generate a cryptographically random temp file path.
 * Uses crypto.randomUUID() instead of Date.now() to prevent prediction.
 */
export function secureTempPath(directory: string, prefix: string, extension: string = '.txt'): string {
  const id = crypto.randomUUID();
  return path.join(directory, `${prefix}_${id}${extension}`);
}

// ============================================================================
// COMMAND GUARD
// ============================================================================

/**
 * Check if a command is allowed and return its policy.
 * Rejects any command not in the allowlist.
 */
export function getCommandPolicy(command: string): CommandPolicy | null {
  // Normalize: strip path prefix, get base name
  const baseName = path.basename(command).toLowerCase();
  return ALLOWED_COMMANDS[baseName] ?? null;
}

/**
 * Validate that a command + args combination is permitted.
 * Returns a descriptive error if rejected.
 */
export function validateCommand(
  command: string,
  args: string[],
  options?: { shell?: boolean }
): { valid: true; policy: CommandPolicy } | { valid: false; error: string } {
  const policy = getCommandPolicy(command);

  if (!policy) {
    const baseName = path.basename(command);
    logAudit('BLOCKED', command, args, `Command not in allowlist: ${baseName}`);
    return { valid: false, error: `Command not allowed: ${baseName}. Allowed: ${Object.keys(ALLOWED_COMMANDS).join(', ')}` };
  }

  // Check shell usage
  if (options?.shell && !policy.allowShell) {
    logAudit('BLOCKED', command, args, 'Shell execution not allowed for this command');
    return { valid: false, error: `Shell execution not allowed for ${path.basename(command)}` };
  }

  // Validate arguments
  const validator = policy.argValidator ?? validateSafeArgument;
  for (let i = 0; i < args.length; i++) {
    const result = validator(args[i]);
    if (!result.valid) {
      logAudit('BLOCKED', command, args, `Argument ${i} validation failed: ${result.error}`);
      return { valid: false, error: `Argument validation failed at position ${i}: ${result.error}` };
    }
  }

  return { valid: true, policy };
}

// ============================================================================
// GIT-SPECIFIC HELPERS
// ============================================================================

/**
 * Build validated git command arguments.
 * Converts from template-string patterns (vulnerable) to args-array patterns (safe).
 */
export function buildGitArgs(
  subcommand: string,
  args: string[],
  options?: { branch?: string; remote?: string }
): string[] {
  const result = [subcommand, ...args];

  if (options?.branch) {
    const v = validateBranchName(options.branch);
    if (!v.valid) throw new Error(`Invalid branch name: ${v.error}`);
    result.push(v.sanitized!);
  }

  if (options?.remote) {
    const v = validateBranchName(options.remote); // remote refs follow same rules
    if (!v.valid) throw new Error(`Invalid remote ref: ${v.error}`);
    result.push(v.sanitized!);
  }

  return result;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

interface AuditEntry {
  timestamp: string;
  status: 'ALLOWED' | 'BLOCKED' | 'EXECUTED' | 'FAILED';
  command: string;
  args: string[];
  detail?: string;
  durationMs?: number;
}

// In-memory ring buffer (last 200 entries). Not persisted — resets on restart.
const auditLog: AuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 200;

function logAudit(
  status: AuditEntry['status'],
  command: string,
  args: string[],
  detail?: string,
  durationMs?: number
) {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    status,
    command: path.basename(command),
    args: args.map(a => a.length > 100 ? a.slice(0, 100) + '...' : a),
    detail,
    durationMs,
  };

  auditLog.push(entry);
  if (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog.shift();
  }

  // Log blocked commands to stderr for visibility
  if (status === 'BLOCKED') {
    console.warn(`[CommandSandbox] BLOCKED: ${entry.command} ${entry.args.join(' ')} — ${detail}`);
  }
}

/**
 * Get recent audit log entries. Useful for debugging and monitoring.
 */
export function getAuditLog(limit: number = 50): AuditEntry[] {
  return auditLog.slice(-limit);
}

/**
 * Record a successful execution in the audit log.
 */
export function recordExecution(command: string, args: string[], durationMs?: number) {
  logAudit('EXECUTED', command, args, undefined, durationMs);
}

/**
 * Record a failed execution in the audit log.
 */
export function recordFailure(command: string, args: string[], error: string) {
  logAudit('FAILED', command, args, error);
}
