'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Folder, FolderOpen, ChevronRight } from 'lucide-react';
import { FilePath } from '../../../../../utils/pathUtils';

interface FilesTabProps {
  filePaths: string[];
  groupColor: string;
}

export default function FilesTab({ filePaths, groupColor }: FilesTabProps) {
  // Group files by directory
  const groupedFiles = React.useMemo(() => {
    const groups: Record<string, string[]> = {};

    filePaths.forEach((filePath) => {
      const fp = FilePath.from(filePath);
      const directory = fp.directory || '/';
      const fileName = fp.fileName;

      if (!groups[directory]) {
        groups[directory] = [];
      }
      groups[directory].push(fileName);
    });

    return groups;
  }, [filePaths]);

  if (filePaths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Folder className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-mono">No files associated with this context</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg backdrop-blur-sm border"
            style={{
              backgroundColor: `${groupColor}20`,
              borderColor: `${groupColor}40`,
            }}
          >
            <FolderOpen className="w-5 h-5" style={{ color: groupColor }} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-mono">Related Files</h3>
            <p className="text-sm text-gray-400 font-mono">{filePaths.length} file{filePaths.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Files List - Grouped by Directory */}
      <div className="space-y-6">
        {Object.entries(groupedFiles).sort().map(([directory, files], groupIndex) => (
          <motion.div
            key={directory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
            className="space-y-2"
          >
            {/* Directory Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/40 rounded-lg border border-gray-700/30">
              <Folder
                className="w-4 h-4 flex-shrink-0"
                style={{ color: groupColor }}
              />
              <span className="text-sm font-mono text-gray-300 truncate">
                {directory === '/' ? 'Root Directory' : directory}
              </span>
            </div>

            {/* Files in Directory */}
            <div className="ml-4 space-y-1">
              {files.sort().map((fileName, fileIndex) => (
                <motion.div
                  key={`${directory}/${fileName}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: groupIndex * 0.1 + fileIndex * 0.05 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900/40 hover:bg-gray-800/60 border border-transparent hover:border-gray-700/50 transition-all group"
                >
                  <ChevronRight
                    className="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition-colors"
                    style={{ color: groupColor }}
                  />
                  <FileText
                    className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors flex-shrink-0"
                  />
                  <span className="text-sm font-mono text-gray-400 group-hover:text-gray-200 transition-colors flex-1 truncate">
                    {fileName}
                  </span>
                  {/* File extension badge */}
                  {fileName.includes('.') && (
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono flex-shrink-0"
                      style={{
                        backgroundColor: `${groupColor}15`,
                        color: groupColor,
                      }}
                    >
                      {FilePath.from(fileName).extension}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="mt-8 p-4 rounded-xl border border-gray-700/30 bg-gray-800/20">
        <div className="flex items-center justify-between text-sm font-mono">
          <span className="text-gray-400">Total Files:</span>
          <span className="font-semibold" style={{ color: groupColor }}>
            {filePaths.length}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm font-mono mt-2">
          <span className="text-gray-400">Directories:</span>
          <span className="font-semibold" style={{ color: groupColor }}>
            {Object.keys(groupedFiles).length}
          </span>
        </div>
      </div>
    </div>
  );
}
