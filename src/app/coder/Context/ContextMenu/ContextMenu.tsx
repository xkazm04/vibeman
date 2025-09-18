import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Edit, Trash2, FolderOpen, MousePointer, FileText, CheckSquare, Square } from 'lucide-react';
import { Context, ContextGroup, useContextStore } from '../../../../stores/contextStore';
import { useStore } from '../../../../stores/nodeStore';
import { useActiveProjectStore } from '../../../../stores/activeProjectStore';
import { MultiFileEditor } from '../../../../components/editor';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import EnhancedContextEditModal from './EnhancedContextEditModal';
import ContextFileModal from '../ContextFile/ContextFileModal';

interface ContextMenuProps {
  context: Context;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  availableGroups: ContextGroup[];
  selectedFilePaths: string[];
}

export default function ContextMenu({ context, isVisible, position, onClose, availableGroups, selectedFilePaths }: ContextMenuProps) {
  const { removeContext, selectedContextIds, toggleContextSelection } = useContextStore();
  const { clearSelection, selectFilesByPaths } = useStore();
  const { fileStructure } = useActiveProjectStore();
  const { showFullScreenModal } = useGlobalModal();
  const [showFileEditor, setShowFileEditor] = useState(false);
  const [showContextFileModal, setShowContextFileModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleAction = async (action: string) => {
    switch (action) {
      case 'select':
        // Clear current selection and select context files
        clearSelection();
        selectFilesByPaths(context.filePaths, fileStructure);
        break;
      case 'toggleForBacklog':
        // Toggle context selection for backlog generation
        toggleContextSelection(context.id);
        break;
      case 'copy':
        navigator.clipboard.writeText(JSON.stringify(context, null, 2));
        break;
      case 'edit':
        showFullScreenModal(
          `Edit Context: ${context.name}`,
          <EnhancedContextEditModal
            context={context}
            availableGroups={availableGroups}
            selectedFilePaths={selectedFilePaths}
            onSave={() => {
              // Context will be updated via the store
            }}
          />,
          {
            icon: Edit,
            iconBgColor: "from-cyan-500/20 to-blue-500/20",
            iconColor: "text-cyan-400",
            maxWidth: "max-w-7xl",
            maxHeight: "max-h-[90vh]"
          }
        );
        break;
      case 'delete':
        try {
          await removeContext(context.id);
        } catch (error) {
          console.error('Failed to delete context:', error);
        }
        break;
      case 'open':
        setShowFileEditor(true);
        return; // Don't close menu yet, let file editor handle it
      case 'contextFile':
        setShowContextFileModal(true);
        return; // Don't close menu yet, let context file modal handle it
    }
    onClose();
  };



  const handleFileEditorClose = () => {
    setShowFileEditor(false);
    onClose();
  };

  const handleContextFileModalClose = () => {
    setShowContextFileModal(false);
    onClose();
  };

  const handleFileSave = async (filePath: string, content: string) => {
    // TODO: Implement actual file saving logic
    // This would typically make an API call to save the file
    console.log('Saving file:', filePath, 'with content length:', content.length);

    // Mock API call
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // Simulate success/failure
        if (Math.random() > 0.1) { // 90% success rate for demo
          resolve();
        } else {
          reject(new Error('Failed to save file'));
        }
      }, 1000);
    });
  };

  // Don't render on server side
  if (!mounted) return null;

  const menuContent = (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop - Subtle overlay without blur */}
          <div
            className="fixed inset-0 bg-black/5"
            style={{ zIndex: 999998 }}
            onClick={onClose}
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed bg-gray-900/95 border border-gray-600/70 rounded-2xl shadow-2xl py-3 min-w-[200px] backdrop-blur-md"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              zIndex: 999999, // Ensure it's above everything
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            }}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent rounded-2xl" />
            
            <div className="relative">
              <motion.button
                onClick={() => handleAction('open')}
                className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700/60 hover:text-white flex items-center space-x-3 transition-all duration-200 rounded-xl mx-1"
                whileHover={{ x: 4, backgroundColor: 'rgba(55, 65, 81, 0.6)' }}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="font-mono font-medium">Open Files</span>
              </motion.button>

              <motion.button
                onClick={() => handleAction('copy')}
                className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700/60 hover:text-white flex items-center space-x-3 transition-all duration-200 rounded-xl mx-1"
                whileHover={{ x: 4, backgroundColor: 'rgba(55, 65, 81, 0.6)' }}
              >
                <Copy className="w-4 h-4" />
                <span className="font-mono font-medium">Copy Context</span>
              </motion.button>

              <motion.button
                onClick={() => handleAction('select')}
                className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700/60 hover:text-white flex items-center space-x-3 transition-all duration-200 rounded-xl mx-1"
                whileHover={{ x: 4, backgroundColor: 'rgba(55, 65, 81, 0.6)' }}
              >
                <MousePointer className="w-4 h-4" />
                <span className="font-mono font-medium">Select Files</span>
              </motion.button>

              <motion.button
                onClick={() => handleAction('toggleForBacklog')}
                className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700/60 hover:text-white flex items-center space-x-3 transition-all duration-200 rounded-xl mx-1"
                whileHover={{ x: 4, backgroundColor: 'rgba(55, 65, 81, 0.6)' }}
              >
                {selectedContextIds.has(context.id) ? (
                  <CheckSquare className="w-4 h-4 text-green-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="font-mono font-medium">
                  {selectedContextIds.has(context.id) ? 'Unselect for Backlog' : 'Select for Backlog'}
                </span>
              </motion.button>

              <motion.button
                onClick={() => handleAction('contextFile')}
                className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700/60 hover:text-white flex items-center space-x-3 transition-all duration-200 rounded-xl mx-1"
                whileHover={{ x: 4, backgroundColor: 'rgba(55, 65, 81, 0.6)' }}
              >
                <FileText className="w-4 h-4" />
                <span className="font-mono font-medium">Context File</span>
              </motion.button>

              <motion.button
                onClick={() => handleAction('edit')}
                className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700/60 hover:text-white flex items-center space-x-3 transition-all duration-200 rounded-xl mx-1"
                whileHover={{ x: 4, backgroundColor: 'rgba(55, 65, 81, 0.6)' }}
              >
                <Edit className="w-4 h-4" />
                <span className="font-mono font-medium">Edit</span>
              </motion.button>

              <div className="border-t border-gray-600/40 my-2 mx-2" />

              <motion.button
                onClick={() => handleAction('delete')}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center space-x-3 transition-all duration-200 rounded-xl mx-1"
                whileHover={{ x: 4, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <Trash2 className="w-4 h-4" />
                <span className="font-mono font-medium">Delete</span>
              </motion.button>
            </div>
          </motion.div>



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
      )}
    </AnimatePresence>
  );

  // Use portal to render at document root level
  return typeof document !== 'undefined' 
    ? createPortal(menuContent, document.body)
    : null;
}