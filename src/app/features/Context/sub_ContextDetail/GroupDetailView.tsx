import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderTree } from 'lucide-react';
import { Context, ContextGroup, useContextStore, useShallow } from '../../../../stores/contextStore';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import { normalizePath } from '../../../../utils/pathUtils';
import { useFocusTrap } from '../../../../lib/accessibility';
import { zIndex } from '@/lib/design-tokens';
import GroupDetailHeader from './GroupDetailHeader';
import GroupDetailStats from './GroupDetailStats';
import GroupDetailContent from './GroupDetailContent';

interface GroupDetailViewProps {
  groupId: string;
  onClose: () => void;
}

const TITLE_ID = 'group-detail-title';

export default function GroupDetailView({ groupId, onClose }: GroupDetailViewProps) {
  const { contexts, groups } = useContextStore(useShallow(s => ({ contexts: s.contexts, groups: s.groups })));
  const removeGroup = useContextStore(s => s.removeGroup);
  const { showConfirmModal } = useGlobalModal();
  const [selectedGroup, setSelectedGroup] = useState<ContextGroup | null>(null);
  const [groupContexts, setGroupContexts] = useState<Context[]>([]);
  const { containerRef, handleKeyDown } = useFocusTrap(true);

  // Find the group and its contexts
  useEffect(() => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setSelectedGroup(group);
      const contextList = contexts.filter(c => c.groupId === groupId);
      setGroupContexts(contextList);
    }
  }, [groupId, contexts, groups]);

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    showConfirmModal(
      'Delete Group',
      `Are you sure you want to delete "${selectedGroup.name}"? This will ungroup all contexts but won't delete them.`,
      async () => {
        try {
          await removeGroup(selectedGroup.id);
          onClose();
        } catch (error) {
          console.error('Failed to delete group:', error);
        }
      }
    );
  };

  // Calculate total files across all contexts
  const totalFiles = groupContexts.reduce((sum, context) => sum + context.filePaths.length, 0);

  const allFilePaths = Array.from(new Set(groupContexts.flatMap(context =>
    context.filePaths.map(normalizePath)
  )));

  if (!selectedGroup) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
            <FolderTree className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-xl text-gray-400">Group not found</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: zIndex.modal }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onKeyDown={handleKeyDown}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-[95vw] h-full max-h-[95vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-gray-700/40 overflow-hidden shadow-2xl"
      >
        {/* Header Panel */}
        <GroupDetailHeader
          group={selectedGroup}
          titleId={TITLE_ID}
          contextCount={groupContexts.length}
          totalFiles={totalFiles}
          uniquePathCount={allFilePaths.length}
          onClose={onClose}
          onDelete={handleDeleteGroup}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-8">
            <div className="max-w-full mx-auto space-y-8">
              <GroupDetailStats
                group={selectedGroup}
                contextCount={groupContexts.length}
                totalFiles={totalFiles}
              />

              <GroupDetailContent
                group={selectedGroup}
                groupContexts={groupContexts}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
