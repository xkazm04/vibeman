/**
 * Plugin Architecture Types for TechDebt
 * Defines interfaces for custom debt category plugins
 */

import type {
  TechDebtCategory,
  TechDebtSeverity,
  TechDebtScanConfig,
  RemediationPlan,
  RemediationStep,
  RiskFactors
} from '@/app/db/models/tech-debt.types';

/**
 * Plugin metadata for identification and display
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: TechDebtCategory | string; // Custom categories allowed
  icon?: string;
  homepage?: string;
  repository?: string;
  tags?: string[];
}

/**
 * Plugin status for lifecycle management
 */
export type PluginStatus = 'active' | 'inactive' | 'error' | 'loading';

/**
 * Plugin registration state
 */
export interface RegisteredPlugin {
  metadata: PluginMetadata;
  status: PluginStatus;
  loadedAt: string;
  lastError?: string;
  instance?: TechDebtPlugin;
}

/**
 * Detected issue from plugin scanner
 */
export interface PluginDetectedIssue {
  title: string;
  description: string;
  severity: TechDebtSeverity;
  filePaths: string[];
  technicalImpact: string;
  businessImpact: string;
  detectionDetails: Record<string, unknown>;
  customData?: Record<string, unknown>; // Plugin-specific data
}

/**
 * Plugin scan context provided to scanners
 */
export interface PluginScanContext {
  projectId: string;
  projectPath: string;
  config: TechDebtScanConfig;
  filePatterns?: string[];
  excludePatterns?: string[];
  maxItems?: number;
}

/**
 * Risk scoring input for plugins
 */
export interface PluginRiskInput {
  severity: TechDebtSeverity;
  filePaths: string[];
  technicalImpact: string;
  businessImpact: string;
  customFactors?: Record<string, number>;
}

/**
 * Custom risk weight configuration
 */
export interface RiskWeightConfig {
  severity?: number;
  ageInDays?: number;
  fileCount?: number;
  businessImpact?: number;
  technicalImpact?: number;
  customWeights?: Record<string, number>;
}

/**
 * Remediation template for generating plans
 */
export interface RemediationTemplate {
  category: string;
  stepTemplates: RemediationStepTemplate[];
  prerequisites: string[];
  testingStrategy: string;
  rollbackPlan: string;
}

/**
 * Template for individual remediation steps
 */
export interface RemediationStepTemplate {
  order: number;
  titleTemplate: string;
  descriptionTemplate: string;
  estimatedMinutes: number;
  validationTemplate: string;
  conditions?: TemplateCondition[];
}

/**
 * Condition for including/excluding remediation steps
 */
export interface TemplateCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'greaterThan' | 'lessThan';
  value: string | number;
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginLifecycleHooks {
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
  onActivate?: () => Promise<void>;
  onDeactivate?: () => Promise<void>;
  onError?: (error: Error) => void;
}

/**
 * Scanner interface that plugins must implement
 */
export interface PluginScanner {
  /**
   * Scan for tech debt issues
   */
  scan(context: PluginScanContext): Promise<PluginDetectedIssue[]>;

  /**
   * Optional: Validate that the scanner can run in this environment
   */
  validate?(): Promise<{ valid: boolean; message?: string }>;

  /**
   * Optional: Get scanner configuration options
   */
  getConfigOptions?(): ScannerConfigOption[];
}

/**
 * Configuration option for scanner settings
 */
export interface ScannerConfigOption {
  key: string;
  label: string;
  type: 'boolean' | 'string' | 'number' | 'select';
  defaultValue: unknown;
  options?: { value: unknown; label: string }[];
  description?: string;
}

/**
 * Risk scorer interface for custom scoring logic
 */
export interface PluginRiskScorer {
  /**
   * Calculate risk score for an issue
   */
  calculateRisk(input: PluginRiskInput): number;

  /**
   * Optional: Get custom weight configuration
   */
  getWeightConfig?(): RiskWeightConfig;
}

/**
 * Remediation planner interface for custom remediation plans
 */
export interface PluginRemediationPlanner {
  /**
   * Generate remediation plan for an issue
   */
  generatePlan(issue: PluginDetectedIssue): RemediationPlan;

  /**
   * Optional: Get remediation template
   */
  getTemplate?(): RemediationTemplate;
}

/**
 * Main plugin interface that all plugins must implement
 */
export interface TechDebtPlugin {
  /**
   * Plugin metadata
   */
  readonly metadata: PluginMetadata;

  /**
   * Scanner implementation
   */
  readonly scanner: PluginScanner;

  /**
   * Optional: Custom risk scorer
   */
  readonly riskScorer?: PluginRiskScorer;

  /**
   * Optional: Custom remediation planner
   */
  readonly remediationPlanner?: PluginRemediationPlanner;

  /**
   * Optional: Lifecycle hooks
   */
  readonly hooks?: PluginLifecycleHooks;
}

/**
 * Plugin constructor type for dynamic loading
 */
export type PluginConstructor = new () => TechDebtPlugin;

/**
 * Plugin factory function type for module exports
 */
export type PluginFactory = () => TechDebtPlugin;

/**
 * Plugin module export format
 */
export interface PluginModule {
  default?: TechDebtPlugin | PluginFactory | PluginConstructor;
  createPlugin?: PluginFactory;
  Plugin?: PluginConstructor;
}

/**
 * Plugin load result
 */
export interface PluginLoadResult {
  success: boolean;
  plugin?: TechDebtPlugin;
  error?: string;
}

/**
 * Plugin scan result
 */
export interface PluginScanResult {
  pluginId: string;
  category: string;
  issues: PluginDetectedIssue[];
  scanDuration: number;
  error?: string;
}

/**
 * Combined scan results from all plugins
 */
export interface AggregatedScanResults {
  results: PluginScanResult[];
  totalIssues: number;
  scanDuration: number;
  errors: { pluginId: string; error: string }[];
}

/**
 * Plugin event types for event emitter
 */
export type PluginEventType =
  | 'plugin:loaded'
  | 'plugin:unloaded'
  | 'plugin:activated'
  | 'plugin:deactivated'
  | 'plugin:error'
  | 'scan:started'
  | 'scan:completed'
  | 'scan:error';

/**
 * Plugin event payload
 */
export interface PluginEvent {
  type: PluginEventType;
  pluginId?: string;
  timestamp: string;
  data?: unknown;
}

/**
 * Plugin event listener
 */
export type PluginEventListener = (event: PluginEvent) => void;
