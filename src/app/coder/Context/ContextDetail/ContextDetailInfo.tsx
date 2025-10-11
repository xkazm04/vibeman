/**
 * Context Detail Info Component
 * Basic information panel for context details
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { Context, ContextGroup } from '../../../../stores/contextStore';

interface ContextDetailInfoProps {
  context: Context;
  contextGroup: ContextGroup | null;
}

export default function ContextDetailInfo({ context, contextGroup }: ContextDetailInfoProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-6 border border-gray-700/40"
    >
      <h3 className="text-xl font-bold text-white font-mono mb-6 flex items-center space-x-3">
        <FileText className="w-6 h-6 text-blue-400" />
        <span>Context Information</span>
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Name</label>
          <p className="text-lg font-bold text-white font-mono mt-1">{context.name}</p>
        </div>
        
        {context.description && (
          <div>
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Description</label>
            <p className="text-gray-300 mt-1 leading-relaxed">{context.description}</p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Files</label>
            <p className="text-2xl font-bold text-white font-mono mt-1">{context.filePaths.length}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Group</label>
            <p 
              className="text-lg font-bold font-mono mt-1"
              style={{ color: contextGroup?.color || '#8B5CF6' }}
            >
              {contextGroup?.name || 'Ungrouped'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
