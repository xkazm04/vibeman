/**
 * Context Detail Header Component
 * Top bar with navigation and action buttons
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Edit3, Trash2, FolderTree } from 'lucide-react';
import { ContextGroup } from '../../../../stores/contextStore';

interface ContextDetailHeaderProps {
  contextGroup: ContextGroup | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ContextDetailHeader({ 
  contextGroup, 
  onClose, 
  onEdit, 
  onDelete 
}: ContextDetailHeaderProps) {
  return (
    <div 
      className="relative h-20 px-8 flex items-center justify-between border-b border-gray-700/30"
      style={{
        background: `linear-gradient(135deg, ${contextGroup?.color || '#8B5CF6'}15 0%, transparent 50%, ${contextGroup?.color || '#8B5CF6'}05 100%)`
      }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-transparent to-transparent" />
      
      {/* Left Section - Group Info */}
      <div className="flex items-center space-x-4">
        <motion.button
          onClick={onClose}
          className="p-2 hover:bg-gray-700/50 rounded-xl transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-6 h-6 text-gray-400" />
        </motion.button>
        
        <div className="flex items-center space-x-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm"
            style={{
              backgroundColor: `${contextGroup?.color || '#8B5CF6'}20`,
              border: `1px solid ${contextGroup?.color || '#8B5CF6'}30`
            }}
          >
            <FolderTree
              className="w-6 h-6"
              style={{ color: contextGroup?.color || '#8B5CF6' }}
            />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-white font-mono">
              {contextGroup?.name || 'Ungrouped'}
            </h1>
            <p className="text-sm text-gray-400">Context Detail View</p>
          </div>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center space-x-3">
        <motion.button
          onClick={onEdit}
          className="p-3 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all border border-blue-500/30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Edit3 className="w-5 h-5" />
        </motion.button>
        
        <motion.button
          onClick={onDelete}
          className="p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all border border-red-500/30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Trash2 className="w-5 h-5" />
        </motion.button>

        <motion.button
          onClick={onClose}
          className="p-3 hover:bg-gray-700/50 rounded-xl transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <X className="w-6 h-6 text-gray-400" />
        </motion.button>
      </div>
    </div>
  );
}
