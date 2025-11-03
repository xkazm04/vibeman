import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ProcessInfo {
  port: number;
  pid: number | null;
  command?: string;
}

/**
 * Get port check command for current platform
 */
function getPortCheckCommand(port: number): string {
  return process.platform === 'win32'
    ? `netstat -ano | findstr :${port}`
    : `lsof -i :${port}`;
}

/**
 * Get process command lookup command for current platform
 */
function getProcessCommandLookup(pid: number): string {
  return process.platform === 'win32'
    ? `wmic process where processid=${pid} get commandline /format:list`
    : `ps -p ${pid} -o command=`;
}

/**
 * Extract command from command lookup output
 */
function extractCommand(output: string, platform: string): string {
  if (platform === 'win32') {
    const match = output.match(/CommandLine=(.+)/);
    return match ? match[1].trim() : '';
  }
  return output.trim();
}

export async function POST(request: NextRequest) {
  try {
    const { ports } = await request.json();
    
    if (!Array.isArray(ports)) {
      return NextResponse.json(
        { error: 'Invalid ports array' },
        { status: 400 }
      );
    }

    const processes: ProcessInfo[] = [];

    for (const port of ports) {
      try {
        const processInfo = await getProcessOnPort(port);
        if (processInfo) {
          processes.push(processInfo);
        }
      } catch (error) {
        console.warn(`Failed to check port ${port}:`, error);
      }
    }

    return NextResponse.json({ processes });
  } catch (error) {
    console.error('Scan ports API error:', error);
    return NextResponse.json(
      { error: 'Failed to scan ports' },
      { status: 500 }
    );
  }
}

/**
 * Try to get process command for PID
 */
async function tryGetProcessCommand(pid: number): Promise<string> {
  try {
    const { stdout } = await execAsync(getProcessCommandLookup(pid));
    return extractCommand(stdout, process.platform);
  } catch {
    // Ignore command lookup errors
    return '';
  }
}

/**
 * Parse Windows netstat output
 */
async function parseWindowsNetstat(stdout: string, port: number): Promise<ProcessInfo | null> {
  const lines = stdout.trim().split('\n');
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
      const pid = parseInt(parts[4]);
      if (!isNaN(pid)) {
        const command = await tryGetProcessCommand(pid);
        return { port, pid, command };
      }
    }
  }
  return null;
}

/**
 * Parse Unix lsof output
 */
async function parseUnixLsof(stdout: string, port: number): Promise<ProcessInfo | null> {
  const lines = stdout.trim().split('\n');
  if (lines.length > 0) {
    const firstLine = lines[0];
    const parts = firstLine.split(/\s+/);
    if (parts.length >= 2) {
      const pid = parseInt(parts[1]);
      if (!isNaN(pid)) {
        const command = await tryGetProcessCommand(pid);
        return { port, pid, command };
      }
    }
  }
  return null;
}

async function getProcessOnPort(port: number): Promise<ProcessInfo | null> {
  try {
    const command = getPortCheckCommand(port);
    const { stdout } = await execAsync(command);

    if (process.platform === 'win32') {
      return parseWindowsNetstat(stdout, port);
    } else {
      return parseUnixLsof(stdout, port);
    }
  } catch (error) {
    // Port not in use or command failed
    return null;
  }
} 