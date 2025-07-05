import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { pid, port } = await request.json();
    
    if (!pid || typeof pid !== 'number') {
      return NextResponse.json(
        { error: 'Invalid PID' },
        { status: 400 }
      );
    }

    console.log(`[EMERGENCY KILL] Attempting to kill process PID ${pid} on port ${port}`);

    try {
      // Kill the process
      if (process.platform === 'win32') {
        await execAsync(`taskkill /PID ${pid} /T /F`);
      } else {
        await execAsync(`kill -KILL ${pid}`);
      }

      // Wait a moment and verify the process is gone
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if the port is still in use
      let stillRunning = false;
      try {
        const command = process.platform === 'win32'
          ? `netstat -ano | findstr :${port}`
          : `lsof -i :${port}`;
          
        const { stdout } = await execAsync(command);
        stillRunning = stdout.trim().length > 0;
      } catch {
        // Command failed, assume process is dead
        stillRunning = false;
      }

      if (stillRunning) {
        console.log(`[EMERGENCY KILL] Process ${pid} might still be running on port ${port}`);
        return NextResponse.json({
          success: false,
          error: 'Process may still be running'
        });
      }

      console.log(`[EMERGENCY KILL] Successfully killed process ${pid}`);
      return NextResponse.json({
        success: true,
        message: `Process ${pid} killed successfully`
      });

    } catch (killError) {
      console.error(`[EMERGENCY KILL] Failed to kill process ${pid}:`, killError);
      return NextResponse.json({
        success: false,
        error: `Failed to kill process: ${killError instanceof Error ? killError.message : 'Unknown error'}`
      });
    }

  } catch (error) {
    console.error('Kill process API error:', error);
    return NextResponse.json(
      { error: 'Failed to kill process' },
      { status: 500 }
    );
  }
} 