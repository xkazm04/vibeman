/**
 * FastAPI Analyzers
 * Python/FastAPI-specific code analysis components
 */

// Export all FastAPI analyzers
export * from './PrintStatementsAnalyzer';
export * from './TypeAnnotationsAnalyzer';
export * from './PythonUnusedImportsAnalyzer';
export * from './PydanticModelsAnalyzer';
export * from './AsyncEndpointsAnalyzer';
export * from './DependencyInjectionAnalyzer';
export * from './ErrorHandlingAnalyzer';
export * from './CORSConfigurationAnalyzer';

// Import classes for registry
import { PrintStatementsAnalyzer } from './PrintStatementsAnalyzer';
import { TypeAnnotationsAnalyzer } from './TypeAnnotationsAnalyzer';
import { PythonUnusedImportsAnalyzer } from './PythonUnusedImportsAnalyzer';
import { PydanticModelsAnalyzer } from './PydanticModelsAnalyzer';
import { AsyncEndpointsAnalyzer } from './AsyncEndpointsAnalyzer';
import { DependencyInjectionAnalyzer } from './DependencyInjectionAnalyzer';
import { ErrorHandlingAnalyzer } from './ErrorHandlingAnalyzer';
import { CORSConfigurationAnalyzer } from './CORSConfigurationAnalyzer';

/**
 * FastAPI Analyzer Registry
 * Maps analyzer IDs to their implementations
 */
export const FASTAPI_ANALYZER_REGISTRY = {
  'analyzer.print-statements': PrintStatementsAnalyzer,
  'analyzer.python-type-annotations': TypeAnnotationsAnalyzer,
  'analyzer.python-unused-imports': PythonUnusedImportsAnalyzer,
  'analyzer.pydantic-models': PydanticModelsAnalyzer,
  'analyzer.async-endpoints': AsyncEndpointsAnalyzer,
  'analyzer.dependency-injection': DependencyInjectionAnalyzer,
  'analyzer.fastapi-error-handling': ErrorHandlingAnalyzer,
  'analyzer.cors-configuration': CORSConfigurationAnalyzer,
} as const;

export type FastAPIAnalyzerId = keyof typeof FASTAPI_ANALYZER_REGISTRY;
