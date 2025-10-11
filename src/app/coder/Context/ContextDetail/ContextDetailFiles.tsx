/**
 * Context Detail Files Component
 * Displays list of file paths in the context
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FolderTree } from 'lucide-react';
import { Context } from '../../../../stores/contextStore';

interface ContextDetailFilesProps {
  context: Context;
}

export default function ContextDetailFiles({ context }: ContextDetailFilesProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-6 border border-gray-700/40"
    >
      <h3 className="text-xl font-bold text-white font-mono mb-6 flex items-center space-x-3">
        <FolderTree className="w-6 h-6 text-green-400" />
        <span>File Paths ({context.filePaths.length})</span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {context.filePaths.map((path, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.05 }}
            className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-gray-600/50 transition-all group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p 
                  className="text-sm text-gray-300 font-mono truncate group-hover:text-white transition-colors"
                  title={path}
                >
                  {path}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
