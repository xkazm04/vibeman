/**
 * Plugin Scanner Integration
 * Runs scans using registered plugins
 */

import { pluginRegistry } from './pluginRegistry';
import type {
  TechDebtPlugin,
  PluginScanContext,
  PluginDetectedIssue,
  PluginScanResult,
  AggregatedScanResults
} from './types';
import type { TechDebtScanConfig, TechDebtCategory, RemediationPlan } from '@/app/db/models/tech-debt.types';
import { calculateRiskScore } from '../riskScoring';
import { generateRemediationPlan } from '../remediationPlanner';

/**
 * Run all active plugin scanners
 */
export async function runPluginScans(
  projectId: string,
  projectPath: string,
  config: TechDebtScanConfig
): Promise<AggregatedScanResults> {
  const startTime = Date.now();
  const results: PluginScanResult[] = [];
  const errors: { pluginId: string; error: string }[] = [];

  const activePlugins = pluginRegistry.getActive();

  // Run scans in parallel
  const scanPromises = activePlugins.map(async (plugin) => {
    const scanContext: PluginScanContext = {
      projectId,
      projectPath,
      config,
      filePatterns: config.filePatterns,
      excludePatterns: config.excludePatterns,
      maxItems: config.maxItems
    };

    return runSinglePluginScan(plugin, scanContext);
  });

  const scanResults = await Promise.allSettled(scanPromises);

  for (let i = 0; i < scanResults.length; i++) {
    const result = scanResults[i];
    const plugin = activePlugins[i];

    if (result.status === 'fulfilled') {
      results.push(result.value);
      if (result.value.error) {
        errors.push({
          pluginId: plugin.metadata.id,
          error: result.value.error
        });
      }
    } else {
      errors.push({
        pluginId: plugin.metadata.id,
        error: result.reason?.message || 'Unknown error'
      });
    }
  }

  const totalDuration = Date.now() - startTime;
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);

  return {
    results,
    totalIssues,
    scanDuration: totalDuration,
    errors
  };
}

/**
 * Run a single plugin scan
 */
async function runSinglePluginScan(
  plugin: TechDebtPlugin,
  context: PluginScanContext
): Promise<PluginScanResult> {
  const startTime = Date.now();
  const pluginId = plugin.metadata.id;
  const category = plugin.metadata.category;

  try {
    // Validate scanner if method exists
    if (plugin.scanner.validate) {
      const validation = await plugin.scanner.validate();
      if (!validation.valid) {
        return {
          pluginId,
          category,
          issues: [],
          scanDuration: Date.now() - startTime,
          error: validation.message || 'Scanner validation failed'
        };
      }
    }

    // Run the scan
    const issues = await plugin.scanner.scan(context);

    return {
      pluginId,
      category,
      issues,
      scanDuration: Date.now() - startTime
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      pluginId,
      category,
      issues: [],
      scanDuration: Date.now() - startTime,
      error: errorMessage
    };
  }
}

/**
 * Run scan for specific plugin
 */
export async function runPluginScan(
  pluginId: string,
  projectId: string,
  projectPath: string,
  config: TechDebtScanConfig
): Promise<PluginScanResult | null> {
  const plugin = pluginRegistry.getInstance(pluginId);
  if (!plugin) return null;

  const context: PluginScanContext = {
    projectId,
    projectPath,
    config,
    filePatterns: config.filePatterns,
    excludePatterns: config.excludePatterns,
    maxItems: config.maxItems
  };

  return runSinglePluginScan(plugin, context);
}

/**
 * Run scans for specific categories (including plugin categories)
 */
export async function runCategorizedScans(
  projectId: string,
  projectPath: string,
  categories: string[],
  config: TechDebtScanConfig
): Promise<AggregatedScanResults> {
  const startTime = Date.now();
  const results: PluginScanResult[] = [];
  const errors: { pluginId: string; error: string }[] = [];

  // Get plugins for requested categories
  const activePlugins = pluginRegistry.getActive();
  const matchingPlugins = activePlugins.filter((plugin) =>
    categories.includes(plugin.metadata.category)
  );

  const scanContext: PluginScanContext = {
    projectId,
    projectPath,
    config,
    filePatterns: config.filePatterns,
    excludePatterns: config.excludePatterns,
    maxItems: config.maxItems
  };

  const scanPromises = matchingPlugins.map((plugin) =>
    runSinglePluginScan(plugin, scanContext)
  );

  const scanResults = await Promise.allSettled(scanPromises);

  for (let i = 0; i < scanResults.length; i++) {
    const result = scanResults[i];
    const plugin = matchingPlugins[i];

    if (result.status === 'fulfilled') {
      results.push(result.value);
      if (result.value.error) {
        errors.push({
          pluginId: plugin.metadata.id,
          error: result.value.error
        });
      }
    } else {
      errors.push({
        pluginId: plugin.metadata.id,
        error: result.reason?.message || 'Unknown error'
      });
    }
  }

  return {
    results,
    totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
    scanDuration: Date.now() - startTime,
    errors
  };
}

/**
 * Calculate risk score using plugin scorer if available
 */
export function calculatePluginRiskScore(
  plugin: TechDebtPlugin,
  issue: PluginDetectedIssue
): number {
  // Use plugin's custom risk scorer if available
  if (plugin.riskScorer) {
    return plugin.riskScorer.calculateRisk({
      severity: issue.severity,
      filePaths: issue.filePaths,
      technicalImpact: issue.technicalImpact,
      businessImpact: issue.businessImpact,
      customFactors: issue.customData as Record<string, number>
    });
  }

  // Fall back to default risk scoring
  const severityWeight: Record<string, number> = {
    critical: 10,
    high: 7,
    medium: 5,
    low: 2
  };

  return calculateRiskScore({
    severity: severityWeight[issue.severity] || 5,
    ageInDays: 0,
    fileCount: issue.filePaths.length,
    businessImpact: impactToWeight(issue.businessImpact),
    technicalImpact: impactToWeight(issue.technicalImpact)
  });
}

/**
 * Generate remediation plan using plugin planner if available
 */
export function generatePluginRemediationPlan(
  plugin: TechDebtPlugin,
  issue: PluginDetectedIssue,
  category: string
): RemediationPlan {
  // Use plugin's custom remediation planner if available
  if (plugin.remediationPlanner) {
    return plugin.remediationPlanner.generatePlan(issue);
  }

  // Fall back to default remediation planning
  return generateRemediationPlan({
    category: category as TechDebtCategory,
    title: issue.title,
    description: issue.description,
    severity: issue.severity,
    filePaths: issue.filePaths,
    technicalImpact: issue.technicalImpact,
    businessImpact: issue.businessImpact
  });
}

/**
 * Helper: Convert impact description to numeric weight
 */
function impactToWeight(impact: string): number {
  const lower = impact.toLowerCase();
  if (lower.includes('critical') || lower.includes('severe')) return 10;
  if (lower.includes('significant') || lower.includes('major')) return 7;
  if (lower.includes('moderate') || lower.includes('medium')) return 5;
  return 3;
}

/**
 * Get all available scan categories (built-in + plugin)
 */
export function getAvailableScanCategories(): string[] {
  const builtInCategories = [
    'code_quality',
    'security',
    'performance',
    'testing',
    'documentation',
    'dependencies',
    'architecture',
    'maintainability',
    'accessibility'
  ];

  const pluginCategories = pluginRegistry
    .getActive()
    .map((p) => p.metadata.category)
    .filter((c) => !builtInCategories.includes(c));

  return [...builtInCategories, ...pluginCategories];
}
