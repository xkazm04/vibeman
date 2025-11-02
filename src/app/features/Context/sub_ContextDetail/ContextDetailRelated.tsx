/**
 * Context Detail Related Component
 * Shows other contexts in the same group
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FolderTree } from 'lucide-react';
import { Context, ContextGroup } from '../../../../stores/contextStore';
import ContextCard from '../ContextCard';

interface ContextDetailRelatedProps {
  groupContexts: Context[];
  contextGroup: ContextGroup | null;
  allGroups: ContextGroup[];
}

export default function ContextDetailRelated({ 
  groupContexts, 
  contextGroup, 
  allGroups 
}: ContextDetailRelatedProps) {
  if (groupContexts.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-6 border border-gray-700/40"
    >
      <h3 className="text-xl font-bold text-white font-mono mb-6 flex items-center space-x-3">
        <FolderTree 
          className="w-6 h-6" 
          style={{ color: contextGroup?.color || '#8B5CF6' }}
        />
        <span>Other Contexts in {contextGroup?.name || 'Group'} ({groupContexts.length})</span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupContexts.map((context, index) => (
          <motion.div
            key={context.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="transform scale-75 origin-top-left"
          >
            <ContextCard
              context={context}
              groupColor={contextGroup?.color}
              availableGroups={allGroups}
              selectedFilePaths={[]}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
