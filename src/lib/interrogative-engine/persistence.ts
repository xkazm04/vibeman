/**
 * Item Persistence Implementations
 *
 * Ready-made persistence backends for common storage patterns.
 */

import type { InterrogativeItem, ItemPersistence, ItemStatus } from './types';

// ============================================================================
// IN-MEMORY PERSISTENCE
// ============================================================================

/**
 * In-memory persistence for transient items (e.g. DecisionQueue).
 */
export class InMemoryItemPersistence<T extends InterrogativeItem>
  implements ItemPersistence<T>
{
  private store = new Map<string, T>();

  getAll(): T[] {
    return Array.from(this.store.values());
  }

  getById(id: string): T | null {
    return this.store.get(id) ?? null;
  }

  save(item: T): void {
    this.store.set(item.id, item);
  }

  updateStatus(id: string, status: ItemStatus): void {
    const item = this.store.get(id);
    if (item) {
      this.store.set(id, { ...item, status });
    }
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  clear(): void {
    this.store.clear();
  }
}

// ============================================================================
// API PERSISTENCE
// ============================================================================

export interface ApiItemPersistenceConfig<T extends InterrogativeItem> {
  /** Base URL for CRUD operations */
  baseUrl: string;
  /** Transform API response list into items */
  parseList: (data: unknown) => T[];
  /** Transform API response into a single item */
  parseSingle?: (data: unknown) => T | null;
  /** Query params for list fetches */
  queryParams?: Record<string, string>;
  /** Map ItemStatus to the domain-specific status string sent to API */
  statusMapper?: (status: ItemStatus) => string;
}

/**
 * REST API persistence for items stored in a database.
 * Used by Questions, Directions, Ideas, Proposals, etc.
 */
export class ApiItemPersistence<T extends InterrogativeItem>
  implements ItemPersistence<T>
{
  constructor(private readonly apiConfig: ApiItemPersistenceConfig<T>) {}

  async getAll(): Promise<T[]> {
    const params = this.apiConfig.queryParams
      ? '?' + new URLSearchParams(this.apiConfig.queryParams).toString()
      : '';

    const response = await fetch(`${this.apiConfig.baseUrl}${params}`);
    if (!response.ok) return [];
    const data = await response.json();
    return this.apiConfig.parseList(data);
  }

  async getById(id: string): Promise<T | null> {
    const response = await fetch(`${this.apiConfig.baseUrl}/${id}`);
    if (!response.ok) return null;
    const data = await response.json();
    return this.apiConfig.parseSingle?.(data) ?? (data as T);
  }

  async save(item: T): Promise<void> {
    await fetch(this.apiConfig.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  }

  async updateStatus(id: string, status: ItemStatus): Promise<void> {
    const mappedStatus = this.apiConfig.statusMapper?.(status) ?? status;
    await fetch(`${this.apiConfig.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: mappedStatus }),
    });
  }

  async delete(id: string): Promise<boolean> {
    const response = await fetch(`${this.apiConfig.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    return response.ok;
  }
}
