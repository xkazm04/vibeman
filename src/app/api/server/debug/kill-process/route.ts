import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface KillProcessRequest {
  pid: number;
  port?: number;
}

/**
 * Get platform-specific kill command
 */
function getKillCommand(pid: number): string {
  return process.platform === 'win32'
    ? `taskkill /PID ${pid} /T /F`
    : `kill -KILL ${pid}`;
}

/**
 * Get platform-specific port check command
 */
function getPortCheckCommand(port: number): string {
  return process.platform === 'win32'
    ? `netstat -ano | findstr :${port}`
    : `lsof -i :${port}`;
}

/**
 * Validate request body
 */
function validateRequest(body: unknown): body is KillProcessRequest {
  const req = body as KillProcessRequest;
  return req.pid && typeof req.pid === 'number';
}

/**
 * Kill the specified process
 */
async function killProcess(pid: number): Promise<void> {
  const command = getKillCommand(pid);
  await execAsync(command);
}

/**
 * Check if a port is still in use
 */
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const command = getPortCheckCommand(port);
    const { stdout } = await execAsync(command);
    return stdout.trim().length > 0;
  } catch {
    // Command failed, assume port is free
    return false;
  }
}

/**
 * Verify the process was successfully killed
 */
async function verifyProcessKilled(pid: number, port?: number): Promise<{ success: boolean; error?: string }> {
  // Wait a moment for the process to terminate
  await new Promise(resolve => setTimeout(resolve, 1000));

  // If no port specified, assume success
  if (!port) {
    return { success: true };
  }

  // Check if the port is still in use
  const stillRunning = await isPortInUse(port);

  if (stillRunning) {
    return {
      success: false,
      error: 'Process may still be running'
    };
  }

  return { success: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!validateRequest(body)) {
      return NextResponse.json(
        { error: 'Invalid PID' },
        { status: 400 }
      );
    }

    const { pid, port } = body;

    try {
      // Kill the process
      await killProcess(pid);

      // Verify the kill was successful
      const verification = await verifyProcessKilled(pid, port);

      if (!verification.success) {
        return NextResponse.json({
          success: false,
          error: verification.error
        });
      }

      return NextResponse.json({
        success: true,
        message: `Process ${pid} killed successfully`
      });

    } catch (killError) {
      return NextResponse.json({
        success: false,
        error: `Failed to kill process: ${killError instanceof Error ? killError.message : 'Unknown error'}`
      });
    }

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to kill process' },
      { status: 500 }
    );
  }
} 