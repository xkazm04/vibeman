'use client';
import React from 'react';
import { Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import EventTable from './EventTable';
import { FilterState } from '../background-tasks/bgTaskTypes';
import { EventLogEntry } from '@/types';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';

interface EventsProps {
  viewState: 'normal' | 'maximized' | 'minimized';
  filterState: FilterState;
  isLoading: boolean;
}

export default function Events({ 
  viewState, 
  filterState,
  isLoading 
}: EventsProps) {
  const { eventFilter, setEventFilter } = filterState;
  const { showFullScreenModal, showConfirmModal } = useGlobalModal();

  const {
    events: rawEventLog,
    eventCounts: rawEventCounts,
    refresh: refreshEvents
  } = useEvents({
    limit: 50,
    type: eventFilter,
    autoRefresh: false
  });

  // Transform events to EventLogEntry format for the table
  const eventLog: EventLogEntry[] = rawEventLog.map(event => {
    // Safely parse timestamp
    let timestamp: Date;
    try {
      timestamp = event.created_at ? new Date(event.created_at) : new Date();
      // Validate the date
      if (isNaN(timestamp.getTime())) {
        timestamp = new Date();
      }
    } catch (error) {
      timestamp = new Date();
    }

    return {
      id: event.id || 'unknown',
      title: event.title || 'Untitled Event',
      description: event.description || 'No description',
      type: event.type || 'info',
      timestamp: timestamp,
      agent: event.agent || undefined,
      message: event.message || undefined,
      rawMessage: event.message || undefined // For modal display
    };
  });

  // Event filtering and counts with safe fallbacks
  const limitedEvents = eventLog.slice(0, 50);
  const filteredEvents: EventLogEntry[] = eventFilter === 'all' 
    ? limitedEvents 
    : limitedEvents.filter(event => event.type === eventFilter);

  // Safely handle event counts
  const eventCounts = (() => {
    try {
      // Check if rawEventCounts is valid
      if (rawEventCounts && typeof rawEventCounts === 'object' && Object.keys(rawEventCounts).length > 0) {
        return rawEventCounts;
      }
      
      // Fallback to calculating from current events
      return limitedEvents.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      console.warn('Error processing event counts:', error);
      // Return empty counts as fallback
      return {
        info: 0,
        warning: 0,
        error: 0,
        success: 0,
        proposal_accepted: 0,
        proposal_rejected: 0
      };
    }
  })();

  // Filter options
  const eventFilterOptions = [
    { value: 'all', label: 'All', icon: null, count: limitedEvents.length },
    { value: 'info', label: 'Info', icon: Info, count: eventCounts.info || 0 },
    { value: 'warning', label: 'Warning', icon: AlertTriangle, count: eventCounts.warning || 0 },
    { value: 'error', label: 'Error', icon: XCircle, count: eventCounts.error || 0 },
    { value: 'success', label: 'Success', icon: CheckCircle, count: eventCounts.success || 0 },
  ];

  const getFilterColor = (type: string) => {
    switch (type) {
      case 'info': return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
      case 'warning': return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400';
      case 'error': return 'border-red-500/50 bg-red-500/10 text-red-400';
      case 'success': return 'border-green-500/50 bg-green-500/10 text-green-400';
      default: return 'border-gray-500/50 bg-gray-500/10 text-gray-400';
    }
  };

  const handleEventClick = (event: EventLogEntry) => {
    const modalContent = (
      <div className="space-y-6">
        {/* Event Description */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
          <p className="text-gray-300 bg-gray-800/50 p-3 rounded-lg border border-gray-700/30">
            {event.description}
          </p>
        </div>

        {/* Event Details */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Event Information</h3>
          <div className="grid grid-cols-2 gap-4">
            {formatEventDetails(event).map(({ label, value }) => (
              <div key={label} className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/30">
                <div className="text-sm text-gray-400 mb-1">{label}</div>
                <div className="text-white font-mono text-sm">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Message/Data */}
        {event.rawMessage && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Additional Data</h3>
            {(() => {
              const parsedMessage = parseEventMessage(event.rawMessage);
              
              if (!parsedMessage) return null;

              if (parsedMessage.isJson) {
                // Check if it's an Ollama event with structured data
                const data = parsedMessage.data;
                if (data && typeof data === 'object' && data.taskType) {
                  return (
                    <div className="space-y-4">
                      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/30">
                        <h4 className="text-md font-semibold text-white mb-3">Ollama Generation Details</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {data.taskType && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Task Type:</span>
                              <span className="text-white">{data.taskType}</span>
                            </div>
                          )}
                          {data.duration && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Duration:</span>
                              <span className="text-white">{data.duration}ms</span>
                            </div>
                          )}
                          {data.model && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Model:</span>
                              <span className="text-white">{data.model}</span>
                            </div>
                          )}
                          {data.promptTokens && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Prompt Tokens:</span>
                              <span className="text-white">{data.promptTokens}</span>
                            </div>
                          )}
                          {data.responseTokens && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Response Tokens:</span>
                              <span className="text-white">{data.responseTokens}</span>
                            </div>
                          )}
                          {data.responseLength && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Response Length:</span>
                              <span className="text-white">{data.responseLength} chars</span>
                            </div>
                          )}
                          {data.totalDuration && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total Duration:</span>
                              <span className="text-white">{Math.round(data.totalDuration / 1000000)}ms</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Check if there's an actual Ollama response to display */}
                      {data.response && (
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/30">
                          <h4 className="text-md font-semibold text-white mb-3">AI Response</h4>
                          <div className="max-h-96 overflow-y-auto">
                            <MarkdownViewer 
                              content={data.response} 
                              theme="dark"
                              className="text-sm"
                            />
                          </div>
                        </div>
                      )}

                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/30 overflow-auto">
                        <h4 className="text-md font-semibold text-white mb-2">Raw Data</h4>
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                          {JSON.stringify(data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/30 overflow-auto">
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                        {JSON.stringify(parsedMessage.data, null, 2)}
                      </pre>
                    </div>
                  );
                }
              } else {
                // Check if the message looks like markdown
                const isMarkdown = parsedMessage.data.includes('#') || 
                                 parsedMessage.data.includes('```') || 
                                 parsedMessage.data.includes('*') ||
                                 parsedMessage.data.includes('[') ||
                                 parsedMessage.data.includes('|');

                if (isMarkdown) {
                  return (
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/30">
                      <h4 className="text-md font-semibold text-white mb-3">Message Content</h4>
                      <div className="max-h-96 overflow-y-auto">
                        <MarkdownViewer 
                          content={parsedMessage.data} 
                          theme="dark"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/30 overflow-auto">
                      <h4 className="text-md font-semibold text-white mb-3">Message Content</h4>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                        {parsedMessage.data}
                      </p>
                    </div>
                  );
                }
              }
            })()}
          </div>
        )}
      </div>
    );

    showFullScreenModal("Event Details", modalContent, {
      subtitle: `${event.type.toUpperCase()} - ${event.title}`,
      icon: event.type === 'error' ? XCircle :
            event.type === 'warning' ? AlertTriangle :
            event.type === 'success' ? CheckCircle : Info,
      iconBgColor: event.type === 'error' ? 'from-red-800/60 to-red-900/60' :
                   event.type === 'warning' ? 'from-yellow-800/60 to-yellow-900/60' :
                   event.type === 'success' ? 'from-green-800/60 to-green-900/60' : 
                   'from-blue-800/60 to-blue-900/60',
      iconColor: event.type === 'error' ? 'text-red-300' :
                 event.type === 'warning' ? 'text-yellow-300' :
                 event.type === 'success' ? 'text-green-300' : 
                 'text-blue-300',
      maxWidth: "max-w-4xl",
      maxHeight: "max-h-[80vh]"
    });
  };

  const formatEventDetails = (event: EventLogEntry) => {
    const details: Array<{ label: string; value: string }> = [
      { label: 'Event ID', value: event.id },
      { label: 'Type', value: event.type.toUpperCase() },
    ];

    // Safely handle date formatting
    try {
      if (event.timestamp instanceof Date && !isNaN(event.timestamp.getTime())) {
        details.push({ label: 'Created', value: event.timestamp.toLocaleString() });
      } else {
        details.push({ label: 'Created', value: 'Invalid date' });
      }
    } catch (error) {
      details.push({ label: 'Created', value: 'Unknown' });
    }

    if (event.agent) {
      details.push({ label: 'Agent', value: event.agent });
    }

    return details;
  };

  const parseEventMessage = (message: string | null) => {
    if (!message) return null;

    try {
      // Try to parse as JSON for structured data
      const parsed = JSON.parse(message);
      return {
        isJson: true,
        data: parsed
      };
    } catch {
      // Return as plain text
      return {
        isJson: false,
        data: message
      };
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/kiro/events?id=${eventId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete event');
      }

      // Refresh events list
      refreshEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      // You could show an error toast here
    }
  };

  const confirmDeleteEvent = (eventId: string, eventTitle: string) => {
    showConfirmModal(
      'Delete Event',
      `Are you sure you want to delete the event "${eventTitle}"? This action cannot be undone.`,
      () => handleDeleteEvent(eventId)
    );
  };

  return (
    <>
      <div className="flex flex-col">
        <div className="flex-shrink-0 mb-3">
          <h4 className="text-md font-medium text-white mb-2">Events ({limitedEvents.length})</h4>
          <div className="flex flex-wrap gap-1">
            {eventFilterOptions.map(({ value, label, icon: Icon, count }) => (
              <button
                key={value}
                onClick={() => setEventFilter(value)}
                className={`flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium transition-all ${
                  eventFilter === value
                    ? getFilterColor(value)
                    : 'border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-gray-600/50 hover:bg-gray-700/30'
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                <span>{label}</span>
                <span className="bg-gray-900/50 px-1 py-0.5 rounded-full text-xs">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
        <EventTable
          viewState={viewState}
          filter={eventFilter}
          filteredEvents={filteredEvents}
          isLoading={isLoading}
          onEventClick={handleEventClick}
          onDeleteEvent={confirmDeleteEvent}
        />
      </div>


    </>
  );
}