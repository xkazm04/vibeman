import React from 'react';
import { X, Circle } from 'lucide-react';
import { getFileIcon, truncateText } from './editorUtils';

interface FileTabProps {
  filename: string;
  isActive: boolean;
  isDirty?: boolean;
  onSelect: () => void;
  onClose: () => void;
  className?: string;
}

export default function FileTab({
  filename,
  isActive,
  isDirty = false,
  onSelect,
  onClose,
  className = '',
}: FileTabProps) {
  const icon = getFileIcon(filename);
  const displayName = truncateText(filename.split('/').pop() || filename, 20);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      onClick={onSelect}
      className={`
        group flex items-center space-x-2 px-3 py-2 cursor-pointer transition-all duration-200 border-r border-gray-700/50 min-w-0 max-w-[200px]
        ${isActive 
          ? 'bg-gray-800 text-white border-b-2 border-cyan-400' 
          : 'bg-gray-900/50 text-gray-300 hover:bg-gray-800/70 hover:text-white'
        }
        ${className}
      `}
      title={filename}
    >
      {/* File Icon */}
      <span className="text-sm flex-shrink-0" role="img" aria-label="file-icon">
        {icon}
      </span>

      {/* File Name */}
      <span className="text-sm font-mono truncate flex-1 min-w-0">
        {displayName}
      </span>

      {/* Dirty Indicator or Close Button */}
      <div className="flex-shrink-0 flex items-center">
        {isDirty && !isActive && (
          <Circle className="w-2 h-2 text-orange-400 fill-current" />
        )}
        
        {(isActive || !isDirty) && (
          <button
            onClick={handleClose}
            className={`
              p-0.5 rounded-sm transition-all duration-200
              ${isActive 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 hover:bg-gray-700'
              }
            `}
            title="Close file"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}