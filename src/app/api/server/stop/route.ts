import { NextRequest, NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';

export async function POST(request: NextRequest) {
  try {
    const { projectId, force } = await request.json();
    console.log(`[STOP API] Received request for projectId: ${projectId}, force: ${force}`);
    
    // Ensure process manager is initialized
    await processManager.initialize();
    
    // If force is true, clear error state first
    if (force) {
      console.log(`[STOP API] Force flag set, clearing error state for ${projectId}`);
      processManager.clearErrorState(projectId);
    }
    
    const status = processManager.getStatus(projectId);
    console.log(`[STOP API] Current status for ${projectId}:`, status);
    
    if (!status) {
      console.log(`[STOP API] No process found for ${projectId}`);
      return NextResponse.json({
        success: true,
        message: 'No process found to stop'
      });
    }
    
    if (status.status === 'stopped') {
      console.log(`[STOP API] Process ${projectId} was already stopped, removing from manager`);
      // Remove the stopped process entry
      processManager.removeProcess(projectId);
      return NextResponse.json({
        success: true,
        message: 'Process was already stopped and has been cleared'
      });
    }
    
    if (status.status === 'error' && force) {
      console.log(`[STOP API] Force removing error state process ${projectId}`);
      // Force remove error state process
      processManager.removeProcess(projectId);
      return NextResponse.json({
        success: true,
        message: 'Error state cleared and process removed'
      });
    }
    
    console.log(`[STOP API] Attempting to stop process ${projectId}`);
    await processManager.stopProcess(projectId);
    console.log(`[STOP API] Successfully stopped process ${projectId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Process stopped successfully'
    });
  } catch (error) {
    console.error('[STOP API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop process' },
      { status: 500 }
    );
  }
}