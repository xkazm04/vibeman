/**
 * Analyzer Components Index
 * Exports all analyzer components and registry with project type filtering
 */

import { ProjectType, AnalyzerCategory, AnalyzerProjectMetadata } from '../../types';

// Export all analyzers
export * from './ConsoleAnalyzer';
export * from './AnyTypesAnalyzer';
export * from './UnusedImportsAnalyzer';
export * from './LargeFilesAnalyzer';
export * from './LongFunctionsAnalyzer';
export * from './ComplexityAnalyzer';
export * from './DuplicationAnalyzer';
export * from './MagicNumbersAnalyzer';
export * from './ReactHooksAnalyzer';
export * from './ImplementationPlanAnalyzer';
export * from './IdeaGeneratorAnalyzer';

// Export FastAPI analyzers
export * from './fastapi';

// Component registry imports
import { ConsoleAnalyzer } from './ConsoleAnalyzer';
import { AnyTypesAnalyzer } from './AnyTypesAnalyzer';
import { UnusedImportsAnalyzer } from './UnusedImportsAnalyzer';
import { LargeFilesAnalyzer } from './LargeFilesAnalyzer';
import { LongFunctionsAnalyzer } from './LongFunctionsAnalyzer';
import { ComplexityAnalyzer } from './ComplexityAnalyzer';
import { DuplicationAnalyzer } from './DuplicationAnalyzer';
import { MagicNumbersAnalyzer } from './MagicNumbersAnalyzer';
import { ReactHooksAnalyzer } from './ReactHooksAnalyzer';
import { ImplementationPlanAnalyzer } from './ImplementationPlanAnalyzer';
import { IdeaGeneratorAnalyzer } from './IdeaGeneratorAnalyzer';

// FastAPI analyzer imports
import { FASTAPI_ANALYZER_REGISTRY } from './fastapi';

/**
 * Combined Analyzer Registry
 * Maps analyzer IDs to their implementations
 */
export const ANALYZER_REGISTRY = {
  // JavaScript/TypeScript analyzers
  'analyzer.console': ConsoleAnalyzer,
  'analyzer.any-types': AnyTypesAnalyzer,
  'analyzer.unused-imports': UnusedImportsAnalyzer,
  'analyzer.large-files': LargeFilesAnalyzer,
  'analyzer.long-functions': LongFunctionsAnalyzer,
  'analyzer.complexity': ComplexityAnalyzer,
  'analyzer.duplication': DuplicationAnalyzer,
  'analyzer.magic-numbers': MagicNumbersAnalyzer,
  'analyzer.react-hooks': ReactHooksAnalyzer,

  // Business analyzers (LLM-based)
  'analyzer.implementation-plan': ImplementationPlanAnalyzer,
  'analyzer.idea-generator': IdeaGeneratorAnalyzer,

  // FastAPI analyzers
  ...FASTAPI_ANALYZER_REGISTRY,
} as const;

export type AnalyzerId = keyof typeof ANALYZER_REGISTRY;

/**
 * Create an analyzer instance by ID
 */
export function createAnalyzer(id: AnalyzerId): InstanceType<typeof ANALYZER_REGISTRY[AnalyzerId]> {
  const AnalyzerClass = ANALYZER_REGISTRY[id];
  if (!AnalyzerClass) {
    throw new Error(`Unknown analyzer: ${id}`);
  }
  return new AnalyzerClass();
}

/**
 * Get all available analyzer IDs
 */
export function getAnalyzerIds(): AnalyzerId[] {
  return Object.keys(ANALYZER_REGISTRY) as AnalyzerId[];
}

/**
 * Get analyzer metadata for UI display
 */
export function getAnalyzerMetadata(id: AnalyzerId) {
  const instance = createAnalyzer(id);
  const metadata = (instance as { projectMetadata?: AnalyzerProjectMetadata }).projectMetadata;

  return {
    id: instance.id,
    name: instance.name,
    description: instance.description,
    configSchema: instance.getConfigSchema(),
    defaultConfig: instance.getDefaultConfig(),
    outputTypes: instance.getOutputTypes(),
    projectMetadata: metadata,
  };
}

// ============================================================================
// Project Type Filtering Helpers
// ============================================================================

/**
 * Get analyzers that support a specific project type
 *
 * @example
 * const nextjsAnalyzers = getAnalyzersForProjectType('nextjs');
 * const fastapiAnalyzers = getAnalyzersForProjectType('fastapi');
 */
export function getAnalyzersForProjectType(projectType: ProjectType | string): AnalyzerId[] {
  const ids = getAnalyzerIds();

  return ids.filter(id => {
    const instance = createAnalyzer(id);
    const metadata = (instance as { projectMetadata?: AnalyzerProjectMetadata }).projectMetadata;

    if (!metadata) return false;

    // 'all' means supports all project types
    if (metadata.supportedProjectTypes === 'all') return true;

    return metadata.supportedProjectTypes.includes(projectType as ProjectType);
  });
}

/**
 * Get analyzers by category (technical or business)
 *
 * @example
 * const technicalAnalyzers = getAnalyzersByCategory('technical');
 * const businessAnalyzers = getAnalyzersByCategory('business');
 */
export function getAnalyzersByCategory(category: AnalyzerCategory): AnalyzerId[] {
  const ids = getAnalyzerIds();

  return ids.filter(id => {
    const instance = createAnalyzer(id);
    const metadata = (instance as { projectMetadata?: AnalyzerProjectMetadata }).projectMetadata;

    if (!metadata) return false;

    return metadata.category === category;
  });
}

/**
 * Get analyzers filtered by both project type and category
 *
 * @example
 * const nextjsTechnical = getFilteredAnalyzers('nextjs', 'technical');
 * const allBusiness = getFilteredAnalyzers(undefined, 'business');
 */
export function getFilteredAnalyzers(
  projectType?: ProjectType | string,
  category?: AnalyzerCategory
): AnalyzerId[] {
  let ids = getAnalyzerIds();

  if (projectType) {
    ids = ids.filter(id => {
      const instance = createAnalyzer(id);
      const metadata = (instance as { projectMetadata?: AnalyzerProjectMetadata }).projectMetadata;

      if (!metadata) return false;
      if (metadata.supportedProjectTypes === 'all') return true;
      return metadata.supportedProjectTypes.includes(projectType as ProjectType);
    });
  }

  if (category) {
    ids = ids.filter(id => {
      const instance = createAnalyzer(id);
      const metadata = (instance as { projectMetadata?: AnalyzerProjectMetadata }).projectMetadata;

      if (!metadata) return false;
      return metadata.category === category;
    });
  }

  return ids;
}

/**
 * Get analyzers by tag
 *
 * @example
 * const codeQualityAnalyzers = getAnalyzersByTag('code-quality');
 * const reactAnalyzers = getAnalyzersByTag('react');
 */
export function getAnalyzersByTag(tag: string): AnalyzerId[] {
  const ids = getAnalyzerIds();

  return ids.filter(id => {
    const instance = createAnalyzer(id);
    const metadata = (instance as { projectMetadata?: AnalyzerProjectMetadata }).projectMetadata;

    if (!metadata?.tags) return false;

    return metadata.tags.includes(tag);
  });
}

/**
 * Get all unique tags from all analyzers
 */
export function getAllAnalyzerTags(): string[] {
  const tags = new Set<string>();
  const ids = getAnalyzerIds();

  for (const id of ids) {
    const instance = createAnalyzer(id);
    const metadata = (instance as { projectMetadata?: AnalyzerProjectMetadata }).projectMetadata;

    if (metadata?.tags) {
      metadata.tags.forEach(tag => tags.add(tag));
    }
  }

  return Array.from(tags).sort();
}

/**
 * Get summary of analyzers by project type
 */
export function getAnalyzerSummaryByProjectType(): Record<string, { technical: number; business: number; total: number }> {
  const projectTypes: (ProjectType | 'all')[] = ['nextjs', 'fastapi', 'express', 'react-native', 'other'];
  const summary: Record<string, { technical: number; business: number; total: number }> = {};

  for (const projectType of projectTypes) {
    const analyzers = getAnalyzersForProjectType(projectType);
    const technical = analyzers.filter(id => {
      const instance = createAnalyzer(id);
      const metadata = (instance as { projectMetadata?: AnalyzerProjectMetadata }).projectMetadata;
      return metadata?.category === 'technical';
    }).length;

    summary[projectType] = {
      technical,
      business: analyzers.length - technical,
      total: analyzers.length,
    };
  }

  return summary;
}
