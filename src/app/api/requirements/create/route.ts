import { NextRequest, NextResponse } from 'next/server';
import { FileSystemInterface } from '../../../../lib/fileSystemInterface';
import { ClaudeTaskManager } from '../../../../lib/claudeTaskManager';
import { DevelopmentRequirement } from '../../../../types/development';

export async function POST(request: NextRequest) {
  try {
    const { 
      projectPath, 
      title, 
      description, 
      priority = 'medium', 
      files = [],
      estimatedComplexity = 5 
    } = await request.json();

    // Validate required fields
    if (!projectPath || !title || !description) {
      return NextResponse.json({ 
        message: 'Missing required fields: projectPath, title, description' 
      }, { status: 400 });
    }

    // Create requirement
    const requirement: DevelopmentRequirement = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectPath,
      title,
      description,
      priority,
      status: 'pending',
      files,
      estimatedComplexity,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Initialize file system interface
    const fileSystem = new FileSystemInterface(projectPath);
    await fileSystem.initialize();

    // Submit to Claude
    const taskManager = new ClaudeTaskManager(fileSystem, projectPath);
    const taskPath = await taskManager.submitRequirement(requirement);

    return NextResponse.json({
      success: true,
      requirement,
      taskPath,
      message: 'Requirement submitted to Claude Code'
    });

  } catch (error) {
    console.error('Error creating requirement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create requirement',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 