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
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 max-w-xs pointer-events-none"
          style={{
            left: position.x,
            top: position.y - 10,
            transform: 'translateX(-50%)'
          }}
        >
          {/* Header */}
          <div className="flex items-center space-x-2 mb-2">
            <div className="p-1 bg-purple-500/20 rounded-sm">
              <FolderTree className="w-3 h-3 text-purple-400" />
            </div>
            <h4 className="text-sm font-semibold text-white font-mono">{context.name}</h4>
          </div>

          {/* Description */}
          {context.description && (
            <p className="text-xs text-gray-300 mb-3">{context.description}</p>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
            <div className="flex items-center space-x-1">
              <FileText className="w-3 h-3" />
              <span>{context.filePaths.length} files</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{context.createdAt.toLocaleDateString()}</span>
            </div>
          </div>

          {/* Files List */}
          <div className="border-t border-gray-600/30 pt-2">
            <p className="text-xs text-gray-400 mb-1">Files:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {context.filePaths.map((path, index) => (
                <div key={index} className="text-xs text-gray-300 font-mono truncate" title={path}>
                  {path}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}