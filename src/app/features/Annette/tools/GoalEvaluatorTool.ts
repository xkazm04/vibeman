import { ToolDefinition } from '@/lib/langgraph/langTypes';
import { goalRepository } from '@/app/db/repositories/goal.repository';

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
            const goals = goalRepository.getGoalsByProject(projectId);
            if (status) {
                return { goals: goals.filter(g => g.status === status) };
            }
            return { goals };
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
            const goal = goalRepository.getGoalById(goalId);
            return {
                goal,
                message: "Please analyze recent implementation logs against this goal's description."
            };
        }
    }
];
