'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FolderOpen, ChevronRight, X, Check } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

interface FolderNode {
  id: string;
  name: string;
  path: string;
  children?: FolderNode[];
}

interface FolderSelectorProps {
  selectedFolders: string[];
  onFoldersChange: (folders: string[]) => void;
}

/**
 * Recursively build folder tree using the POST API
 */
async function buildFolderTree(
  path: string,
  rootPath: string,
  currentDepth: number,
  maxDepth: number
): Promise<FolderNode | null> {
  try {
    const response = await fetch('/api/disk/list-directories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      console.error(`Failed to load directories for ${path}`);
      return null;
    }

    const data = await response.json();

    if (!data.success) {
      console.error(`API returned error for ${path}:`, data.error);
      return null;
    }

    // Create node for current directory
    const node: FolderNode = {
      id: path,
      name: path === rootPath ? 'Root' : path.split(/[\\/]/).pop() || path,
      path,
      children: [],
    };

    // Recursively load children if not at max depth
    if (currentDepth < maxDepth && data.directories && data.directories.length > 0) {
      const childPromises = data.directories.map((dir: { name: string; path: string }) =>
        buildFolderTree(dir.path, rootPath, currentDepth + 1, maxDepth)
      );

      const childNodes = await Promise.all(childPromises);
      node.children = childNodes.filter((child): child is FolderNode => child !== null);
    }

    return node;
  } catch (error) {
    console.error(`Error building folder tree for ${path}:`, error);
    return null;
  }
}

/**
 * Compact folder selector for RefactorWizard
 * Allows users to select specific folders to scan instead of the entire codebase
 */
export default function FolderSelector({ selectedFolders, onFoldersChange }: FolderSelectorProps) {
  const { activeProject } = useActiveProjectStore();
  const [folderStructure, setFolderStructure] = useState<FolderNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Load folder structure from project
  useEffect(() => {
    if (!activeProject?.path) return;

    const loadFolders = async () => {
      setIsLoading(true);
      try {
        const tree = await buildFolderTree(activeProject.path, activeProject.path, 0, 5);
        setFolderStructure(tree);
      } catch (error) {
        console.error('[FolderSelector] Failed to load folders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFolders();
  }, [activeProject?.path]);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleSelection = (path: string) => {
    const newSelection = [...selectedFolders];
    const index = newSelection.indexOf(path);

    if (index >= 0) {
      newSelection.splice(index, 1);
    } else {
      newSelection.push(path);
    }

    onFoldersChange(newSelection);
  };

  const selectAll = () => {
    if (!folderStructure) return;
    const allPaths = getAllFolderPaths(folderStructure);
    onFoldersChange(allPaths);
  };

  const clearAll = () => {
    onFoldersChange([]);
  };

  const getAllFolderPaths = (node: FolderNode): string[] => {
    const paths = [node.path];
    if (node.children) {
      node.children.forEach(child => {
        paths.push(...getAllFolderPaths(child));
      });
    }
    return paths;
  };

  if (!activeProject) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
        No project selected
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-300">
          Select Folders to Scan
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={selectAll}
            disabled={!folderStructure}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={clearAll}
            disabled={selectedFolders.length === 0}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Selected count */}
      {selectedFolders.length > 0 && (
        <div className="text-xs text-cyan-400 bg-cyan-500/10 px-3 py-2 rounded border border-cyan-500/20">
          {selectedFolders.length} folder{selectedFolders.length === 1 ? '' : 's'} selected
        </div>
      )}

      {/* Folder tree */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-3 max-h-64 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="text-sm text-gray-500 text-center py-8">
            Loading folders...
          </div>
        ) : folderStructure ? (
          <FolderTreeNode
            node={folderStructure}
            level={0}
            isExpanded={expandedFolders.has(folderStructure.path)}
            isSelected={selectedFolders.includes(folderStructure.path)}
            expandedFolders={expandedFolders}
            selectedFolders={selectedFolders}
            onToggleExpand={toggleFolder}
            onToggleSelect={toggleSelection}
          />
        ) : (
          <div className="text-sm text-gray-500 text-center py-8">
            No folders found
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-500">
        Leave empty to scan entire project, or select specific folders to reduce scan scope
      </div>
    </div>
  );
}

interface FolderTreeNodeProps {
  node: FolderNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  expandedFolders: Set<string>;
  selectedFolders: string[];
  onToggleExpand: (path: string) => void;
  onToggleSelect: (path: string) => void;
}

function FolderTreeNode({
  node,
  level,
  isExpanded,
  isSelected,
  expandedFolders,
  selectedFolders,
  onToggleExpand,
  onToggleSelect,
}: FolderTreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const Icon = isExpanded ? FolderOpen : Folder;

  return (
    <div>
      {/* Folder row */}
      <div
        className="flex items-center space-x-2 py-1 hover:bg-gray-700/30 rounded group cursor-pointer"
        style={{ paddingLeft: `${level * 12}px` }}
      >
        {/* Expand/collapse chevron */}
        {hasChildren && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.path);
            }}
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-300"
          >
            <ChevronRight className="w-3 h-3" />
          </motion.button>
        )}

        {!hasChildren && <div className="w-4" />}

        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(node.path);
          }}
          className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-cyan-500 border-cyan-500'
              : 'bg-gray-800 border-gray-600 hover:border-gray-500'
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
        </button>

        {/* Folder icon and name */}
        <div
          onClick={() => hasChildren && onToggleExpand(node.path)}
          className="flex items-center space-x-2 flex-1 min-w-0"
        >
          <Icon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <span className="text-sm text-gray-300 truncate">{node.name}</span>
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.children!.map((child) => (
              <FolderTreeNodeRecursive
                key={child.id}
                node={child}
                level={level + 1}
                expandedFolders={expandedFolders}
                selectedFolders={selectedFolders}
                onToggleExpand={onToggleExpand}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrapper to pass expanded/selected state from parent
function FolderTreeNodeRecursive({
  node,
  level,
  expandedFolders,
  selectedFolders,
  onToggleExpand,
  onToggleSelect,
}: {
  node: FolderNode;
  level: number;
  expandedFolders: Set<string>;
  selectedFolders: string[];
  onToggleExpand: (path: string) => void;
  onToggleSelect: (path: string) => void;
}) {
  return (
    <FolderTreeNode
      node={node}
      level={level}
      isExpanded={expandedFolders.has(node.path)}
      isSelected={selectedFolders.includes(node.path)}
      expandedFolders={expandedFolders}
      selectedFolders={selectedFolders}
      onToggleExpand={onToggleExpand}
      onToggleSelect={onToggleSelect}
    />
  );
}
