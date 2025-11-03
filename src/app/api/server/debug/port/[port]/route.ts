import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  try {
    const { port: portStr } = await params;
    const port = parseInt(portStr);
    if (isNaN(port)) {
      return NextResponse.json(
        { error: 'Invalid port number' },
        { status: 400 }
      );
    }

    const command = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port}`;

    try {
      const { stdout, stderr } = await execAsync(command);
      const inUse = stdout.trim().length > 0;
      
      return NextResponse.json({
        port,
        inUse,
        command,
        output: stdout.trim(),
        error: stderr.trim() || null
      });
    } catch (cmdError) {
      return NextResponse.json({
        port,
        inUse: false,
        command,
        output: '',
        error: cmdError instanceof Error ? cmdError.message : 'Command failed'
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Port check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 