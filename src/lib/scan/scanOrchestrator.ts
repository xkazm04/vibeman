/**
 * Scan Orchestrator
 *
 * Unified coordinator for all scan types.
 * Routes scan requests to appropriate strategy and manages execution.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ScanConfig,
  ScanResult,
  ScanRepository,
  ScanEventListener,
  ScanEvent,
  SupportedProvider,
} from './types';
import { ScanError } from './types';
import { BaseScanStrategy } from './strategies/baseScanStrategy';
import { AgentScanStrategy } from './strategies/agentScanStrategy';
import { StructureScanStrategy } from './strategies/structureScanStrategy';
import type { FileGatherer } from './types';

/**
 * Main orchestrator for unified scanning.
 * Routes to correct strategy based on scanCategory.
 */
export class ScanOrchestrator {
  private strategies = new Map<string, BaseScanStrategy>();
  private repository?: ScanRepository;
  private fileGatherer?: FileGatherer;
  private progressListeners = new Map<string, ScanEventListener[]>();

  constructor(fileGatherer?: FileGatherer, repository?: ScanRepository) {
    this.fileGatherer = fileGatherer;
    this.repository = repository;

    // Register default strategies
    this.registerStrategy('agent', new AgentScanStrategy(fileGatherer, repository));
    this.registerStrategy('structure', new StructureScanStrategy(fileGatherer, repository));
  }

  /**
   * Register a custom scan strategy.
   */
  registerStrategy(key: string, strategy: BaseScanStrategy): void {
    this.strategies.set(key, strategy);
  }

  /**
   * Execute a single scan.
   */
  async execute(config: ScanConfig): Promise<ScanResult> {
    const strategy = this.strategies.get(config.scanCategory);
    if (!strategy) {
      throw new Error(`No strategy registered for scan category: ${config.scanCategory}`);
    }

    // Subscribe to events if listeners registered
    const listeners = this.progressListeners.get(config.projectId) || [];
    for (const listener of listeners) {
      strategy.onEvent(listener);
    }

    return strategy.scan(config);
  }

  /**
   * Execute multiple scans in parallel.
   */
  async executeParallel(configs: ScanConfig[]): Promise<ScanResult[]> {
    return Promise.all(configs.map(config => this.execute(config)));
  }

  /**
   * Subscribe to scan progress events for a project.
   */
  onProgress(projectId: string, listener: ScanEventListener): () => void {
    if (!this.progressListeners.has(projectId)) {
      this.progressListeners.set(projectId, []);
    }

    const listeners = this.progressListeners.get(projectId)!;
    listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    };
  }

  /**
   * Execute a full scan plan (Ideas + Structure).
   * Useful for comprehensive codebase analysis.
   */
  async executeFullScan(
    projectId: string,
    projectPath: string,
    projectType?: string,
    agentPersona?: string,
    provider?: string
  ): Promise<ScanResult[]> {
    const configs: ScanConfig[] = [];

    // Structure scan (if project type known)
    if (projectType) {
      configs.push({
        projectId,
        projectPath,
        projectType: projectType as any,
        scanCategory: 'structure',
        provider: provider as SupportedProvider | undefined,
      });
    }

    // Agent scan (if persona specified)
    if (agentPersona) {
      configs.push({
        projectId,
        projectPath,
        projectType: projectType as any,
        scanCategory: 'agent',
        scanType: agentPersona,
        provider: provider as SupportedProvider | undefined,
      });
    }

    return this.executeParallel(configs);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────────────────

let orchestratorInstance: ScanOrchestrator | null = null;

/**
 * Get the global scan orchestrator instance.
 */
export function getScanOrchestrator(): ScanOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new ScanOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * Initialize the orchestrator with custom dependencies.
 */
export function initializeScanOrchestrator(
  fileGatherer?: FileGatherer,
  repository?: ScanRepository
): ScanOrchestrator {
  orchestratorInstance = new ScanOrchestrator(fileGatherer, repository);
  return orchestratorInstance;
}
