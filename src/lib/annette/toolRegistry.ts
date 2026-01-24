/**
 * Annette Tool Registry
 * Defines all tools in Anthropic tool_use format and dispatches execution
 */

import { executeBrainTools } from './tools/brain';
import { executeDirectionTools } from './tools/directions';
import { executeIdeaTools } from './tools/ideas';
import { executeGoalTools } from './tools/goals';
import { executeContextTools } from './tools/contexts';
import { executeTaskTools } from './tools/tasks';
import { executeProjectTools } from './tools/projects';
import { executeStandupTools } from './tools/standup';
import { logger } from '@/lib/logger';

// Anthropic tool_use format
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Execute a tool call and return the result
 */
export async function executeTool(
  toolCall: ToolCall,
  projectId: string,
  projectPath?: string
): Promise<ToolResult> {
  const { id, name, input } = toolCall;

  try {
    let result: string;

    // Dispatch to the right tool category
    if (name.startsWith('get_behavioral') || name.startsWith('get_outcomes') ||
        name.startsWith('get_reflection') || name.startsWith('trigger_reflection') ||
        name.startsWith('get_signals') || name.startsWith('get_insights')) {
      result = await executeBrainTools(name, input, projectId);
    } else if (name.startsWith('generate_directions') || name.startsWith('list_directions') ||
               name.startsWith('get_direction') || name.startsWith('accept_direction') ||
               name.startsWith('reject_direction')) {
      result = await executeDirectionTools(name, input, projectId, projectPath);
    } else if (name.startsWith('browse_ideas') || name.startsWith('accept_idea') ||
               name.startsWith('reject_idea') || name.startsWith('generate_ideas') ||
               name.startsWith('get_idea')) {
      result = await executeIdeaTools(name, input, projectId, projectPath);
    } else if (name.startsWith('list_goals') || name.startsWith('create_goal') ||
               name.startsWith('update_goal') || name.startsWith('generate_goal')) {
      result = await executeGoalTools(name, input, projectId, projectPath);
    } else if (name.startsWith('list_contexts') || name.startsWith('get_context') ||
               name.startsWith('scan_contexts') || name.startsWith('generate_description')) {
      result = await executeContextTools(name, input, projectId);
    } else if (name.startsWith('get_queue') || name.startsWith('queue_requirement') ||
               name.startsWith('get_execution') || name.startsWith('get_implementation')) {
      result = await executeTaskTools(name, input, projectId, projectPath);
    } else if (name.startsWith('get_project') || name.startsWith('list_projects')) {
      result = await executeProjectTools(name, input, projectId);
    } else if (name.startsWith('generate_standup') || name.startsWith('get_standup') ||
               name.startsWith('run_automation')) {
      result = await executeStandupTools(name, input, projectId);
    } else {
      result = `Unknown tool: ${name}`;
      return { tool_use_id: id, content: result, is_error: true };
    }

    return { tool_use_id: id, content: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
    logger.error('Annette tool execution failed', { tool: name, error });
    return { tool_use_id: id, content: `Error: ${errorMessage}`, is_error: true };
  }
}

/**
 * Get all tool definitions for the Anthropic API
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    // Brain Tools
    {
      name: 'get_behavioral_context',
      description: 'Get the current behavioral context showing user focus areas, trends, and patterns from the Brain system',
      input_schema: {
        type: 'object',
        properties: {
          window_days: { type: 'string', description: 'Number of days to look back (default: 7)' },
        },
      },
    },
    {
      name: 'get_outcomes',
      description: 'Get recent implementation outcomes (success/failure/revert stats) for directions',
      input_schema: {
        type: 'object',
        properties: {
          limit: { type: 'string', description: 'Max number of outcomes to return (default: 10)' },
        },
      },
    },
    {
      name: 'get_reflection_status',
      description: 'Get the current Brain reflection status: when last reflected, decisions since, and if threshold is approaching',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'trigger_reflection',
      description: 'Manually trigger a Brain reflection session to analyze patterns and update guidance. Requires confirmation.',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_signals',
      description: 'Query raw behavioral signals by type (git_activity, api_focus, context_focus, implementation)',
      input_schema: {
        type: 'object',
        properties: {
          signal_type: { type: 'string', description: 'Filter by signal type', enum: ['git_activity', 'api_focus', 'context_focus', 'implementation'] },
          limit: { type: 'string', description: 'Max signals to return (default: 20)' },
        },
      },
    },
    {
      name: 'get_insights',
      description: 'Get learning insights from the most recent Brain reflection (preferences, patterns, warnings)',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },

    // Direction Tools
    {
      name: 'generate_directions',
      description: 'Generate new improvement directions for a specific context or the whole project',
      input_schema: {
        type: 'object',
        properties: {
          context_id: { type: 'string', description: 'Optional context ID to focus generation on' },
          count: { type: 'string', description: 'Number of directions to generate (default: 3)' },
        },
      },
    },
    {
      name: 'list_directions',
      description: 'List existing directions for the project, optionally filtered by status',
      input_schema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status', enum: ['pending', 'accepted', 'rejected', 'implemented'] },
          limit: { type: 'string', description: 'Max directions to return (default: 10)' },
        },
      },
    },
    {
      name: 'get_direction_detail',
      description: 'Get full details of a specific direction by ID',
      input_schema: {
        type: 'object',
        properties: {
          direction_id: { type: 'string', description: 'The direction ID to look up' },
        },
        required: ['direction_id'],
      },
    },
    {
      name: 'accept_direction',
      description: 'Accept a direction for implementation. This queues a Claude Code requirement.',
      input_schema: {
        type: 'object',
        properties: {
          direction_id: { type: 'string', description: 'The direction ID to accept' },
        },
        required: ['direction_id'],
      },
    },
    {
      name: 'reject_direction',
      description: 'Reject/delete a direction that is not useful',
      input_schema: {
        type: 'object',
        properties: {
          direction_id: { type: 'string', description: 'The direction ID to reject' },
        },
        required: ['direction_id'],
      },
    },

    // Idea Tools
    {
      name: 'browse_ideas',
      description: 'Get the next pending idea to review (tinder-style)',
      input_schema: {
        type: 'object',
        properties: {
          context_id: { type: 'string', description: 'Optional context ID to filter ideas' },
        },
      },
    },
    {
      name: 'accept_idea',
      description: 'Accept an idea, creating a requirement for implementation',
      input_schema: {
        type: 'object',
        properties: {
          idea_id: { type: 'string', description: 'The idea ID to accept' },
        },
        required: ['idea_id'],
      },
    },
    {
      name: 'reject_idea',
      description: 'Reject an idea, removing it from the queue',
      input_schema: {
        type: 'object',
        properties: {
          idea_id: { type: 'string', description: 'The idea ID to reject' },
        },
        required: ['idea_id'],
      },
    },
    {
      name: 'generate_ideas',
      description: 'Trigger idea generation for a context using AI agents',
      input_schema: {
        type: 'object',
        properties: {
          context_id: { type: 'string', description: 'Context ID to generate ideas for' },
        },
        required: ['context_id'],
      },
    },
    {
      name: 'get_idea_stats',
      description: 'Get statistics about ideas: total, accepted, rejected, pending counts',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },

    // Goal Tools
    {
      name: 'list_goals',
      description: 'List all goals for the current project with their status',
      input_schema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status', enum: ['open', 'in_progress', 'done'] },
        },
      },
    },
    {
      name: 'create_goal',
      description: 'Create a new development goal for the project',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Goal title' },
          description: { type: 'string', description: 'Goal description' },
          context_id: { type: 'string', description: 'Optional context to associate with' },
        },
        required: ['title'],
      },
    },
    {
      name: 'update_goal',
      description: 'Update a goal status or details',
      input_schema: {
        type: 'object',
        properties: {
          goal_id: { type: 'string', description: 'Goal ID to update' },
          status: { type: 'string', description: 'New status', enum: ['open', 'in_progress', 'done'] },
          title: { type: 'string', description: 'Updated title' },
          description: { type: 'string', description: 'Updated description' },
        },
        required: ['goal_id'],
      },
    },
    {
      name: 'generate_goal_candidates',
      description: 'Use AI to suggest potential goals based on project analysis',
      input_schema: {
        type: 'object',
        properties: {
          count: { type: 'string', description: 'Number of candidates to generate (default: 3)' },
        },
      },
    },

    // Context Tools
    {
      name: 'list_contexts',
      description: 'List all code contexts (feature areas / business domains) for the project',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_context_detail',
      description: 'Get detailed information about a specific context including files and description',
      input_schema: {
        type: 'object',
        properties: {
          context_id: { type: 'string', description: 'Context ID to get details for' },
        },
        required: ['context_id'],
      },
    },
    {
      name: 'scan_contexts',
      description: 'Trigger a scan to discover or update code contexts in the project',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'generate_description',
      description: 'Generate an AI description for a context based on its files',
      input_schema: {
        type: 'object',
        properties: {
          context_id: { type: 'string', description: 'Context ID to generate description for' },
        },
        required: ['context_id'],
      },
    },

    // Task/Execution Tools
    {
      name: 'get_queue_status',
      description: 'Get the current scan/execution queue status and pending items',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'queue_requirement',
      description: 'Queue a requirement for Claude Code execution',
      input_schema: {
        type: 'object',
        properties: {
          requirement_name: { type: 'string', description: 'Name/title for the requirement' },
          requirement_content: { type: 'string', description: 'Content/instructions for the requirement' },
        },
        required: ['requirement_name', 'requirement_content'],
      },
    },
    {
      name: 'get_execution_status',
      description: 'Get the status of currently running Claude Code executions',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_implementation_logs',
      description: 'Get recent implementation logs showing what was executed',
      input_schema: {
        type: 'object',
        properties: {
          limit: { type: 'string', description: 'Max logs to return (default: 5)' },
        },
      },
    },

    // Project Tools
    {
      name: 'get_project_structure',
      description: 'Get the project file/folder structure',
      input_schema: {
        type: 'object',
        properties: {
          depth: { type: 'string', description: 'Max directory depth (default: 3)' },
        },
      },
    },
    {
      name: 'list_projects',
      description: 'List all registered projects',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_project_files',
      description: 'Get files in a specific project directory',
      input_schema: {
        type: 'object',
        properties: {
          directory: { type: 'string', description: 'Relative directory path to list (default: root)' },
        },
      },
    },

    // Standup/Reporting Tools
    {
      name: 'generate_standup',
      description: 'Generate an AI-powered standup report based on recent activity',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_standup_history',
      description: 'Get previous standup reports',
      input_schema: {
        type: 'object',
        properties: {
          limit: { type: 'string', description: 'Number of standups to return (default: 5)' },
        },
      },
    },
    {
      name: 'run_automation',
      description: 'Run the standup automation workflow (evaluates goals, creates tasks)',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}
