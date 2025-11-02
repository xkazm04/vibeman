import React from 'react';
import { motion } from 'framer-motion';
import { FolderTree, Calendar, FileText, Trash2 } from 'lucide-react';
import { useContextStore } from '../../../stores/contextStore';

export default function ContextList() {
  const { contexts, removeContext } = useContextStore();

  if (contexts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
          <FolderTree className="w-8 h-8 opacity-50" />
        </div>
        <p className="text-sm mb-2">No contexts saved yet</p>
        <p className="text-sm text-gray-600">Select files and save your first context</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contexts.map((context, index) => (
        <motion.div
          key={context.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <FolderTree className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-white font-mono truncate">
                  {context.name}
                </h3>
              </div>
              
              {context.description && (
                <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                  {context.description}
                </p>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
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
            
            <button
              onClick={() => removeContext(context.id)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-sm transition-all"
              title="Delete context"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          
          {/* Files preview */}
          <div className="mt-3 pt-3 border-t border-gray-700/30">
            <div className="flex flex-wrap gap-1">
              {context.filePaths.slice(0, 3).map((path, fileIndex) => (
                <span
                  key={fileIndex}
                  className="inline-flex items-center px-2 py-1 bg-gray-900/50 text-sm text-gray-400 rounded-sm font-mono"
                >
                  {path.split('/').pop()}
                </span>
              ))}
              {context.filePaths.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-900/50 text-sm text-gray-500 rounded-sm">
                  +{context.filePaths.length - 3} more
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}