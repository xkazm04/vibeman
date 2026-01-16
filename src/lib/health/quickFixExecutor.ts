/**
 * Quick Fix Executor
 * Handles one-click remediation for common configuration issues
 */

export type QuickFixId =
  | 'run_blueprint'
  | 'configure_api'
  | 'open_ideas_tinder'
  | 'run_tech_debt_scan'
  | 'run_security_scan'
  | 'apply_patches'
  | 'generate_tests'
  | 'run_refactor_wizard';

export interface QuickFixResult {
  success: boolean;
  message: string;
  error?: string;
  redirectTo?: string;
  actionRequired?: string;
  data?: Record<string, unknown>;
}

export interface QuickFixDefinition {
  id: QuickFixId;
  name: string;
  description: string;
  estimatedDuration: string;
  requiresConfirmation: boolean;
  isDestructive: boolean;
}

// Quick fix definitions
export const QUICK_FIXES: Record<QuickFixId, QuickFixDefinition> = {
  run_blueprint: {
    id: 'run_blueprint',
    name: 'Run Blueprint Scan',
    description: 'Analyze your project structure and generate initial contexts',
    estimatedDuration: '30-60 seconds',
    requiresConfirmation: false,
    isDestructive: false,
  },
  configure_api: {
    id: 'configure_api',
    name: 'Configure API Keys',
    description: 'Set up LLM provider API keys for AI features',
    estimatedDuration: '2-5 minutes',
    requiresConfirmation: false,
    isDestructive: false,
  },
  open_ideas_tinder: {
    id: 'open_ideas_tinder',
    name: 'Review Ideas (Tinder Mode)',
    description: 'Quickly swipe through pending ideas to accept or reject',
    estimatedDuration: '5-10 minutes',
    requiresConfirmation: false,
    isDestructive: false,
  },
  run_tech_debt_scan: {
    id: 'run_tech_debt_scan',
    name: 'Run Tech Debt Scan',
    description: 'Scan codebase for technical debt issues',
    estimatedDuration: '1-2 minutes',
    requiresConfirmation: false,
    isDestructive: false,
  },
  run_security_scan: {
    id: 'run_security_scan',
    name: 'Run Security Scan',
    description: 'Scan for security vulnerabilities in dependencies',
    estimatedDuration: '1-2 minutes',
    requiresConfirmation: false,
    isDestructive: false,
  },
  apply_patches: {
    id: 'apply_patches',
    name: 'Apply Security Patches',
    description: 'Apply pending security patches to dependencies',
    estimatedDuration: '2-5 minutes',
    requiresConfirmation: true,
    isDestructive: false,
  },
  generate_tests: {
    id: 'generate_tests',
    name: 'Generate Test Scenarios',
    description: 'Use AI to generate test scenarios for your code',
    estimatedDuration: '1-3 minutes',
    requiresConfirmation: false,
    isDestructive: false,
  },
  run_refactor_wizard: {
    id: 'run_refactor_wizard',
    name: 'Run Refactor Wizard',
    description: 'Analyze code for refactoring opportunities',
    estimatedDuration: '2-5 minutes',
    requiresConfirmation: false,
    isDestructive: false,
  },
};

/**
 * Execute a quick fix action
 * Returns result with success status and any follow-up actions
 */
export async function executeQuickFix(
  quickFixId: QuickFixId,
  projectId: string,
  options?: Record<string, unknown>
): Promise<QuickFixResult> {
  const fix = QUICK_FIXES[quickFixId];
  if (!fix) {
    return {
      success: false,
      message: 'Unknown quick fix',
      error: `Quick fix '${quickFixId}' not found`,
    };
  }

  try {
    switch (quickFixId) {
      case 'run_blueprint':
        return await executeRunBlueprint(projectId);

      case 'configure_api':
        return executeConfigureApi();

      case 'open_ideas_tinder':
        return executeOpenIdeasTinder(projectId);

      case 'run_tech_debt_scan':
        return await executeRunTechDebtScan(projectId);

      case 'run_security_scan':
        return await executeRunSecurityScan(projectId);

      case 'apply_patches':
        return await executeApplyPatches(projectId, options?.patchIds as string[] | undefined);

      case 'generate_tests':
        return executeGenerateTests(projectId);

      case 'run_refactor_wizard':
        return executeRunRefactorWizard(projectId);

      default:
        return {
          success: false,
          message: 'Quick fix not implemented',
          error: `Quick fix '${quickFixId}' is not yet implemented`,
        };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Quick fix failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run Blueprint scan
 */
async function executeRunBlueprint(projectId: string): Promise<QuickFixResult> {
  // This triggers a navigation to the Blueprint modal
  return {
    success: true,
    message: 'Opening Blueprint scan...',
    redirectTo: `/blueprint?projectId=${projectId}`,
    actionRequired: 'open_blueprint_modal',
  };
}

/**
 * Configure API keys
 */
function executeConfigureApi(): QuickFixResult {
  return {
    success: true,
    message: 'Opening API configuration...',
    redirectTo: '/settings/api',
    actionRequired: 'open_settings_api',
  };
}

/**
 * Open Ideas Tinder for review
 */
function executeOpenIdeasTinder(projectId: string): QuickFixResult {
  return {
    success: true,
    message: 'Opening Ideas Tinder...',
    redirectTo: `/ideas/tinder?projectId=${projectId}`,
    actionRequired: 'open_ideas_tinder',
  };
}

/**
 * Run tech debt scan
 */
async function executeRunTechDebtScan(projectId: string): Promise<QuickFixResult> {
  try {
    const response = await fetch('/api/scan-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        scanType: 'tech_debt',
        priority: 'high',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to queue tech debt scan');
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Tech debt scan queued successfully',
      data: { scanId: data.id },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to start tech debt scan',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run security scan
 */
async function executeRunSecurityScan(projectId: string): Promise<QuickFixResult> {
  try {
    const response = await fetch('/api/scan-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        scanType: 'security',
        priority: 'high',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to queue security scan');
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Security scan queued successfully',
      data: { scanId: data.id },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to start security scan',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Apply security patches
 */
async function executeApplyPatches(
  projectId: string,
  patchIds?: string[]
): Promise<QuickFixResult> {
  try {
    const response = await fetch('/api/security-patches/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        patchIds,
        applyAll: !patchIds || patchIds.length === 0,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to apply patches');
    }

    const data = await response.json();
    return {
      success: true,
      message: `Applied ${data.appliedCount || 0} security patches`,
      data: { appliedCount: data.appliedCount },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to apply security patches',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate test scenarios
 */
function executeGenerateTests(projectId: string): QuickFixResult {
  return {
    success: true,
    message: 'Opening Test Scenario Generator...',
    redirectTo: `/tests/generate?projectId=${projectId}`,
    actionRequired: 'open_test_generator',
  };
}

/**
 * Run refactor wizard
 */
function executeRunRefactorWizard(projectId: string): QuickFixResult {
  return {
    success: true,
    message: 'Opening Refactor Wizard...',
    redirectTo: `/refactor?projectId=${projectId}`,
    actionRequired: 'open_refactor_wizard',
  };
}

/**
 * Check if a quick fix requires user confirmation
 */
export function requiresConfirmation(quickFixId: QuickFixId): boolean {
  return QUICK_FIXES[quickFixId]?.requiresConfirmation ?? false;
}

/**
 * Get quick fix definition
 */
export function getQuickFixDefinition(quickFixId: QuickFixId): QuickFixDefinition | null {
  return QUICK_FIXES[quickFixId] || null;
}

/**
 * Get all available quick fixes
 */
export function getAllQuickFixes(): QuickFixDefinition[] {
  return Object.values(QUICK_FIXES);
}
