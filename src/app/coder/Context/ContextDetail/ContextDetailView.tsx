import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderTree } from 'lucide-react';
import { Context, useContextStore } from '../../../../stores/contextStore';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import { getRelatedContexts } from '../lib';
import ContextCard from '../ContextCard';
import ContextDetailHeader from './ContextDetailHeader';
import ContextDetailInfo from './ContextDetailInfo';
import ContextDetailTimeline from './ContextDetailTimeline';
import ContextDetailFiles from './ContextDetailFiles';
import ContextDetailRelated from './ContextDetailRelated';

interface ContextDetailViewProps {
  contextId: string;
  onClose: () => void;
}

export default function ContextDetailView({ contextId, onClose }: ContextDetailViewProps) {
  const { contexts, groups, removeContext } = useContextStore();
  const { showConfirmModal } = useGlobalModal();
  const [selectedContext, setSelectedContext] = useState<Context | null>(null);
  const [contextGroup, setContextGroup] = useState<typeof groups[0] | null>(null);

  // Find the context and its group
  useEffect(() => {
    const context = contexts.find(c => c.id === contextId);
    if (context) {
      setSelectedContext(context);
      const group = groups.find(g => g.id === context.groupId);
      setContextGroup(group || null);
    }
  }, [contextId, contexts, groups]);

  // Get all contexts in the same group (excluding current)
  const groupContexts = selectedContext 
    ? getRelatedContexts(contexts, selectedContext.id, selectedContext.groupId || undefined)
    : [];

  const handleEdit = () => {
    // TODO: Implement edit
  };

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
        <ContextDetailHeader
          contextGroup={contextGroup}
          onClose={onClose}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ContextDetailInfo 
                  context={selectedContext} 
                  contextGroup={contextGroup} 
                />
                <ContextDetailTimeline context={selectedContext} />
              </div>

              {/* File Paths */}
              <ContextDetailFiles context={selectedContext} />

              {/* Related Contexts in Same Group */}
              <ContextDetailRelated 
                groupContexts={groupContexts}
                contextGroup={contextGroup}
                allGroups={groups}
              />

            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}