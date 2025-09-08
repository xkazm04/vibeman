'use client';
import React from 'react';
import { useEvents, useCreateEvent } from '@/hooks/useEvents';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

export default function EventsTestPanel() {
  const { activeProject } = useActiveProjectStore();
  const projectId = activeProject?.id || 'test-project';
  
  const {
    events,
    eventCounts,
    isLoading,
    error,
    refresh,
    clearEvents,
    isCreatingEvent,
    isClearingEvents
  } = useEvents({
    projectId,
    limit: 10,
    autoRefresh: false
  });

  const createEvent = useCreateEvent();

  const handleCreateTestEvent = () => {
    createEvent.mutate({
      project_id: projectId,
      title: 'Test Event',
      description: 'This is a test event created from the client',
      type: 'info',
      agent: 'test-client',
      message: JSON.stringify({
        timestamp: new Date().toISOString(),
        source: 'EventsTestPanel',
        testData: { foo: 'bar', number: 42 }
      })
    });
  };

  const handleCreateErrorEvent = () => {
    createEvent.mutate({
      project_id: projectId,
      title: 'Test Error Event',
      description: 'This is a test error event',
      type: 'error',
      agent: 'test-client',
      message: 'Error details: Something went wrong in the test'
    });
  };

  const handleClearEvents = () => {
    clearEvents(projectId);
  };

  if (isLoading) {
    return <div className="p-4 text-gray-400">Loading events...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-400">Error: {error.message}</div>;
  }

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Events Test Panel</h3>
      
      {/* Controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleCreateTestEvent}
          disabled={isCreatingEvent}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded text-sm"
        >
          {isCreatingEvent ? 'Creating...' : 'Create Test Event'}
        </button>
        
        <button
          onClick={handleCreateErrorEvent}
          disabled={isCreatingEvent}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded text-sm"
        >
          Create Error Event
        </button>
        
        <button
          onClick={refresh}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
        >
          Refresh
        </button>
        
        <button
          onClick={handleClearEvents}
          disabled={isClearingEvents}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded text-sm"
        >
          {isClearingEvents ? 'Clearing...' : 'Clear All'}
        </button>
      </div>

      {/* Event Counts */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Event Counts:</h4>
        <div className="flex gap-4 text-xs">
          <span className="text-blue-400">Info: {eventCounts.info || 0}</span>
          <span className="text-yellow-400">Warning: {eventCounts.warning || 0}</span>
          <span className="text-red-400">Error: {eventCounts.error || 0}</span>
          <span className="text-green-400">Success: {eventCounts.success || 0}</span>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Recent Events ({events.length}):</h4>
        {events.length === 0 ? (
          <div className="text-gray-500 text-sm">No events found</div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-2 bg-gray-800 rounded border border-gray-700 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white">{event.title}</span>
                  <span className={`px-1 py-0.5 rounded text-xs ${
                    event.type === 'error' ? 'bg-red-900 text-red-300' :
                    event.type === 'warning' ? 'bg-yellow-900 text-yellow-300' :
                    event.type === 'success' ? 'bg-green-900 text-green-300' :
                    'bg-blue-900 text-blue-300'
                  }`}>
                    {event.type}
                  </span>
                </div>
                <div className="text-gray-400 mb-1">{event.description}</div>
                <div className="text-gray-500 text-xs">
                  {new Date(event.created_at).toLocaleString()}
                  {event.agent && ` • ${event.agent}`}
                </div>
                {event.message && (
                  <details className="mt-1">
                    <summary className="text-gray-500 cursor-pointer">Message</summary>
                    <pre className="text-gray-400 text-xs mt-1 whitespace-pre-wrap">
                      {event.message}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}