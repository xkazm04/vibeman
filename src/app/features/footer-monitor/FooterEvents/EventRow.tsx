import React from 'react';
import { motion } from 'framer-motion';
import { Info, AlertTriangle, XCircle, CheckCircle, Trash2 } from 'lucide-react';
import { EventLogEntry } from '@/types';

interface EventRowProps {
  event: EventLogEntry;
  index: number;
  onClick?: (event: EventLogEntry) => void;
  onDelete?: (eventId: string, eventTitle: string) => void;
}

export default function EventRow({ event, index, onClick, onDelete }: EventRowProps) {
  const getIcon = (type: EventLogEntry['type']) => {
    switch (type) {
      case 'info': return Info;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      case 'success': return CheckCircle;
      default: return Info;
    }
  };

  const getColor = (type: EventLogEntry['type']) => {
    switch (type) {
      case 'info': return 'text-blue-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getBgColor = (type: EventLogEntry['type']) => {
    switch (type) {
      case 'info': return 'bg-blue-500/10';
      case 'warning': return 'bg-yellow-500/10';
      case 'error': return 'bg-red-500/10';
      case 'success': return 'bg-green-500/10';
      default: return 'bg-gray-500/10';
    }
  };

  const IconComponent = getIcon(event.type);
  const colorClass = getColor(event.type);
  const bgColorClass = getBgColor(event.type);

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click if delete button was clicked
    if ((e.target as HTMLElement).closest('.delete-button')) {
      return;
    }
    onClick?.(event);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(event.id, event.title);
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.02 }}
      className={`border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors group ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={handleRowClick}
    >
      <td className="px-3 py-2">
        <div className="flex items-center space-x-2">
          <IconComponent className={`w-3.5 h-3.5 ${colorClass} flex-shrink-0`} />
          <span className="text-white text-sm font-medium truncate">{event.title}</span>
        </div>
      </td>
      <td className="px-3 py-2">
        <span className="text-gray-300 text-sm line-clamp-2">{event.description}</span>
      </td>
      <td className="px-3 py-2">
        <span className={`inline-flex items-center text-sm font-medium px-2 py-0.5 rounded-full ${bgColorClass} ${colorClass} capitalize`}>
          {event.type}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="text-gray-400 text-sm font-mono">
          {(() => {
            try {
              const timestamp = typeof event.timestamp === 'string' 
                ? new Date(event.timestamp) 
                : event.timestamp;
              return timestamp instanceof Date && !isNaN(timestamp.getTime()) 
                ? timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })
                : 'Invalid date';
            } catch (error) {
              return 'Invalid date';
            }
          })()}
        </span>
      </td>
      <td className="px-3 py-2 text-center">
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            className="delete-button opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200"
            title="Delete event"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </td>
    </motion.tr>
  );
}; 