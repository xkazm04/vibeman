/**
 * Preview Server API
 * Starts a project server on port 3001 for preview purposes
 * Kills any existing process on port 3001 first
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { projectDb } from '@/lib/project_database';

const execAsync = promisify(exec);

const PREVIEW_PORT = 3001;

// Store the preview process reference
let previewProcess: ChildProcess | null = null;

/**
 * Get platform-specific command to find process on port
 */
function getFindProcessCommand(port: number): string {
  return process.platform === 'win32'
    ? `netstat -ano | findstr :${port} | findstr LISTENING`
    : `lsof -t -i:${port}`;
}

/**
 * Get platform-specific kill command
 */
function getKillCommand(pid: number): string {
  return process.platform === 'win32'
    ? `taskkill /PID ${pid} /T /F`
    : `kill -9 ${pid}`;
}

/**
 * Parse PIDs from netstat output (Windows)
 */
function parsePidsFromNetstat(output: string): number[] {
  const pids: number[] = [];
  const lines = output.trim().split('\n');

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const lastPart = parts[parts.length - 1];
    const pid = parseInt(lastPart, 10);
    if (!isNaN(pid) && pid > 0 && !pids.includes(pid)) {
      pids.push(pid);
    }
  }

  return pids;
}

/**
 * Kill process(es) on a specific port
 */
async function killProcessOnPort(port: number): Promise<{ success: boolean; error?: string }> {
  try {
    const findCommand = getFindProcessCommand(port);

    try {
      const { stdout } = await execAsync(findCommand);

      if (!stdout.trim()) {
        return { success: true }; // No process found, port is free
      }

      // Parse PIDs based on platform
      let pids: number[];
      if (process.platform === 'win32') {
        pids = parsePidsFromNetstat(stdout);
      } else {
        pids = stdout.trim().split('\n').map(p => parseInt(p, 10)).filter(p => !isNaN(p));
      }

      if (pids.length === 0) {
        return { success: true };
      }

      // Kill each process
      for (const pid of pids) {
        try {
          const killCommand = getKillCommand(pid);
          await execAsync(killCommand);
        } catch (killError) {
          // Continue trying to kill other processes
          console.error(`Failed to kill PID ${pid}:`, killError);
        }
      }

      // Wait for processes to die
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify port is free
      try {
        const { stdout: checkOutput } = await execAsync(findCommand);
        if (checkOutput.trim()) {
          return { success: false, error: 'Failed to kill process - port still in use' };
        }
      } catch {
        // Command failed means port is free
      }

      return { success: true };
    } catch {
      // No process on port
      return { success: true };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to kill process on port ${port}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Start the project server on preview port
 */
async function startPreviewServer(
  projectPath: string,
  runScript: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Kill any existing preview process
    if (previewProcess) {
      try {
        previewProcess.kill('SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {
        // Ignore kill errors
      }
      previewProcess = null;
    }

    // Parse the run script to modify port
    let command: string;
    let args: string[];

    if (runScript.includes('npm run')) {
      // For npm scripts, we need to pass the port differently
      const scriptName = runScript.replace('npm run ', '').trim();
      command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      args = ['run', scriptName, '--', '-p', PREVIEW_PORT.toString()];
    } else if (runScript.includes('next dev') || runScript.includes('next start')) {
      // Direct next command
      command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      args = ['next', 'dev', '-p', PREVIEW_PORT.toString()];
    } else {
      // Fallback: try to append port
      command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      args = ['run', 'dev', '--', '-p', PREVIEW_PORT.toString()];
    }

    // Spawn the process
    previewProcess = spawn(command, args, {
      cwd: projectPath,
      shell: true,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: PREVIEW_PORT.toString(),
      },
    });

    // Set up error handling
    previewProcess.on('error', (error) => {
      console.error('[Preview Server] Process error:', error);
      previewProcess = null;
    });

    previewProcess.on('exit', (code) => {
      console.log(`[Preview Server] Process exited with code ${code}`);
      previewProcess = null;
    });

    // Wait a bit for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if process is still running
    if (!previewProcess || previewProcess.killed) {
      return { success: false, error: 'Server process exited unexpectedly' };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * POST /api/server/preview
 * Start a project on the preview port (3001)
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get project from database
    const project = projectDb.getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if project type supports preview
    if (project.type !== 'nextjs' && project.type !== 'react') {
      return NextResponse.json(
        { success: false, error: `Preview not supported for project type: ${project.type}` },
        { status: 400 }
      );
    }

    // Step 1: Kill any existing process on preview port
    const killResult = await killProcessOnPort(PREVIEW_PORT);
    if (!killResult.success) {
      return NextResponse.json(
        { success: false, error: killResult.error, stage: 'kill' },
        { status: 500 }
      );
    }

    // Step 2: Start the server
    const startResult = await startPreviewServer(project.path, project.run_script);
    if (!startResult.success) {
      return NextResponse.json(
        { success: false, error: startResult.error, stage: 'start' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      port: PREVIEW_PORT,
      url: `http://localhost:${PREVIEW_PORT}`,
      message: `${project.name} started on port ${PREVIEW_PORT}`,
    });
  } catch (error) {
    console.error('[Preview API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start preview server',
        stage: 'unknown'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/server/preview
 * Stop the preview server
 */
export async function DELETE() {
  try {
    // Kill the preview process if it exists
    if (previewProcess) {
      try {
        previewProcess.kill('SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch {
        // Ignore
      }
      previewProcess = null;
    }

    // Also try to kill anything on the preview port
    await killProcessOnPort(PREVIEW_PORT);

    return NextResponse.json({
      success: true,
      message: 'Preview server stopped',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to stop preview server' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/server/preview
 * Check preview server status
 */
export async function GET() {
  try {
    const findCommand = getFindProcessCommand(PREVIEW_PORT);

    try {
      const { stdout } = await execAsync(findCommand);
      const isRunning = stdout.trim().length > 0;

      return NextResponse.json({
        running: isRunning,
        port: PREVIEW_PORT,
        url: isRunning ? `http://localhost:${PREVIEW_PORT}` : null,
      });
    } catch {
      return NextResponse.json({
        running: false,
        port: PREVIEW_PORT,
        url: null,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to check preview status' },
      { status: 500 }
    );
  }
}
