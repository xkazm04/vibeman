import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown } from 'lucide-react';
import { useActiveProjectStore } from '../stores/activeProjectStore';

interface FolderNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FolderNode[];
  expanded?: boolean;
}

interface FolderSelectorProps {
  onSelect: (folderPath: string) => void;
  selectedPath?: string;
  className?: string;
}

export default function FolderSelector({ onSelect, selectedPath, className = '' }: FolderSelectorProps) {
  const { activeProject } = useActiveProjectStore();
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFolderStructure();
  }, [activeProject]);

  const loadFolderStructure = async () => {
    try {
      // Build the API URL with the active project's path
      const params = new URLSearchParams();
      if (activeProject?.path) {
        params.set('projectPath', activeProject.path);
      }
      
      const response = await fetch(`/api/kiro/folder-structure?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load folder structure: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load folder structure');
      }
      
      // Add a default 'context' folder if it doesn't exist
      const structure = result.structure || [];
      const hasContextFolder = structure.some((node: FolderNode) => node.name === 'context');
      
      if (!hasContextFolder) {
        structure.unshift({
          name: 'context',
          path: 'context',
          type: 'folder'
        });
      }
      
      setFolderTree(structure);
      setLoading(false);
    } catch (error) {
      // Fallback to a basic structure with context folder
      const fallbackStructure: FolderNode[] = [
        {
          name: 'context',
          path: 'context',
          type: 'folder'
        },
        {
          name: 'src',
          path: 'src',
          type: 'folder'
        },
        {
          name: 'docs',
          path: 'docs',
          type: 'folder'
        },
        {
          name: 'public',
          path: 'public',
          type: 'folder'
        }
      ];
      
      setFolderTree(fallbackStructure);
      setLoading(false);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderFolderNode = (node: FolderNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedPath === node.path;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.path}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: depth * 0.05 }}
          className={`
            flex items-center space-x-2 py-1.5 px-2 rounded-md cursor-pointer
            hover:bg-gray-800/50 transition-colors duration-200
            ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-300'}
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              if (hasChildren) {
                toggleFolder(node.path);
              }
              onSelect(node.path);
            }
          }}
        >
          {/* Expand/Collapse Icon */}
          {node.type === 'folder' && hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.path);
              }}
              className="p-0.5 hover:bg-gray-700 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          
          {/* Folder/File Icon */}
          <div className="flex-shrink-0">
            {node.type === 'folder' ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-400" />
              ) : (
                <Folder className="w-4 h-4 text-blue-400" />
              )
            ) : (
              <File className="w-4 h-4 text-gray-500" />
            )}
          </div>
          
          {/* Name */}
          <span className="text-sm font-mono truncate">
            {node.name}
          </span>
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {node.type === 'folder' && hasChildren && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {node.children!.map(child => renderFolderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-400 text-sm">Loading folders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
        {folderTree.map(node => renderFolderNode(node))}
      </div>
      
      {selectedPath && (
        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Selected folder:</div>
          <div className="text-sm font-mono text-cyan-400">{selectedPath}</div>
        </div>
      )}
    </div>
  );
}