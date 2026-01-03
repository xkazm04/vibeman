/**
 * Base Plugin Abstract Class
 * Provides a convenient base for creating TechDebt plugins
 */

import type {
  TechDebtPlugin,
  PluginMetadata,
  PluginScanner,
  PluginRiskScorer,
  PluginRemediationPlanner,
  PluginLifecycleHooks,
  PluginScanContext,
  PluginDetectedIssue,
  PluginRiskInput,
  RiskWeightConfig,
  RemediationTemplate,
  ScannerConfigOption,
  TemplateCondition
} from './types';
import type {
  TechDebtSeverity,
  RemediationPlan,
  RemediationStep
} from '@/app/db/models/tech-debt.types';

/**
 * Abstract base class for TechDebt plugins
 * Provides sensible defaults and helper methods
 */
export abstract class BasePlugin implements TechDebtPlugin {
  abstract readonly metadata: PluginMetadata;

  /**
   * Scanner implementation - must be provided by subclass
   */
  get scanner(): PluginScanner {
    return {
      scan: this.scan.bind(this),
      validate: this.validateScanner.bind(this),
      getConfigOptions: this.getScannerConfigOptions.bind(this)
    };
  }

  /**
   * Optional: Risk scorer - override if custom scoring needed
   */
  get riskScorer(): PluginRiskScorer | undefined {
    return undefined;
  }

  /**
   * Optional: Remediation planner - override if custom plans needed
   */
  get remediationPlanner(): PluginRemediationPlanner | undefined {
    return undefined;
  }

  /**
   * Optional: Lifecycle hooks - override as needed
   */
  get hooks(): PluginLifecycleHooks | undefined {
    return {
      onLoad: this.onLoad?.bind(this),
      onUnload: this.onUnload?.bind(this),
      onActivate: this.onActivate?.bind(this),
      onDeactivate: this.onDeactivate?.bind(this),
      onError: this.onError?.bind(this)
    };
  }

  /**
   * Main scan method - must be implemented by subclass
   */
  abstract scan(context: PluginScanContext): Promise<PluginDetectedIssue[]>;

  /**
   * Validate that the scanner can run - override if needed
   */
  protected async validateScanner(): Promise<{ valid: boolean; message?: string }> {
    return { valid: true };
  }

  /**
   * Get scanner configuration options - override if needed
   */
  protected getScannerConfigOptions(): ScannerConfigOption[] {
    return [];
  }

  /**
   * Lifecycle: Called when plugin is loaded
   */
  protected async onLoad?(): Promise<void> {
    // Default: no-op
  }

  /**
   * Lifecycle: Called when plugin is unloaded
   */
  protected async onUnload?(): Promise<void> {
    // Default: no-op
  }

  /**
   * Lifecycle: Called when plugin is activated
   */
  protected async onActivate?(): Promise<void> {
    // Default: no-op
  }

  /**
   * Lifecycle: Called when plugin is deactivated
   */
  protected async onDeactivate?(): Promise<void> {
    // Default: no-op
  }

  /**
   * Lifecycle: Called when an error occurs
   */
  protected onError?(error: Error): void {
    console.error(`[${this.metadata.name}] Plugin error:`, error);
  }

  /**
   * Helper: Create a detected issue
   */
  protected createIssue(
    title: string,
    description: string,
    severity: TechDebtSeverity,
    options: {
      filePaths?: string[];
      technicalImpact?: string;
      businessImpact?: string;
      detectionDetails?: Record<string, unknown>;
      customData?: Record<string, unknown>;
    } = {}
  ): PluginDetectedIssue {
    return {
      title,
      description,
      severity,
      filePaths: options.filePaths || [],
      technicalImpact: options.technicalImpact || 'Needs review',
      businessImpact: options.businessImpact || 'May affect quality',
      detectionDetails: {
        plugin: this.metadata.id,
        pluginVersion: this.metadata.version,
        timestamp: new Date().toISOString(),
        ...options.detectionDetails
      },
      customData: options.customData
    };
  }
}

/**
 * Base class for plugins with custom risk scoring
 */
export abstract class ScoringPlugin extends BasePlugin {
  /**
   * Custom risk weight configuration
   */
  protected abstract riskWeights: RiskWeightConfig;

  get riskScorer(): PluginRiskScorer {
    return {
      calculateRisk: this.calculateRisk.bind(this),
      getWeightConfig: () => this.riskWeights
    };
  }

  /**
   * Calculate risk score - can be overridden
   */
  protected calculateRisk(input: PluginRiskInput): number {
    const weights = this.riskWeights;
    const severityWeight = weights.severity ?? 30;
    const fileWeight = weights.fileCount ?? 15;
    const businessWeight = weights.businessImpact ?? 20;
    const techWeight = weights.technicalImpact ?? 15;

    const severityScore = this.severityToScore(input.severity);
    const fileScore = Math.min(10, input.filePaths.length * 2);
    const businessScore = this.impactToScore(input.businessImpact);
    const techScore = this.impactToScore(input.technicalImpact);

    // Calculate base score
    let score =
      (severityScore * severityWeight +
        fileScore * fileWeight +
        businessScore * businessWeight +
        techScore * techWeight) /
      (severityWeight + fileWeight + businessWeight + techWeight);

    // Apply custom factors if present
    if (input.customFactors && weights.customWeights) {
      for (const [factor, value] of Object.entries(input.customFactors)) {
        const weight = weights.customWeights[factor] || 0;
        score += (value / 10) * weight;
      }
    }

    return Math.min(100, Math.max(0, Math.round(score * 10)));
  }

  private severityToScore(severity: TechDebtSeverity): number {
    const scores: Record<TechDebtSeverity, number> = {
      critical: 10,
      high: 7,
      medium: 5,
      low: 2
    };
    return scores[severity];
  }

  private impactToScore(impact: string): number {
    const lower = impact.toLowerCase();
    if (lower.includes('critical') || lower.includes('severe')) return 10;
    if (lower.includes('significant') || lower.includes('major')) return 7;
    if (lower.includes('moderate') || lower.includes('medium')) return 5;
    return 3;
  }
}

/**
 * Base class for plugins with custom remediation planning
 */
export abstract class RemediationPlugin extends BasePlugin {
  /**
   * Remediation template for the plugin's category
   */
  protected abstract remediationTemplate: RemediationTemplate;

  get remediationPlanner(): PluginRemediationPlanner {
    return {
      generatePlan: this.generatePlan.bind(this),
      getTemplate: () => this.remediationTemplate
    };
  }

  /**
   * Generate remediation plan from template
   */
  protected generatePlan(issue: PluginDetectedIssue): RemediationPlan {
    const template = this.remediationTemplate;

    // Generate steps from templates
    const steps = template.stepTemplates
      .filter((stepTemplate) => {
        // Check conditions
        if (!stepTemplate.conditions || stepTemplate.conditions.length === 0) {
          return true;
        }
        return stepTemplate.conditions.every((condition) =>
          this.evaluateCondition(condition, issue)
        );
      })
      .map((stepTemplate) => this.processStepTemplate(stepTemplate, issue));

    // Calculate estimated effort
    const totalMinutes = steps.reduce((sum, step) => sum + step.estimatedMinutes, 0);
    const estimatedEffort = Math.round((totalMinutes / 60) * 10) / 10;

    return {
      summary: this.processTemplate(template.category, issue),
      estimatedEffort,
      prerequisites: template.prerequisites.map((p) => this.processTemplate(p, issue)),
      steps,
      impactedFiles: issue.filePaths.map((path) => ({
        path,
        changeType: 'modify' as const,
        description: 'Address detected issue'
      })),
      testingStrategy: this.processTemplate(template.testingStrategy, issue),
      rollbackPlan: template.rollbackPlan
    };
  }

  private processStepTemplate(
    template: RemediationTemplate['stepTemplates'][0],
    issue: PluginDetectedIssue
  ): RemediationStep {
    return {
      order: template.order,
      title: this.processTemplate(template.titleTemplate, issue),
      description: this.processTemplate(template.descriptionTemplate, issue),
      estimatedMinutes: template.estimatedMinutes,
      validation: this.processTemplate(template.validationTemplate, issue)
    };
  }

  /**
   * Process a template string with issue data
   */
  protected processTemplate(template: string, issue: PluginDetectedIssue): string {
    return template
      .replace('{{title}}', issue.title)
      .replace('{{description}}', issue.description)
      .replace('{{severity}}', issue.severity)
      .replace('{{fileCount}}', String(issue.filePaths.length))
      .replace('{{files}}', issue.filePaths.join(', '));
  }

  /**
   * Evaluate a template condition
   */
  private evaluateCondition(
    condition: TemplateCondition,
    issue: PluginDetectedIssue
  ): boolean {
    // Get the field value
    let fieldValue: unknown;
    switch (condition.field) {
      case 'severity':
        fieldValue = issue.severity;
        break;
      case 'fileCount':
        fieldValue = issue.filePaths.length;
        break;
      case 'title':
        fieldValue = issue.title;
        break;
      case 'description':
        fieldValue = issue.description;
        break;
      default:
        fieldValue = issue.customData?.[condition.field];
    }

    // Evaluate the condition
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'matches':
        return new RegExp(String(condition.value)).test(String(fieldValue));
      case 'greaterThan':
        return Number(fieldValue) > Number(condition.value);
      case 'lessThan':
        return Number(fieldValue) < Number(condition.value);
      default:
        return true;
    }
  }
}

/**
 * Full-featured base class with custom scoring and remediation
 */
export abstract class FullPlugin extends BasePlugin {
  protected abstract riskWeights: RiskWeightConfig;
  protected abstract remediationTemplate: RemediationTemplate;

  get riskScorer(): PluginRiskScorer {
    return {
      calculateRisk: this.calculateRisk.bind(this),
      getWeightConfig: () => this.riskWeights
    };
  }

  get remediationPlanner(): PluginRemediationPlanner {
    return {
      generatePlan: this.generateRemediationPlan.bind(this),
      getTemplate: () => this.remediationTemplate
    };
  }

  /**
   * Calculate risk score
   */
  protected calculateRisk(input: PluginRiskInput): number {
    const weights = this.riskWeights;
    const severityScore = this.severityToScore(input.severity);
    const fileScore = Math.min(10, input.filePaths.length * 2);
    const businessScore = this.impactToScore(input.businessImpact);
    const techScore = this.impactToScore(input.technicalImpact);

    const totalWeight =
      (weights.severity ?? 30) +
      (weights.fileCount ?? 15) +
      (weights.businessImpact ?? 20) +
      (weights.technicalImpact ?? 15);

    const score =
      (severityScore * (weights.severity ?? 30) +
        fileScore * (weights.fileCount ?? 15) +
        businessScore * (weights.businessImpact ?? 20) +
        techScore * (weights.technicalImpact ?? 15)) /
      totalWeight;

    return Math.min(100, Math.max(0, Math.round(score * 10)));
  }

  /**
   * Generate remediation plan
   */
  protected generateRemediationPlan(issue: PluginDetectedIssue): RemediationPlan {
    const template = this.remediationTemplate;
    const steps = template.stepTemplates.map((stepTemplate) => ({
      order: stepTemplate.order,
      title: this.processTemplate(stepTemplate.titleTemplate, issue),
      description: this.processTemplate(stepTemplate.descriptionTemplate, issue),
      estimatedMinutes: stepTemplate.estimatedMinutes,
      validation: this.processTemplate(stepTemplate.validationTemplate, issue)
    }));

    const totalMinutes = steps.reduce((sum, step) => sum + step.estimatedMinutes, 0);

    return {
      summary: `Address ${issue.title}`,
      estimatedEffort: Math.round((totalMinutes / 60) * 10) / 10,
      prerequisites: template.prerequisites,
      steps,
      impactedFiles: issue.filePaths.map((path) => ({
        path,
        changeType: 'modify' as const,
        description: 'Address detected issue'
      })),
      testingStrategy: template.testingStrategy,
      rollbackPlan: template.rollbackPlan
    };
  }

  private severityToScore(severity: TechDebtSeverity): number {
    return { critical: 10, high: 7, medium: 5, low: 2 }[severity];
  }

  private impactToScore(impact: string): number {
    const lower = impact.toLowerCase();
    if (lower.includes('critical') || lower.includes('severe')) return 10;
    if (lower.includes('significant') || lower.includes('major')) return 7;
    if (lower.includes('moderate') || lower.includes('medium')) return 5;
    return 3;
  }

  protected processTemplate(template: string, issue: PluginDetectedIssue): string {
    return template
      .replace('{{title}}', issue.title)
      .replace('{{description}}', issue.description)
      .replace('{{severity}}', issue.severity)
      .replace('{{fileCount}}', String(issue.filePaths.length));
  }
}
