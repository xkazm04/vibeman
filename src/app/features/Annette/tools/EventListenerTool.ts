import { ToolDefinition } from './types';
import { eventQueryHelpers } from '../lib/knowledgeQuery';

export const EVENT_LISTENER_TOOLS: ToolDefinition[] = [
    {
        name: 'get_recent_events',
        description: 'Get recent events for the project to understand what has happened recently.',
        parameters: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Number of events to retrieve (default: 10)'
                },
                type: {
                    type: 'string',
                    description: 'Filter by event type (optional)'
                }
            },
            required: []
        },
        execute: async ({ projectId, limit = 10, type }: { projectId: string; limit?: number; type?: string }) => {
            return eventQueryHelpers.getRecentEvents(projectId, limit, type);
        }
    },
    {
        name: 'get_latest_event_by_title',
        description: 'Get the latest event with a specific title.',
        parameters: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Title of the event to search for'
                }
            },
            required: ['title']
        },
        execute: async ({ projectId, title }: { projectId: string; title: string }) => {
            return eventQueryHelpers.getLatestEventByTitle(projectId, title);
        }
    }
];
