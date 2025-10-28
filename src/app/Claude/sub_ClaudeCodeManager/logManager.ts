import * as fs from 'fs';
import * as path from 'path';
import { getClaudeFolderPath } from './folderManager';

/**
 * Log management for Claude Code execution
 * Handles creation and management of execution log files
 */

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
export function ensureLogsDirectory(projectPath: string): string {
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
