import React from 'react';
import { motion } from 'framer-motion';
import { FolderTree, Clock } from 'lucide-react';
import type { Context, ContextGroup } from '../../../../stores/contextStore';
import { FilePath } from '../../../../utils/pathUtils';
import { formatDateTime } from '@/lib/formatDate';
import { getGridLayout } from '../lib/contextUtils';

interface GroupDetailContentProps {
  group: ContextGroup;
  groupContexts: Context[];
}

export default function GroupDetailContent({ group, groupContexts }: GroupDetailContentProps) {
  if (groupContexts.length === 0) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-12 border border-gray-700/40 text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-700/50 rounded-full flex items-center justify-center">
          <FolderTree className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-300 font-mono mb-2">No Contexts Yet</h3>
        <p className="text-gray-500">This group is empty. Add some contexts to get started.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-6 border border-gray-700/40"
    >
      <h3 className="text-2xl font-bold text-white font-mono mb-6 flex items-center space-x-3">
        <FolderTree
          className="w-7 h-7"
          style={{ color: group.color }}
        />
        <span>Contexts in {group.name}</span>
      </h3>

      <div className={`grid gap-4 ${getGridLayout(groupContexts.length)}`}>
        {groupContexts.map((context, index) => (
          <motion.div
            key={context.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: 0.3 + index * 0.1,
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className="group"
          >
            {/* Enhanced Context Card with additional info */}
            <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 rounded-xl p-4 border border-gray-700/40 hover:border-gray-600/60 transition-all duration-300 group-hover:shadow-lg">
              <div className="space-y-4">
                {/* Context Header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-white font-mono truncate" title={context.name}>
                    {context.name}
                  </h4>
                  <div
                    className="px-2 py-1 rounded-lg text-sm font-bold font-mono"
                    style={{
                      backgroundColor: `${group.color}20`,
                      color: group.color
                    }}
                  >
                    {context.filePaths.length}
                  </div>
                </div>

                {/* Description */}
                {context.description && (
                  <p className="text-sm text-gray-300 line-clamp-2" title={context.description}>
                    {context.description}
                  </p>
                )}

                {/* File Paths Preview */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Files ({context.filePaths.length})
                  </p>
                  <div className="max-h-32 overflow-y-auto">
                    {/* 3 columns x 5 rows grid for up to 15 files */}
                    <div className="grid grid-cols-3 gap-1">
                      {context.filePaths.slice(0, 15).map((path, pathIndex) => {
                        const fp = FilePath.from(path);
                        const normalizedPath = fp.normalized;
                        const fileName = fp.fileName;
                        return (
                          <div key={pathIndex} className="flex items-center space-x-1 min-w-0">
                            <div className="w-1 h-1 bg-gray-500 rounded-full flex-shrink-0"></div>
                            <p className="text-sm text-gray-300 font-mono truncate" title={normalizedPath}>
                              {fileName}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    {context.filePaths.length > 15 && (
                      <p className="text-sm text-gray-500 font-mono mt-2 text-center">
                        +{context.filePaths.length - 15} more files
                      </p>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-700/30">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateTime(context.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
