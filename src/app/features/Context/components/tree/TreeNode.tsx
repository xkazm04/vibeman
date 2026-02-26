import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, File, ChevronRight, FolderOpen, Check } from 'lucide-react';
import { TreeNode as TreeNodeType } from '@/types';
import { useStore } from '@/stores/nodeStore';
import { getFileTypeColor } from '@/helpers/typeStyles';
import { pathsMatch, joinPath, isAbsolutePath } from '@/utils/pathUtils';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import CodePreviewModal from './CodePreviewModal';

interface TreeNodeProps {
  node: TreeNodeType;
  level?: number;
  onToggle: (nodeId: string) => void;
  showCheckboxes?: boolean;
  selectedPaths?: string[];
  projectPath?: string;
}

const TreeNode = React.memo(function TreeNode({
  node,
  level = 0,
  onToggle,
  showCheckboxes = false,
  selectedPaths = [],
  projectPath
}: TreeNodeProps) {
  const { selectedNodes, highlightedNodes } = useStore();
  const { activeProject } = useActiveProjectStore();
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const nodePath = node.path;

  // Construct absolute file path for code preview
  const absoluteFilePath = useMemo(() => {
    if (node.type !== 'file') return nodePath;

    if (isAbsolutePath(nodePath)) {
      return nodePath;
    }

    const baseProjectPath = projectPath || activeProject?.path;
    if (!baseProjectPath) return nodePath;

    return joinPath(baseProjectPath, nodePath);
  }, [node.type, nodePath, projectPath, activeProject?.path]);

  // For checkbox mode, check if any selected path matches this node's path (normalized)
  const isSelected = showCheckboxes
    ? selectedPaths.some(selectedPath => pathsMatch(selectedPath, nodePath))
    : selectedNodes.has(node.id);

  const isHighlighted = highlightedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  const Icon = useMemo(() => {
    if (node.type === 'folder') {
      return isExpanded ? FolderOpen : Folder;
    }
    return File;
  }, [node.type, isExpanded]);

  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (showCheckboxes) {
      onToggle(nodePath);
    } else {
      onToggle(node.id);
    }
  }, [showCheckboxes, onToggle, nodePath, node.id]);

  const handleChevronClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(prev => !prev);
    }
  }, [hasChildren]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (node.type === 'file') {
      setShowPreviewModal(true);
    }
  }, [node.type]);

  const nodeStyling = useMemo(() => {
    if (isHighlighted && isSelected) {
      return 'bg-gradient-to-r from-orange-500/20 to-cyan-500/20 border-l-2 border-orange-400 shadow-lg shadow-orange-500/20';
    } else if (isHighlighted) {
      return 'bg-orange-500/15 border-l-2 border-orange-400 shadow-md shadow-orange-500/10';
    } else if (isSelected) {
      return 'bg-cyan-500/15 border-l-2 border-cyan-400';
    }
    return '';
  }, [isHighlighted, isSelected]);

  const closePreviewModal = useCallback(() => setShowPreviewModal(false), []);

  return (
    <div className="select-none">
      <motion.div
        data-testid={`tree-node-${node.id}`}
        whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.2)' }}
        className={`
          group flex items-center my-[0.5px] py-2 relative px-2 rounded-sm cursor-pointer transition-all duration-200
          ${nodeStyling}
          hover:bg-gray-700/30
        `}
        onClick={handleNodeClick}
        onContextMenu={handleContextMenu}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {/* Chevron for folders */}
        {hasChildren ? (
          <motion.div
            data-testid={`tree-node-chevron-${node.id}`}
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

        {/* Checkbox for file selection mode */}
        {showCheckboxes && (
          <div className="flex items-center mr-2">
            <div
              data-testid={`tree-node-checkbox-${node.id}`}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                isSelected
                  ? 'bg-cyan-500 border-cyan-500'
                  : 'border-gray-500 hover:border-gray-400'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
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
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-1 overflow-hidden"
              >
                <p className="text-sm text-orange-200 leading-relaxed pr-8">
                  {node.description}
                </p>
              </motion.div>
            )}
          {!isHighlighted && (
            <span className="text-sm text-gray-500 truncate hidden group-hover:inline mt-1">
              {node.description}
            </span>
          )}
          </div>
        </div>

        {/* Selection indicator (only for non-checkbox mode) */}
        {isSelected && !showCheckboxes && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute right-2
            w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-sm shadow-cyan-400/50 flex-shrink-0 ml-2"
          />
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
                showCheckboxes={showCheckboxes}
                selectedPaths={selectedPaths}
                projectPath={projectPath}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code Preview Modal */}
      <CodePreviewModal
        isOpen={showPreviewModal}
        filePath={absoluteFilePath}
        onClose={closePreviewModal}
      />
    </div>
  );
});

export default TreeNode;
