import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting background task queue...');
    
    // Start the queue by calling the queue management endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/kiro/background-tasks/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' })
    });
    
    const result = await response.json();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Background task queue started successfully',
        queueStatus: result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to start queue'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to start queue:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start queue'
    }, { status: 500 });
  }
}