/**
 * Modular Scan Adapter Framework - Type Definitions
 *
 * This module defines the core types for the scan adapter system,
 * enabling multi-tech framework support through a plugin architecture.
 */

import { Project } from '@/types';

/**
 * Unified scan result structure returned by all adapters
 */
export interface ScanResult<TData = any> {
  success: boolean;
  error?: string;
  data?: TData;
  warnings?: string[];
  metadata?: {
    scanDuration?: number;
    filesAnalyzed?: number;
    [key: string]: any;
  };
}

/**
 * Decision data structure for user confirmation/rejection
 */
export interface DecisionData {
  type: string;
  title: string;
  description: string;
  count?: number;
  severity?: 'info' | 'warning' | 'error';
  projectId?: string;
  projectPath?: string;
  projectType?: string;
  data?: any;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Context passed to scan adapters for execution
 */
export interface ScanContext {
  project: Project;
  options?: Record<string, any>;
  signal?: AbortSignal; // For cancellable scans
}

/**
 * Core adapter interface that all scan adapters must implement
 */
export interface ScanAdapter<TData = any> {
  /**
   * Unique identifier for this adapter (e.g., 'nextjs-build', 'fastapi-structure')
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Description of what this adapter scans
   */
  readonly description: string;

  /**
   * Supported project types (e.g., ['nextjs'], ['fastapi'], or ['*'] for all)
   */
  readonly supportedTypes: string[];

  /**
   * Scan category (build, structure, contexts, etc.)
   */
  readonly category: ScanCategory;

  /**
   * Priority for this adapter (higher = runs first when multiple adapters match)
   */
  readonly priority?: number;

  /**
   * Check if this adapter can handle the given project
   */
  canHandle(project: Project): boolean;

  /**
   * Execute the scan and return results
   */
  execute(context: ScanContext): Promise<ScanResult<TData>>;

  /**
   * Build decision data from scan results
   */
  buildDecision(result: ScanResult<TData>, project: Project): DecisionData | null;

  /**
   * Optional: Validate adapter configuration
   */
  validate?(): Promise<{ valid: boolean; errors?: string[] }>;
}

/**
 * Scan categories that adapters can belong to
 */
export type ScanCategory =
  | 'build'
  | 'structure'
  | 'contexts'
  | 'dependencies'
  | 'vision'
  | 'photo'
  | 'ideas'
  | 'prototype'
  | 'contribute'
  | 'fix'
  | 'custom';

/**
 * Registry configuration
 */
export interface ScanRegistryConfig {
  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Maximum concurrent scans
   */
  maxConcurrent?: number;

  /**
   * Default timeout for scans (ms)
   */
  defaultTimeout?: number;
}

/**
 * Adapter metadata for registry management
 */
export interface AdapterMetadata {
  adapter: ScanAdapter;
  registeredAt: Date;
  usageCount: number;
  lastUsed: Date | null;
}

/**
 * Result of adapter registration
 */
export interface RegistrationResult {
  success: boolean;
  error?: string;
  adapterId?: string;
}

/**
 * Base adapter configuration
 */
export interface BaseAdapterConfig {
  apiEndpoint?: string;
  timeout?: number;
  retryCount?: number;
  customOptions?: Record<string, any>;
}
