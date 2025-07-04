import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, File, ChevronRight, FolderOpen, Zap } from 'lucide-react';
import { TreeNode as TreeNodeType } from '../../../types';
import { useStore } from '../../../stores/nodeStore';

interface TreeNodeProps {
  node: TreeNodeType;
  level?: number;
  onToggle: (nodeId: string) => void;
}

export default function TreeNode({ node, level = 0, onToggle }: TreeNodeProps) {
  const { selectedNodes, highlightedNodes } = useStore();
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const isSelected = selectedNodes.has(node.id);
  const isHighlighted = highlightedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  const getIcon = () => {
    if (node.type === 'folder') {
      return isExpanded ? FolderOpen : Folder;
    }
    return File;
  };

  const Icon = getIcon();

  const getFileTypeColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'jsx':
        return 'text-blue-400';
      case 'ts':
      case 'js':
        return 'text-yellow-400';
      case 'css':
      case 'scss':
        return 'text-pink-400';
      case 'json':
        return 'text-green-400';
      case 'md':
        return 'text-gray-400';
      default:
        return 'text-gray-300';
    }
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id);
    
    // Auto-expand/collapse folders when selected
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const getNodeStyling = () => {
    if (isHighlighted && isSelected) {
      return 'bg-gradient-to-r from-orange-500/20 to-cyan-500/20 border-l-2 border-orange-400 shadow-lg shadow-orange-500/20';
    } else if (isHighlighted) {
      return 'bg-orange-500/15 border-l-2 border-orange-400 shadow-md shadow-orange-500/10';
    } else if (isSelected) {
      return 'bg-cyan-500/15 border-l-2 border-cyan-400';
    }
    return '';
  };

  return (
    <div className="select-none">
      <motion.div
        whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.2)' }}
        className={`
          group flex items-center py-2 px-2 rounded-sm cursor-pointer transition-all duration-200
          ${getNodeStyling()}
          hover:bg-gray-700/30
        `}
        onClick={handleNodeClick}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {/* Chevron for folders */}
        {hasChildren ? (
          <motion.div
            whileHover={{ scale: 1.1 }}
            onClick={handleChevronClick}
            className="flex items-center justify-center w-4 h-4 mr-1 hover:bg-gray-600/50 rounded-sm"
          >
            <ChevronRight 
              className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            />
          </motion.div>
        ) : (
          <div className="w-4 h-4 mr-1" />
        )}

        {/* Icon */}
        <Icon 
          className={`w-4 h-4 mr-2 flex-shrink-0 transition-colors duration-200 ${
            node.type === 'folder' 
              ? isExpanded 
                ? isHighlighted ? 'text-orange-400' : 'text-blue-400'
                : isHighlighted ? 'text-orange-500' : 'text-yellow-500'
              : isHighlighted ? 'text-orange-400' : getFileTypeColor(node.name)
          }`} 
        />

        {/* Name and Description */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center space-x-2">
            <span className={`font-mono text-sm truncate transition-colors duration-200 ${
              isSelected ? 'text-white font-medium' : 
              isHighlighted ? 'text-orange-100 font-medium' : 'text-gray-200'
            }`}>
              {node.name}
            </span>
            
            {/* Highlight indicator */}
            {isHighlighted && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center space-x-1"
              >
                <Zap className="w-3 h-3 text-orange-400" />
                <span className="text-xs text-orange-400 font-medium">AI Impact</span>
              </motion.div>
            )}
          </div>
          
          {/* Always show description for highlighted nodes, show on hover for others */}
          <AnimatePresence>
            {isHighlighted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-1 overflow-hidden"
              >
                <p className="text-xs text-orange-200 leading-relaxed pr-8">
                  {node.description}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Hover description for non-highlighted nodes */}
          {!isHighlighted && (
            <span className="text-xs text-gray-500 truncate hidden group-hover:inline mt-1">
              {node.description}
            </span>
          )}
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-sm shadow-cyan-400/50 flex-shrink-0 ml-2"
          />
        )}

        {/* File count for folders */}
        {hasChildren && (
          <span className="text-xs text-gray-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.children!.length}
          </span>
        )}
      </motion.div>
      
      {/* Children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {node.children!.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                onToggle={onToggle}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}