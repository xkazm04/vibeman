'use client';

/**
 * Events Log Component
 * Displays integration event history
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { DbIntegrationEvent, IntegrationEventType } from '@/app/db/models/integration.types';

interface ParsedEvent extends Omit<DbIntegrationEvent, 'payload' | 'response'> {
  payload: Record<string, unknown>;
  response: unknown;
}

interface EventsLogProps {
  projectId: string;
  integrationId?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  sent: { bg: 'bg-green-500/10', text: 'text-green-400' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-400' },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  skipped: { bg: 'bg-gray-500/10', text: 'text-gray-400' },
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  'goal.created': '🎯',
  'goal.updated': '✏️',
  'goal.completed': '✅',
  'idea.generated': '💡',
  'idea.accepted': '👍',
  'idea.rejected': '👎',
  'idea.implemented': '🚀',
  'scan.completed': '🔍',
  'implementation.completed': '🛠️',
  'context.updated': '📁',
  'standup.generated': '📋',
  'automation.started': '🤖',
  'automation.completed': '🎉',
  'automation.failed': '❌',
};

export function EventsLog({ projectId, integrationId }: EventsLogProps) {
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (integrationId) {
        params.set('integrationId', integrationId);
      } else {
        params.set('projectId', projectId);
      }
      params.set('limit', '100');

      const response = await fetch(`/api/integrations/events?${params}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
      } else {
        setError(data.error || 'Failed to load events');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [projectId, integrationId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="events-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400" data-testid="events-error">
        {error}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 bg-gray-800/30 rounded-lg border border-gray-700/50" data-testid="events-empty">
        <p>No events recorded yet</p>
        <p className="text-sm mt-2">
          Events will appear here when integrations are triggered
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="events-log">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          Showing {events.length} most recent events
        </p>
        <button
          onClick={fetchEvents}
          className="px-3 py-1.5 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg transition-colors flex items-center gap-1.5"
          data-testid="refresh-events-btn"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {events.map((event) => {
        const statusStyle = STATUS_STYLES[event.status] || STATUS_STYLES.pending;
        const icon = EVENT_TYPE_ICONS[event.event_type] || '📤';
        const isExpanded = expandedEvent === event.id;

        return (
          <motion.div
            key={event.id}
            layout
            className="bg-gray-800/30 border border-gray-700/50 rounded-lg overflow-hidden"
            data-testid={`event-${event.id}`}
          >
            {/* Event Header */}
            <button
              onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
              className="w-full p-3 flex items-center gap-3 text-left hover:bg-gray-700/20 transition-colors"
              data-testid={`event-toggle-${event.id}-btn`}
            >
              <span className="text-lg">{icon}</span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {event.event_type.replace('.', ' ').replace(/^\w/, (c) => c.toUpperCase())}
                  </span>
                  <span className={`px-1.5 py-0.5 text-xs rounded capitalize ${statusStyle.bg} ${statusStyle.text}`}>
                    {event.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(event.created_at).toLocaleString()}
                  {event.retry_count > 0 && (
                    <span className="ml-2 text-yellow-500">
                      ({event.retry_count} retries)
                    </span>
                  )}
                </p>
              </div>

              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Event Details */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-700/50 p-3 space-y-3"
              >
                {/* Error Message */}
                {event.error_message && (
                  <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                    <strong>Error:</strong> {event.error_message}
                  </div>
                )}

                {/* Payload */}
                <div>
                  <h4 className="text-xs font-medium text-gray-400 mb-1">Payload</h4>
                  <pre className="p-2 bg-gray-900/50 rounded text-xs text-gray-300 overflow-x-auto max-h-48">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>

                {/* Response */}
                {event.response !== null && event.response !== undefined && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-1">Response</h4>
                    <pre className="p-2 bg-gray-900/50 rounded text-xs text-gray-300 overflow-x-auto max-h-48">
                      {JSON.stringify(event.response, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>ID: {event.id}</span>
                  {event.processed_at && (
                    <span>Processed: {new Date(event.processed_at).toLocaleString()}</span>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
