import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Edit, Trash2, FolderOpen, MousePointer, FileText, CheckSquare, Square } from 'lucide-react';
import { Context, ContextGroup, useContextStore } from '../../../../stores/contextStore';
import { useStore } from '../../../../stores/nodeStore';
import { useActiveProjectStore } from '../../../../stores/activeProjectStore';
import { MultiFileEditor } from '../../../../components/editor';
import ContextEditModal from './ContextEditModal';
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFileEditor, setShowFileEditor] = useState(false);
  const [showContextFileModal, setShowContextFileModal] = useState(false);

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
        setShowEditModal(true);
        return; // Don't close menu yet, let edit modal handle it
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

  const handleEditModalClose = () => {
    setShowEditModal(false);
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

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[140px]"
            style={{
              left: position.x,
              top: position.y
            }}
          >
            <button
              onClick={() => handleAction('open')}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center space-x-2 transition-colors"
            >
              <FolderOpen className="w-3 h-3" />
              <span>Open Files</span>
            </button>

            <button
              onClick={() => handleAction('copy')}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center space-x-2 transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Context</span>
            </button>

            <button
              onClick={() => handleAction('select')}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center space-x-2 transition-colors"
            >
              <MousePointer className="w-3 h-3" />
              <span>Select Files</span>
            </button>

            <button
              onClick={() => handleAction('toggleForBacklog')}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center space-x-2 transition-colors"
            >
              {selectedContextIds.has(context.id) ? (
                <CheckSquare className="w-3 h-3 text-green-400" />
              ) : (
                <Square className="w-3 h-3" />
              )}
              <span>
                {selectedContextIds.has(context.id) ? 'Unselect for Backlog' : 'Select for Backlog'}
              </span>
            </button>

            <button
              onClick={() => handleAction('contextFile')}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center space-x-2 transition-colors"
            >
              <FileText className="w-3 h-3" />
              <span>Context File</span>
            </button>

            <button
              onClick={() => handleAction('edit')}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 flex items-center space-x-2 transition-colors"
            >
              <Edit className="w-3 h-3" />
              <span>Edit</span>
            </button>

            <div className="border-t border-gray-600/30 my-1" />

            <button
              onClick={() => handleAction('delete')}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center space-x-2 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </motion.div>

          {/* Edit Modal */}
          <ContextEditModal
            isOpen={showEditModal}
            onClose={handleEditModalClose}
            context={context}
            availableGroups={availableGroups}
            selectedFilePaths={selectedFilePaths}
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
      )}
    </AnimatePresence>
  );
}