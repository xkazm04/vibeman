import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, FileText, Calendar, FolderTree, Clock, Edit3, Trash2 } from 'lucide-react';
import { Context, ContextGroup, useContextStore } from '../../../../stores/contextStore';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import ContextCard from '../ContextCard';
import ContextTooltip from '../ContextTooltip';

interface ContextDetailViewProps {
  contextId: string;
  onClose: () => void;
}

export default function ContextDetailView({ contextId, onClose }: ContextDetailViewProps) {
  const { contexts, groups, removeContext } = useContextStore();
  const { showConfirmModal } = useGlobalModal();
  const [selectedContext, setSelectedContext] = useState<Context | null>(null);
  const [contextGroup, setContextGroup] = useState<ContextGroup | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Find the context and its group
  useEffect(() => {
    const context = contexts.find(c => c.id === contextId);
    if (context) {
      setSelectedContext(context);
      const group = groups.find(g => g.id === context.groupId);
      setContextGroup(group || null);
    }
  }, [contextId, contexts, groups]);

  // Get all contexts in the same group
  const groupContexts = selectedContext 
    ? contexts.filter(c => c.groupId === selectedContext.groupId && c.id !== selectedContext.id)
    : [];

  const handleDelete = async () => {
    if (!selectedContext) return;

    showConfirmModal(
      'Delete Context',
      `Are you sure you want to delete "${selectedContext.name}"? This action cannot be undone.`,
      async () => {
        try {
          await removeContext(selectedContext.id);
          onClose();
        } catch (error) {
          console.error('Failed to delete context:', error);
        }
      }
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!selectedContext) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
            <FolderTree className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-xl text-gray-400">Context not found</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-7xl h-full max-h-[95vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-gray-700/40 overflow-hidden shadow-2xl"
      >
        {/* Header Panel */}
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
              onClick={() => {/* TODO: Implement edit */}}
              className="p-3 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all border border-blue-500/30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Edit3 className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              onClick={handleDelete}
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

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto space-y-8">
              
              {/* Context Card Display */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex justify-center"
              >
                <div className="transform scale-150">
                  <ContextCard
                    context={selectedContext}
                    groupColor={contextGroup?.color}
                    availableGroups={groups}
                    selectedFilePaths={[]}
                  />
                </div>
              </motion.div>

              {/* Detailed Information */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                
                {/* Basic Information */}
                <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-6 border border-gray-700/40">
                  <h3 className="text-xl font-bold text-white font-mono mb-6 flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-blue-400" />
                    <span>Context Information</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Name</label>
                      <p className="text-lg font-bold text-white font-mono mt-1">{selectedContext.name}</p>
                    </div>
                    
                    {selectedContext.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Description</label>
                        <p className="text-gray-300 mt-1 leading-relaxed">{selectedContext.description}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Files</label>
                        <p className="text-2xl font-bold text-white font-mono mt-1">{selectedContext.filePaths.length}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Group</label>
                        <p 
                          className="text-lg font-bold font-mono mt-1"
                          style={{ color: contextGroup?.color || '#8B5CF6' }}
                        >
                          {contextGroup?.name || 'Ungrouped'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-6 border border-gray-700/40">
                  <h3 className="text-xl font-bold text-white font-mono mb-6 flex items-center space-x-3">
                    <Calendar className="w-6 h-6 text-purple-400" />
                    <span>Timeline</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Created</label>
                      <p className="text-white font-mono mt-1">{formatDate(selectedContext.createdAt)}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Last Updated</label>
                      <p className="text-white font-mono mt-1">{formatDate(selectedContext.updatedAt)}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-700/30">
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>
                          {Math.floor((new Date().getTime() - selectedContext.createdAt.getTime()) / (1000 * 60 * 60 * 24))} days old
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* File Paths */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-6 border border-gray-700/40"
              >
                <h3 className="text-xl font-bold text-white font-mono mb-6 flex items-center space-x-3">
                  <FolderTree className="w-6 h-6 text-green-400" />
                  <span>File Paths ({selectedContext.filePaths.length})</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedContext.filePaths.map((path, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30 hover:border-gray-600/50 transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p 
                            className="text-sm text-gray-300 font-mono truncate group-hover:text-white transition-colors"
                            title={path}
                          >
                            {path}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Related Contexts in Same Group */}
              {groupContexts.length > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-6 border border-gray-700/40"
                >
                  <h3 className="text-xl font-bold text-white font-mono mb-6 flex items-center space-x-3">
                    <FolderTree 
                      className="w-6 h-6" 
                      style={{ color: contextGroup?.color || '#8B5CF6' }}
                    />
                    <span>Other Contexts in {contextGroup?.name || 'Group'} ({groupContexts.length})</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupContexts.map((context, index) => (
                      <motion.div
                        key={context.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="transform scale-75 origin-top-left"
                      >
                        <ContextCard
                          context={context}
                          groupColor={contextGroup?.color}
                          availableGroups={groups}
                          selectedFilePaths={[]}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}