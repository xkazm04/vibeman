import { NextRequest, NextResponse } from 'next/server';
import { processManager } from '@/lib/processManager';
import { GitManager } from '@/lib/gitManager';

export async function POST(request: NextRequest) {
  try {
    const { projectId, path, branch } = await request.json();
    
    // Check if the project is running
    const status = processManager.getStatus(projectId);
    if (status && status.status === 'running') {
      return NextResponse.json(
        { 
          success: false,
          message: 'Cannot pull while the server is running. Please stop it first.' 
        },
        { status: 400 }
      );
    }
    
    // Check if it's a git repository
    const isGitRepo = await GitManager.isGitRepo(path);
    if (!isGitRepo) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Not a git repository' 
        },
        { status: 400 }
      );
    }
    
    // Switch to the correct branch if needed
    const currentBranch = await GitManager.getCurrentBranch(path);
    if (branch && currentBranch !== branch) {
      const switchResult = await GitManager.switchBranch(path, branch);
      if (!switchResult.success) {
        return NextResponse.json(switchResult, { status: 400 });
      }
    }
    
    // Pull latest changes
    const result = await GitManager.pull(path, branch);
    
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('Git pull error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to pull changes'
      },
      { status: 500 }
    );
  }
}