import React from 'react';
import { motion } from 'framer-motion';
import { FileText, FolderTree, X } from 'lucide-react';

interface SelectedFilesListProps {
  selectedPaths: string[];
  onRemoveFile: (path: string) => void;
  onClearAll: () => void;
}

export const SelectedFilesList: React.FC<SelectedFilesListProps> = ({
  selectedPaths,
  onRemoveFile,
  onClearAll
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-400">Selected Files</h4>
        {selectedPaths.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
      
      <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl h-full overflow-hidden">
        {selectedPaths.length > 0 ? (
          <div className="h-full overflow-y-auto p-3 space-y-2">
            {selectedPaths.map((filePath, index) => (
              <motion.div
                key={filePath}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-2 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:bg-gray-700/50 transition-colors group"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300 truncate font-mono">
                    {filePath}
                  </span>
                </div>
                <button
                  onClick={() => onRemoveFile(filePath)}
                  className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FolderTree className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No files selected</p>
            <p className="text-xs mt-1 text-center px-4">
              Select files from the project tree on the left
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectedFilesList;