/**
 * TechDebt Plugin System
 * Export all plugin-related modules
 */

// Types
export * from './types';

// Registry
export { pluginRegistry, PluginRegistry } from './pluginRegistry';

// Scanner integration
export {
  runPluginScans,
  runPluginScan,
  runCategorizedScans,
  calculatePluginRiskScore,
  generatePluginRemediationPlan,
  getAvailableScanCategories
} from './pluginScanner';

// Base classes
export {
  BasePlugin,
  ScoringPlugin,
  RemediationPlugin,
  FullPlugin
} from './BasePlugin';

// Example plugins
export {
  ReactHooksPlugin,
  createReactHooksPlugin
} from './examples';
