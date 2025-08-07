import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderTree, FileText, X, Calendar } from 'lucide-react';
import { Context, useContextStore } from '../../../stores/contextStore';
import ContextTooltip from './ContextTooltip';
import ContextMenu from './ContextMenu';

interface ContextCardProps {
  context: Context;
}

export default function ContextCard({ context }: ContextCardProps) {
  const { removeContext, moveContext } = useContextStore();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMoveContext = (e: CustomEvent) => {
      const { contextId, newSection } = e.detail;
      if (contextId === context.id) {
        moveContext(contextId, newSection);
      }
    };

    window.addEventListener('moveContext', handleMoveContext as EventListener);
    return () => {
      window.removeEventListener('moveContext', handleMoveContext as EventListener);
    };
  }, [context.id, moveContext]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', context.id);
    e.dataTransfer.effectAllowed = 'move';
    setShowTooltip(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeContext(context.id);
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
        <div className="p-1 bg-purple-500/20 rounded-sm flex-shrink-0">
          <FolderTree className="w-3 h-3 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h5 className="text-xs font-semibold text-white font-mono truncate" title={context.name}>
            {context.name}
          </h5>
        </div>
      </div>

      {/* Description */}
      {context.description && (
        <p className="text-xs text-gray-400 mb-2 line-clamp-2" title={context.description}>
          {context.description}
        </p>
      )}

      {/* File Count and Date */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <FileText className="w-2.5 h-2.5" />
          <span>{context.filePaths.length}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Calendar className="w-2.5 h-2.5" />
          <span>{context.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Files Preview */}
      <div className="mt-2 pt-2 border-t border-gray-600/20">
        <div className="flex flex-wrap gap-1">
          {context.filePaths.slice(0, 2).map((path, index) => (
            <span
              key={index}
              className="inline-block px-1 py-0.5 bg-gray-900/50 text-xs text-gray-400 rounded-sm font-mono truncate max-w-full"
              title={path}
            >
              {path.split('/').pop()}
            </span>
          ))}
          {context.filePaths.length > 2 && (
            <span className="inline-block px-1 py-0.5 bg-gray-900/50 text-xs text-gray-500 rounded-sm">
              +{context.filePaths.length - 2}
            </span>
          )}
        </div>
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
      />
    </>
  );
}