/**
 * Template Discovery Library
 * Scans external projects and extracts TemplateConfig exports
 */

export { discoverTemplateFiles, type ScanResult, type DiscoveredFile } from './scanner';
export {
  parseTemplateConfig,
  parseTemplateConfigs,
  computeContentHash,
  type ParsedTemplateConfig,
  type ParseResult,
} from './parser';
