import { FolderOpen, Loader2, Check } from 'lucide-react';
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
      <div className="flex items-center justify-center py-6">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span className="text-sm">Scanning directories...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500">
        Parent: <span className="font-mono text-gray-400">{parentPath}</span>
      </div>

      <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar">
        {directories.map((dir) => {
          const isSelected = selectedPath === dir.path;
          return (
            <button
              key={dir.path}
              type="button"
              onClick={() => {
                onPathSelect(dir.path);
                if (!projectName && onAutoFillName) {
                  onAutoFillName(dir.name);
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                isSelected
                  ? 'bg-cyan-500/20 ring-1 ring-cyan-500/40 text-white'
                  : 'hover:bg-gray-700/50 text-gray-400 hover:text-gray-300'
              }`}
            >
              <div className={`p-1 rounded ${isSelected ? 'bg-cyan-500/20' : 'bg-gray-700/50'}`}>
                {isSelected ? (
                  <Check className="w-3 h-3 text-cyan-400" />
                ) : (
                  <FolderOpen className="w-3 h-3 text-blue-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${isSelected ? 'text-cyan-300' : ''}`}>
                  {dir.name}
                </div>
                <div className="text-[10px] text-gray-500 truncate font-mono">
                  {dir.path}
                </div>
              </div>
            </button>
          );
        })}

        {directories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-gray-500">
            <FolderOpen className="w-6 h-6 mb-2 text-gray-600" />
            <span className="text-xs">No directories found</span>
          </div>
        )}
      </div>
    </div>
  );
}
