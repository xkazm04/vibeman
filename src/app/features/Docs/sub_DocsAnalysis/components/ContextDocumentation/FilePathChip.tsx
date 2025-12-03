/**
 * FilePathChip Component
 * File path chip with progressive disclosure
 * Shows icon + filename by default; expands to show folder on hover
 */

'use client';

import React from 'react';
import { Code2, Database, FileCode } from 'lucide-react';
import { FileType } from './filePatterns';

interface FilePathChipProps {
  path: string;
  type: FileType;
}

const CHIP_STYLES = {
  api: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30',
  db: 'bg-pink-500/20 text-pink-400 border-pink-500/30 hover:bg-pink-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30',
};

const CHIP_ICONS = {
  api: <Code2 className="w-3 h-3 flex-shrink-0" />,
  db: <Database className="w-3 h-3 flex-shrink-0" />,
  other: <FileCode className="w-3 h-3 flex-shrink-0" />,
};

export default function FilePathChip({ path, type }: FilePathChipProps) {
  const fileName = path.split('/').pop() || path;
  const folderPath = path.split('/').slice(-3, -1).join('/');

  return (
    <span
      className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
        cursor-default transition-all duration-200 hover:scale-105 ${CHIP_STYLES[type]}`}
      title={path}
      data-testid={`file-chip-${type}-${fileName}`}
    >
      {CHIP_ICONS[type]}
      {/* Folder path - progressive disclosure on hover */}
      <span
        className="text-[10px] opacity-50
          opacity-0 group-hover:opacity-50
          max-w-0 group-hover:max-w-[150px]
          overflow-hidden whitespace-nowrap
          transition-all duration-200"
      >
        {folderPath}/
      </span>
      <span className="group-hover:font-semibold transition-all duration-200">{fileName}</span>
    </span>
  );
}
