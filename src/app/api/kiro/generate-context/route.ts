import { NextRequest, NextResponse } from 'next/server';
import { ollamaClient } from '../../../../lib/ollama';
import { contextDb } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { 
      contextName, 
      description, 
      filePaths, 
      groupId, 
      projectId, 
      projectPath,
      generateFile = false,
      prompt,
      model 
    } = await request.json();

    // Validate required fields
    if (!contextName || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Context name and project ID are required' },
        { status: 400 }
      );
    }

    if (!filePaths || filePaths.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one file path is required' },
        { status: 400 }
      );
    }

    const contextId = uuidv4();
    let contextFilePath: string | undefined;
    let hasContextFile = false;

    // Generate context file if requested
    if (generateFile && prompt && projectPath) {
      try {
        // Use the universal Ollama client
        const result = await ollamaClient.generate({
          prompt,
          model,
          projectId,
          taskType: 'context_generation',
          taskDescription: `Generate context documentation for: ${contextName}`
        });

        if (result.success && result.response) {
          // Create context file path
          const contextDir = path.join(projectPath, '.kiro', 'contexts');
          if (!fs.existsSync(contextDir)) {
            fs.mkdirSync(contextDir, { recursive: true });
          }

          const fileName = `${contextName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
          contextFilePath = path.join(contextDir, fileName);

          // Write context file
          const contextContent = `# ${contextName}

${description ? `## Description\n${description}\n\n` : ''}## Files
${filePaths.map((filePath: string) => `- \`${filePath}\``).join('\n')}

## Generated Context

${result.response}

---
*Generated on ${new Date().toISOString()}*
`;

          fs.writeFileSync(contextFilePath, contextContent, 'utf8');
          hasContextFile = true;

          // Make path relative to project root
          contextFilePath = path.relative(projectPath, contextFilePath);
        }
      } catch (error) {
        console.error('Failed to generate context file:', error);
        // Continue without context file - we'll still save the context
      }
    }

    // Save context to database
    try {
      const dbContext = contextDb.createContext({
        id: contextId,
        project_id: projectId,
        group_id: groupId || null,
        name: contextName,
        description: description || undefined,
        file_paths: filePaths,
        has_context_file: hasContextFile,
        context_file_path: contextFilePath
      });

      // Convert database format to frontend format
      const context = {
        id: dbContext.id,
        projectId: dbContext.project_id,
        groupId: dbContext.group_id,
        name: dbContext.name,
        description: dbContext.description,
        filePaths: JSON.parse(dbContext.file_paths),
        hasContextFile: Boolean(dbContext.has_context_file),
        contextFilePath: dbContext.context_file_path,
        createdAt: new Date(dbContext.created_at),
        updatedAt: new Date(dbContext.updated_at)
      };

      return NextResponse.json({
        success: true,
        context,
        contextFilePath: hasContextFile ? contextFilePath : null,
        message: hasContextFile 
          ? 'Context created successfully with generated file'
          : 'Context created successfully'
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to save context: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}` 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Context creation API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}