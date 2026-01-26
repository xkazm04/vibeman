/**
 * Task/Execution Tools - Implementation for Annette's task-related tool calls
 */

import { scanQueueDb, implementationLogDb } from '@/app/db';

/**
 * CLI Execution info returned when a tool triggers immediate execution
 * The frontend uses this to display the MiniTerminal inline
 */
export interface CLIExecutionInfo {
  /** Indicates this response should trigger CLI display */
  showCLI: boolean;
  /** Requirement name to execute */
  requirementName: string;
  /** Project path for execution */
  projectPath: string;
  /** Project ID */
  projectId: string;
  /** Optional execution ID if already started */
  executionId?: string;
  /** Whether to auto-start execution */
  autoStart: boolean;
}

export async function executeTaskTools(
  name: string,
  input: Record<string, unknown>,
  projectId: string,
  projectPath?: string
): Promise<string> {
  switch (name) {
    case 'get_queue_status': {
      const items = scanQueueDb.getQueueByProject(projectId);
      const pending = items.filter(i => i.status === 'queued');
      const running = items.filter(i => i.status === 'running');
      const completed = items.filter(i => i.status === 'completed');
      const failed = items.filter(i => i.status === 'failed');

      return JSON.stringify({
        total: items.length,
        pending: pending.length,
        running: running.length,
        completed: completed.length,
        failed: failed.length,
        currentlyRunning: running.map(i => ({
          id: i.id,
          type: i.scan_type,
          startedAt: i.started_at,
        })),
        nextPending: pending.slice(0, 3).map(i => ({
          id: i.id,
          type: i.scan_type,
          createdAt: i.created_at,
        })),
      });
    }

    case 'queue_requirement': {
      const requirementName = input.requirement_name as string;
      const requirementContent = input.requirement_content as string;

      if (!requirementName || !requirementContent) {
        return JSON.stringify({ error: 'requirement_name and requirement_content are required' });
      }

      try {
        const response = await fetch('http://localhost:3000/api/claude-code/requirement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            projectPath,
            name: requirementName,
            content: requirementContent,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return JSON.stringify({ success: false, error });
        }

        const data = await response.json();
        return JSON.stringify({
          success: true,
          message: `Requirement "${requirementName}" queued for execution.`,
          requirementId: data.id || data.requirementId,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to queue requirement' });
      }
    }

    case 'get_execution_status': {
      try {
        const response = await fetch(`http://localhost:3000/api/claude-code/status?projectId=${projectId}`);

        if (!response.ok) {
          return JSON.stringify({ running: false, message: 'No active executions' });
        }

        const data = await response.json();
        return JSON.stringify(data);
      } catch (error) {
        return JSON.stringify({ running: false, error: 'Failed to check execution status' });
      }
    }

    case 'get_implementation_logs': {
      const limit = parseInt(String(input.limit || '5'), 10);

      try {
        const logs = implementationLogDb.getRecentLogsByProject(projectId, limit);
        return JSON.stringify({
          total: logs.length,
          logs: logs.map(l => ({
            id: l.id,
            title: l.title,
            overview: l.overview?.substring(0, 150),
            tested: !!l.tested,
            createdAt: l.created_at,
          })),
        });
      } catch (error) {
        return JSON.stringify({ logs: [], error: 'Failed to fetch implementation logs' });
      }
    }

    case 'execute_now': {
      // Execute a requirement immediately with CLI visibility
      const requirementName = input.requirement_name as string;
      const requirementContent = input.requirement_content as string;

      if (!requirementName || !requirementContent) {
        return JSON.stringify({ error: 'requirement_name and requirement_content are required' });
      }

      if (!projectPath) {
        return JSON.stringify({ error: 'Project path is required for immediate execution' });
      }

      try {
        // First, create the requirement file
        const reqResponse = await fetch('http://localhost:3000/api/claude-code/requirement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            projectPath,
            name: requirementName,
            content: requirementContent,
          }),
        });

        if (!reqResponse.ok) {
          const error = await reqResponse.text();
          return JSON.stringify({ success: false, error });
        }

        // Return CLI execution info for frontend to display MiniTerminal
        const cliInfo: CLIExecutionInfo = {
          showCLI: true,
          requirementName,
          projectPath,
          projectId,
          autoStart: true,
        };

        return JSON.stringify({
          success: true,
          message: `Starting execution of "${requirementName}". Watch the progress below.`,
          cliExecution: cliInfo,
        });
      } catch (error) {
        return JSON.stringify({ success: false, error: 'Failed to start execution' });
      }
    }

    case 'execute_requirement': {
      // Execute an existing requirement file with CLI visibility
      const requirementName = input.requirement_name as string;

      if (!requirementName) {
        return JSON.stringify({ error: 'requirement_name is required' });
      }

      if (!projectPath) {
        return JSON.stringify({ error: 'Project path is required for execution' });
      }

      // Return CLI execution info for frontend to display MiniTerminal
      const cliInfo: CLIExecutionInfo = {
        showCLI: true,
        requirementName,
        projectPath,
        projectId,
        autoStart: true,
      };

      return JSON.stringify({
        success: true,
        message: `Starting execution of "${requirementName}". Watch the progress below.`,
        cliExecution: cliInfo,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown task tool: ${name}` });
  }
}
