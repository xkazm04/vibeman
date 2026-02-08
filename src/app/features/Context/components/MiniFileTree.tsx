'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { File, Folder, ChevronRight, FileCode, FileJson, FileText, Image, LucideIcon } from 'lucide-react';
import { FilePath } from '../../../../utils/pathUtils';

interface MiniFileTreeProps {
  filePaths: string[];
  maxFiles?: number;
  showFullPath?: boolean;
  groupByFolder?: boolean;
  className?: string;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  extension?: string;
}

/**
 * Static lookup map for file icons - O(1) access instead of O(n) switch evaluation
 */
const FILE_ICONS: Record<string, LucideIcon> = {
  tsx: FileCode,
  ts: FileCode,
  jsx: FileCode,
  js: FileCode,
  json: FileJson,
  md: FileText,
  txt: FileText,
  png: Image,
  jpg: Image,
  jpeg: Image,
  svg: Image,
  gif: Image,
  webp: Image,
};

/**
 * Static lookup map for extension colors - O(1) access instead of O(n) switch evaluation
 */
const EXTENSION_COLORS: Record<string, string> = {
  tsx: 'text-blue-400',
  ts: 'text-blue-300',
  jsx: 'text-yellow-400',
  js: 'text-yellow-300',
  json: 'text-green-400',
  css: 'text-pink-400',
  scss: 'text-pink-400',
  sass: 'text-pink-400',
  less: 'text-pink-400',
  py: 'text-emerald-400',
  md: 'text-gray-400',
  html: 'text-orange-400',
  vue: 'text-green-500',
  svelte: 'text-orange-500',
};

const DEFAULT_FILE_ICON = File;
const DEFAULT_EXTENSION_COLOR = 'text-gray-500';

/**
 * Get icon based on file extension - O(1) lookup
 */
function getFileIcon(extension: string | undefined): LucideIcon {
  return FILE_ICONS[extension || ''] || DEFAULT_FILE_ICON;
}

/**
 * Get extension color for visual differentiation - O(1) lookup
 */
function getExtensionColor(extension: string | undefined): string {
  return EXTENSION_COLORS[extension || ''] || DEFAULT_EXTENSION_COLOR;
}

/**
 * Build a simplified tree structure from file paths using FilePath value objects
 */
function buildSimpleTree(filePaths: string[]): { folders: Set<string>; files: { name: string; path: string; extension?: string }[] } {
  const folders = new Set<string>();
  const files: { name: string; path: string; extension?: string }[] = [];

  filePaths.forEach(raw => {
    const fp = FilePath.from(raw);
    const parent = fp.parentFolder;
    if (parent) {
      folders.add(parent);
    }

    files.push({
      name: fp.fileName,
      path: raw,
      extension: fp.extension,
    });
  });

  return { folders, files };
}

/**
 * MiniFileTree - Compact file tree visualization for context cards
 *
 * Shows a condensed view of context files with folder grouping
 * and file type indicators.
 */
export default function MiniFileTree({
  filePaths,
  maxFiles = 5,
  showFullPath = false,
  groupByFolder = true,
  className = '',
}: MiniFileTreeProps) {
  const { folders, files } = useMemo(() => buildSimpleTree(filePaths), [filePaths]);

  const displayFiles = files.slice(0, maxFiles);
  const hiddenCount = files.length - maxFiles;

  if (filePaths.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
        <Folder className="w-3 h-3" />
        <span>No files</span>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Folder summary */}
      {groupByFolder && folders.size > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5 py-1 px-1.5 rounded-md bg-gray-800/20 border border-gray-700/20 transition-colors duration-200 hover:bg-gray-800/40">
          <Folder className="w-3 h-3 text-amber-500/70" />
          <span className="font-mono">
            {folders.size} folder{folders.size !== 1 ? 's' : ''}
          </span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className="font-mono">
            {filePaths.length} file{filePaths.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* File list */}
      <div className="space-y-0.5">
        {displayFiles.map((file, index) => {
          const Icon = getFileIcon(file.extension);
          const color = getExtensionColor(file.extension);

          return (
            <motion.div
              key={file.path}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center gap-1.5 text-xs group"
              title={file.path}
            >
              <Icon className={`w-3 h-3 flex-shrink-0 ${color}`} />
              <span className="text-gray-300 truncate group-hover:text-gray-100 transition-colors">
                {showFullPath ? file.path : file.name}
              </span>
              {file.extension && (
                <span className={`text-[10px] ${color} opacity-60`}>
                  .{file.extension}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Hidden count indicator */}
      {hiddenCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-1 text-xs text-gray-500 mt-1"
        >
          <span className="font-mono">+{hiddenCount} more</span>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Ultra-compact inline file preview
 */
export function MiniFileList({
  filePaths,
  maxDisplay = 3,
  className = '',
}: {
  filePaths: string[];
  maxDisplay?: number;
  className?: string;
}) {
  const displayPaths = filePaths.slice(0, maxDisplay);
  const remaining = filePaths.length - maxDisplay;

  if (filePaths.length === 0) {
    return <span className={`text-xs text-gray-500 ${className}`}>No files</span>;
  }

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {displayPaths.map((path) => {
        const fp = FilePath.from(path);
        const fileName = fp.fileName;
        const ext = fp.extension;

        return (
          <span
            key={path}
            className={`text-[10px] px-1.5 py-0.5 rounded ${getExtensionColor(ext)} bg-gray-800/50`}
            title={path}
          >
            {fileName.length > 15 ? fileName.slice(0, 12) + '...' : fileName}
          </span>
        );
      })}
      {remaining > 0 && (
        <span className="text-[10px] text-gray-500">+{remaining}</span>
      )}
    </div>
  );
}

/**
 * File type summary badges
 */
export function FileTypeSummary({
  filePaths,
  className = '',
}: {
  filePaths: string[];
  className?: string;
}) {
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filePaths.forEach(raw => {
      const ext = FilePath.from(raw).extension || 'other';
      counts[ext] = (counts[ext] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [filePaths]);

  if (filePaths.length === 0) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {typeCounts.map(([ext, count]) => (
        <span
          key={ext}
          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${getExtensionColor(ext)} bg-gray-800/50 border border-gray-700/30 transition-all duration-200 hover:bg-gray-700/50 hover:border-gray-600/40`}
        >
          {count} .{ext}
        </span>
      ))}
    </div>
  );
}
