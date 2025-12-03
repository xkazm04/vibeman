/**
 * Scan Registry
 * Central registry for scan components
 * Manages registration, discovery, and instantiation of scans
 */

import { BaseScan } from './base/BaseScan';
import {
  ScanConfig,
  ScanComponentDefinition,
  ScanCategory,
  ScanExecutionMode,
} from './base/types';

/**
 * Scan constructor type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScanConstructor = new (config: any) => BaseScan<any, unknown>;

/**
 * Registry entry for a scan
 */
interface ScanRegistryEntry {
  id: string;
  definition: ScanComponentDefinition;
  constructor: ScanConstructor;
}

/**
 * Filter options for querying scans
 */
interface ScanFilterOptions {
  category?: ScanCategory;
  executionMode?: ScanExecutionMode;
  requiresContext?: boolean;
  projectType?: string;
  tags?: string[];
}

/**
 * Singleton registry for scan components
 */
class ScanRegistryImpl {
  private scans = new Map<string, ScanRegistryEntry>();
  private initialized = false;

  /**
   * Register a scan component
   */
  register(ScanClass: ScanConstructor): void {
    // Create a temporary instance to get definition
    const tempConfig = {
      projectId: 'temp',
      projectPath: '/temp',
    };

    const instance = new ScanClass(tempConfig);
    const definition = instance.getDefinition();

    this.scans.set(definition.id, {
      id: definition.id,
      definition,
      constructor: ScanClass,
    });
  }

  /**
   * Get a scan by ID
   */
  get(id: string): ScanRegistryEntry | undefined {
    return this.scans.get(id);
  }

  /**
   * Check if a scan is registered
   */
  has(id: string): boolean {
    return this.scans.has(id);
  }

  /**
   * Get all registered scans
   */
  getAll(): ScanRegistryEntry[] {
    return Array.from(this.scans.values());
  }

  /**
   * Get all scan definitions
   */
  getDefinitions(): ScanComponentDefinition[] {
    return this.getAll().map(entry => entry.definition);
  }

  /**
   * Filter scans by criteria
   */
  filter(options: ScanFilterOptions): ScanRegistryEntry[] {
    return this.getAll().filter(entry => {
      const def = entry.definition;

      if (options.category && def.category !== options.category) {
        return false;
      }

      if (options.executionMode && def.executionMode !== options.executionMode) {
        return false;
      }

      if (options.requiresContext !== undefined && def.requiresContext !== options.requiresContext) {
        return false;
      }

      if (options.projectType) {
        const supports = def.supportedProjectTypes.includes('*') ||
          def.supportedProjectTypes.includes(options.projectType);
        if (!supports) return false;
      }

      if (options.tags && options.tags.length > 0) {
        const hasTags = options.tags.some(tag =>
          def.tags?.includes(tag)
        );
        if (!hasTags) return false;
      }

      return true;
    });
  }

  /**
   * Get scans by category
   */
  getByCategory(category: ScanCategory): ScanRegistryEntry[] {
    return this.filter({ category });
  }

  /**
   * Get project-level scans
   */
  getProjectScans(): ScanRegistryEntry[] {
    return this.filter({ category: 'project' });
  }

  /**
   * Get context-specific scans
   */
  getContextScans(): ScanRegistryEntry[] {
    return this.filter({ category: 'context' });
  }

  /**
   * Get batch scans
   */
  getBatchScans(): ScanRegistryEntry[] {
    return this.filter({ category: 'batch' });
  }

  /**
   * Create a scan instance
   */
  create<TConfig extends ScanConfig>(
    id: string,
    config: TConfig
  ): BaseScan<TConfig, unknown> | null {
    const entry = this.get(id);
    if (!entry) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new entry.constructor(config) as BaseScan<any, unknown>;
  }

  /**
   * Get scans compatible with a project type
   */
  getForProjectType(projectType: string): ScanRegistryEntry[] {
    return this.filter({ projectType });
  }

  /**
   * Clear the registry (useful for testing)
   */
  clear(): void {
    this.scans.clear();
    this.initialized = false;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    byCategory: Record<ScanCategory, number>;
    byExecutionMode: Record<ScanExecutionMode, number>;
  } {
    const entries = this.getAll();

    const byCategory = {
      project: 0,
      context: 0,
      batch: 0,
    };

    const byExecutionMode = {
      'fire-and-forget': 0,
      polling: 0,
      direct: 0,
      streaming: 0,
    };

    entries.forEach(entry => {
      byCategory[entry.definition.category]++;
      byExecutionMode[entry.definition.executionMode]++;
    });

    return {
      total: entries.length,
      byCategory,
      byExecutionMode,
    };
  }

  /**
   * Mark registry as initialized
   */
  markInitialized(): void {
    this.initialized = true;
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Singleton instance
 */
export const ScanRegistry = new ScanRegistryImpl();

/**
 * Decorator for auto-registering scans
 * Usage: @RegisterScan
 */
export function RegisterScan(target: ScanConstructor): void {
  ScanRegistry.register(target);
}
