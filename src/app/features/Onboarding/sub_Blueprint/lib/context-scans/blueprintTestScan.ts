/**
 * Blueprint Test Scan Library
 * Generates and executes automated Playwright tests using Claude Code
 */

import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { executePipeline } from '../pipeline';
import { useBlueprintStore } from '../../store/blueprintStore';

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: {
    taskId: string;
    requirementPath: string;
    contextId: string;
    contextName: string;
  };
}

export interface DecisionData {
  type: string;
  title: string;
  description: string;
  count?: number;
  severity?: 'info' | 'warning' | 'error';
  projectId?: string;
  projectPath?: string;
  contextId?: string;
  data?: any;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

/**
 * Execute test scan for a specific context using Claude Code pipeline
 */
export async function executeTestScan(contextId: string): Promise<ScanResult> {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return {
      success: false,
      error: 'No active project selected',
    };
  }

  if (!contextId) {
    return {
      success: false,
      error: 'No context ID provided',
    };
  }

  try {
    // Get context info first
    const contextResponse = await fetch(`/api/contexts/${contextId}`);
    if (!contextResponse.ok) {
      return {
        success: false,
        error: 'Failed to fetch context information',
      };
    }

    const contextData = await contextResponse.json();
    const contextName = contextData.name || 'Unknown Context';

    // Build requirement content via API (server-side)
    const buildResponse = await fetch('/api/blueprint/test-requirement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contextId,
        projectId: activeProject.id,
      }),
    });

    const buildResult = await buildResponse.json();

    if (!buildResult.success || !buildResult.requirementContent) {
      return {
        success: false,
        error: buildResult.error || 'Failed to build requirement content',
      };
    }

    // Execute pipeline with progress tracking
    const result = await executePipeline({
      projectPath: activeProject.path,
      projectId: activeProject.id,
      requirementName: `test-${contextId}`,
      requirementContent: buildResult.requirementContent,
      onProgress: (progress, message) => {
        // Update Blueprint store with progress
        useBlueprintStore.getState().updateScanProgress(progress);
        console.log(`[Test Scan] ${progress}%: ${message}`);
      },
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Pipeline execution failed',
      };
    }

    return {
      success: true,
      data: {
        taskId: result.taskId || '',
        requirementPath: result.requirementPath || '',
        contextId,
        contextName,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Test scan failed unexpectedly';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Build decision data for test scan results
 */
export function buildDecisionData(result: ScanResult): DecisionData | null {
  const { activeProject } = useActiveProjectStore.getState();

  if (!activeProject) {
    return null;
  }

  // Handle error cases
  if (!result.success) {
    return {
      type: 'test-scan-error',
      title: 'Test Scan Failed',
      description: `An error occurred while running the test scan:\n\n${result.error || 'Unknown error'}\n\nPlease check the console for more details.`,
      count: 0,
      severity: 'error',
      projectId: activeProject.id,
      projectPath: activeProject.path,
      data: { error: result.error },
      onAccept: async () => {
        // Error acknowledged
      },
      onReject: async () => {
        // Error dismissed
      },
    };
  }

  if (!result.data) {
    return null;
  }

  const { taskId, contextName } = result.data;

  return {
    type: 'test-scan',
    title: 'Test Scan Completed',
    description: `✅ Claude Code has completed automated testing for **${contextName}**.\n\n🔍 **Task ID**: ${taskId}\n\n**Test Process Completed:**\n- ✅ Environment diagnostics\n- ✅ Test scenario analysis\n- ✅ Playwright test execution\n- ✅ Screenshot capture\n- ✅ Issue documentation\n\n**Generated Artifacts:**\n- Test requirement file\n- Test execution results\n- Issue report with severity levels\n- Process improvement suggestions\n\n📄 **Report Location**: \`.claude/commands/test-report-${result.data.contextId}.md\`\n\nClick **Accept** to acknowledge completion.`,
    count: 1,
    severity: 'info',
    projectId: activeProject.id,
    projectPath: activeProject.path,
    contextId: result.data.contextId,
    data: { taskId, contextId: result.data.contextId, contextName },

    // Accept: Acknowledge completion
    onAccept: async () => {
      console.log('[Test Scan] User acknowledged completion');
    },

    // Reject: Not applicable
    onReject: async () => {
      console.log('[Test Scan] User dismissed notification');
    },
  };
}
