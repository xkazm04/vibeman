/**
 * Annette's Tools
 * Specialized tools for the AI assistant
 */

import { ideaDb } from '@/app/db';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<ToolResult>;
}

/**
 * Get pending ideas count for a project
 */
async function getPendingIdeasCount(params: { projectId: string }): Promise<ToolResult> {
  try {
    const ideas = ideaDb.getIdeasByProject(params.projectId);
    const pendingIdeas = ideas.filter((idea) => idea.status === 'pending');

    return {
      success: true,
      data: {
        total: pendingIdeas.length,
        ideas: pendingIdeas.map((idea) => ({
          id: idea.id,
          title: idea.title,
          category: idea.category,
          effort: idea.effort,
          impact: idea.impact,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pending ideas',
    };
  }
}

/**
 * Get high-level documentation from the project
 */
async function getHighLevelDocs(params: { projectPath: string }): Promise<ToolResult> {
  try {
    // Look for VISION.md or similar high-level docs
    const docsDir = path.join(params.projectPath, 'docs');
    const visionPath = path.join(docsDir, 'VISION.md');

    let visionContent = null;

    // Try to read VISION.md
    try {
      visionContent = await fs.readFile(visionPath, 'utf-8');
    } catch {
      // VISION.md doesn't exist, try README.md
      const readmePath = path.join(params.projectPath, 'README.md');
      try {
        visionContent = await fs.readFile(readmePath, 'utf-8');
      } catch {
        return {
          success: false,
          error: 'No high-level documentation found (VISION.md or README.md)',
        };
      }
    }

    return {
      success: true,
      data: {
        content: visionContent,
        source: visionContent ? (await fs.access(visionPath).then(() => 'VISION.md').catch(() => 'README.md')) : 'unknown',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve documentation',
    };
  }
}

/**
 * Available tools for Annette
 */
export const ANNETTE_TOOLS: Record<string, Tool> = {
  get_pending_ideas_count: {
    name: 'get_pending_ideas_count',
    description: 'Get the count and summary of pending project ideas',
    parameters: {
      projectId: 'string - The project ID',
    },
    execute: getPendingIdeasCount,
  },

  get_high_level_docs: {
    name: 'get_high_level_docs',
    description: 'Retrieve high-level project documentation (VISION.md or README.md)',
    parameters: {
      projectPath: 'string - The absolute path to the project directory',
    },
    execute: getHighLevelDocs,
  },
};

/**
 * Execute a tool by name
 */
export async function executeTool(toolName: string, params: any): Promise<ToolResult> {
  const tool = ANNETTE_TOOLS[toolName];

  if (!tool) {
    return {
      success: false,
      error: `Tool '${toolName}' not found`,
    };
  }

  return await tool.execute(params);
}
