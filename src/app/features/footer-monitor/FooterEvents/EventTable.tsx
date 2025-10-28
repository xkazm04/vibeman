import { useState } from 'react';
import EventRow from './EventRow';
import { AnimatePresence } from 'framer-motion';
import { EventLogEntry } from '@/types';

const EventTable = ({
  viewState, 
  filter, 
  filteredEvents, 
  isLoading, 
  onEventClick,
  onDeleteEvent
}: {
  viewState: 'normal' | 'maximized' | 'minimized';
  filter: string;
  filteredEvents: EventLogEntry[];
  isLoading?: boolean;
  onEventClick?: (event: EventLogEntry) => void;
  onDeleteEvent?: (eventId: string, eventTitle: string) => void;
}) => {
  const getTableHeight = () => {
    switch (viewState) {
      case 'maximized': return 'max-h-[65vh]';
      case 'normal': 
      default: return 'max-h-96';
    }
  };
  
  return (
    <div className="flex-1 overflow-hidden border border-gray-700/30 rounded-lg bg-gray-900/20">
      <div className={`${getTableHeight()} overflow-auto custom-scrollbar`}>
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50">
            <tr>
              <th className="px-3 py-2 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Event</th>
              <th className="px-3 py-2 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Description</th>
              <th className="px-3 py-2 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Type</th>
              <th className="px-3 py-2 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">Time</th>
              <th className="px-3 py-2 text-center text-gray-300 font-medium text-sm uppercase tracking-wider w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredEvents.map((event, index) => (
                <EventRow 
                  key={event.id} 
                  event={event} 
                  index={index}
                  onClick={onEventClick}
                  onDelete={onDeleteEvent}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {filteredEvents.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-sm">No {filter !== 'all' ? filter : ''} events to display</div>
          </div>
        )}
        {isLoading && filteredEvents.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-sm animate-pulse">Loading events...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventTable;