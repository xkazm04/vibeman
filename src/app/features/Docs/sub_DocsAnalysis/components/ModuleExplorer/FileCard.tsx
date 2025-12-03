/**
 * FileCard Component
 * Card for displaying API/DB files in the ModuleExplorer
 * Implements progressive disclosure: shows file name only by default
 * Full path reveals on hover with smooth transitions
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Database } from 'lucide-react';
import { getFileName, getFolderPath } from './fileHelpers';

interface FileCardProps {
  filePath: string;
  type: 'api' | 'db';
}

export default function FileCard({ filePath, type }: FileCardProps) {
  const fileName = getFileName(filePath);
  const folderPath = getFolderPath(filePath);

  return (
    <motion.div
      className="relative p-3 rounded-xl border transition-all bg-gray-800/40 border-gray-700/30 group hover:bg-gray-800/60 hover:border-gray-600/50"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
      data-testid={`file-card-${type}-${fileName}`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`p-1.5 rounded-lg transition-all duration-200 ${
            type === 'api'
              ? 'bg-amber-500/20 group-hover:bg-amber-500/30'
              : 'bg-pink-500/20 group-hover:bg-pink-500/30'
          }`}
        >
          {type === 'api' ? (
            <Code2 className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Database className="w-3.5 h-3.5 text-pink-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h5 className="text-xs font-medium text-white truncate">{fileName}</h5>
          {/* Folder path - progressive disclosure on hover */}
          <p
            className="text-[10px] text-gray-500 truncate
              opacity-0 group-hover:opacity-100
              scale-95 group-hover:scale-100
              max-h-0 group-hover:max-h-6
              overflow-hidden
              transition-all duration-200"
          >
            {folderPath}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
