/**
 * Typed Tauri command wrappers
 *
 * Each function here maps to a #[tauri::command] in src-tauri/src/commands/.
 * As routes are migrated from Next.js API to Tauri, add typed wrappers here.
 */

import { tauriInvoke, isTauri } from './bridge';

// ============================================================================
// System commands (Phase 1)
// ============================================================================

export interface AppInfo {
  version: string;
  started_at: string;
  uptime_seconds: number;
  platform: string;
  arch: string;
}

export async function getAppInfo(): Promise<AppInfo> {
  return tauriInvoke<AppInfo>('get_app_info');
}

export async function greet(name: string): Promise<string> {
  return tauriInvoke<string>('greet', { name });
}

// ============================================================================
// Process management commands (Phase 2-3)
// ============================================================================

export interface SpawnCliArgs {
  program: string;
  cwd: string;
  prompt?: string;
  args?: string[];
  env?: Record<string, string>;
  session_id?: string;
  project_id?: string;
  provider?: string;
  timeout_secs?: number;
}

export interface SpawnResult {
  session_id: string;
  pid: number;
}

export type ProcessStatus =
  | 'Running'
  | { Completed: { exit_code: number } }
  | { Failed: { error: string } }
  | 'Killed'
  | 'TimedOut';

export async function spawnCli(args: SpawnCliArgs): Promise<SpawnResult> {
  return tauriInvoke<SpawnResult>('spawn_cli', { args });
}

export async function killProcess(sessionId: string): Promise<void> {
  return tauriInvoke<void>('kill_process', { sessionId });
}

export async function processStatus(sessionId: string): Promise<ProcessStatus | null> {
  return tauriInvoke<ProcessStatus | null>('process_status', { sessionId });
}

export async function listProcesses(): Promise<Array<[string, number, ProcessStatus]>> {
  return tauriInvoke<Array<[string, number, ProcessStatus]>>('list_processes');
}

// ============================================================================
// Filesystem commands (Phase 2-4)
// ============================================================================

export interface ScannedFile {
  path: string;
  relative_path: string;
  name: string;
  extension: string | null;
  size: number;
  is_dir: boolean;
}

export interface ScanDirectoryArgs {
  path: string;
  extensions?: string[];
  ignore?: string[];
}

export async function scanDirectory(args: ScanDirectoryArgs): Promise<ScannedFile[]> {
  return tauriInvoke<ScannedFile[]>('scan_directory', { args });
}

export async function readFile(path: string): Promise<string> {
  return tauriInvoke<string>('read_file', { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return tauriInvoke<void>('write_file', { path, content });
}

// ============================================================================
// Database commands (Phase 2-5)
// ============================================================================

export async function dbQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  return tauriInvoke<T[]>('db_query', { sql, params });
}

export async function dbExecute(
  sql: string,
  params?: unknown[],
): Promise<{ changes: number }> {
  return tauriInvoke<{ changes: number }>('db_execute', { sql, params });
}

export interface DbHealth {
  status: string;
  path: string;
  table_count: number;
}

export async function dbHealth(): Promise<DbHealth> {
  return tauriInvoke<DbHealth>('db_health');
}

// Re-export detection helper
export { isTauri };
