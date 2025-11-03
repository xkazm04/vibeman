import React from 'react';
import { FileCode } from 'lucide-react';

interface FileChipProps {
  filename: string;
}

export const FileChip: React.FC<FileChipProps> = ({ filename }) => {
  return (
    <span className="text-sm px-2 py-1 rounded bg-gray-700/50 text-gray-400 font-mono flex items-center space-x-1">
      <FileCode className="w-3 h-3" />
      <span>{filename}</span>
    </span>
  );
};
