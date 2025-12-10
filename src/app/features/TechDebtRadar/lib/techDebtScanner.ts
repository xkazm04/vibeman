/**
 * Technical Debt Scanner
 * Analyzes project code for technical debt patterns and issues
 * Now with plugin support for extensible scanning
 */

import type {
  TechDebtCategory,
  TechDebtSeverity,
  TechDebtStatus,
  DbTechDebt,
  TechDebtScanConfig
} from '@/app/db/models/tech-debt.types';
import { calculateRiskScore } from './riskScoring';
import { generateRemediationPlan } from './remediationPlanner';
import {
  pluginRegistry,
  runPluginScans,
  calculatePluginRiskScore,
  generatePluginRemediationPlan,
  type PluginDetectedIssue,
  type AggregatedScanResults
} from './plugins';
import { generateTechDebtId } from '@/lib/idGenerator';

/**
 * Detection details type
 */
interface DetectionDetails {
  scanType?: string;
  timestamp?: string;
  recommendedTools?: string[];
  recommendedCommands?: string[];
  checkFor?: string[];
  focusAreas?: string[];
  metrics?: string[];
  standards?: string[];
  tools?: string[];
  [key: string]: unknown;
}

/**
 * Detected tech debt issue before database insertion
 */
interface DetectedIssue {
  category: TechDebtCategory;
  title: string;
  description: string;
  severity: TechDebtSeverity;
  filePaths: string[];
  technicalImpact: string;
  businessImpact: string;
  detectionDetails: DetectionDetails;
}

/**
 * Helper to create a detected issue with common structure
 */
function createDetectedIssue(
  category: TechDebtCategory,
  title: string,
  description: string,
  severity: TechDebtSeverity,
  filePaths: string[],
  technicalImpact: string,
  businessImpact: string,
  detectionDetails: DetectionDetails
): DetectedIssue {
  return {
    category,
    title,
    description,
    severity,
    filePaths,
    technicalImpact,
    businessImpact,
    detectionDetails
  };
}

/**
 * Main scanner function
 * Now supports both built-in and plugin scanners
 */
export async function scanProjectForTechDebt(
  config: TechDebtScanConfig,
  projectPath?: string
): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  // Separate built-in and plugin categories
  const builtInCategories: TechDebtCategory[] = [
    'code_quality',
    'security',
    'performance',
    'testing',
    'documentation',
    'dependencies',
    'architecture',
    'maintainability',
    'accessibility',
    'other'
  ];

  const builtInScanTypes = config.scanTypes.filter((type) =>
    builtInCategories.includes(type)
  );
  const pluginCategories = config.scanTypes.filter(
    (type) => !builtInCategories.includes(type)
  );

  // Run built-in scans
  for (const scanType of builtInScanTypes) {
    const typeIssues = await scanByCategory(scanType, config);
    issues.push(...typeIssues);
  }

  // Run plugin scans
  if (pluginCategories.length > 0 || pluginRegistry.getActive().length > 0) {
    const pluginResults = await runPluginScansForCategories(
      config,
      projectPath || '',
      pluginCategories
    );
    issues.push(...pluginResults);
  }

  // Limit results if specified
  if (config.maxItems && issues.length > config.maxItems) {
    return issues.slice(0, config.maxItems);
  }

  return issues;
}

/**
 * Run plugin scans for specified categories
 */
async function runPluginScansForCategories(
  config: TechDebtScanConfig,
  projectPath: string,
  categories: string[]
): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  try {
    // Get all active plugins
    const activePlugins = pluginRegistry.getActive();

    // Filter plugins by category if specific categories requested
    const pluginsToRun = categories.length > 0
      ? activePlugins.filter((p) => categories.includes(p.metadata.category))
      : activePlugins;

    // Run scans for each plugin
    for (const plugin of pluginsToRun) {
      try {
        const scanContext = {
          projectId: config.projectId,
          projectPath,
          config,
          filePatterns: config.filePatterns,
          excludePatterns: config.excludePatterns,
          maxItems: config.maxItems
        };

        const pluginIssues = await plugin.scanner.scan(scanContext);

        // Convert plugin issues to standard format
        for (const issue of pluginIssues) {
          issues.push(convertPluginIssueToDetected(issue, plugin.metadata.category));
        }
      } catch (error) {
        console.error(`[Scanner] Error running plugin ${plugin.metadata.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[Scanner] Error running plugin scans:', error);
  }

  return issues;
}

/**
 * Convert plugin detected issue to standard format
 */
function convertPluginIssueToDetected(
  issue: PluginDetectedIssue,
  category: string
): DetectedIssue {
  return {
    category: category as TechDebtCategory,
    title: issue.title,
    description: issue.description,
    severity: issue.severity,
    filePaths: issue.filePaths,
    technicalImpact: issue.technicalImpact,
    businessImpact: issue.businessImpact,
    detectionDetails: {
      ...issue.detectionDetails,
      source: 'plugin',
      customData: issue.customData
    }
  };
}

/**
 * Scan for specific category of tech debt
 */
async function scanByCategory(
  category: TechDebtCategory,
  config: TechDebtScanConfig
): Promise<DetectedIssue[]> {
  switch (category) {
    case 'code_quality':
      return await scanCodeQuality(config);
    case 'security':
      return await scanSecurity(config);
    case 'performance':
      return await scanPerformance(config);
    case 'testing':
      return await scanTesting(config);
    case 'documentation':
      return await scanDocumentation(config);
    case 'dependencies':
      return await scanDependencies(config);
    case 'architecture':
      return await scanArchitecture(config);
    case 'maintainability':
      return await scanMaintainability(config);
    case 'accessibility':
      return await scanAccessibility(config);
    default:
      return [];
  }
}

/**
 * Scan for code quality issues
 */
async function scanCodeQuality(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  // Scan project files (simplified - would use proper file traversal)
  // This is a placeholder implementation
  return [
    createDetectedIssue(
      'code_quality',
      'Code Quality Scan Placeholder',
      'Automated code quality scanning requires file system access',
      'low',
      [],
      'Scanner needs implementation',
      'Limited tech debt visibility',
      { scanType: 'code_quality', timestamp: new Date().toISOString() }
    )
  ];
}

/**
 * Scan for security vulnerabilities
 */
async function scanSecurity(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  return [
    createDetectedIssue(
      'security',
      'Security Scan Required',
      'Run npm audit and dependency security checks',
      'high',
      ['package.json', 'package-lock.json'],
      'Potential security vulnerabilities in dependencies',
      'Risk of data breaches or security incidents',
      { recommendedTools: ['npm audit', 'snyk', 'OWASP Dependency-Check'] }
    )
  ];
}

/**
 * Scan for performance issues
 */
async function scanPerformance(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  return [
    createDetectedIssue(
      'performance',
      'Performance Audit Recommended',
      'Conduct performance profiling and optimization analysis',
      'medium',
      [],
      'Potential slow rendering, memory leaks, or inefficient algorithms',
      'Poor user experience and higher infrastructure costs',
      { recommendedTools: ['Lighthouse', 'Chrome DevTools', 'React Profiler'] }
    )
  ];
}

/**
 * Scan for testing coverage gaps
 */
async function scanTesting(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  return [
    createDetectedIssue(
      'testing',
      'Test Coverage Analysis Needed',
      'Measure test coverage and identify untested critical paths',
      'medium',
      [],
      'Increased risk of regressions and bugs',
      'Higher cost of bug fixes and reduced confidence in releases',
      { recommendedTools: ['Jest coverage', 'nyc', 'Istanbul'] }
    )
  ];
}

/**
 * Scan for documentation gaps
 */
async function scanDocumentation(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  return [
    createDetectedIssue(
      'documentation',
      'Documentation Review Required',
      'Review and update project documentation for completeness',
      'low',
      ['README.md', 'docs/'],
      'Difficult onboarding and maintenance',
      'Slower development velocity and knowledge silos',
      { checkFor: ['API docs', 'setup guides', 'architecture diagrams'] }
    )
  ];
}

/**
 * Scan for dependency issues
 */
async function scanDependencies(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  return [
    createDetectedIssue(
      'dependencies',
      'Dependency Audit Required',
      'Check for outdated dependencies and update recommendations',
      'medium',
      ['package.json'],
      'Missing security patches and new features',
      'Security risks and compatibility issues',
      { recommendedCommands: ['npm outdated', 'npm audit', 'npm update'] }
    )
  ];
}

/**
 * Scan for architecture issues
 */
async function scanArchitecture(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  return [
    createDetectedIssue(
      'architecture',
      'Architecture Review Recommended',
      'Review system architecture for scalability and maintainability',
      'medium',
      [],
      'Potential scalability bottlenecks and tight coupling',
      'Difficult to scale and adapt to changing requirements',
      { focusAreas: ['component coupling', 'data flow', 'state management'] }
    )
  ];
}

/**
 * Scan for maintainability issues
 */
async function scanMaintainability(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  return [
    createDetectedIssue(
      'maintainability',
      'Code Maintainability Analysis',
      'Analyze code complexity and maintainability metrics',
      'low',
      [],
      'Complex code that is difficult to understand and modify',
      'Higher maintenance costs and slower feature development',
      { metrics: ['cyclomatic complexity', 'cognitive complexity', 'duplication'] }
    )
  ];
}

/**
 * Scan for accessibility issues
 */
async function scanAccessibility(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  return [
    createDetectedIssue(
      'accessibility',
      'Accessibility Audit Required',
      'Conduct WCAG compliance audit and improve accessibility',
      'medium',
      [],
      'Non-compliant with accessibility standards',
      'Excludes users with disabilities and potential legal risks',
      { standards: ['WCAG 2.1 Level AA'], tools: ['axe', 'Lighthouse', 'WAVE'] }
    )
  ];
}

// Input type for createTechDebt that uses arrays/objects before serialization
interface TechDebtCreateInput {
  id: string;
  project_id: string;
  scan_id: string | null;
  category: TechDebtCategory;
  title: string;
  description: string;
  severity: TechDebtSeverity;
  risk_score: number;
  estimated_effort_hours: number | null;
  impact_scope: Array<Record<string, unknown>> | null;
  technical_impact: string | null;
  business_impact: string | null;
  detected_by: 'automated_scan' | 'manual_entry' | 'ai_analysis';
  detection_details: Record<string, unknown> | null;
  file_paths: string[] | null;
  status: TechDebtStatus;
  remediation_plan: Record<string, unknown> | null;
  remediation_steps: Array<Record<string, unknown>> | null;
  estimated_completion_date: string | null;
  backlog_item_id: string | null;
  goal_id: string | null;
}

/**
 * Convert detected issues to database format
 */
export function prepareIssuesForDatabase(
  issues: DetectedIssue[],
  projectId: string,
  scanId: string | null
): TechDebtCreateInput[] {
  return issues.map((issue) => {
    const riskScore = calculateRiskScore({
      severity: severityToWeight(issue.severity),
      ageInDays: 0, // New detection
      fileCount: issue.filePaths.length,
      businessImpact: impactToWeight(issue.businessImpact),
      technicalImpact: impactToWeight(issue.technicalImpact)
    });

    const remediationPlan = generateRemediationPlan(issue);

    return {
      id: generateTechDebtId(),
      project_id: projectId,
      scan_id: scanId,
      category: issue.category,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      risk_score: riskScore,
      estimated_effort_hours: remediationPlan.estimatedEffort,
      impact_scope: [{ category: issue.category }],
      technical_impact: issue.technicalImpact,
      business_impact: issue.businessImpact,
      detected_by: 'automated_scan' as const,
      detection_details: issue.detectionDetails as Record<string, unknown>,
      file_paths: issue.filePaths,
      status: 'detected' as const,
      remediation_plan: remediationPlan as unknown as Record<string, unknown>,
      remediation_steps: remediationPlan.steps as unknown as Array<Record<string, unknown>>,
      estimated_completion_date: null,
      backlog_item_id: null,
      goal_id: null
    };
  });
}

/**
 * Helper: Convert severity to numeric weight
 */
function severityToWeight(severity: TechDebtSeverity): number {
  const weights = { critical: 10, high: 7, medium: 5, low: 2 };
  return weights[severity];
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
