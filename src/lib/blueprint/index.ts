/**
 * Blueprint Library
 *
 * A modular, composable architecture for code analysis and refactoring.
 * This library provides reusable components for building custom scan pipelines.
 *
 * @example
 * ```typescript
 * import { createAnalyzer, createProcessor, createExecutor } from '@/lib/blueprint';
 *
 * // Create analyzer
 * const analyzer = createAnalyzer('analyzer.console');
 * await analyzer.initialize({ includeDebug: true });
 *
 * // Execute analysis
 * const issues = await analyzer.execute(undefined, context);
 *
 * // Process results
 * const processor = createProcessor('processor.filter');
 * await processor.initialize({ minSeverity: 'medium' });
 * const filtered = await processor.execute(issues, context);
 *
 * // Generate requirements
 * const executor = createExecutor('executor.requirement');
 * await executor.initialize({ batchSize: 10 });
 * const result = await executor.execute(filtered, context);
 * ```
 */

// Types
export * from './types';

// Components
export * from './components';

// Pipeline
export * from './pipeline';

// Prompts
export * from './prompts';

// Re-export commonly used items at top level
export {
  createAnalyzer,
  createProcessor,
  createExecutor,
  createComponent,
  getAnalyzerIds,
  getProcessorIds,
  getExecutorIds,
  getComponentIds,
  getComponentsByType,
  ANALYZER_REGISTRY,
  PROCESSOR_REGISTRY,
  EXECUTOR_REGISTRY,
  COMPONENT_REGISTRY,
} from './components';

export { promptBuilder } from './prompts';

// Scan components - Base
export {
  BaseScan,
  ScanRegistry,
} from './components/scans';

// Scan components - Project level
export {
  VisionScan,
  UnusedScan,
  BuildScan,
} from './components/scans/project';

// Scan components - Context specific
export {
  ContextReviewScan,
  PhotoScan,
  TestScan,
  SeparatorScan,
  TestDesignScan,
} from './components/scans/context';

// Scan components - Batch
export {
  ScreenCoverageScan,
  FeatureContextsScan,
} from './components/scans/batch';

// Pipeline
export {
  PipelineExecutor,
  executePipeline,
  createRequirementOnly,
} from './pipeline';

// Backward compatibility wrappers
export * as compat from './compat';
