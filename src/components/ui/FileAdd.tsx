import React from 'react';
import { FileText, Trash2, Plus } from 'lucide-react';

interface FileAddProps {
  // Current files in the context
  filePaths: string[];
  onRemoveFile: (path: string) => void;
  
  // Available files to add
  availableFilesToAdd: string[];
  onAddSelectedFiles: () => void;
  
  // Labels and styling
  currentFilesLabel?: string;
  addFilesLabel?: string;
  className?: string;
}

export default function FileAdd({
  filePaths,
  onRemoveFile,
  availableFilesToAdd,
  onAddSelectedFiles,
  currentFilesLabel = "Files",
  addFilesLabel = "Add Selected Files",
  className = ""
}: FileAddProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Add Selected Files */}
      {availableFilesToAdd.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {addFilesLabel}
          </label>
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-400">
                {availableFilesToAdd.length} new files available
              </span>
              <button
                onClick={onAddSelectedFiles}
                className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-sm hover:bg-green-500/30 transition-colors text-sm"
              >
                <Plus className="w-3 h-3" />
                <span>Add All</span>
              </button>
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {availableFilesToAdd.map((path, index) => (
                <div key={index} className="text-sm text-green-300 font-mono">
                  {path}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current Files */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {currentFilesLabel} ({filePaths.length})
        </label>
        <div className="max-h-40 overflow-y-auto bg-gray-900/50 border border-gray-600 rounded-md">
          {filePaths.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files in this context</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filePaths.map((path, index) => (
                <div key={index} className="flex items-center justify-between group p-2 hover:bg-gray-800/50 rounded-sm">
                  <span className="text-sm text-gray-300 font-mono flex-1 truncate" title={path}>
                    {path}
                  </span>
                  <button
                    onClick={() => onRemoveFile(path)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-sm transition-all ml-2"
                    title="Remove file"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}