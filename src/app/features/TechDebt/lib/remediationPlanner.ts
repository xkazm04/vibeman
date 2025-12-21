/**
 * Remediation Plan Generator
 * Creates step-by-step plans for addressing technical debt
 */

import type {
  RemediationPlan,
  RemediationStep,
  TechDebtCategory,
  TechDebtSeverity
} from '@/app/db/models/tech-debt.types';

interface IssueInput {
  category: TechDebtCategory;
  title: string;
  description: string;
  severity: TechDebtSeverity;
  filePaths: string[];
  technicalImpact: string;
  businessImpact: string;
}

/**
 * Generate a comprehensive remediation plan
 */
export function generateRemediationPlan(issue: IssueInput): RemediationPlan {
  const steps = generateStepsForCategory(issue);
  const estimatedEffort = calculateEstimatedEffort(steps, issue.severity);
  const impactedFiles = generateImpactedFiles(issue.filePaths);

  return {
    summary: generateSummary(issue),
    estimatedEffort,
    prerequisites: generatePrerequisites(issue.category),
    steps,
    impactedFiles,
    testingStrategy: generateTestingStrategy(issue.category),
    rollbackPlan: generateRollbackPlan(issue.category)
  };
}

/**
 * Generate summary of remediation approach
 */
function generateSummary(issue: IssueInput): string {
  const categoryActions: Record<TechDebtCategory, string> = {
    code_quality: 'Refactor code to improve quality and reduce complexity',
    security: 'Apply security patches and harden vulnerable areas',
    performance: 'Optimize algorithms and improve resource utilization',
    maintainability: 'Restructure code for better maintainability',
    testing: 'Increase test coverage and improve test quality',
    documentation: 'Update and expand documentation',
    dependencies: 'Update dependencies and resolve version conflicts',
    architecture: 'Refactor architecture for better scalability',
    other: 'Address identified technical debt issue'
  };

  return `${categoryActions[issue.category]}: ${issue.title}`;
}

/**
 * Generate steps based on category
 */
function generateStepsForCategory(issue: IssueInput): RemediationStep[] {
  switch (issue.category) {
    case 'code_quality':
      return generateCodeQualitySteps(issue);
    case 'security':
      return generateSecuritySteps(issue);
    case 'performance':
      return generatePerformanceSteps(issue);
    case 'testing':
      return generateTestingSteps(issue);
    case 'documentation':
      return generateDocumentationSteps(issue);
    case 'dependencies':
      return generateDependencySteps(issue);
    case 'architecture':
      return generateArchitectureSteps(issue);
    case 'maintainability':
      return generateMaintainabilitySteps(issue);
    default:
      return generateGenericSteps(issue);
  }
}

/**
 * Code quality remediation steps
 */
function generateCodeQualitySteps(issue: IssueInput): RemediationStep[] {
  if (issue.title.includes('TODO') || issue.title.includes('FIXME')) {
    return [
      {
        order: 1,
        title: 'Identify and catalog all TODO/FIXME comments',
        description: 'Search codebase for TODO and FIXME comments, create list with context',
        estimatedMinutes: 30,
        validation: 'Complete list of comments with file locations'
      },
      {
        order: 2,
        title: 'Prioritize comments by impact',
        description: 'Assess each comment for business impact and technical complexity',
        estimatedMinutes: 45,
        validation: 'Prioritized list with effort estimates'
      },
      {
        order: 3,
        title: 'Implement high-priority items',
        description: 'Address critical TODO/FIXME items with proper implementations',
        estimatedMinutes: 240,
        validation: 'Code changes committed, comments removed or updated'
      },
      {
        order: 4,
        title: 'Convert remaining items to tracked issues',
        description: 'Create backlog items for non-critical TODOs to track properly',
        estimatedMinutes: 30,
        validation: 'All comments either resolved or tracked in backlog'
      }
    ];
  }

  if (issue.title.includes('Console')) {
    return [
      {
        order: 1,
        title: 'Audit all console statements',
        description: 'Find all console.log, console.warn, console.error in codebase',
        estimatedMinutes: 20,
        validation: 'Complete list of console statements'
      },
      {
        order: 2,
        title: 'Implement proper logging solution',
        description: 'Set up structured logging library (e.g., winston, pino)',
        estimatedMinutes: 60,
        validation: 'Logging library configured and documented'
      },
      {
        order: 3,
        title: 'Replace console statements',
        description: 'Replace console calls with proper logging or remove if debugging-only',
        estimatedMinutes: 90,
        validation: 'No console statements in production code paths'
      }
    ];
  }

  return generateGenericSteps(issue);
}

/**
 * Security remediation steps
 */
function generateSecuritySteps(issue: IssueInput): RemediationStep[] {
  return [
    {
      order: 1,
      title: 'Run security audit',
      description: 'Execute npm audit and document all vulnerabilities',
      estimatedMinutes: 15,
      validation: 'Audit report with severity levels'
    },
    {
      order: 2,
      title: 'Research vulnerability fixes',
      description: 'Identify available patches and breaking changes',
      estimatedMinutes: 60,
      validation: 'Fix plan for each vulnerability'
    },
    {
      order: 3,
      title: 'Update vulnerable dependencies',
      description: 'Apply security patches and test for breaking changes',
      estimatedMinutes: 120,
      validation: 'Dependencies updated, tests passing'
    },
    {
      order: 4,
      title: 'Verify security improvements',
      description: 'Re-run security audit to confirm vulnerabilities resolved',
      estimatedMinutes: 15,
      validation: 'Clean security audit report'
    }
  ];
}

/**
 * Performance remediation steps
 */
function generatePerformanceSteps(issue: IssueInput): RemediationStep[] {
  return [
    {
      order: 1,
      title: 'Profile current performance',
      description: 'Use Chrome DevTools or similar to establish baseline metrics',
      estimatedMinutes: 45,
      validation: 'Performance metrics documented'
    },
    {
      order: 2,
      title: 'Identify bottlenecks',
      description: 'Analyze profiling data to find slow operations',
      estimatedMinutes: 60,
      validation: 'List of specific bottlenecks with evidence'
    },
    {
      order: 3,
      title: 'Implement optimizations',
      description: 'Apply targeted optimizations (memoization, lazy loading, etc.)',
      estimatedMinutes: 180,
      validation: 'Code changes committed with comments'
    },
    {
      order: 4,
      title: 'Measure improvements',
      description: 'Re-run performance profiling and compare to baseline',
      estimatedMinutes: 30,
      validation: 'Measurable performance improvement documented'
    }
  ];
}

/**
 * Testing remediation steps
 */
function generateTestingSteps(issue: IssueInput): RemediationStep[] {
  return [
    {
      order: 1,
      title: 'Measure current test coverage',
      description: 'Run coverage report to establish baseline',
      estimatedMinutes: 10,
      validation: 'Coverage report showing percentages by file'
    },
    {
      order: 2,
      title: 'Identify critical untested paths',
      description: 'Focus on business-critical code with low coverage',
      estimatedMinutes: 45,
      validation: 'Prioritized list of files/functions to test'
    },
    {
      order: 3,
      title: 'Write missing tests',
      description: 'Create unit and integration tests for identified gaps',
      estimatedMinutes: 240,
      validation: 'New tests written and passing'
    },
    {
      order: 4,
      title: 'Verify coverage improvement',
      description: 'Re-run coverage report to confirm improvement',
      estimatedMinutes: 10,
      validation: 'Coverage increased to target threshold'
    }
  ];
}

/**
 * Documentation remediation steps
 */
function generateDocumentationSteps(issue: IssueInput): RemediationStep[] {
  return [
    {
      order: 1,
      title: 'Audit existing documentation',
      description: 'Review all docs for completeness and accuracy',
      estimatedMinutes: 60,
      validation: 'List of documentation gaps'
    },
    {
      order: 2,
      title: 'Create documentation plan',
      description: 'Prioritize what to document based on user needs',
      estimatedMinutes: 30,
      validation: 'Documentation outline with priorities'
    },
    {
      order: 3,
      title: 'Write missing documentation',
      description: 'Create clear, comprehensive docs for identified gaps',
      estimatedMinutes: 180,
      validation: 'Documentation written and reviewed'
    },
    {
      order: 4,
      title: 'Update outdated documentation',
      description: 'Ensure all existing docs reflect current implementation',
      estimatedMinutes: 90,
      validation: 'All docs accurate and current'
    }
  ];
}

/**
 * Dependency remediation steps
 */
function generateDependencySteps(issue: IssueInput): RemediationStep[] {
  return [
    {
      order: 1,
      title: 'Check for outdated dependencies',
      description: 'Run npm outdated to identify update candidates',
      estimatedMinutes: 10,
      validation: 'List of outdated packages with versions'
    },
    {
      order: 2,
      title: 'Review changelogs and breaking changes',
      description: 'Check release notes for each update',
      estimatedMinutes: 60,
      validation: 'Update plan with migration notes'
    },
    {
      order: 3,
      title: 'Update dependencies incrementally',
      description: 'Update one at a time, testing after each',
      estimatedMinutes: 120,
      validation: 'Dependencies updated, tests passing'
    },
    {
      order: 4,
      title: 'Verify application stability',
      description: 'Run full test suite and manual testing',
      estimatedMinutes: 45,
      validation: 'All tests passing, no regressions'
    }
  ];
}

/**
 * Architecture remediation steps
 */
function generateArchitectureSteps(issue: IssueInput): RemediationStep[] {
  return [
    {
      order: 1,
      title: 'Document current architecture',
      description: 'Create diagrams showing current system structure',
      estimatedMinutes: 90,
      validation: 'Architecture diagrams created'
    },
    {
      order: 2,
      title: 'Design improved architecture',
      description: 'Propose refactoring plan to address issues',
      estimatedMinutes: 120,
      validation: 'New architecture design documented'
    },
    {
      order: 3,
      title: 'Implement architectural changes',
      description: 'Refactor code to new architecture incrementally',
      estimatedMinutes: 480,
      validation: 'Refactoring completed, tests passing'
    },
    {
      order: 4,
      title: 'Validate improvements',
      description: 'Verify that architectural issues are resolved',
      estimatedMinutes: 60,
      validation: 'Architecture review completed'
    }
  ];
}

/**
 * Maintainability remediation steps
 */
function generateMaintainabilitySteps(issue: IssueInput): RemediationStep[] {
  return [
    {
      order: 1,
      title: 'Analyze code complexity',
      description: 'Run static analysis tools to measure complexity',
      estimatedMinutes: 20,
      validation: 'Complexity metrics report'
    },
    {
      order: 2,
      title: 'Identify high-complexity areas',
      description: 'Find functions/modules with excessive complexity',
      estimatedMinutes: 30,
      validation: 'Prioritized list of complex code'
    },
    {
      order: 3,
      title: 'Refactor complex code',
      description: 'Break down complex functions, extract methods, simplify logic',
      estimatedMinutes: 240,
      validation: 'Complexity reduced, tests passing'
    },
    {
      order: 4,
      title: 'Add code comments',
      description: 'Document complex logic and design decisions',
      estimatedMinutes: 60,
      validation: 'Code well-commented and understandable'
    }
  ];
}

/**
 * Accessibility remediation steps
 */
function generateAccessibilitySteps(issue: IssueInput): RemediationStep[] {
  return [
    {
      order: 1,
      title: 'Run accessibility audit',
      description: 'Use axe or Lighthouse to identify issues',
      estimatedMinutes: 30,
      validation: 'Audit report with specific issues'
    },
    {
      order: 2,
      title: 'Fix critical accessibility issues',
      description: 'Address WCAG Level A violations',
      estimatedMinutes: 120,
      validation: 'Critical issues resolved'
    },
    {
      order: 3,
      title: 'Implement WCAG AA compliance',
      description: 'Add ARIA labels, keyboard navigation, color contrast',
      estimatedMinutes: 180,
      validation: 'WCAG AA standards met'
    },
    {
      order: 4,
      title: 'Test with assistive technologies',
      description: 'Verify with screen readers and keyboard-only navigation',
      estimatedMinutes: 60,
      validation: 'Manual accessibility testing completed'
    }
  ];
}

/**
 * Generic remediation steps
 */
function generateGenericSteps(issue: IssueInput): RemediationStep[] {
  return [
    {
      order: 1,
      title: 'Investigate issue',
      description: `Analyze the issue: ${issue.title}`,
      estimatedMinutes: 45,
      validation: 'Root cause identified'
    },
    {
      order: 2,
      title: 'Design solution',
      description: 'Create detailed plan to address the issue',
      estimatedMinutes: 60,
      validation: 'Solution design documented'
    },
    {
      order: 3,
      title: 'Implement fix',
      description: 'Execute the solution plan',
      estimatedMinutes: 120,
      validation: 'Implementation completed and tested'
    },
    {
      order: 4,
      title: 'Verify resolution',
      description: 'Confirm the issue is fully resolved',
      estimatedMinutes: 30,
      validation: 'Issue verified as resolved'
    }
  ];
}

/**
 * Calculate total estimated effort
 */
function calculateEstimatedEffort(steps: RemediationStep[], severity: TechDebtSeverity): number {
  const baseMinutes = steps.reduce((sum, step) => sum + step.estimatedMinutes, 0);

  // Add buffer based on severity
  const bufferMultiplier = {
    critical: 1.5,
    high: 1.3,
    medium: 1.2,
    low: 1.1
  };

  const totalMinutes = baseMinutes * bufferMultiplier[severity];
  return Math.round(totalMinutes / 60 * 10) / 10; // Convert to hours, round to 1 decimal
}

/**
 * Generate impacted files list
 */
function generateImpactedFiles(filePaths: string[]): Array<{
  path: string;
  changeType: 'modify' | 'create' | 'delete';
  description: string;
}> {
  return filePaths.map((path) => ({
    path,
    changeType: 'modify' as const,
    description: 'Update to address technical debt'
  }));
}

/**
 * Generate prerequisites
 */
function generatePrerequisites(category: TechDebtCategory): string[] {
  const prereqs: Record<TechDebtCategory, string[]> = {
    code_quality: ['Development environment setup', 'Code review approval'],
    security: ['Security audit tools installed', 'Backup of current system'],
    performance: ['Performance profiling tools', 'Test environment'],
    maintainability: ['Refactoring tools', 'Test suite passing'],
    testing: ['Testing framework setup', 'Coverage tools installed'],
    documentation: ['Documentation platform access', 'Style guide'],
    dependencies: ['Package manager updated', 'Dependency audit completed'],
    architecture: ['Architecture approval', 'Migration plan reviewed'],
    accessibility: ['Accessibility testing tools', 'WCAG guidelines'],
    other: ['Requirements clarified', 'Approval obtained']
  };

  return prereqs[category];
}

/**
 * Generate testing strategy
 */
function generateTestingStrategy(category: TechDebtCategory): string {
  const strategies: Record<TechDebtCategory, string> = {
    code_quality: 'Run unit tests, verify code quality metrics improved, peer review changes',
    security: 'Run security audit tools, penetration testing, verify no new vulnerabilities',
    performance: 'Performance profiling before/after, load testing, verify metrics improved',
    maintainability: 'Code review for readability, verify complexity metrics, run all tests',
    testing: 'Verify coverage increased, all tests passing, no flaky tests',
    documentation: 'Peer review for clarity, verify examples work, check completeness',
    dependencies: 'Full regression testing, verify no breaking changes, check compatibility',
    architecture: 'Integration testing, system testing, verify all features work',
    accessibility: 'Automated accessibility tests, screen reader testing, keyboard navigation',
    other: 'Comprehensive testing appropriate to changes made'
  };

  return strategies[category];
}

/**
 * Generate rollback plan
 */
function generateRollbackPlan(category: TechDebtCategory): string {
  return 'If issues arise: 1) Revert changes via version control, 2) Restore from backup if needed, 3) Document lessons learned, 4) Revise remediation plan';
}
