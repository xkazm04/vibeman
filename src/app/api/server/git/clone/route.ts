import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { GitManager } from '@/lib/gitManager';

export async function POST(request: NextRequest) {
  try {
    const { repository, targetPath, branch } = await request.json();
    
    // Check if directory exists
    try {
      await fs.access(targetPath);
      
      // Check if directory is empty
      const files = await fs.readdir(targetPath);
      if (files.length > 0) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Target directory is not empty' 
          },
          { status: 400 }
        );
      }
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(targetPath, { recursive: true });
    }
    
    // Clone the repository
    const result = await GitManager.clone(repository, targetPath, branch);
    
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('Git clone error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to clone repository'
      },
      { status: 500 }
    );
  }
}