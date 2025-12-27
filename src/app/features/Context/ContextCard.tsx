import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FolderOpen, Copy, MousePointer, FileText, Edit, Trash2, CheckSquare, Square } from 'lucide-react';
import { Context, ContextGroup, useContextStore } from '../../../stores/contextStore';
import { ContextHealthDot } from './components/ContextHealthIndicator';
import { useTooltipStore } from '../../../stores/tooltipStore';
import { useStore } from '../../../stores/nodeStore';
import { MultiFileEditor } from '../../../components/editor';
import { useGlobalModal } from '../../../hooks/useGlobalModal';
import ContextEditModal from './sub_ContextGen/ContextEditModal';
import ContextFileModal from './sub_ContextFile/ContextFileModal';
import ContextMenu from '@/components/ContextMenu';
import { useThemeStore } from '@/stores/themeStore';
import { getFocusRingStyles } from '@/lib/ui/focusRing';

interface ContextCardProps {
  context: Context;
  groupColor?: string;
  availableGroups: ContextGroup[];
  selectedFilePaths: string[];

}

export default function ContextCard({ context, groupColor, availableGroups, selectedFilePaths }: ContextCardProps) {
  const { removeContext, selectedContextIds, toggleContextSelection, setSelectedContext } = useContextStore();
  const { toggleTooltip } = useTooltipStore();
  const { clearSelection } = useStore();
  const { showFullScreenModal } = useGlobalModal();
  const { theme } = useThemeStore();
  const focusRingClasses = getFocusRingStyles(theme);
  const isSelectedForBacklog = selectedContextIds.has(context.id);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [showFileEditor, setShowFileEditor] = useState(false);
  const [showContextFileModal, setShowContextFileModal] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', context.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeContext(context.id);
    } catch (error) {
      // Failed to remove context
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTooltip(context, groupColor || '#8B5CF6');
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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

  const handleSelect = () => {
    clearSelection();
    setSelectedContext(context.id);
    setShowContextMenu(false);
  };

  const handleToggleForBacklog = () => {
    toggleContextSelection(context.id);
    setShowContextMenu(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(context, null, 2));
    setShowContextMenu(false);
  };

  const handleEdit = () => {
    showFullScreenModal(
      `Edit Context: ${context.name}`,
      <ContextEditModal
        context={context}
        availableGroups={availableGroups}
        onSave={() => {
          // Context will be updated via the store
        }}
      />,
      {
        icon: Edit,
        iconBgColor: "from-cyan-500/20 to-blue-500/20",
        iconColor: "text-cyan-400",
        maxWidth: "max-w-[95vw]",
        maxHeight: "max-h-[95vh]"
      }
    );
    setShowContextMenu(false);
  };

  const handleDelete = async () => {
    try {
      await removeContext(context.id);
    } catch (error) {
      // Failed to delete context
    }
    setShowContextMenu(false);
  };

  const handleOpenFiles = () => {
    setShowFileEditor(true);
    setShowContextMenu(false);
  };

  const handleContextFile = () => {
    setShowContextFileModal(true);
    setShowContextMenu(false);
  };

  const handleFileEditorClose = () => {
    setShowFileEditor(false);
  };

  const handleContextFileModalClose = () => {
    setShowContextFileModal(false);
  };

  const handleFileSave = async (filePath: string, content: string) => {
    // Saving file
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) {
          resolve();
        } else {
          reject(new Error('Failed to save file'));
        }
      }, 1000);
    });
  };

  const contextMenuItems = [
    {
      label: 'Open Neural Files',
      icon: FolderOpen,
      onClick: handleOpenFiles,
    },
    {
      label: 'Clone Context',
      icon: Copy,
      onClick: handleCopy,
    },
    {
      label: 'Select',
      icon: MousePointer,
      onClick: handleSelect,
    },
    {
      label: selectedContextIds.has(context.id) ? 'Remove from Queue' : 'Add to Queue',
      icon: selectedContextIds.has(context.id) ? CheckSquare : Square,
      onClick: handleToggleForBacklog,
    },
    {
      label: 'Context Matrix',
      icon: FileText,
      onClick: handleContextFile,
    },
    {
      label: 'Modify Node',
      icon: Edit,
      onClick: handleEdit,
    },
    {
      label: 'Delete Context',
      icon: Trash2,
      onClick: handleDelete,
      destructive: true,
    },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileDrag={{ scale: 1.05, rotate: 2 }}
        draggable
        onDragStart={handleDragStart as any}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        data-testid={`context-card-${context.id}`}
        className={`group relative rounded-2xl p-4 cursor-move transition-all duration-300 min-w-[280px] h-fit backdrop-blur-sm ${isSelectedForBacklog
            ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-400/60 hover:from-green-500/30 hover:to-emerald-500/30 shadow-lg shadow-green-500/20'
            : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-600/40 hover:from-gray-800/80 hover:to-gray-900/80 hover:border-gray-500/60'
          }`}
        style={{
          background: isSelectedForBacklog
            ? undefined
            : `linear-gradient(135deg, ${groupColor || '#8B5CF6'}10 0%, transparent 50%, ${groupColor || '#8B5CF6'}05 100%)`
        }}
      >
        {/* Remove Button */}
        <motion.button
          onClick={handleRemove}
          aria-label={`Remove ${context.name}`}
          data-testid={`context-card-remove-${context.id}`}
          className={`absolute -top-2 -right-2 w-6 h-6 bg-red-500/90 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center shadow-lg ${focusRingClasses}`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-3 h-3" />
        </motion.button>

        {/* Selection Indicator - Static version (removed pulse animation) */}
        {isSelectedForBacklog && (
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center shadow-lg shadow-green-400/50">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}

        {/* Main Content - Single Row Layout */}
        <div className="relative flex items-center justify-between space-x-4 card-main-content">
          {/* Left Section - Icon and Name */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <ContextHealthDot context={context} />
                <h5 className="text-base font-bold text-white font-mono mb-1" title={context.name}>
                  {context.name}
                </h5>
              </div>
          </div>
          <div className="flex opacity-50 absolute -top-11 -left-2  items-center space-x-3 flex-shrink-0">
                {/* File Count Badge */}
                <div className="flex items-center space-x-2">
                  <div
                    className="px-3 py-1.5 rounded-lg text-sm font-bold font-mono backdrop-blur-sm"
                    style={{
                      color: groupColor || '#8B5CF6'
                    }}
                  >
                    {context.filePaths.length}
                  </div>
                </div>
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

      <ContextMenu
        isOpen={showContextMenu}
        position={contextMenuPosition}
        items={contextMenuItems}
        onClose={handleCloseContextMenu}
        variant="neural"
      />

      {/* File Editor Modal */}
      <MultiFileEditor
        isOpen={showFileEditor}
        onClose={handleFileEditorClose}
        filePaths={context.filePaths}
        title={`${context.name} - Files`}
        readOnly={false}
        onSave={handleFileSave}
      />

      {/* Context File Modal */}
      <ContextFileModal
        isOpen={showContextFileModal}
        onClose={handleContextFileModalClose}
        context={context}
      />
    </>
  );
}