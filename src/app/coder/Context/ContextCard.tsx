import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderTree, X, BookCheck, FileText, Clock, Sparkles } from 'lucide-react';
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
  const { removeContext, selectedContextIds } = useContextStore();
  const isSelectedForBacklog = selectedContextIds.has(context.id);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

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
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
    setIsHovered(false);
  };

  // Format date for display
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTooltip(false);
    
    // Calculate optimal position to avoid screen edges
    const menuWidth = 200;
    const menuHeight = 350;
    const padding = 20;
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Adjust if menu would go off right edge
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }
    
    // Adjust if menu would go off bottom edge
    if (y + menuHeight > window.innerHeight - padding) {
      y = window.innerHeight - menuHeight - padding;
    }
    
    // Ensure minimum distance from edges
    x = Math.max(padding, x);
    y = Math.max(padding, y);
    
    setContextMenuPosition({ x, y });
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
        whileHover={{ scale: 1.02, y: -2 }}
        whileDrag={{ scale: 1.05, rotate: 2 }}
        draggable
        onDragStart={handleDragStart}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        className={`group relative rounded-2xl p-4 cursor-move transition-all duration-300 min-w-[280px] h-fit backdrop-blur-sm ${
          isSelectedForBacklog
            ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-400/60 hover:from-green-500/30 hover:to-emerald-500/30 shadow-lg shadow-green-500/20'
            : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-600/40 hover:from-gray-800/80 hover:to-gray-900/80 hover:border-gray-500/60'
        }`}
        style={{
          background: isSelectedForBacklog 
            ? undefined 
            : `linear-gradient(135deg, ${groupColor || '#8B5CF6'}10 0%, transparent 50%, ${groupColor || '#8B5CF6'}05 100%)`
        }}
      >
        {/* Background Effects */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div 
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `linear-gradient(45deg, ${groupColor || '#8B5CF6'}20, transparent, ${groupColor || '#8B5CF6'}20)`,
              filter: 'blur(1px)',
            }}
          />
        </div>

        {/* Remove Button */}
        <motion.button
          onClick={handleRemove}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500/90 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-3 h-3" />
        </motion.button>

        {/* Selection Indicator */}
        {isSelectedForBacklog && (
          <motion.div
            className="absolute -top-1 -left-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <motion.div
              className="w-2 h-2 bg-white rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>
        )}

        {/* Main Content - Single Row Layout */}
        <div className="relative flex items-center justify-between space-x-4">
          {/* Left Section - Icon and Name */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Context Type Icon */}
            <div className="relative flex-shrink-0">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-300"
                style={{ 
                  backgroundColor: `${groupColor || '#8B5CF6'}20`,
                  border: `1px solid ${groupColor || '#8B5CF6'}30`
                }}
              >
                {context.hasContextFile ? (
                  <BookCheck 
                    className="w-5 h-5 transition-colors duration-300" 
                    style={{ color: groupColor || '#8B5CF6' }}
                  />
                ) : (
                  <FileText 
                    className="w-5 h-5 transition-colors duration-300" 
                    style={{ color: groupColor || '#8B5CF6' }}
                  />
                )}
              </div>
              
              {/* Glow effect on hover */}
              <motion.div
                className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(45deg, ${groupColor || '#8B5CF6'}30, transparent, ${groupColor || '#8B5CF6'}30)`,
                  filter: 'blur(8px)',
                }}
              />
            </div>

            {/* Context Info */}
            <div className="flex-1 min-w-0">
              <h5 className="text-base font-bold text-white font-mono truncate mb-1" title={context.name}>
                {context.name}
              </h5>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                <span>{formatDate(context.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Right Section - Stats and Badges */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* File Count Badge */}
            <div className="flex items-center space-x-2">
              <div 
                className="px-3 py-1.5 rounded-lg text-sm font-bold font-mono backdrop-blur-sm"
                style={{ 
                  backgroundColor: `${groupColor || '#8B5CF6'}20`,
                  color: groupColor || '#8B5CF6',
                  border: `1px solid ${groupColor || '#8B5CF6'}30`
                }}
              >
                {context.filePaths.length}
              </div>
              <span className="text-xs text-gray-500 font-mono">
                file{context.filePaths.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Special Features Indicator */}
            {context.hasContextFile && (
              <motion.div
                className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Hover Overlay */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${groupColor || '#8B5CF6'}05 0%, transparent 50%, ${groupColor || '#8B5CF6'}05 100%)`,
          }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
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