'use client';
import React, { useState } from 'react';
import { Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useEvents, ClientEvent } from '@/hooks/useEvents';
import { UniversalModal } from '@/components/UniversalModal';
import EventTable from '../events/EventTable';

interface EventsPanelProps {
  viewState: 'normal' | 'maximized' | 'minimized';
  eventFilter: string;
  setEventFilter: (filter: string) => void;
  isLoading: boolean;
}

export default function EventsPanel({ 
  viewState, 
  eventFilter, 
  setEventFilter, 
  isLoading 
}: EventsPanelProps) {
  const [selectedEvent, setSelectedEvent] = useState<ClientEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    events: eventLog,
    eventCounts: rawEventCounts,
    refresh
  } = useEvents({
    limit: 50,
    type: eventFilter,
    autoRefresh: false
  });

  // Event filtering and counts
  const limitedEvents = eventLog.slice(0, 50);
  const filteredEvents = eventFilter === 'all' ? limitedEvents : limitedEvents.filter(event => event.type === eventFilter);

  // Use server-provided counts or calculate from current events
  const eventCounts = rawEventCounts && Object.keys(rawEventCounts).length > 0 
    ? rawEventCounts 
    : limitedEvents.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

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

  const handleEventClick = (event: any) => {
    // Find the original DbEvent from eventLog
    const dbEvent = eventLog.find(e => e.id === event.id);
    if (dbEvent) {
      setSelectedEvent(dbEvent);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const formatEventDetails = (event: ClientEvent) => {
    const details: Array<{ label: string; value: string }> = [
      { label: 'Event ID', value: event.id },
      { label: 'Project ID', value: event.project_id },
      { label: 'Type', value: event.type.toUpperCase() },
      { label: 'Created', value: new Date(event.created_at).toLocaleString() }
    ];

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
        />
      </div>

      {/* Event Details Modal */}
      <UniversalModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Event Details"
        subtitle={selectedEvent ? `${selectedEvent.type.toUpperCase()} - ${selectedEvent.title}` : ''}
        icon={selectedEvent ? (
          selectedEvent.type === 'error' ? XCircle :
          selectedEvent.type === 'warning' ? AlertTriangle :
          selectedEvent.type === 'success' ? CheckCircle : Info
        ) : Info}
        iconBgColor={selectedEvent ? (
          selectedEvent.type === 'error' ? 'from-red-800/60 to-red-900/60' :
          selectedEvent.type === 'warning' ? 'from-yellow-800/60 to-yellow-900/60' :
          selectedEvent.type === 'success' ? 'from-green-800/60 to-green-900/60' : 
          'from-blue-800/60 to-blue-900/60'
        ) : 'from-blue-800/60 to-blue-900/60'}
        iconColor={selectedEvent ? (
          selectedEvent.type === 'error' ? 'text-red-300' :
          selectedEvent.type === 'warning' ? 'text-yellow-300' :
          selectedEvent.type === 'success' ? 'text-green-300' : 
          'text-blue-300'
        ) : 'text-blue-300'}
        maxWidth="max-w-4xl"
        maxHeight="max-h-[80vh]"
      >
        {selectedEvent && (
          <div className="space-y-6">
            {/* Event Description */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
              <p className="text-gray-300 bg-gray-800/50 p-3 rounded-lg border border-gray-700/30">
                {selectedEvent.description}
              </p>
            </div>

            {/* Event Details */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Event Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {formatEventDetails(selectedEvent).map(({ label, value }) => (
                  <div key={label} className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/30">
                    <div className="text-sm text-gray-400 mb-1">{label}</div>
                    <div className="text-white font-mono text-sm">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Message/Data */}
            {selectedEvent.message && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Additional Data</h3>
                {(() => {
                  const parsedMessage = parseEventMessage(selectedEvent.message);
                  
                  if (!parsedMessage) return null;

                  if (parsedMessage.isJson) {
                    return (
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/30 overflow-auto">
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                          {JSON.stringify(parsedMessage.data, null, 2)}
                        </pre>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/30 overflow-auto">
                        <p className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                          {parsedMessage.data}
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        )}
      </UniversalModal>
    </>
  );
}