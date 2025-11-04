import { FolderOpen, Loader2 } from 'lucide-react';
import { Directory } from '../types';

interface PathSelectionProps {
  directories: Directory[];
  selectedPath: string;
  onPathSelect: (path: string) => void;
  onAutoFillName?: (name: string) => void;
  projectName: string;
  parentPath: string;
  loading: boolean;
}

export default function PathSelection({
  directories,
  selectedPath,
  onPathSelect,
  onAutoFillName,
  projectName,
  parentPath,
  loading
}: PathSelectionProps) {
  if (loading) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Project Path *
        </label>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="ml-2 text-gray-400">Loading directories...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-3">
        Project Path *
      </label>

      <div className="text-sm text-gray-500 mb-3">
        Parent directory: <span className="font-mono text-gray-400">{parentPath}</span>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar border border-gray-600 rounded-md p-3 bg-gray-700/30">
        {directories.map((dir) => (
          <label
            key={dir.path}
            className={`flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-colors ${
              selectedPath === dir.path
                ? 'bg-cyan-500/20 border border-cyan-500/30'
                : 'hover:bg-gray-600/30 border border-transparent'
            }`}
          >
            <input
              type="radio"
              name="projectPath"
              value={dir.path}
              checked={selectedPath === dir.path}
              onChange={(e) => {
                onPathSelect(e.target.value);
                // Auto-fill project name if empty
                if (!projectName && onAutoFillName) {
                  onAutoFillName(dir.name);
                }
              }}
              className="sr-only"
            />
            <FolderOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {dir.name}
              </div>
              <div className="text-sm text-gray-400 truncate font-mono">
                {dir.path}
              </div>
            </div>
          </label>
        ))}

        {directories.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No directories found in parent path
          </div>
        )}
      </div>
    </div>
  );
}
