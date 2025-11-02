import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Edit, Trash2, FolderOpen, MousePointer, FileText, CheckSquare, Square } from 'lucide-react';
import { Context, ContextGroup, useContextStore } from '../../../../stores/contextStore';
import { useStore } from '../../../../stores/nodeStore';
import { MultiFileEditor } from '../../../../components/editor';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import ContextEditModal from '../sub_ContextGen/ContextEditModal';
import ContextFileModal from '../sub_ContextFile/ContextFileModal';

interface ContextMenuProps {
  context: Context;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  availableGroups: ContextGroup[];
}

export default function ContextMenu({ context, isVisible, position, onClose, availableGroups }: ContextMenuProps) {
  const { removeContext, selectedContextIds, toggleContextSelection, setSelectedContext } = useContextStore();
  const { clearSelection } = useStore();
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
        // Clear current file selection and set this context as the only selected context
        clearSelection();
        setSelectedContext(context.id);
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

          {/* Neural Context Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 border border-gray-700/50 rounded-2xl shadow-2xl py-4 min-w-[220px] backdrop-blur-xl"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              zIndex: 999999,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(99, 102, 241, 0.2)'
            }}
          >
            {/* Neural Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent rounded-2xl" />
            
            {/* Animated Grid Pattern */}
            <motion.div
              className="absolute inset-0 opacity-5 rounded-2xl"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '8px 8px'
              }}
              animate={{
                backgroundPosition: ['0px 0px', '8px 8px'],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            
            {/* Floating Particles */}
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
                style={{
                  left: `${20 + i * 30}%`,
                  top: `${20 + i * 20}%`,
                }}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              />
            ))}
            
            <div className="relative space-y-1">
              <motion.button
                onClick={() => handleAction('open')}
                className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-blue-500/10 hover:text-cyan-300 flex items-center space-x-3 transition-all duration-300 rounded-xl mx-1 border border-transparent hover:border-cyan-500/30 backdrop-blur-sm"
                whileHover={{ x: 6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  whileHover={{ rotate: 15 }}
                  transition={{ duration: 0.2 }}
                >
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                </motion.div>
                <span className="font-mono font-medium">Open Neural Files</span>
              </motion.button>

              <motion.button
                onClick={() => handleAction('copy')}
                className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gradient-to-r hover:from-slate-500/10 hover:to-blue-500/10 hover:text-slate-300 flex items-center space-x-3 transition-all duration-300 rounded-xl mx-1 border border-transparent hover:border-slate-500/30 backdrop-blur-sm"
                whileHover={{ x: 6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  whileHover={{ rotate: 15 }}
                  transition={{ duration: 0.2 }}
                >
                  <Copy className="w-4 h-4 text-slate-400" />
                </motion.div>
                <span className="font-mono font-medium">Clone Context</span>
              </motion.button>

              <motion.button
                onClick={() => handleAction('select')}
                className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-pink-500/10 hover:text-blue-300 flex items-center space-x-3 transition-all duration-300 rounded-xl mx-1 border border-transparent hover:border-blue-500/30 backdrop-blur-sm"
                whileHover={{ x: 6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  whileHover={{ rotate: 15 }}
                  transition={{ duration: 0.2 }}
                >
                  <MousePointer className="w-4 h-4 text-blue-400" />
                </motion.div>
                <span className="font-mono font-medium">Select</span>
              </motion.button>

              <motion.button
                onClick={() => handleAction('toggleForBacklog')}
                className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gradient-to-r hover:from-green-500/10 hover:to-emerald-500/10 hover:text-green-300 flex items-center space-x-3 transition-all duration-300 rounded-xl mx-1 border border-transparent hover:border-green-500/30 backdrop-blur-sm"
                whileHover={{ x: 6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  {selectedContextIds.has(context.id) ? (
                    <CheckSquare className="w-4 h-4 text-green-400" />
                  ) : (
                    <Square className="w-4 h-4 text-green-400" />
                  )}
                </motion.div>
                <span className="font-mono font-medium">
                  {selectedContextIds.has(context.id) ? 'Remove from Queue' : 'Add to Queue'}
                </span>
              </motion.button>

              <motion.button
                onClick={() => handleAction('contextFile')}
                className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-cyan-500/10 hover:text-blue-300 flex items-center space-x-3 transition-all duration-300 rounded-xl mx-1 border border-transparent hover:border-blue-500/30 backdrop-blur-sm"
                whileHover={{ x: 6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  whileHover={{ rotate: 15 }}
                  transition={{ duration: 0.2 }}
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                </motion.div>
                <span className="font-mono font-medium">Context Matrix</span>
              </motion.button>

              <motion.button
                onClick={() => handleAction('edit')}
                className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gradient-to-r hover:from-yellow-500/10 hover:to-orange-500/10 hover:text-yellow-300 flex items-center space-x-3 transition-all duration-300 rounded-xl mx-1 border border-transparent hover:border-yellow-500/30 backdrop-blur-sm"
                whileHover={{ x: 6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  whileHover={{ rotate: 15 }}
                  transition={{ duration: 0.2 }}
                >
                  <Edit className="w-4 h-4 text-yellow-400" />
                </motion.div>
                <span className="font-mono font-medium">Modify Node</span>
              </motion.button>

              {/* Neural Divider */}
              <div className="relative my-3 mx-2">
                <div className="border-t border-gray-600/40" />
                <motion.div
                  className="absolute inset-0 border-t border-red-500/30"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                />
              </div>

              <motion.button
                onClick={() => handleAction('delete')}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 hover:text-red-300 flex items-center space-x-3 transition-all duration-300 rounded-xl mx-1 border border-transparent hover:border-red-500/50 backdrop-blur-sm"
                whileHover={{ x: 6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.div>
                <span className="font-mono font-medium">Delete Context</span>
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