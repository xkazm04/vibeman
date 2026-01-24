'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface WorkspaceProjectAssignerProps {
  workspaceId: string;
  onClose: () => void;
}

export default function WorkspaceProjectAssigner({ workspaceId, onClose }: WorkspaceProjectAssignerProps) {
  const { projects } = useServerProjectStore();
  const { workspaceProjectMap, setWorkspaceProjects } = useWorkspaceStore();

  const currentProjectIds = workspaceProjectMap[workspaceId] || [];
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentProjectIds));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set(workspaceProjectMap[workspaceId] || []));
  }, [workspaceId, workspaceProjectMap]);

  const toggleProject = (projectId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await setWorkspaceProjects(workspaceId, Array.from(selectedIds));
    setSaving(false);
    onClose();
  };

  // Show which workspace each project currently belongs to
  const getProjectWorkspace = (projectId: string): string | null => {
    for (const [wsId, ids] of Object.entries(workspaceProjectMap)) {
      if (wsId !== workspaceId && ids.includes(projectId)) {
        return wsId;
      }
    }
    return null;
  };

  const { workspaces } = useWorkspaceStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 bg-gray-800/60 border border-gray-700/40 rounded-lg space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">Assign Projects</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1">
        {projects.map(project => {
          const isSelected = selectedIds.has(project.id);
          const otherWsId = getProjectWorkspace(project.id);
          const otherWs = otherWsId ? workspaces.find(w => w.id === otherWsId) : null;

          return (
            <button
              key={project.id}
              onClick={() => toggleProject(project.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all ${
                isSelected
                  ? 'bg-blue-500/20 border border-blue-500/40'
                  : 'bg-gray-900/30 border border-transparent hover:bg-gray-800/40'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
              }`}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm text-gray-200 truncate">{project.name}</span>
              {otherWs && !isSelected && (
                <span className="text-[10px] text-gray-500 ml-auto shrink-0">
                  in {otherWs.name}
                </span>
              )}
              {otherWs && isSelected && (
                <span className="text-[10px] text-amber-400/70 ml-auto shrink-0">
                  moves from {otherWs.name}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 text-xs bg-blue-600/80 text-white rounded-md hover:bg-blue-500/80 disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </motion.div>
  );
}
