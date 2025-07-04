import { NextRequest, NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();
    
    await processManager.stopProcess(projectId);
    
    return NextResponse.json({
      success: true,
      message: 'Process stopped successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop process' },
      { status: 500 }
    );
  }
}