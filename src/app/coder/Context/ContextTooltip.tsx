import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Calendar, FolderTree } from 'lucide-react';
import { Context } from '../../../stores/contextStore';

interface ContextTooltipProps {
  context: Context;
  isVisible: boolean;
  position: { x: number; y: number };
}

export default function ContextTooltip({ context, isVisible, position }: ContextTooltipProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.15 }}
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 max-w-sm pointer-events-none"
          style={{
            left: position.x,
            top: position.y - 10,
            transform: 'translateX(-50%)'
          }}
        >
          {/* Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-md">
              <FolderTree className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white font-mono">{context.name}</h4>
              <div className="flex items-center space-x-3 mt-1 text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>{context.filePaths.length} files</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{context.createdAt.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {context.description && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-300 mb-1">Description:</p>
              <p className="text-xs text-gray-400 leading-relaxed">{context.description}</p>
            </div>
          )}

          {/* Files List */}
          <div className="border-t border-gray-600/30 pt-3">
            <p className="text-xs font-medium text-gray-300 mb-2">Files:</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {context.filePaths.map((path, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full flex-shrink-0"></div>
                  <div className="text-xs text-gray-300 font-mono truncate" title={path}>
                    {path}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}