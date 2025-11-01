/**
 * Technical Debt Scanner
 * Analyzes project code for technical debt patterns and issues
 */

import type {
  TechDebtCategory,
  TechDebtSeverity,
  DbTechDebt,
  TechDebtScanConfig
} from '@/app/db/models/tech-debt.types';
import { calculateRiskScore } from './riskScoring';
import { generateRemediationPlan } from './remediationPlanner';

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
  detectionDetails: any;
}

/**
 * Main scanner function
 */
export async function scanProjectForTechDebt(
  config: TechDebtScanConfig
): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  for (const scanType of config.scanTypes) {
    const typeIssues = await scanByCategory(scanType, config);
    issues.push(...typeIssues);
  }

  // Limit results if specified
  if (config.maxItems && issues.length > config.maxItems) {
    return issues.slice(0, config.maxItems);
  }

  return issues;
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
  const issues: DetectedIssue[] = [];

  // Check for common code smells
  const patterns = [
    {
      pattern: /\/\/ TODO:/gi,
      title: 'TODO Comments Found',
      severity: 'low' as TechDebtSeverity,
      description: 'TODO comments indicate incomplete work or deferred implementation',
      technicalImpact: 'May indicate incomplete features or edge cases',
      businessImpact: 'Potential bugs or missing functionality'
    },
    {
      pattern: /console\.(log|warn|error|debug)/gi,
      title: 'Console Statements in Code',
      severity: 'low' as TechDebtSeverity,
      description: 'Console statements should be removed or replaced with proper logging',
      technicalImpact: 'Performance impact and cluttered console output',
      businessImpact: 'Poor production debugging experience'
    },
    {
      pattern: /\/\/ FIXME:/gi,
      title: 'FIXME Comments Found',
      severity: 'medium' as TechDebtSeverity,
      description: 'FIXME comments indicate known issues that need attention',
      technicalImpact: 'Known bugs or problematic code patterns',
      businessImpact: 'Potential system failures or data issues'
    },
    {
      pattern: /debugger;/gi,
      title: 'Debugger Statements Left in Code',
      severity: 'medium' as TechDebtSeverity,
      description: 'Debugger statements should be removed before production',
      technicalImpact: 'Will pause execution in production if DevTools are open',
      businessImpact: 'Poor user experience and potential application hangs'
    }
  ];

  // Scan project files (simplified - would use proper file traversal)
  // This is a placeholder implementation
  issues.push({
    category: 'code_quality',
    title: 'Code Quality Scan Placeholder',
    description: 'Automated code quality scanning requires file system access',
    severity: 'low',
    filePaths: [],
    technicalImpact: 'Scanner needs implementation',
    businessImpact: 'Limited tech debt visibility',
    detectionDetails: { scanType: 'code_quality', timestamp: new Date().toISOString() }
  });

  return issues;
}

/**
 * Scan for security vulnerabilities
 */
async function scanSecurity(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  // Check for common security issues
  issues.push({
    category: 'security',
    title: 'Security Scan Required',
    description: 'Run npm audit and dependency security checks',
    severity: 'high',
    filePaths: ['package.json', 'package-lock.json'],
    technicalImpact: 'Potential security vulnerabilities in dependencies',
    businessImpact: 'Risk of data breaches or security incidents',
    detectionDetails: { recommendedTools: ['npm audit', 'snyk', 'OWASP Dependency-Check'] }
  });

  return issues;
}

/**
 * Scan for performance issues
 */
async function scanPerformance(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  issues.push({
    category: 'performance',
    title: 'Performance Audit Recommended',
    description: 'Conduct performance profiling and optimization analysis',
    severity: 'medium',
    filePaths: [],
    technicalImpact: 'Potential slow rendering, memory leaks, or inefficient algorithms',
    businessImpact: 'Poor user experience and higher infrastructure costs',
    detectionDetails: { recommendedTools: ['Lighthouse', 'Chrome DevTools', 'React Profiler'] }
  });

  return issues;
}

/**
 * Scan for testing coverage gaps
 */
async function scanTesting(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  issues.push({
    category: 'testing',
    title: 'Test Coverage Analysis Needed',
    description: 'Measure test coverage and identify untested critical paths',
    severity: 'medium',
    filePaths: [],
    technicalImpact: 'Increased risk of regressions and bugs',
    businessImpact: 'Higher cost of bug fixes and reduced confidence in releases',
    detectionDetails: { recommendedTools: ['Jest coverage', 'nyc', 'Istanbul'] }
  });

  return issues;
}

/**
 * Scan for documentation gaps
 */
async function scanDocumentation(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  issues.push({
    category: 'documentation',
    title: 'Documentation Review Required',
    description: 'Review and update project documentation for completeness',
    severity: 'low',
    filePaths: ['README.md', 'docs/'],
    technicalImpact: 'Difficult onboarding and maintenance',
    businessImpact: 'Slower development velocity and knowledge silos',
    detectionDetails: { checkFor: ['API docs', 'setup guides', 'architecture diagrams'] }
  });

  return issues;
}

/**
 * Scan for dependency issues
 */
async function scanDependencies(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  issues.push({
    category: 'dependencies',
    title: 'Dependency Audit Required',
    description: 'Check for outdated dependencies and update recommendations',
    severity: 'medium',
    filePaths: ['package.json'],
    technicalImpact: 'Missing security patches and new features',
    businessImpact: 'Security risks and compatibility issues',
    detectionDetails: { recommendedCommands: ['npm outdated', 'npm audit', 'npm update'] }
  });

  return issues;
}

/**
 * Scan for architecture issues
 */
async function scanArchitecture(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  issues.push({
    category: 'architecture',
    title: 'Architecture Review Recommended',
    description: 'Review system architecture for scalability and maintainability',
    severity: 'medium',
    filePaths: [],
    technicalImpact: 'Potential scalability bottlenecks and tight coupling',
    businessImpact: 'Difficult to scale and adapt to changing requirements',
    detectionDetails: { focusAreas: ['component coupling', 'data flow', 'state management'] }
  });

  return issues;
}

/**
 * Scan for maintainability issues
 */
async function scanMaintainability(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  issues.push({
    category: 'maintainability',
    title: 'Code Maintainability Analysis',
    description: 'Analyze code complexity and maintainability metrics',
    severity: 'low',
    filePaths: [],
    technicalImpact: 'Complex code that is difficult to understand and modify',
    businessImpact: 'Higher maintenance costs and slower feature development',
    detectionDetails: { metrics: ['cyclomatic complexity', 'cognitive complexity', 'duplication'] }
  });

  return issues;
}

/**
 * Scan for accessibility issues
 */
async function scanAccessibility(config: TechDebtScanConfig): Promise<DetectedIssue[]> {
  const issues: DetectedIssue[] = [];

  issues.push({
    category: 'accessibility',
    title: 'Accessibility Audit Required',
    description: 'Conduct WCAG compliance audit and improve accessibility',
    severity: 'medium',
    filePaths: [],
    technicalImpact: 'Non-compliant with accessibility standards',
    businessImpact: 'Excludes users with disabilities and potential legal risks',
    detectionDetails: { standards: ['WCAG 2.1 Level AA'], tools: ['axe', 'Lighthouse', 'WAVE'] }
  });

  return issues;
}

/**
 * Convert detected issues to database format
 */
export function prepareIssuesForDatabase(
  issues: DetectedIssue[],
  projectId: string,
  scanId: string | null
): Omit<DbTechDebt, 'created_at' | 'updated_at' | 'resolved_at' | 'dismissed_at' | 'dismissal_reason'>[] {
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
      id: `tech-debt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      project_id: projectId,
      scan_id: scanId,
      category: issue.category,
      title: issue.title,
      description: issue.description,
      severity: issue.severity,
      risk_score: riskScore,
      estimated_effort_hours: remediationPlan.estimatedEffort,
      impact_scope: JSON.stringify([issue.category]),
      technical_impact: issue.technicalImpact,
      business_impact: issue.businessImpact,
      detected_by: 'automated_scan',
      detection_details: JSON.stringify(issue.detectionDetails),
      file_paths: JSON.stringify(issue.filePaths),
      status: 'detected',
      remediation_plan: JSON.stringify(remediationPlan),
      remediation_steps: JSON.stringify(remediationPlan.steps),
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
