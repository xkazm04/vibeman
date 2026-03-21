/**
 * Tauri IPC Bridge
 *
 * Provides a unified interface for calling Tauri commands from the frontend.
 * When running in a browser (non-Tauri), falls back to the existing Next.js API routes.
 * This allows gradual migration: each route can be switched from HTTP to IPC independently.
 */

// Detect if we're running inside Tauri
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Invoke a Tauri command if available, otherwise fall back to HTTP fetch.
 * This is the core migration helper - routes can be switched one at a time.
 */
export async function tauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauri()) {
    throw new Error(`Tauri not available for command: ${command}`);
  }

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

/**
 * Hybrid fetch: tries Tauri command first, falls back to HTTP API.
 * Use this during migration to transparently switch backends.
 *
 * @param tauriCommand - The Tauri command name (e.g., 'get_app_info')
 * @param apiPath - The fallback API path (e.g., '/api/health')
 * @param args - Arguments for the Tauri command
 * @param fetchOptions - Options for the fallback fetch call
 */
export async function hybridFetch<T>(
  tauriCommand: string | null,
  apiPath: string,
  args?: Record<string, unknown>,
  fetchOptions?: RequestInit,
): Promise<T> {
  // If Tauri is available and we have a command mapped, use IPC
  if (tauriCommand && isTauri()) {
    try {
      return await tauriInvoke<T>(tauriCommand, args);
    } catch (err) {
      console.warn(`Tauri command ${tauriCommand} failed, falling back to HTTP:`, err);
    }
  }

  // Fallback to HTTP API
  const response = await fetch(apiPath, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

/**
 * Listen to Tauri events (for streaming data from Rust backend).
 * Falls back to SSE/EventSource for non-Tauri environments.
 */
export async function tauriListen(
  event: string,
  callback: (payload: unknown) => void,
): Promise<() => void> {
  if (!isTauri()) {
    throw new Error(`Tauri not available for event: ${event}`);
  }

  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen(event, (e) => callback(e.payload));
  return unlisten;
}
