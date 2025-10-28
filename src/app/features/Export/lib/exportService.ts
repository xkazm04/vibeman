/**
 * Export Service
 * Handles exporting AI reviews, docs, goals, tasks, and code tasks
 * Supports both JSON and Markdown formats with metadata
 */

import { goalDb, backlogDb, contextDb, scanDb, implementationLogDb } from '@/app/db';
import type { DbGoal, DbBacklogItem, DbContext, DbScan, DbImplementationLog } from '@/app/db/models/types';

export interface ExportMetadata {
  exportedAt: string;
  exportVersion: string;
  projectId: string;
  projectName: string;
  llmProvider?: string;
  format: 'json' | 'markdown';
}

export interface ExportData {
  metadata: ExportMetadata;
  aiDocs?: {
    content: string;
    generatedAt?: string;
    provider?: string;
  };
  goals: DbGoal[];
  tasks: DbBacklogItem[];
  contexts: DbContext[];
  scans: DbScan[];
  implementationLogs: DbImplementationLog[];
}

/**
 * Gather all project data for export
 */
export async function gatherExportData(
  projectId: string,
  projectName: string,
  options: {
    includeAIDocs?: boolean;
    aiDocsContent?: string;
    aiDocsProvider?: string;
    llmProvider?: string;
  } = {}
): Promise<ExportData> {
  // Gather all data from database
  const goals = goalDb.getGoalsByProject(projectId);
  const tasks = backlogDb.getBacklogByProject(projectId);
  const contexts = contextDb.getContextsByProject(projectId);
  const scans = scanDb.getScansByProject(projectId);
  const implementationLogs = implementationLogDb.getLogsByProject(projectId);

  const metadata: ExportMetadata = {
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0.0',
    projectId,
    projectName,
    llmProvider: options.llmProvider,
    format: 'json' // Will be updated when formatting
  };

  const exportData: ExportData = {
    metadata,
    goals,
    tasks,
    contexts,
    scans,
    implementationLogs
  };

  // Include AI docs if requested
  if (options.includeAIDocs && options.aiDocsContent) {
    exportData.aiDocs = {
      content: options.aiDocsContent,
      generatedAt: new Date().toISOString(),
      provider: options.aiDocsProvider
    };
  }

  return exportData;
}

/**
 * Export data as JSON format
 */
export function exportAsJSON(data: ExportData): string {
  const jsonData = {
    ...data,
    metadata: {
      ...data.metadata,
      format: 'json'
    }
  };

  return JSON.stringify(jsonData, null, 2);
}

/**
 * Export data as Markdown format
 */
export function exportAsMarkdown(data: ExportData): string {
  const { metadata, aiDocs, goals, tasks, contexts, scans, implementationLogs } = data;

  let markdown = '';

  // Header
  markdown += `# ${metadata.projectName} - AI Review Export\n\n`;

  // Metadata section
  markdown += `## Export Metadata\n\n`;
  markdown += `- **Exported At**: ${new Date(metadata.exportedAt).toLocaleString()}\n`;
  markdown += `- **Export Version**: ${metadata.exportVersion}\n`;
  markdown += `- **Project ID**: ${metadata.projectId}\n`;
  if (metadata.llmProvider) {
    markdown += `- **LLM Provider**: ${metadata.llmProvider}\n`;
  }
  markdown += `\n---\n\n`;

  // AI Documentation section
  if (aiDocs) {
    markdown += `## AI Documentation Review\n\n`;
    if (aiDocs.provider) {
      markdown += `**Provider**: ${aiDocs.provider}\n\n`;
    }
    if (aiDocs.generatedAt) {
      markdown += `**Generated**: ${new Date(aiDocs.generatedAt).toLocaleString()}\n\n`;
    }
    markdown += `${aiDocs.content}\n\n`;
    markdown += `---\n\n`;
  }

  // Goals section
  markdown += `## Goals (${goals.length})\n\n`;
  if (goals.length === 0) {
    markdown += `*No goals found*\n\n`;
  } else {
    const statusGroups = {
      in_progress: goals.filter(g => g.status === 'in_progress'),
      open: goals.filter(g => g.status === 'open'),
      done: goals.filter(g => g.status === 'done'),
      rejected: goals.filter(g => g.status === 'rejected'),
      undecided: goals.filter(g => g.status === 'undecided')
    };

    for (const [status, statusGoals] of Object.entries(statusGroups)) {
      if (statusGoals.length > 0) {
        markdown += `### ${status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')} (${statusGoals.length})\n\n`;

        statusGoals.forEach((goal, index) => {
          markdown += `${index + 1}. **${goal.title}**\n`;
          if (goal.description) {
            markdown += `   ${goal.description}\n`;
          }
          if (goal.context_id) {
            markdown += `   *Context ID*: ${goal.context_id}\n`;
          }
          markdown += `   *Created*: ${new Date(goal.created_at).toLocaleString()}\n\n`;
        });
      }
    }
  }
  markdown += `---\n\n`;

  // Tasks/Backlog section
  markdown += `## Tasks & Backlog (${tasks.length})\n\n`;
  if (tasks.length === 0) {
    markdown += `*No tasks found*\n\n`;
  } else {
    const taskGroups = {
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      accepted: tasks.filter(t => t.status === 'accepted'),
      pending: tasks.filter(t => t.status === 'pending'),
      rejected: tasks.filter(t => t.status === 'rejected')
    };

    for (const [status, statusTasks] of Object.entries(taskGroups)) {
      if (statusTasks.length > 0) {
        markdown += `### ${status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')} (${statusTasks.length})\n\n`;

        statusTasks.forEach((task, index) => {
          markdown += `${index + 1}. **${task.title}** [${task.agent}]\n`;
          markdown += `   ${task.description}\n`;

          if (task.impacted_files) {
            try {
              const files = JSON.parse(task.impacted_files);
              if (files && files.length > 0) {
                markdown += `\n   **Impacted Files:**\n`;
                files.forEach((file: any) => {
                  markdown += `   - \`${file.path || file.filepath}\` (${file.changeType || file.type})\n`;
                });
              }
            } catch (e) {
              // Skip if JSON parse fails
            }
          }

          if (task.goal_id) {
            markdown += `\n   *Linked Goal*: ${task.goal_id}\n`;
          }
          markdown += `   *Created*: ${new Date(task.created_at).toLocaleString()}\n\n`;
        });
      }
    }
  }
  markdown += `---\n\n`;

  // Contexts section
  markdown += `## Contexts (${contexts.length})\n\n`;
  if (contexts.length === 0) {
    markdown += `*No contexts found*\n\n`;
  } else {
    contexts.forEach((context, index) => {
      markdown += `### ${index + 1}. ${context.name}\n\n`;

      if (context.description) {
        markdown += `${context.description}\n\n`;
      }

      try {
        const filePaths = JSON.parse(context.file_paths);
        if (filePaths && filePaths.length > 0) {
          markdown += `**Files (${filePaths.length}):**\n`;
          filePaths.forEach((path: string) => {
            markdown += `- \`${path}\`\n`;
          });
          markdown += `\n`;
        }
      } catch (e) {
        // Skip if JSON parse fails
      }

      if (context.has_context_file && context.context_file_path) {
        markdown += `**Context File**: \`${context.context_file_path}\`\n\n`;
      }

      markdown += `*Created*: ${new Date(context.created_at).toLocaleString()}\n\n`;
    });
  }
  markdown += `---\n\n`;

  // Scans section
  markdown += `## AI Scans (${scans.length})\n\n`;
  if (scans.length === 0) {
    markdown += `*No scans found*\n\n`;
  } else {
    scans.forEach((scan, index) => {
      markdown += `### ${index + 1}. ${scan.scan_type}\n\n`;

      if (scan.summary) {
        markdown += `${scan.summary}\n\n`;
      }

      if (scan.input_tokens || scan.output_tokens) {
        markdown += `**Token Usage:**\n`;
        if (scan.input_tokens) markdown += `- Input: ${scan.input_tokens.toLocaleString()}\n`;
        if (scan.output_tokens) markdown += `- Output: ${scan.output_tokens.toLocaleString()}\n`;
        if (scan.input_tokens && scan.output_tokens) {
          markdown += `- Total: ${(scan.input_tokens + scan.output_tokens).toLocaleString()}\n`;
        }
        markdown += `\n`;
      }

      markdown += `*Scanned*: ${new Date(scan.timestamp).toLocaleString()}\n\n`;
    });
  }
  markdown += `---\n\n`;

  // Implementation Logs section
  markdown += `## Implementation History (${implementationLogs.length})\n\n`;
  if (implementationLogs.length === 0) {
    markdown += `*No implementation logs found*\n\n`;
  } else {
    implementationLogs.forEach((log, index) => {
      markdown += `### ${index + 1}. ${log.title}\n\n`;
      markdown += `**Requirement**: ${log.requirement_name}\n\n`;
      markdown += `${log.overview}\n\n`;
      markdown += `**Tested**: ${log.tested ? 'Yes' : 'No'}\n\n`;
      markdown += `*Implemented*: ${new Date(log.created_at).toLocaleString()}\n\n`;
    });
  }
  markdown += `---\n\n`;

  // Footer
  markdown += `## Summary\n\n`;
  markdown += `- **Total Goals**: ${goals.length}\n`;
  markdown += `- **Total Tasks**: ${tasks.length}\n`;
  markdown += `- **Total Contexts**: ${contexts.length}\n`;
  markdown += `- **Total Scans**: ${scans.length}\n`;
  markdown += `- **Total Implementations**: ${implementationLogs.length}\n\n`;

  const totalTokens = scans.reduce((sum, scan) => {
    return sum + (scan.input_tokens || 0) + (scan.output_tokens || 0);
  }, 0);

  if (totalTokens > 0) {
    markdown += `- **Total LLM Tokens Used**: ${totalTokens.toLocaleString()}\n\n`;
  }

  markdown += `*Generated by Vibeman Export Service v${metadata.exportVersion}*\n`;

  return markdown;
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  projectName: string,
  format: 'json' | 'markdown'
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const sanitizedName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const extension = format === 'json' ? 'json' : 'md';

  return `${sanitizedName}_ai_review_${timestamp}.${extension}`;
}

/**
 * Create downloadable blob from export data
 */
export function createExportBlob(content: string, format: 'json' | 'markdown'): Blob {
  const mimeType = format === 'json'
    ? 'application/json'
    : 'text/markdown';

  return new Blob([content], { type: mimeType });
}
