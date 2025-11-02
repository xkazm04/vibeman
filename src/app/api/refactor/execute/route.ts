import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { RefactorAction } from '@/stores/refactorStore';
import { validateActions, groupActionsByFile } from '@/app/features/RefactorWizard/lib/scriptGenerator';

export async function POST(request: NextRequest) {
  try {
    const { scriptId, actions } = await request.json();

    if (!actions || !Array.isArray(actions)) {
      return NextResponse.json(
        { error: 'Actions array is required' },
        { status: 400 }
      );
    }

    // Validate actions
    const validation = validateActions(actions as RefactorAction[]);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid actions', details: validation.errors },
        { status: 400 }
      );
    }

    // Execute actions
    const results = await executeActions(actions as RefactorAction[]);

    return NextResponse.json({
      success: true,
      scriptId,
      results,
    });
  } catch (error) {
    console.error('Script execution error:', error);
    return NextResponse.json(
      {
        error: 'Execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function executeActions(actions: RefactorAction[]): Promise<any[]> {
  const results: any[] = [];
  const grouped = groupActionsByFile(actions);

  for (const [filePath, fileActions] of grouped) {
    try {
      // Read current file content
      let content = await fs.readFile(filePath, 'utf-8');

      // Apply each action to the file
      for (const action of fileActions) {
        try {
          content = await applyAction(content, action);
          results.push({
            action: action.id,
            file: filePath,
            success: true,
          });
        } catch (error) {
          results.push({
            action: action.id,
            file: filePath,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Write modified content back
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      results.push({
        file: filePath,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

async function applyAction(content: string, action: RefactorAction): Promise<string> {
  switch (action.type) {
    case 'replace':
      if (!action.oldContent || !action.newContent) {
        throw new Error('Replace action requires oldContent and newContent');
      }
      // Replace first occurrence
      if (!content.includes(action.oldContent)) {
        throw new Error(`Old content not found in file: ${action.oldContent.slice(0, 50)}...`);
      }
      return content.replace(action.oldContent, action.newContent);

    case 'insert':
      if (!action.newContent || action.lineStart === undefined) {
        throw new Error('Insert action requires newContent and lineStart');
      }
      const lines = content.split('\n');
      lines.splice(action.lineStart - 1, 0, action.newContent);
      return lines.join('\n');

    case 'delete':
      if (action.lineStart === undefined) {
        throw new Error('Delete action requires lineStart');
      }
      const deleteLines = content.split('\n');
      const endLine = action.lineEnd || action.lineStart;
      deleteLines.splice(action.lineStart - 1, endLine - action.lineStart + 1);
      return deleteLines.join('\n');

    case 'rename':
      // Simple rename (replace all occurrences)
      if (!action.oldContent || !action.newContent) {
        throw new Error('Rename action requires oldContent and newContent');
      }
      return content.split(action.oldContent).join(action.newContent);

    default:
      throw new Error(`Unsupported action type: ${action.type}`);
  }
}
