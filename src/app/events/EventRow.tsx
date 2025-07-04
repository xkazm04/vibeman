import React from 'react';
import { motion } from 'framer-motion';
import { Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { EventLogEntry } from '@/types';

interface EventRowProps {
  event: EventLogEntry;
  index: number;
}

export default function EventRow({ event, index }: EventRowProps) {
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

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.02 }}
      className="border-b border-gray-700/20 hover:bg-gray-800/20 transition-colors"
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
        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${bgColorClass} ${colorClass} capitalize`}>
          {event.type}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="text-gray-400 text-xs font-mono">
          {event.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          })}
        </span>
      </td>
    </motion.tr>
  );
}; 