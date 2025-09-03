import React from 'react';
import { RefreshCw, AlertCircle, FolderTree } from 'lucide-react';
import { TreeNode as TreeNodeType, Project } from '../../../types';
import TreeNode from './TreeNode';

interface TreeViewProps {
  activeProject: Project | null;
  filteredStructure: TreeNodeType | null;
  isLoading: boolean;
  error: string | null;
  onToggleNode: (nodeId: string) => void;
  onRefresh: () => void;
  onClearError: () => void;
  onClearSearch: () => void;
}

export default function TreeView({
  activeProject,
  filteredStructure,
  isLoading,
  error,
  onToggleNode,
  onRefresh,
  onClearError,
  onClearSearch
}: TreeViewProps) {
  return (
    <div className="flex-1 overflow-auto custom-scrollbar">
      <div className="min-h-0 pr-2">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin opacity-50" />
            </div>
            <p className="text-sm mb-2">Loading project structure...</p>
            <p className="text-xs text-gray-600">This may take a moment</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm mb-2">Failed to load project structure</p>
            <p className="text-xs text-gray-600 mb-4">{error}</p>
            <div className="flex justify-center space-x-2">
              <button
                onClick={onClearError}
                className="text-sm text-gray-400 hover:text-gray-300 transition-colors px-4 py-2 bg-gray-700/50 rounded-lg hover:bg-gray-700/70"
              >
                Dismiss
              </button>
              <button
                onClick={onRefresh}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors px-4 py-2 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20"
              >
                Retry
              </button>
            </div>
          </div>
        ) : !activeProject ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
              <FolderTree className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm mb-2">No active project</p>
            <p className="text-xs text-gray-600">Select a project to view its structure</p>
          </div>
        ) : filteredStructure ? (
          <TreeNode
            node={filteredStructure}
            onToggle={onToggleNode}
          />
        ) : null}
      </div>
    </div>
  );
} 