/**
 * ScanStrategyFactory
 *
 * Factory for creating and managing scan strategies.
 * Automatically selects the appropriate strategy based on project type.
 */

import type { ScanStrategy, ProjectType, ScanStrategyMetadata } from './ScanStrategy';
import { NextJSScanStrategy } from './strategies/NextJSScanStrategy';
import { FastAPIScanStrategy } from './strategies/FastAPIScanStrategy';
import { ExpressScanStrategy } from './strategies/ExpressScanStrategy';
import { ReactNativeScanStrategy } from './strategies/ReactNativeScanStrategy';

/**
 * Registry of all available scan strategies
 */
const STRATEGY_REGISTRY: ScanStrategyMetadata[] = [
  {
    name: 'Next.js Scanner',
    techStack: 'nextjs',
    description: 'Scanner for Next.js applications with App Router and Pages Router support',
    strategyClass: NextJSScanStrategy,
  },
  {
    name: 'FastAPI Scanner',
    techStack: 'fastapi',
    description: 'Scanner for FastAPI Python applications',
    strategyClass: FastAPIScanStrategy,
  },
  {
    name: 'Express.js Scanner',
    techStack: 'express',
    description: 'Scanner for Express.js Node.js applications',
    strategyClass: ExpressScanStrategy,
  },
  {
    name: 'React Native Scanner',
    techStack: 'react-native',
    description: 'Scanner for React Native mobile applications',
    strategyClass: ReactNativeScanStrategy,
  },
];

/**
 * ScanStrategyFactory - creates and manages scan strategies
 */
export class ScanStrategyFactory {
  private static strategies = new Map<ProjectType, ScanStrategy>();

  /**
   * Get all registered strategies
   */
  static getAllStrategies(): ScanStrategyMetadata[] {
    return [...STRATEGY_REGISTRY];
  }

  /**
   * Get strategy by project type
   */
  static getStrategy(projectType: ProjectType): ScanStrategy {
    // Return cached strategy if available
    if (this.strategies.has(projectType)) {
      return this.strategies.get(projectType)!;
    }

    // Find and instantiate strategy
    const metadata = STRATEGY_REGISTRY.find(s => s.techStack === projectType);
    if (!metadata) {
      throw new Error(`No scan strategy found for project type: ${projectType}`);
    }

    const strategy = new metadata.strategyClass();
    this.strategies.set(projectType, strategy);
    return strategy;
  }

  /**
   * Auto-detect and get appropriate strategy for a project
   */
  static async detectStrategy(
    projectPath: string,
    explicitType?: ProjectType
  ): Promise<ScanStrategy> {
    // If explicit type provided, use it
    if (explicitType && explicitType !== 'other') {
      return this.getStrategy(explicitType);
    }

    // Try to auto-detect by checking each strategy
    for (const metadata of STRATEGY_REGISTRY) {
      const strategy = new metadata.strategyClass();
      const canHandle = await strategy.canHandle(projectPath, explicitType);
      if (canHandle) {
        this.strategies.set(metadata.techStack, strategy);
        return strategy;
      }
    }

    // Default to Next.js strategy if nothing detected
    console.warn(
      `Could not detect project type for ${projectPath}, defaulting to Next.js strategy`
    );
    return this.getStrategy('nextjs');
  }

  /**
   * Register a custom strategy
   */
  static registerStrategy(metadata: ScanStrategyMetadata): void {
    // Check if strategy already exists
    const existing = STRATEGY_REGISTRY.find(s => s.techStack === metadata.techStack);
    if (existing) {
      console.warn(
        `Strategy for ${metadata.techStack} already exists. Overwriting.`
      );
      STRATEGY_REGISTRY.splice(STRATEGY_REGISTRY.indexOf(existing), 1);
    }

    STRATEGY_REGISTRY.push(metadata);
    // Clear cached instance if exists
    this.strategies.delete(metadata.techStack);
  }

  /**
   * Clear strategy cache
   */
  static clearCache(): void {
    this.strategies.clear();
  }

  /**
   * Get strategy metadata by tech stack
   */
  static getStrategyMetadata(projectType: ProjectType): ScanStrategyMetadata | null {
    return STRATEGY_REGISTRY.find(s => s.techStack === projectType) || null;
  }
}

/**
 * Export convenience functions
 */

/**
 * Get scan strategy for a project
 */
export async function getScanStrategy(
  projectPath: string,
  projectType?: ProjectType
): Promise<ScanStrategy> {
  return ScanStrategyFactory.detectStrategy(projectPath, projectType);
}

/**
 * Get all available strategies
 */
export function getAllScanStrategies(): ScanStrategyMetadata[] {
  return ScanStrategyFactory.getAllStrategies();
}

/**
 * Register a custom scan strategy
 */
export function registerScanStrategy(metadata: ScanStrategyMetadata): void {
  ScanStrategyFactory.registerStrategy(metadata);
}

// Export types
export type { ScanStrategy, ProjectType, ScanStrategyMetadata } from './ScanStrategy';
