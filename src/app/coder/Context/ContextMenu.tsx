import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Edit, Trash2, FolderOpen } from 'lucide-react';
import { Context, useContextStore } from '../../../stores/contextStore';

interface ContextMenuProps {
  context: Context;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

export default function ContextMenu({ context, isVisible, position, onClose }: ContextMenuProps) {
  const { removeContext } = useContextStore();

  const handleAction = (action: string) => {
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(JSON.stringify(context, null, 2));
        break;
      case 'edit':
        // TODO: Implement edit functionality
        console.log('Edit context:', context.id);
        break;
      case 'delete':
        removeContext(context.id);
        break;
      case 'open':
        // TODO: Implement open all files functionality
        console.log('Open files:', context.filePaths);
        break;
    }
    onClose();
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
        </>
      )}
    </AnimatePresence>
  );
}