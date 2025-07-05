import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ProcessInfo {
  port: number;
  pid: number | null;
  command?: string;
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

async function getProcessOnPort(port: number): Promise<ProcessInfo | null> {
  try {
    const command = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port}`;
      
    const { stdout } = await execAsync(command);
    
    if (process.platform === 'win32') {
      // Parse Windows netstat output
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
          const pid = parseInt(parts[4]);
          if (!isNaN(pid)) {
            // Try to get process command
            let command = '';
            try {
              const { stdout: cmdOutput } = await execAsync(`wmic process where processid=${pid} get commandline /format:list`);
              const cmdMatch = cmdOutput.match(/CommandLine=(.+)/);
              if (cmdMatch) {
                command = cmdMatch[1].trim();
              }
            } catch {
              // Ignore command lookup errors
            }
            
            return { port, pid, command };
          }
        }
      }
    } else {
      // Parse Unix lsof output
      const lines = stdout.trim().split('\n');
      if (lines.length > 0) {
        const firstLine = lines[0];
        const parts = firstLine.split(/\s+/);
        if (parts.length >= 2) {
          const pid = parseInt(parts[1]);
          if (!isNaN(pid)) {
            // Try to get process command
            let command = '';
            try {
              const { stdout: cmdOutput } = await execAsync(`ps -p ${pid} -o command=`);
              command = cmdOutput.trim();
            } catch {
              // Ignore command lookup errors
            }
            
            return { port, pid, command };
          }
        }
      }
    }
  } catch (error) {
    // Port not in use or command failed
    return null;
  }
  
  return null;
} 