/**
 * Persistence Strategy Implementations
 *
 * Ready-made persistence backends for common storage patterns:
 * - InMemoryPersistence: Map-based (Terminal sessions)
 * - ApiPersistence: REST API-backed (Claude Code, Automation, Remote Device)
 */

import type { BaseSession, PersistenceStrategy } from './types';

// ============================================================================
// IN-MEMORY PERSISTENCE
// ============================================================================

/**
 * In-memory Map persistence.
 * Used by terminal sessions and any subsystem that doesn't need durable storage.
 */
export class InMemoryPersistence<T extends BaseSession>
  implements PersistenceStrategy<T>
{
  private store = new Map<string, T>();

  getAll(): T[] {
    return Array.from(this.store.values());
  }

  getById(id: string): T | null {
    return this.store.get(id) ?? null;
  }

  save(session: T): void {
    this.store.set(session.id, session);
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  updateHeartbeat(id: string): void {
    const session = this.store.get(id);
    if (session) {
      this.store.set(id, { ...session, updatedAt: Date.now() });
    }
  }

  /** Direct access for migration / advanced use cases */
  getStore(): Map<string, T> {
    return this.store;
  }
}

// ============================================================================
// API PERSISTENCE
// ============================================================================

/**
 * Configuration for API-backed persistence.
 * Maps CRUD operations to REST endpoints.
 */
export interface ApiPersistenceConfig<T extends BaseSession> {
  /** Base URL for API calls (e.g. '/api/claude-code/sessions') */
  baseUrl: string;

  /** Transform API response into session objects */
  parseResponse: (data: unknown) => T[];

  /** Transform single API response into a session object */
  parseSingle?: (data: unknown) => T | null;

  /** Heartbeat endpoint (POST). Default: `${baseUrl}/heartbeat` */
  heartbeatUrl?: string;

  /** Query params to append to GET requests */
  queryParams?: Record<string, string>;
}

/**
 * REST API persistence.
 * Used by Claude Code sessions, Automation sessions, and Remote Device sessions.
 */
export class ApiPersistence<T extends BaseSession>
  implements PersistenceStrategy<T>
{
  constructor(private readonly apiConfig: ApiPersistenceConfig<T>) {}

  async getAll(): Promise<T[]> {
    const params = this.apiConfig.queryParams
      ? '?' + new URLSearchParams(this.apiConfig.queryParams).toString()
      : '';

    const response = await fetch(`${this.apiConfig.baseUrl}${params}`);
    if (!response.ok) return [];
    const data = await response.json();
    return this.apiConfig.parseResponse(data);
  }

  async getById(id: string): Promise<T | null> {
    const response = await fetch(`${this.apiConfig.baseUrl}/${id}`);
    if (!response.ok) return null;
    const data = await response.json();
    return this.apiConfig.parseSingle
      ? this.apiConfig.parseSingle(data)
      : (data as T);
  }

  async save(session: T): Promise<void> {
    await fetch(this.apiConfig.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
  }

  async delete(id: string): Promise<boolean> {
    const response = await fetch(`${this.apiConfig.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    return response.ok;
  }

  async updateHeartbeat(id: string): Promise<void> {
    const url =
      this.apiConfig.heartbeatUrl ?? `${this.apiConfig.baseUrl}/heartbeat`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: id }),
    });
  }
}
