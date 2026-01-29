import React, { useMemo, useState } from 'react';
import { Search, FolderTree, Sparkles, Loader2 } from 'lucide-react';
import { TreeNode as TreeNodeType } from '../../../../types';
import { useStore } from '../../../../stores/nodeStore';
import TreeView from '../components/tree/TreeView';
import { normalizePath } from '../../../../utils/pathUtils';
import { DependencyAnalysisResponse } from '../../../api/file-dependencies/route';

interface FileTreeSelectorProps {
  fileStructure: TreeNodeType | null;
  selectedPaths: string[];
  onPathToggle: (path: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  projectPath?: string;
}

// Helper functions extracted from component
const findNodeInTree = (root: TreeNodeType, targetPath: string): TreeNodeType | null => {
  const currentPath = root.path;
  if (normalizePath(currentPath) === normalizePath(targetPath)) {
    return root;
  }

  if (root.children) {
    for (const child of root.children) {
      const found = findNodeInTree(child, targetPath);
      if (found) return found;
    }
  }

  return null;
};

const collectChildFilesFromNode = (node: TreeNodeType): string[] => {
  const filePaths: string[] = [];

  const collect = (n: TreeNodeType) => {
    if (n.type === 'file') {
      filePaths.push(normalizePath(n.path));
    }
    if (n.children) {
      n.children.forEach(collect);
    }
  };

  if (node.children) {
    node.children.forEach(collect);
  }

  return filePaths;
};

export const FileTreeSelector: React.FC<FileTreeSelectorProps> = ({
  fileStructure,
  selectedPaths,
  onPathToggle,
  searchQuery,
  onSearchChange,
  projectPath
}) => {
  const { clearSelection } = useStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);



  // Filter tree based on search query
  const filteredStructure = useMemo(() => {
    if (!fileStructure || !searchQuery.trim()) return fileStructure;

    const filterNode = (node: TreeNodeType): TreeNodeType | null => {
      const nodePath = node.path;
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
    if (!fileStructure) return;

    const node = findNodeInTree(fileStructure, nodePath);

    if (!node) {
      // Fallback: if node not found, just toggle the path
      onPathToggle(normalizePath(nodePath));
      return;
    }

    if (node.type === 'folder') {
      // For folders, collect all child file paths
      const childFilePaths = collectChildFilesFromNode(node);

      // Check if all child files are already selected
      const allSelected = childFilePaths.every(path =>
        selectedPaths.some(sp => normalizePath(sp) === path)
      );

      // Toggle all child files
      childFilePaths.forEach(path => {
        const isCurrentlySelected = selectedPaths.some(sp => normalizePath(sp) === path);

        // If deselecting all, remove each file
        // If selecting all, add each file
        if (allSelected && isCurrentlySelected) {
          onPathToggle(path); // Remove
        } else if (!allSelected && !isCurrentlySelected) {
          onPathToggle(path); // Add
        }
      });
    } else {
      // For files, just toggle normally
      onPathToggle(normalizePath(nodePath));
    }
  };

  // Create normalized selected paths for comparison
  const normalizedSelectedPaths = useMemo(() => {
    return selectedPaths.map(normalizePath);
  }, [selectedPaths]);

  // Smart selection: analyze file dependencies and select related files
  const handleSmartSelection = async () => {
    if (selectedPaths.length !== 1 || !projectPath) {
      return;
    }

    setIsAnalyzing(true);

    try {
      const selectedFile = selectedPaths[0];
      const absolutePath = projectPath + '/' + normalizePath(selectedFile);

      const response = await fetch('/api/file-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: absolutePath,
          projectPath: projectPath,
          maxDepth: 3,
          includeNodeModules: false,
        }),
      });

      const data: DependencyAnalysisResponse = await response.json();

      if (data.success && data.dependencies) {
        // Add all dependencies to selection
        data.dependencies.forEach((dep) => {
          const relPath = normalizePath(dep.relativePath);
          // Only toggle if not already selected
          if (!selectedPaths.some(sp => normalizePath(sp) === relPath)) {
            onPathToggle(relPath);
          }
        });
      }
    } catch (error) {
      // Dependency analysis failed - silent failure as this is a convenience feature
    } finally {
      setIsAnalyzing(false);
    }
  };

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
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Project Files Header with Smart Selection */}
      <div className="px-4 py-3 border-b border-gray-700/30 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">Project Files</span>
        {selectedPaths.length === 1 && projectPath && (
          <button
            onClick={handleSmartSelection}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 rounded-lg hover:from-purple-500/30 hover:to-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-purple-500/30"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                <span>Smart Select</span>
              </>
            )}
          </button>
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