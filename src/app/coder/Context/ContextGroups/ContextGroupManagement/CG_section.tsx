'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Grid3X3 } from 'lucide-react';
import { ContextGroup } from '@/stores/contextStore';
import GroupListItem from './CG_listItem';

interface GroupListSectionProps {
  groups: ContextGroup[];
  editingGroup: string | null;
  hoveredGroup: string | null;
  setHoveredGroup: (id: string | null) => void;
  onUpdateGroup: (groupId: string, updates: { name?: string; color?: string }) => void;
  onDeleteGroup: (groupId: string) => void;
  setEditingGroup: (id: string | null) => void;
}

export default function GroupListSection({
  groups,
  editingGroup,
  hoveredGroup,
  setHoveredGroup,
  onUpdateGroup,
  onDeleteGroup,
  setEditingGroup,
}: GroupListSectionProps) {
  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-bold text-white font-mono">
            Active Groups
          </h3>
        </div>
        <div className="text-sm text-gray-400 font-mono">
          {groups.length} of 20 groups
        </div>
      </div>
      
      {groups.length === 0 ? (
        <motion.div 
          className="text-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="relative mb-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-3xl flex items-center justify-center backdrop-blur-sm">
              <Grid3X3 className="w-12 h-12 text-gray-500" />
            </div>
            <motion.div
              className="absolute -inset-2 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-3xl blur-xl opacity-50"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <p className="text-lg font-semibold text-gray-300 font-mono mb-2">No groups created yet</p>
          <p className="text-gray-500">Create your first group above to start organizing your contexts</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map((group, index) => (
            <GroupListItem
              key={group.id}
              group={group}
              index={index}
              isEditing={editingGroup === group.id}
              isHovered={hoveredGroup === group.id}
              onMouseEnter={() => setHoveredGroup(group.id)}
              onMouseLeave={() => setHoveredGroup(null)}
              onUpdate={onUpdateGroup}
              onDelete={onDeleteGroup}
              onEdit={() => setEditingGroup(group.id)}
              onCancelEdit={() => setEditingGroup(null)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
