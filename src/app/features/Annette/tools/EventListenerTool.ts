import { ToolDefinition } from '@/lib/langgraph/langTypes';
import { eventRepository } from '@/app/db/repositories/event.repository';

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
            if (type) {
                const events = eventRepository.getEventsByType(projectId, type, limit);
                return { events };
            }
            const events = eventRepository.getEventsByProject(projectId, limit);
            return { events };
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
            const event = eventRepository.getLatestEventByTitle(projectId, title);
            return { event };
        }
    }
];
