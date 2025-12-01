import { ToolDefinition } from '@/lib/langgraph/langTypes';
import { goalQueryHelpers } from '../lib/knowledgeQuery';

export const GOAL_EVALUATOR_TOOLS: ToolDefinition[] = [
    {
        name: 'get_project_goals',
        description: 'Get the goals defined for the project to understand objectives.',
        parameters: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    description: 'Filter by status (open, in_progress, done, etc.)'
                }
            },
            required: []
        },
        execute: async ({ projectId, status }: { projectId: string; status?: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided' }) => {
            return goalQueryHelpers.getProjectGoals(projectId, status);
        }
    },
    {
        name: 'evaluate_goal_progress',
        description: 'Evaluate how recent work contributes to a goal. (Conceptual tool - currently returns goal details for LLM analysis)',
        parameters: {
            type: 'object',
            properties: {
                goalId: {
                    type: 'string',
                    description: 'ID of the goal to evaluate'
                }
            },
            required: ['goalId']
        },
        execute: async ({ goalId }: { goalId: string }) => {
            return goalQueryHelpers.getGoalForEvaluation(goalId);
        }
    }
];
