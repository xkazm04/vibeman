import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  parseProgressLines,
  classifyActivity,
} from '@/app/features/TaskRunner/lib/activityClassifier';
import type {
  ActivityEvent,
  TaskActivity,
} from '@/app/features/TaskRunner/lib/activityClassifier.types';

interface Task {
  id: string;
  projectPath: string;
  requirementName: string;
  projectId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'session-limit';
  progress: string[];
  error?: string;
  output?: string;
  logFilePath?: string;
}

interface TaskWithActivity extends Task {
  activity?: {
    current: ActivityEvent | null;
    history: ActivityEvent[];
    toolCounts: Record<string, number>;
    phase: TaskActivity['phase'];
  };
}

interface DbProject {
  id: string;
  name: string;
  path: string;
  [key: string]: unknown;
}

/**
 * Extracts requirement name from log filename
 */
function extractRequirementName(logFileName: string, taskId: string): string {
  return logFileName.replace(taskId + '-', '').replace('.log', '') || 'unknown';
}

/**
 * Determines task status from log content
 */
function determineTaskStatus(logContent: string): 'completed' | 'failed' | 'running' {
  const hasExited = logContent.includes('Process exited with code');
  if (!hasExited) return 'running';

  const exitCode = logContent.match(/Process exited with code:\s*(\d+)/)?.[1];
  return exitCode === '0' ? 'completed' : 'failed';
}

/**
 * Reconstructs task object from log file
 */
function reconstructTaskFromLog(
  taskId: string,
  project: DbProject,
  logPath: string,
  logContent: string
): Task {
  const logFileName = path.basename(logPath, '.log');
  const requirementName = extractRequirementName(logFileName, taskId);
  const status = determineTaskStatus(logContent);

  const task: Task = {
    id: taskId,
    projectPath: project.path,
    requirementName,
    projectId: project.id,
    status,
    progress: [],
    logFilePath: logPath,
  };

  if (status === 'completed') {
    task.output = 'Execution completed';
  } else if (status === 'failed') {
    task.error = 'Execution failed';
  }

  return task;
}

/**
 * Searches for log file across all projects
 */
async function findLogFileAcrossProjects(taskId: string): Promise<Task | null> {
  const { getLogsDirectory } = await import('@/app/Claude/lib/claudeCodeManager');
  const { projectDb } = await import('@/lib/project_database');

  const projects = projectDb.getAllProjects();

  for (const project of projects) {
    const logsDir = getLogsDirectory(project.path);

    try {
      if (!fs.existsSync(logsDir)) continue;

      const logFiles = fs.readdirSync(logsDir);
      const matchingLogs = logFiles
        .filter((f: string) => f.startsWith(taskId) && f.endsWith('.log'))
        .map((f: string) => path.join(logsDir, f));

      if (matchingLogs.length === 0) continue;

      // Get the most recent log file
      const latestLogPath = matchingLogs[matchingLogs.length - 1];
      const logContent = fs.readFileSync(latestLogPath, 'utf-8');

      const task = reconstructTaskFromLog(taskId, project as unknown as DbProject, latestLogPath, logContent);

      logger.info('Task reconstructed from log file', {
        taskId,
        status: task.status,
        logPath: latestLogPath,
      });

      return task;
    } catch (err) {
      logger.warn('Could not access logs for project', { projectName: project.name, error: err });
      continue;
    }
  }

  return null;
}

/**
 * Gets task status, checking memory first, then log files
 */
export async function getTaskStatus(taskId: string): Promise<NextResponse> {
  const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
  let task: Task | null | undefined = executionQueue.getTask(taskId);

  // If task not found in memory, check log files
  if (!task) {
    try {
      task = await findLogFileAcrossProjects(taskId);

      if (!task) {
        logger.error('Task not found in memory or logs', { taskId });
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
    } catch (fallbackError) {
      logger.error('Error during log file fallback', { error: fallbackError });
      return NextResponse.json(
        {
          error: 'Task not found',
          details: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        },
        { status: 404 }
      );
    }
  }

  // Parse activity from progress lines
  let activityData: TaskWithActivity['activity'] = undefined;
  if (task.progress && task.progress.length > 0) {
    try {
      const events = parseProgressLines(task.progress);
      if (events.length > 0) {
        const activity = classifyActivity(events);
        activityData = {
          current: activity.currentActivity,
          history: activity.activityHistory,
          toolCounts: activity.toolCounts,
          phase: activity.phase,
        };
      }
    } catch (parseError) {
      logger.warn('Failed to parse activity from progress', { taskId, error: parseError });
    }
  }

  // Log detailed task status for debugging
  logger.info('Task status retrieved', {
    taskId,
    status: task.status,
    hasError: !!task.error,
    hasOutput: !!task.output,
    progressLines: task.progress?.length || 0,
    activityPhase: activityData?.phase,
    toolsUsed: activityData ? Object.keys(activityData.toolCounts).length : 0,
  });

  const taskWithActivity: TaskWithActivity = {
    ...task,
    activity: activityData,
  };

  return NextResponse.json({ task: taskWithActivity });
}
