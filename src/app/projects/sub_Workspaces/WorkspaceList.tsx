'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Users } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { DbWorkspace } from '@/app/db/models/types';

interface WorkspaceListProps {
  onEdit: (workspace: DbWorkspace) => void;
  onAssignProjects: (workspaceId: string) => void;
  onDelete: (workspaceId: string) => void;
}

export default function WorkspaceList({ onEdit, onAssignProjects, onDelete }: WorkspaceListProps) {
  const { workspaces, workspaceProjectMap } = useWorkspaceStore();

  if (workspaces.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        No workspaces yet. Create one to organize your projects.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {workspaces.map(ws => {
        const projectCount = (workspaceProjectMap[ws.id] || []).length;

        return (
          <motion.div
            key={ws.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-3 py-2.5 bg-gray-800/40 border border-gray-700/30 rounded-lg group"
          >
            {/* Color indicator */}
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: ws.color }}
            />

            {/* Name + description */}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-200 font-medium truncate">{ws.name}</div>
              {ws.description && (
                <div className="text-xs text-gray-500 truncate">{ws.description}</div>
              )}
            </div>

            {/* Project count */}
            <span className="text-xs text-gray-500 shrink-0">
              {projectCount} {projectCount === 1 ? 'project' : 'projects'}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onAssignProjects(ws.id)}
                className="p-1.5 text-gray-500 hover:text-blue-400 rounded"
                title="Assign projects"
              >
                <Users className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onEdit(ws)}
                className="p-1.5 text-gray-500 hover:text-gray-300 rounded"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(ws.id)}
                className="p-1.5 text-gray-500 hover:text-red-400 rounded"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
