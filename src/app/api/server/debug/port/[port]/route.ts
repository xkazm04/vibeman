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

    console.log(`Checking port ${port}...`);
    
    const command = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port}`;
    
    try {
      const { stdout, stderr } = await execAsync(command);
      const inUse = stdout.trim().length > 0;
      
      console.log(`Port ${port} check result:`, { inUse, stdout: stdout.trim() });
      
      return NextResponse.json({
        port,
        inUse,
        command,
        output: stdout.trim(),
        error: stderr.trim() || null
      });
    } catch (cmdError) {
      console.log(`Port ${port} check failed:`, cmdError);
      return NextResponse.json({
        port,
        inUse: false,
        command,
        output: '',
        error: cmdError instanceof Error ? cmdError.message : 'Command failed'
      });
    }
  } catch (error) {
    console.error('Port check API error:', error);
    return NextResponse.json(
      { error: 'Port check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 