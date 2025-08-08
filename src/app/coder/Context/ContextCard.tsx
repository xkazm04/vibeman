import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderTree, X, BookCheck } from 'lucide-react';
import { Context, ContextGroup, useContextStore } from '../../../stores/contextStore';
import ContextTooltip from './ContextTooltip';
import ContextMenu from './ContextMenu/ContextMenu';

interface ContextCardProps {
  context: Context;
  groupColor?: string;
  availableGroups: ContextGroup[];
  selectedFilePaths: string[];
}

export default function ContextCard({ context, groupColor, availableGroups, selectedFilePaths }: ContextCardProps) {
  const { removeContext } = useContextStore();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', context.id);
    e.dataTransfer.effectAllowed = 'move';
    setShowTooltip(false);
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeContext(context.id);
    } catch (error) {
      console.error('Failed to remove context:', error);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTooltip(false);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.02 }}
        whileDrag={{ scale: 1.05, rotate: 2 }}
        draggable
        onDragStart={handleDragStart}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        className="group relative bg-gray-800/60 border border-gray-600/40 rounded-md p-2 cursor-move hover:bg-gray-800/80 transition-all min-w-[120px] max-w-[160px] h-fit"
      >
      {/* Remove Button */}
      <button
        onClick={handleRemove}
        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      >
        <X className="w-2 h-2" />
      </button>

      {/* Context Header */}
      <div className="flex items-start space-x-2 mb-2">
        {context.hasContextFile && (
          <div 
            className="p-1 rounded-sm flex-shrink-0"
            style={{ backgroundColor: `${groupColor || '#8B5CF6'}20` }}
          >
            <BookCheck 
              className="w-3 h-3" 
              style={{ color: groupColor || '#8B5CF6' }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h5 className="text-xs font-semibold text-white font-mono truncate" title={context.name}>
            {context.name}
          </h5>
        </div>
      </div>

      {/* File Count Badge */}
      <div className="flex items-center justify-center mt-1">
        <span className="text-xs text-gray-500 bg-gray-700/30 px-1.5 py-0.5 rounded-full">
          {context.filePaths.length}
        </span>
      </div>
      </motion.div>

      <ContextTooltip
        context={context}
        isVisible={showTooltip}
        position={tooltipPosition}
      />

      <ContextMenu
        context={context}
        isVisible={showContextMenu}
        position={contextMenuPosition}
        onClose={handleCloseContextMenu}
        availableGroups={availableGroups}
        selectedFilePaths={selectedFilePaths}
      />
    </>
  );
}