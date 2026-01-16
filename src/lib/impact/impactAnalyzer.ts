/**
 * Impact Analyzer
 * Calculates change propagation and ripple effects for refactoring
 */

import type { RefactorOpportunity } from '@/stores/refactorStore';
import type {
  ImpactAnalysisResult,
  ImpactGraph,
  ImpactStats,
  FileChangePreview,
  DiffHunk,
  DiffLine,
  RiskAssessment,
  RiskFactor,
  ExecutionStep,
  ScopeAdjustment,
  ImpactReport,
  ImpactAnalysisConfig,
  ImpactNode,
} from './types';
import { DEFAULT_IMPACT_CONFIG } from './types';
import { DependencyGraphBuilder } from './dependencyGraphBuilder';
import { v4 as uuidv4 } from 'uuid';

/**
 * ImpactAnalyzer class
 * Analyzes refactoring impact and generates visualization data
 */
export class ImpactAnalyzer {
  private config: ImpactAnalysisConfig;
  private graphBuilder: DependencyGraphBuilder;
  private currentResult: ImpactAnalysisResult | null = null;
  private scopeAdjustment: ScopeAdjustment = {
    includedNodes: new Set(),
    excludedNodes: new Set(),
  };

  constructor(config: Partial<ImpactAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_IMPACT_CONFIG, ...config };
    this.graphBuilder = new DependencyGraphBuilder(this.config);
  }

  /**
   * Analyze impact of selected refactoring opportunities
   */
  async analyzeImpact(
    opportunities: RefactorOpportunity[],
    fileContents?: Map<string, string>
  ): Promise<ImpactAnalysisResult> {
    console.log('[ImpactAnalyzer] Starting impact analysis for', opportunities.length, 'opportunities');

    // Get all affected files from opportunities
    const sourceFiles = this.getSourceFiles(opportunities);
    console.log('[ImpactAnalyzer] Source files:', sourceFiles);

    // Build dependency graph
    let graph: ImpactGraph;
    if (fileContents && fileContents.size > 0) {
      graph = this.graphBuilder.buildFromFiles(fileContents, sourceFiles);
    } else {
      // Build minimal graph from opportunity data
      graph = this.buildMinimalGraph(opportunities, sourceFiles);
    }

    // Generate change previews
    const changePreview = this.generateChangePreview(opportunities);

    // Calculate risk assessment
    const riskAssessment = this.assessRisk(graph, opportunities);

    // Generate execution plan
    const executionPlan = this.generateExecutionPlan(graph, opportunities);

    // Get affected files list
    const affectedFiles = graph.nodes
      .filter(n => n.level === 'direct' || n.level === 'indirect')
      .map(n => n.path);

    this.currentResult = {
      graph,
      changePreview,
      affectedFiles,
      riskAssessment,
      executionPlan,
    };

    console.log('[ImpactAnalyzer] Analysis complete. Risk score:', riskAssessment.score);
    return this.currentResult;
  }

  /**
   * Get source files from opportunities
   */
  private getSourceFiles(opportunities: RefactorOpportunity[]): string[] {
    const files = new Set<string>();
    for (const opp of opportunities) {
      for (const file of opp.files) {
        files.add(file);
      }
    }
    return Array.from(files);
  }

  /**
   * Build a minimal graph from opportunity data when file contents aren't available
   */
  private buildMinimalGraph(
    opportunities: RefactorOpportunity[],
    sourceFiles: string[]
  ): ImpactGraph {
    const nodes: ImpactNode[] = [];
    const nodeMap = new Map<string, ImpactNode>();

    // Create nodes for all files in opportunities
    for (const file of sourceFiles) {
      const parts = file.split('/');
      const fileName = parts[parts.length - 1];
      const directory = parts.slice(0, -1).join('/');
      const extension = fileName.includes('.') ? fileName.split('.').pop() || '' : '';

      // Count changes in this file
      const changeCount = opportunities.filter(o => o.files.includes(file)).length;

      const node: ImpactNode = {
        id: file,
        path: file,
        fileName,
        directory,
        extension,
        level: 'direct',
        status: 'modified',
        isSource: true,
        depth: 0,
        changeCount,
      };

      nodes.push(node);
      nodeMap.set(file, node);
    }

    // Calculate stats
    const stats: ImpactStats = {
      totalFiles: nodes.length,
      directlyAffected: nodes.length,
      indirectlyAffected: 0,
      potentiallyAffected: 0,
      totalLines: 0,
      affectedLines: 0,
      complexity: { before: 0, after: 0, change: 0 },
      riskScore: this.calculateSimpleRiskScore(nodes.length, opportunities.length),
    };

    return {
      nodes,
      edges: [],
      stats,
    };
  }

  /**
   * Calculate a simple risk score when full analysis isn't available
   */
  private calculateSimpleRiskScore(fileCount: number, opportunityCount: number): number {
    // Simple heuristic: more files and opportunities = higher risk
    const baseRisk = Math.min(50, fileCount * 5);
    const opportunityRisk = Math.min(30, opportunityCount * 3);
    return Math.min(100, baseRisk + opportunityRisk);
  }

  /**
   * Generate change preview for affected files
   */
  private generateChangePreview(opportunities: RefactorOpportunity[]): Map<string, FileChangePreview> {
    const previews = new Map<string, FileChangePreview>();

    for (const opp of opportunities) {
      for (const file of opp.files) {
        if (previews.has(file)) {
          // Update existing preview
          const existing = previews.get(file)!;
          existing.additions += 5; // Estimated
          existing.deletions += 3; // Estimated
          continue;
        }

        // Create synthetic diff based on opportunity
        const hunks = this.generateSyntheticDiff(opp, file);

        previews.set(file, {
          path: file,
          originalContent: '', // Would be loaded from file system
          modifiedContent: '', // Would be generated from opportunity
          hunks,
          additions: hunks.reduce((sum, h) => sum + h.lines.filter(l => l.type === 'addition').length, 0),
          deletions: hunks.reduce((sum, h) => sum + h.lines.filter(l => l.type === 'deletion').length, 0),
          impactLevel: 'direct',
        });
      }
    }

    return previews;
  }

  /**
   * Generate synthetic diff from opportunity data
   */
  private generateSyntheticDiff(opp: RefactorOpportunity, file: string): DiffHunk[] {
    const lines: DiffLine[] = [];

    // Get line numbers for this file if available
    const lineNumbers = opp.lineNumbers?.[file] || [1];

    // Add context before
    lines.push({
      type: 'context',
      content: '// ... existing code ...',
      oldLineNumber: Math.max(1, lineNumbers[0] - 1),
      newLineNumber: Math.max(1, lineNumbers[0] - 1),
    });

    // Add deletion (old code)
    lines.push({
      type: 'deletion',
      content: `// ${opp.title}`,
      oldLineNumber: lineNumbers[0],
    });

    // Add addition (suggested fix)
    if (opp.suggestedFix) {
      const fixLines = opp.suggestedFix.split('\n').slice(0, 3); // First 3 lines
      fixLines.forEach((line, i) => {
        lines.push({
          type: 'addition',
          content: line,
          newLineNumber: lineNumbers[0] + i,
        });
      });
    } else {
      lines.push({
        type: 'addition',
        content: `// Refactored: ${opp.description.substring(0, 50)}...`,
        newLineNumber: lineNumbers[0],
      });
    }

    // Add context after
    lines.push({
      type: 'context',
      content: '// ... more code ...',
      oldLineNumber: lineNumbers[0] + 2,
      newLineNumber: lineNumbers[0] + 3,
    });

    return [{
      oldStart: Math.max(1, lineNumbers[0] - 1),
      oldLines: 3,
      newStart: Math.max(1, lineNumbers[0] - 1),
      newLines: 4,
      lines,
    }];
  }

  /**
   * Assess risk of the refactoring
   */
  private assessRisk(graph: ImpactGraph, opportunities: RefactorOpportunity[]): RiskAssessment {
    const factors: RiskFactor[] = [];

    // Factor 1: Number of files affected
    const fileCount = graph.stats.directlyAffected + graph.stats.indirectlyAffected;
    if (fileCount > 20) {
      factors.push({
        name: 'High File Count',
        description: `${fileCount} files will be affected`,
        severity: fileCount > 50 ? 'high' : 'medium',
        mitigation: 'Consider breaking into smaller batches',
      });
    }

    // Factor 2: Critical severity issues
    const criticalCount = opportunities.filter(o => o.severity === 'critical').length;
    if (criticalCount > 0) {
      factors.push({
        name: 'Critical Issues',
        description: `${criticalCount} critical severity issues`,
        severity: 'high',
        mitigation: 'Review critical issues carefully before proceeding',
      });
    }

    // Factor 3: Security changes
    const securityCount = opportunities.filter(o => o.category === 'security').length;
    if (securityCount > 0) {
      factors.push({
        name: 'Security Changes',
        description: `${securityCount} security-related changes`,
        severity: 'medium',
        mitigation: 'Ensure security review is performed',
      });
    }

    // Factor 4: Architecture changes
    const archCount = opportunities.filter(o => o.category === 'architecture').length;
    if (archCount > 0) {
      factors.push({
        name: 'Architecture Changes',
        description: `${archCount} architectural changes`,
        severity: 'high',
        mitigation: 'Consider phased rollout for architectural changes',
      });
    }

    // Factor 5: Impact propagation depth
    const maxDepth = Math.max(...graph.nodes.map(n => n.depth === Infinity ? 0 : n.depth));
    if (maxDepth > 3) {
      factors.push({
        name: 'Deep Impact',
        description: `Changes propagate ${maxDepth} levels deep`,
        severity: maxDepth > 5 ? 'high' : 'medium',
        mitigation: 'Test integration thoroughly at each level',
      });
    }

    // Calculate overall risk
    const score = graph.stats.riskScore;
    let overallRisk: RiskAssessment['overallRisk'];
    if (score >= 75) {
      overallRisk = 'critical';
    } else if (score >= 50) {
      overallRisk = 'high';
    } else if (score >= 25) {
      overallRisk = 'medium';
    } else {
      overallRisk = 'low';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, score);

    return {
      overallRisk,
      score,
      factors,
      recommendations,
    };
  }

  /**
   * Generate recommendations based on risk factors
   */
  private generateRecommendations(factors: RiskFactor[], score: number): string[] {
    const recommendations: string[] = [];

    if (score >= 50) {
      recommendations.push('Consider running a backup before executing changes');
      recommendations.push('Execute in a feature branch first');
    }

    if (factors.some(f => f.name === 'High File Count')) {
      recommendations.push('Break changes into smaller, reviewable batches');
    }

    if (factors.some(f => f.name === 'Security Changes')) {
      recommendations.push('Schedule security review before deployment');
    }

    if (factors.some(f => f.name === 'Architecture Changes')) {
      recommendations.push('Update documentation to reflect architectural changes');
    }

    if (score < 25) {
      recommendations.push('Low risk - can proceed with standard review process');
    }

    return recommendations;
  }

  /**
   * Generate execution plan
   */
  private generateExecutionPlan(
    graph: ImpactGraph,
    opportunities: RefactorOpportunity[]
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];

    // Group opportunities by category
    const byCategory = new Map<string, RefactorOpportunity[]>();
    for (const opp of opportunities) {
      if (!byCategory.has(opp.category)) {
        byCategory.set(opp.category, []);
      }
      byCategory.get(opp.category)!.push(opp);
    }

    // Create steps by category priority
    const categoryOrder = ['security', 'architecture', 'performance', 'code-quality', 'maintainability', 'duplication'];
    let order = 1;

    for (const category of categoryOrder) {
      const catOpps = byCategory.get(category);
      if (!catOpps || catOpps.length === 0) continue;

      const files = new Set<string>();
      catOpps.forEach(o => o.files.forEach(f => files.add(f)));

      steps.push({
        order,
        files: Array.from(files),
        description: `Apply ${category} improvements (${catOpps.length} changes)`,
        dependencies: order > 1 ? [order - 1] : [],
        estimatedDuration: this.estimateDuration(catOpps),
      });

      order++;
    }

    return steps;
  }

  /**
   * Estimate duration for a set of opportunities
   */
  private estimateDuration(opportunities: RefactorOpportunity[]): string {
    let totalMinutes = 0;

    for (const opp of opportunities) {
      // Parse estimated time if available
      if (opp.estimatedTime) {
        const match = opp.estimatedTime.match(/(\d+)/);
        if (match) {
          totalMinutes += parseInt(match[1], 10);
        }
      } else {
        // Estimate based on effort
        const effortMinutes: Record<string, number> = {
          low: 5,
          medium: 15,
          high: 30,
        };
        totalMinutes += effortMinutes[opp.effort] || 15;
      }
    }

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.ceil(totalMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  }

  /**
   * Adjust scope by including/excluding nodes
   */
  adjustScope(nodeId: string, action: 'include' | 'exclude'): void {
    if (action === 'include') {
      this.scopeAdjustment.excludedNodes.delete(nodeId);
      this.scopeAdjustment.includedNodes.add(nodeId);
    } else {
      this.scopeAdjustment.includedNodes.delete(nodeId);
      this.scopeAdjustment.excludedNodes.add(nodeId);
    }

    if (this.currentResult) {
      this.graphBuilder.updateNodeScope(nodeId, action === 'exclude');
    }
  }

  /**
   * Get current scope adjustment
   */
  getScopeAdjustment(): ScopeAdjustment {
    return { ...this.scopeAdjustment };
  }

  /**
   * Reset scope to default
   */
  resetScope(): void {
    this.scopeAdjustment = {
      includedNodes: new Set(),
      excludedNodes: new Set(),
    };
  }

  /**
   * Generate impact report for export
   */
  generateReport(
    opportunities: RefactorOpportunity[],
    result?: ImpactAnalysisResult
  ): ImpactReport {
    const analysisResult = result || this.currentResult;
    if (!analysisResult) {
      throw new Error('No analysis result available. Run analyzeImpact first.');
    }

    const { graph, riskAssessment, changePreview } = analysisResult;

    // Build impact breakdown
    const directFiles = graph.nodes.filter(n => n.level === 'direct').map(n => n.path);
    const indirectFiles = graph.nodes.filter(n => n.level === 'indirect').map(n => n.path);
    const potentialFiles = graph.nodes.filter(n => n.level === 'potential' && n.depth !== Infinity).map(n => n.path);

    // Build change details
    const changeDetails = Array.from(changePreview.entries()).map(([path, preview]) => ({
      path,
      additions: preview.additions,
      deletions: preview.deletions,
      summary: `${preview.hunks.length} change region(s)`,
    }));

    return {
      title: `Impact Analysis Report - ${new Date().toLocaleDateString()}`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalOpportunities: opportunities.length,
        totalFilesAffected: graph.stats.directlyAffected + graph.stats.indirectlyAffected,
        riskLevel: riskAssessment.overallRisk,
        estimatedEffort: this.estimateDuration(opportunities),
      },
      impactBreakdown: {
        direct: directFiles,
        indirect: indirectFiles,
        potential: potentialFiles,
      },
      changeDetails,
      riskAssessment,
      recommendations: riskAssessment.recommendations,
    };
  }

  /**
   * Get current analysis result
   */
  getCurrentResult(): ImpactAnalysisResult | null {
    return this.currentResult;
  }

  /**
   * Clear current result
   */
  clearResult(): void {
    this.currentResult = null;
    this.resetScope();
  }
}

// Export singleton instance
export const impactAnalyzer = new ImpactAnalyzer();
