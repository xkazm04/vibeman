'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Layers } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import WorkspaceList from './WorkspaceList';
import WorkspaceForm from './WorkspaceForm';
import WorkspaceProjectAssigner from './WorkspaceProjectAssigner';
import type { DbWorkspace } from '@/app/db/models/types';

interface WorkspaceManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ManagerView = 'list' | 'create' | 'edit' | 'assign';

export default function WorkspaceManager({ isOpen, onClose }: WorkspaceManagerProps) {
  const { syncWithServer, createWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaceStore();
  const [view, setView] = useState<ManagerView>('list');
  const [editingWorkspace, setEditingWorkspace] = useState<DbWorkspace | null>(null);
  const [assigningWorkspaceId, setAssigningWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      syncWithServer();
      setView('list');
    }
  }, [isOpen, syncWithServer]);

  if (!isOpen) return null;

  const handleCreate = async (data: { name: string; description?: string; color: string }) => {
    await createWorkspace(data);
    setView('list');
  };

  const handleEdit = async (data: { name: string; description?: string; color: string }) => {
    if (editingWorkspace) {
      await updateWorkspace(editingWorkspace.id, data);
      setEditingWorkspace(null);
      setView('list');
    }
  };

  const handleDelete = async (workspaceId: string) => {
    await deleteWorkspace(workspaceId);
  };

  const handleStartEdit = (workspace: DbWorkspace) => {
    setEditingWorkspace(workspace);
    setView('edit');
  };

  const handleStartAssign = (workspaceId: string) => {
    setAssigningWorkspaceId(workspaceId);
    setView('assign');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="w-full max-w-md bg-gray-900 border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-200">Workspaces</h2>
          </div>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <button
                onClick={() => setView('create')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-600/80 text-white rounded-md hover:bg-blue-500/80"
              >
                <Plus className="w-3 h-3" />
                New
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {view === 'list' && (
              <WorkspaceList
                onEdit={handleStartEdit}
                onAssignProjects={handleStartAssign}
                onDelete={handleDelete}
              />
            )}

            {view === 'create' && (
              <WorkspaceForm
                onSubmit={handleCreate}
                onCancel={() => setView('list')}
              />
            )}

            {view === 'edit' && editingWorkspace && (
              <WorkspaceForm
                workspace={editingWorkspace}
                onSubmit={handleEdit}
                onCancel={() => { setEditingWorkspace(null); setView('list'); }}
              />
            )}

            {view === 'assign' && assigningWorkspaceId && (
              <WorkspaceProjectAssigner
                workspaceId={assigningWorkspaceId}
                onClose={() => { setAssigningWorkspaceId(null); setView('list'); }}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
