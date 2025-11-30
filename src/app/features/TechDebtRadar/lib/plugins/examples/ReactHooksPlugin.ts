/**
 * React Hooks Technical Debt Plugin
 * Example plugin that demonstrates the plugin architecture
 * Scans for common React hooks anti-patterns and best practice violations
 */

import { BasePlugin } from '../BasePlugin';
import type {
  PluginMetadata,
  PluginScanContext,
  PluginDetectedIssue,
  PluginRiskScorer,
  PluginRemediationPlanner,
  PluginRiskInput,
  RiskWeightConfig
} from '../types';
import type { RemediationPlan, RemediationStep } from '@/app/db/models/tech-debt.types';

/**
 * React Hooks Plugin
 * Detects issues like:
 * - Missing dependencies in useEffect
 * - Stale closures
 * - Rules of hooks violations
 * - Performance issues with hooks
 */
export class ReactHooksPlugin extends BasePlugin {
  readonly metadata: PluginMetadata = {
    id: 'react-hooks-scanner',
    name: 'React Hooks Scanner',
    version: '1.0.0',
    description: 'Scans for React hooks anti-patterns and best practice violations',
    author: 'TechDebtRadar Team',
    category: 'react_hooks',
    icon: 'Hook',
    tags: ['react', 'hooks', 'performance', 'best-practices'],
    homepage: 'https://github.com/vibeman/tech-debt-plugins',
    repository: 'https://github.com/vibeman/tech-debt-plugins'
  };

  /**
   * Custom risk scorer for React hooks issues
   */
  get riskScorer(): PluginRiskScorer {
    return {
      calculateRisk: this.calculateHooksRisk.bind(this),
      getWeightConfig: () => this.riskWeights
    };
  }

  /**
   * Custom remediation planner
   */
  get remediationPlanner(): PluginRemediationPlanner {
    return {
      generatePlan: this.generateHooksRemediationPlan.bind(this)
    };
  }

  private riskWeights: RiskWeightConfig = {
    severity: 35,
    fileCount: 15,
    businessImpact: 20,
    technicalImpact: 20,
    customWeights: {
      hookComplexity: 10
    }
  };

  /**
   * Scan for React hooks issues
   */
  async scan(context: PluginScanContext): Promise<PluginDetectedIssue[]> {
    const issues: PluginDetectedIssue[] = [];

    // In a real implementation, this would scan actual files
    // For demonstration, we return example issues

    // Example: Missing dependency in useEffect
    issues.push(
      this.createIssue(
        'Missing useEffect Dependencies',
        'useEffect hook is missing dependencies in its dependency array. This can cause stale closure bugs where the effect uses outdated values.',
        'high',
        {
          filePaths: ['src/components/UserProfile.tsx'],
          technicalImpact: 'Stale closures can cause subtle bugs where effects use outdated state or props',
          businessImpact: 'Data inconsistencies and unexpected behavior can affect user experience',
          detectionDetails: {
            hookType: 'useEffect',
            missingDeps: ['userId', 'fetchUser'],
            lineNumber: 45
          },
          customData: {
            hookComplexity: 7
          }
        }
      )
    );

    // Example: useCallback without dependencies
    issues.push(
      this.createIssue(
        'Unstable Callback Reference',
        'useCallback is used without a dependency array, creating a new function reference on every render. This defeats the purpose of useCallback.',
        'medium',
        {
          filePaths: ['src/components/DataTable.tsx'],
          technicalImpact: 'Creates unnecessary re-renders in child components that receive this callback',
          businessImpact: 'Performance degradation in complex UIs with many child components',
          detectionDetails: {
            hookType: 'useCallback',
            pattern: 'empty_dependency_array',
            lineNumber: 78
          },
          customData: {
            hookComplexity: 4
          }
        }
      )
    );

    // Example: useState inside loop/condition
    issues.push(
      this.createIssue(
        'Conditional Hook Call',
        'useState or useEffect called inside a conditional block. Hooks must be called in the same order on every render.',
        'critical',
        {
          filePaths: ['src/components/ConditionalFeature.tsx'],
          technicalImpact: 'Violates Rules of Hooks, can cause React to lose track of state',
          businessImpact: 'Application crashes or data loss in affected components',
          detectionDetails: {
            hookType: 'useState',
            violation: 'conditional_call',
            lineNumber: 23
          },
          customData: {
            hookComplexity: 10
          }
        }
      )
    );

    // Example: Large useEffect with multiple responsibilities
    issues.push(
      this.createIssue(
        'Overloaded useEffect Hook',
        'useEffect hook has too many responsibilities. Large effects are harder to test, debug, and maintain.',
        'medium',
        {
          filePaths: ['src/pages/Dashboard.tsx'],
          technicalImpact: 'Difficult to reason about effect timing and cleanup, prone to race conditions',
          businessImpact: 'Increased bug surface area and slower development velocity',
          detectionDetails: {
            hookType: 'useEffect',
            linesOfCode: 87,
            operations: ['fetch', 'subscribe', 'cleanup', 'setState'],
            lineNumber: 102
          },
          customData: {
            hookComplexity: 8
          }
        }
      )
    );

    return issues;
  }

  /**
   * Calculate risk score for hooks issues
   */
  private calculateHooksRisk(input: PluginRiskInput): number {
    const weights = this.riskWeights;
    const severityScore = this.severityToScore(input.severity);
    const fileScore = Math.min(10, input.filePaths.length * 3);
    const hookComplexity = (input.customFactors?.hookComplexity as number) || 5;

    const baseScore =
      severityScore * (weights.severity! / 100) +
      fileScore * (weights.fileCount! / 100) +
      hookComplexity * (weights.customWeights!.hookComplexity / 100);

    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, Math.round(baseScore * 10)));
  }

  private severityToScore(severity: string): number {
    const scores: Record<string, number> = {
      critical: 10,
      high: 7,
      medium: 5,
      low: 2
    };
    return scores[severity] || 5;
  }

  /**
   * Generate remediation plan for hooks issues
   */
  private generateHooksRemediationPlan(issue: PluginDetectedIssue): RemediationPlan {
    const detectionDetails = issue.detectionDetails;
    const hookType = detectionDetails.hookType as string;
    const violation = detectionDetails.violation as string | undefined;

    let steps: RemediationStep[];
    let summary: string;

    if (violation === 'conditional_call') {
      summary = 'Move hook call to top level of the component';
      steps = [
        {
          order: 1,
          title: 'Identify the conditional block',
          description: `Locate the ${hookType} call inside the conditional at line ${detectionDetails.lineNumber}`,
          estimatedMinutes: 5,
          validation: 'Hook call location identified'
        },
        {
          order: 2,
          title: 'Refactor component structure',
          description: 'Move the hook call to the top level of the component, before any conditions or returns',
          estimatedMinutes: 20,
          validation: 'Hook is now called unconditionally at top level'
        },
        {
          order: 3,
          title: 'Handle conditional logic differently',
          description: 'Use conditional rendering or effect guards instead of conditional hooks',
          estimatedMinutes: 15,
          validation: 'Component renders correctly with new structure'
        },
        {
          order: 4,
          title: 'Run ESLint rules-of-hooks check',
          description: 'Verify no eslint-plugin-react-hooks errors remain',
          estimatedMinutes: 5,
          validation: 'No hook rule violations detected'
        }
      ];
    } else if (detectionDetails.missingDeps) {
      summary = 'Add missing dependencies to the effect dependency array';
      steps = [
        {
          order: 1,
          title: 'Analyze effect dependencies',
          description: `Review the useEffect at line ${detectionDetails.lineNumber} and identify all values used inside`,
          estimatedMinutes: 10,
          validation: 'All dependencies identified'
        },
        {
          order: 2,
          title: 'Add missing dependencies',
          description: `Add ${(detectionDetails.missingDeps as string[]).join(', ')} to the dependency array`,
          estimatedMinutes: 5,
          validation: 'All dependencies added to array'
        },
        {
          order: 3,
          title: 'Verify effect behavior',
          description: 'Test that the effect triggers at the correct times with the new dependencies',
          estimatedMinutes: 15,
          validation: 'Effect runs when expected, no infinite loops'
        },
        {
          order: 4,
          title: 'Consider useCallback/useMemo if needed',
          description: 'If adding dependencies causes too many re-runs, memoize dependent values',
          estimatedMinutes: 20,
          validation: 'Effect runs efficiently without unnecessary triggers'
        }
      ];
    } else if (detectionDetails.linesOfCode && (detectionDetails.linesOfCode as number) > 50) {
      summary = 'Split large effect into smaller, focused effects';
      steps = [
        {
          order: 1,
          title: 'Identify distinct responsibilities',
          description: 'List all operations the effect performs (fetching, subscribing, cleanup, etc.)',
          estimatedMinutes: 15,
          validation: 'List of distinct responsibilities documented'
        },
        {
          order: 2,
          title: 'Create custom hooks',
          description: 'Extract related logic into custom hooks like useFetch, useSubscription, etc.',
          estimatedMinutes: 45,
          validation: 'Custom hooks created and tested'
        },
        {
          order: 3,
          title: 'Split into multiple useEffect calls',
          description: 'Replace the large effect with multiple focused effects, each with its own dependencies',
          estimatedMinutes: 30,
          validation: 'Multiple smaller effects replace the monolithic one'
        },
        {
          order: 4,
          title: 'Verify combined behavior',
          description: 'Test that the component behaves identically after refactoring',
          estimatedMinutes: 20,
          validation: 'All functionality preserved, easier to maintain'
        }
      ];
    } else {
      summary = 'Review and fix React hooks usage';
      steps = [
        {
          order: 1,
          title: 'Analyze hook usage',
          description: 'Review the hook implementation and identify the issue',
          estimatedMinutes: 15,
          validation: 'Issue root cause identified'
        },
        {
          order: 2,
          title: 'Apply fix',
          description: 'Implement the appropriate fix for the identified issue',
          estimatedMinutes: 30,
          validation: 'Fix applied successfully'
        },
        {
          order: 3,
          title: 'Test component',
          description: 'Verify the component works correctly after the fix',
          estimatedMinutes: 15,
          validation: 'Component functions as expected'
        }
      ];
    }

    const totalMinutes = steps.reduce((sum, step) => sum + step.estimatedMinutes, 0);

    return {
      summary,
      estimatedEffort: Math.round((totalMinutes / 60) * 10) / 10,
      prerequisites: [
        'React developer tools installed',
        'ESLint with eslint-plugin-react-hooks configured',
        'Test suite for affected components'
      ],
      steps,
      impactedFiles: issue.filePaths.map((path) => ({
        path,
        changeType: 'modify' as const,
        description: 'Fix hooks usage pattern'
      })),
      testingStrategy: 'Run unit tests for affected components, manually verify effect behavior in dev tools',
      rollbackPlan: 'Revert changes via version control if behavior regresses'
    };
  }
}

/**
 * Factory function for creating the plugin
 */
export function createReactHooksPlugin(): ReactHooksPlugin {
  return new ReactHooksPlugin();
}
