import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side Task Registry
 *
 * Authoritative source of truth for CLI task execution status.
 * Prevents stuck states by tracking what's actually running on the server.
 */

interface TaskRecord {
  taskId: string;
  sessionId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  requirementName?: string;
}

// In-memory registry (survives during server process lifetime)
const taskRegistry = new Map<string, TaskRecord>();

// Cleanup old records after 1 hour
const RECORD_TTL = 60 * 60 * 1000;

function cleanupOldRecords() {
  const now = Date.now();
  for (const [key, record] of taskRegistry.entries()) {
    const age = now - record.startedAt;
    if (age > RECORD_TTL) {
      taskRegistry.delete(key);
    }
  }
}

// Task timeout - if running for more than 10 minutes, consider it stale
const TASK_TIMEOUT = 10 * 60 * 1000;

/**
 * GET - Query task status or get all tasks for a session
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const sessionId = searchParams.get('sessionId');

  cleanupOldRecords();

  // Get specific task status
  if (taskId) {
    const record = taskRegistry.get(taskId);
    if (!record) {
      return NextResponse.json({ found: false, taskId });
    }

    // Check if task is stale (running too long)
    const isStale = record.status === 'running' &&
      (Date.now() - record.startedAt) > TASK_TIMEOUT;

    return NextResponse.json({
      found: true,
      ...record,
      isStale,
    });
  }

  // Get all tasks for a session
  if (sessionId) {
    const sessionTasks: TaskRecord[] = [];
    for (const record of taskRegistry.values()) {
      if (record.sessionId === sessionId) {
        sessionTasks.push(record);
      }
    }
    return NextResponse.json({ sessionId, tasks: sessionTasks });
  }

  // Return registry stats
  return NextResponse.json({
    totalTasks: taskRegistry.size,
    running: Array.from(taskRegistry.values()).filter(t => t.status === 'running').length,
    completed: Array.from(taskRegistry.values()).filter(t => t.status === 'completed').length,
    failed: Array.from(taskRegistry.values()).filter(t => t.status === 'failed').length,
  });
}

/**
 * POST - Register a task as started or update its status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, taskId, sessionId, status, requirementName } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    cleanupOldRecords();

    switch (action) {
      case 'start': {
        // Register task as running
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId is required for start' }, { status: 400 });
        }

        // Check if session already has a running task
        let existingRunning: TaskRecord | null = null;
        for (const record of taskRegistry.values()) {
          if (record.sessionId === sessionId && record.status === 'running') {
            existingRunning = record;
            break;
          }
        }

        if (existingRunning && existingRunning.taskId !== taskId) {
          // Another task is running - check if it's stale
          const isStale = (Date.now() - existingRunning.startedAt) > TASK_TIMEOUT;
          if (isStale) {
            // Mark stale task as failed
            existingRunning.status = 'failed';
            existingRunning.completedAt = Date.now();
          } else {
            return NextResponse.json({
              error: 'Session already has a running task',
              runningTask: existingRunning,
            }, { status: 409 });
          }
        }

        const record: TaskRecord = {
          taskId,
          sessionId,
          status: 'running',
          startedAt: Date.now(),
          requirementName,
        };
        taskRegistry.set(taskId, record);

        return NextResponse.json({ success: true, record });
      }

      case 'complete': {
        const record = taskRegistry.get(taskId);
        if (!record) {
          // Task wasn't registered - create a completed record
          const newRecord: TaskRecord = {
            taskId,
            sessionId: sessionId || 'unknown',
            status: status === 'failed' ? 'failed' : 'completed',
            startedAt: Date.now(),
            completedAt: Date.now(),
          };
          taskRegistry.set(taskId, newRecord);
          return NextResponse.json({ success: true, record: newRecord, wasUntracked: true });
        }

        record.status = status === 'failed' ? 'failed' : 'completed';
        record.completedAt = Date.now();

        return NextResponse.json({ success: true, record });
      }

      case 'heartbeat': {
        // Update the startedAt to prevent timeout for long-running tasks
        const record = taskRegistry.get(taskId);
        if (record && record.status === 'running') {
          record.startedAt = Date.now();
          return NextResponse.json({ success: true, record });
        }
        return NextResponse.json({ success: false, error: 'Task not found or not running' });
      }

      case 'clear': {
        // Clear all tasks for a session
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId is required for clear' }, { status: 400 });
        }

        let cleared = 0;
        for (const [key, record] of taskRegistry.entries()) {
          if (record.sessionId === sessionId) {
            taskRegistry.delete(key);
            cleared++;
          }
        }
        return NextResponse.json({ success: true, cleared });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Task registry error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a task from registry
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }

  const deleted = taskRegistry.delete(taskId);
  return NextResponse.json({ success: deleted, taskId });
}
