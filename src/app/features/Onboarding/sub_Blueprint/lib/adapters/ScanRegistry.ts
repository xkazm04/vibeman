/**
 * Modular Scan Adapter Framework - Registry
 *
 * Central registry for managing scan adapters. Supports:
 * - Dynamic adapter registration
 * - Adapter discovery based on project type
 * - Priority-based adapter selection
 * - Usage tracking and metrics
 * - Centralized error handling with consistent error messages
 */

import { Project } from '@/types';
import {
  ScanAdapter,
  ScanCategory,
  AdapterMetadata,
  RegistrationResult,
  ScanRegistryConfig,
  ScanContext,
  ScanResult,
  DecisionData,
} from './types';
import {
  AdapterError,
  AdapterErrorCategory,
  toAdapterError,
  NotFoundError,
  ValidationError,
} from './errors';

export class ScanRegistry {
  private static instance: ScanRegistry | null = null;
  private adapters: Map<string, AdapterMetadata> = new Map();
  private categoryIndex: Map<ScanCategory, Set<string>> = new Map();
  private typeIndex: Map<string, Set<string>> = new Map();
  private config: ScanRegistryConfig;

  private constructor(config?: ScanRegistryConfig) {
    this.config = {
      debug: config?.debug ?? false,
      maxConcurrent: config?.maxConcurrent ?? 5,
      defaultTimeout: config?.defaultTimeout ?? 120000, // 2 minutes
    };

    if (this.config.debug) {
      console.log('[ScanRegistry] Initialized with config:', this.config);
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: ScanRegistryConfig): ScanRegistry {
    if (!ScanRegistry.instance) {
      ScanRegistry.instance = new ScanRegistry(config);
    }
    return ScanRegistry.instance;
  }

  /**
   * Reset singleton (mainly for testing)
   */
  public static reset(): void {
    ScanRegistry.instance = null;
  }

  /**
   * Register a scan adapter
   */
  public register(adapter: ScanAdapter): RegistrationResult {
    try {
      // Validate adapter
      if (!adapter.id || !adapter.name || !adapter.category) {
        return {
          success: false,
          error: 'Adapter must have id, name, and category',
        };
      }

      // Check for duplicate ID
      if (this.adapters.has(adapter.id)) {
        return {
          success: false,
          error: `Adapter with id '${adapter.id}' is already registered`,
        };
      }

      // Create metadata
      const metadata: AdapterMetadata = {
        adapter,
        registeredAt: new Date(),
        usageCount: 0,
        lastUsed: null,
      };

      // Store in main map
      this.adapters.set(adapter.id, metadata);

      // Index by category
      if (!this.categoryIndex.has(adapter.category)) {
        this.categoryIndex.set(adapter.category, new Set());
      }
      this.categoryIndex.get(adapter.category)!.add(adapter.id);

      // Index by supported types
      for (const type of adapter.supportedTypes) {
        if (!this.typeIndex.has(type)) {
          this.typeIndex.set(type, new Set());
        }
        this.typeIndex.get(type)!.add(adapter.id);
      }

      if (this.config.debug) {
        console.log(`[ScanRegistry] ✅ Registered adapter: ${adapter.id} (${adapter.name})`);
      }

      return {
        success: true,
        adapterId: adapter.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Register multiple adapters at once
   */
  public registerMany(adapters: ScanAdapter[]): RegistrationResult[] {
    return adapters.map((adapter) => this.register(adapter));
  }

  /**
   * Unregister an adapter
   */
  public unregister(adapterId: string): boolean {
    const metadata = this.adapters.get(adapterId);
    if (!metadata) return false;

    const { adapter } = metadata;

    // Remove from category index
    this.categoryIndex.get(adapter.category)?.delete(adapterId);

    // Remove from type index
    for (const type of adapter.supportedTypes) {
      this.typeIndex.get(type)?.delete(adapterId);
    }

    // Remove from main map
    this.adapters.delete(adapterId);

    if (this.config.debug) {
      console.log(`[ScanRegistry] ❌ Unregistered adapter: ${adapterId}`);
    }

    return true;
  }

  /**
   * Get adapter by ID
   */
  public getAdapter(adapterId: string): ScanAdapter | null {
    return this.adapters.get(adapterId)?.adapter ?? null;
  }

  /**
   * Find adapters that can handle a specific project
   */
  public findAdapters(project: Project, category?: ScanCategory): ScanAdapter[] {
    const candidates: ScanAdapter[] = [];

    // Filter by category if specified
    const adapterIds = category
      ? Array.from(this.categoryIndex.get(category) ?? [])
      : Array.from(this.adapters.keys());

    for (const id of adapterIds) {
      const metadata = this.adapters.get(id);
      if (!metadata) continue;

      const { adapter } = metadata;

      // Check if adapter can handle this project
      if (adapter.canHandle(project)) {
        candidates.push(adapter);
      }
    }

    // Sort by priority (higher first)
    return candidates.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Get the best adapter for a project and category
   */
  public getBestAdapter(project: Project, category: ScanCategory): ScanAdapter | null {
    const adapters = this.findAdapters(project, category);
    return adapters.length > 0 ? adapters[0] : null;
  }

  /**
   * Execute a scan using the best available adapter
   */
  public async executeScan(
    project: Project,
    category: ScanCategory,
    options?: Record<string, any>
  ): Promise<ScanResult> {
    const adapter = this.getBestAdapter(project, category);

    if (!adapter) {
      const error = new NotFoundError({
        message: `No adapter found for project type '${project.type}' and category '${category}'`,
        resourceType: 'Adapter',
        resourceId: `${project.type}:${category}`,
        adapterId: 'registry',
      });

      return {
        success: false,
        error: error.userMessage,
        metadata: {
          errorCode: error.code,
          errorCategory: error.category,
          recoveryActions: error.recoveryActions,
        },
      };
    }

    return this.executeAdapter(adapter, project, options);
  }

  /**
   * Execute a specific adapter with centralized error handling
   *
   * Error handling features:
   * - Consistent error messages with recovery suggestions
   * - Error categorization for appropriate UI feedback
   * - Detailed metadata for debugging
   */
  public async executeAdapter(
    adapter: ScanAdapter,
    project: Project,
    options?: Record<string, any>
  ): Promise<ScanResult> {
    const metadata = this.adapters.get(adapter.id);
    if (!metadata) {
      const error = new NotFoundError({
        message: `Adapter '${adapter.id}' not found in registry`,
        resourceType: 'Adapter',
        resourceId: adapter.id,
        adapterId: 'registry',
      });

      return {
        success: false,
        error: error.userMessage,
        metadata: {
          errorCode: error.code,
          errorCategory: error.category,
          adapterId: adapter.id,
        },
      };
    }

    // Track usage
    metadata.usageCount++;
    metadata.lastUsed = new Date();

    const startTime = Date.now();

    try {
      const context: ScanContext = { project, options };
      const result = await adapter.execute(context);

      // Add metadata to result
      if (!result.metadata) {
        result.metadata = {};
      }
      result.metadata.scanDuration = Date.now() - startTime;
      result.metadata.adapterId = adapter.id;

      if (this.config.debug) {
        console.log(
          `[ScanRegistry] ✅ Scan completed: ${adapter.id} (${result.metadata.scanDuration}ms)`
        );
      }

      return result;
    } catch (error) {
      const adapterError = toAdapterError(error, adapter.id);

      if (this.config.debug) {
        console.error(`[ScanRegistry] ❌ Scan failed: ${adapter.id}`, adapterError.toLogString());
      }

      return {
        success: false,
        error: adapterError.userMessage,
        metadata: {
          scanDuration: Date.now() - startTime,
          adapterId: adapter.id,
          errorCode: adapterError.code,
          errorCategory: adapterError.category,
          retryable: adapterError.retryable,
          recoveryActions: adapterError.recoveryActions,
        },
      };
    }
  }

  /**
   * Build decision data from scan result using the adapter
   */
  public buildDecision(
    adapterId: string,
    result: ScanResult,
    project: Project
  ): DecisionData | null {
    const adapter = this.getAdapter(adapterId);
    if (!adapter) {
      console.error(`[ScanRegistry] Adapter not found: ${adapterId}`);
      return null;
    }

    return adapter.buildDecision(result, project);
  }

  /**
   * Get all registered adapters
   */
  public getAllAdapters(): ScanAdapter[] {
    return Array.from(this.adapters.values()).map((m) => m.adapter);
  }

  /**
   * Get adapters by category
   */
  public getAdaptersByCategory(category: ScanCategory): ScanAdapter[] {
    const adapterIds = this.categoryIndex.get(category) ?? new Set();
    return Array.from(adapterIds)
      .map((id) => this.adapters.get(id)?.adapter)
      .filter((a): a is ScanAdapter => a !== undefined);
  }

  /**
   * Get registry statistics
   */
  public getStats() {
    const stats = {
      totalAdapters: this.adapters.size,
      adaptersByCategory: {} as Record<ScanCategory, number>,
      adaptersByType: {} as Record<string, number>,
      mostUsed: [] as { id: string; name: string; count: number }[],
    };

    // Count by category
    for (const [category, ids] of this.categoryIndex) {
      stats.adaptersByCategory[category] = ids.size;
    }

    // Count by type
    for (const [type, ids] of this.typeIndex) {
      stats.adaptersByType[type] = ids.size;
    }

    // Most used adapters
    stats.mostUsed = Array.from(this.adapters.entries())
      .map(([id, metadata]) => ({
        id,
        name: metadata.adapter.name,
        count: metadata.usageCount,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Clear all adapters (mainly for testing)
   */
  public clear(): void {
    this.adapters.clear();
    this.categoryIndex.clear();
    this.typeIndex.clear();

    if (this.config.debug) {
      console.log('[ScanRegistry] Cleared all adapters');
    }
  }
}

/**
 * Get the singleton registry instance
 */
export function getScanRegistry(config?: ScanRegistryConfig): ScanRegistry {
  return ScanRegistry.getInstance(config);
}
