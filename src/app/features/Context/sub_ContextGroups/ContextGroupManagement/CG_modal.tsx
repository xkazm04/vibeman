'use client';
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ContextGroup, useContextStore } from '@/stores/contextStore';
import { CONTEXT_GROUP_COLORS } from '@/lib/constants/contextColors';
import ModalHeader from './CG_modalHeader';
import CreateGroupSection from './CG_createSection';
import GroupListSection from './CG_section';

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  groups: ContextGroup[];
}

export default function GroupManagementModal({ isOpen, onClose, projectId, groups }: GroupManagementModalProps) {
  const { addGroup, removeGroup, updateGroup, loading } = useContextStore();
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(CONTEXT_GROUP_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState('Code');
  const [error, setError] = useState('');
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (groups.some(g => g.name.toLowerCase() === newGroupName.toLowerCase())) {
      setError('A group with this name already exists');
      return;
    }

    try {
      await addGroup({
        projectId,
        name: newGroupName.trim(),
        color: selectedColor,
      });
      
      setNewGroupName('');
      setSelectedColor(CONTEXT_GROUP_COLORS[groups.length % CONTEXT_GROUP_COLORS.length]);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create group');
    }
  };

  const handleUpdateGroup = async (groupId: string, updates: { name?: string; color?: string }) => {
    try {
      await updateGroup(groupId, updates);
      setEditingGroup(null);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure? This will delete all contexts in this group.')) {
      return;
    }

    try {
      await removeGroup(groupId);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete group');
    }
  };

  const handleClose = () => {
    setEditingGroup(null);
    setNewGroupName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-6"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 30 }}
          className="relative bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 border border-gray-700/50 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Neural Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />
          
          {/* Floating Neural Particles */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -50, 0],
                x: [0, Math.random() * 30 - 15, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut"
              }}
            />
          ))}

          {/* Header */}
          <ModalHeader groupsCount={groups.length} onClose={handleClose} />

          {/* Content */}
          <div className="relative p-8 space-y-8 overflow-y-auto max-h-[70vh]">
            {/* Create New Group */}
            <CreateGroupSection
              newGroupName={newGroupName}
              setNewGroupName={setNewGroupName}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              selectedIcon={selectedIcon}
              setSelectedIcon={setSelectedIcon}
              groups={groups}
              loading={loading}
              onCreateGroup={handleCreateGroup}
              setError={setError}
            />

            {/* Existing Groups */}
            <GroupListSection
              groups={groups}
              editingGroup={editingGroup}
              hoveredGroup={hoveredGroup}
              setHoveredGroup={setHoveredGroup}
              onUpdateGroup={handleUpdateGroup}
              onDeleteGroup={handleDeleteGroup}
              setEditingGroup={setEditingGroup}
            />

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  className="p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 rounded-2xl backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <X className="w-4 h-4 text-red-400" />
                    </div>
                    <p className="text-red-400 font-mono">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="relative flex items-center justify-between p-8 border-t border-gray-700/30">
            <div className="text-sm text-gray-400 font-mono">
              Organize up to 20 groups with unlimited contexts each
            </div>
            
            <motion.button
              onClick={handleClose}
              className="px-6 py-3 bg-gray-700/50 text-gray-300 hover:text-white rounded-xl transition-all font-mono border border-gray-600/50 hover:border-gray-500/50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Done
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
