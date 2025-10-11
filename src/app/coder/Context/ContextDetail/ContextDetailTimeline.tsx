/**
 * Context Detail Timeline Component
 * Displays creation and update timestamps
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import { Context } from '../../../../stores/contextStore';
import { formatDate, calculateDaysSince } from '../lib';

interface ContextDetailTimelineProps {
  context: Context;
}

export default function ContextDetailTimeline({ context }: ContextDetailTimelineProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-6 border border-gray-700/40"
    >
      <h3 className="text-xl font-bold text-white font-mono mb-6 flex items-center space-x-3">
        <Calendar className="w-6 h-6 text-blue-400" />
        <span>Timeline</span>
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Created</label>
          <p className="text-white font-mono mt-1">{formatDate(context.createdAt, 'long')}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Last Updated</label>
          <p className="text-white font-mono mt-1">{formatDate(context.updatedAt, 'long')}</p>
        </div>
        
        <div className="pt-4 border-t border-gray-700/30">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{calculateDaysSince(context.createdAt)} days old</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
