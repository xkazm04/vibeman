import { NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';

export async function GET() {
  try {
    console.log('=== DEBUG API CALLED ===');
    
    // Force initialization
    await processManager.initialize();
    
    // Get all statuses
    const statuses = await processManager.getAllStatuses();
    
    // Return detailed debug info
    const debugInfo = {
      processCount: Object.keys(statuses).length,
      processes: Object.entries(statuses).map(([id, info]) => ({
        id,
        status: info.status,
        port: info.port,
        pid: info.pid,
        startTime: info.startTime,
        hasLogs: info.logs.length > 0
      })),
      statuses
    };
    
    console.log('=== DEBUG INFO ===', debugInfo);
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 