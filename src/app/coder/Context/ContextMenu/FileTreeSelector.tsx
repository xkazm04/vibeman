import React, { useMemo } from 'react';
import { Search, FolderTree } from 'lucide-react';
import { TreeNode as TreeNodeType } from '../../../../types';
import { useStore } from '../../../../stores/nodeStore';
import TreeView from '../../../coder/CodeTree/TreeView';
import { normalizePath } from '../../../../utils/pathUtils';

interface FileTreeSelectorProps {
  fileStructure: TreeNodeType | null;
  selectedPaths: string[];
  onPathToggle: (path: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const FileTreeSelector: React.FC<FileTreeSelectorProps> = ({
  fileStructure,
  selectedPaths,
  onPathToggle,
  searchQuery,
  onSearchChange
}) => {
  const { clearSelection } = useStore();



  // Filter tree based on search query
  const filteredStructure = useMemo(() => {
    if (!fileStructure || !searchQuery.trim()) return fileStructure;
    
    const filterNode = (node: TreeNodeType): TreeNodeType | null => {
      const nodePath = node.path || node.id;
      const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           nodePath.toLowerCase().includes(searchQuery.toLowerCase());
      
      const filteredChildren = node.children?.map(filterNode).filter(Boolean) as TreeNodeType[] || [];
      
      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      
      return null;
    };
    
    return filterNode(fileStructure);
  }, [fileStructure, searchQuery]);

  const handleNodeToggle = (nodePath: string) => {
    // Normalize the path to forward slashes for consistency
    const normalizedPath = normalizePath(nodePath);
    onPathToggle(normalizedPath);
  };

  // Create normalized selected paths for comparison
  const normalizedSelectedPaths = useMemo(() => {
    return selectedPaths.map(normalizePath);
  }, [selectedPaths]);

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-700/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>
        
        {selectedPaths.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {selectedPaths.length} files selected
            </span>
            <button
              onClick={() => {
                selectedPaths.forEach(path => onPathToggle(path));
                clearSelection();
              }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto">
        {filteredStructure ? (
          <TreeView
            activeProject={null}
            filteredStructure={filteredStructure}
            isLoading={false}
            error={null}
            onToggleNode={handleNodeToggle}
            onRefresh={() => {}}
            onClearError={() => {}}
            onClearSearch={() => onSearchChange('')}
            showCheckboxes={true}
            selectedPaths={normalizedSelectedPaths}
          />
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files found</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileTreeSelector;