'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { ContextGroup } from '@/stores/contextStore';
import GradientPalettePicker from '../components/GradientPalettePicker';

interface GroupListItemProps {
  group: ContextGroup;
  index: number;
  isEditing: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onUpdate: (groupId: string, updates: { name?: string; color?: string; accentColor?: string }) => void;
  onDelete: (groupId: string) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
}

export default function GroupListItem({
  group,
  index,
  isEditing,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onUpdate,
  onDelete,
  onEdit,
  onCancelEdit,
}: GroupListItemProps) {
  const [editName, setEditName] = useState(group.name);

  const handleSave = () => {
    if (editName.trim() && editName !== group.name) {
      onUpdate(group.id, { name: editName.trim() });
    }
    onCancelEdit();
  };

  return (
    <motion.div
      className="relative p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/30 rounded-2xl backdrop-blur-sm hover:border-gray-600/50 transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, ${group.color}10 0%, transparent 50%, ${group.accentColor || group.color}05 100%)`,
      }}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-testid={`group-list-item-${group.id}`}
    >
      {/* Hover Glow Effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0"
        style={{
          background: `linear-gradient(45deg, ${group.color}20, transparent, ${group.color}20)`,
          filter: 'blur(1px)',
        }}
        animate={{ opacity: isHovered ? 0.5 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative">
            <motion.div
              className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm border-2"
              style={{
                backgroundColor: `${group.color}20`,
                borderColor: `${group.color}50`,
              }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: group.color }} />
            </motion.div>
          </div>
          
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') onCancelEdit();
                }}
                className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                autoFocus
                maxLength={30}
                data-testid={`group-name-input-${group.id}`}
              />
            ) : (
              <div>
                <h4 className="text-lg font-bold font-mono" style={{ color: group.color }}>
                  {group.name}
                </h4>
                <p className="text-sm text-gray-400 font-mono">
                  Position: {group.position}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Gradient Accent Picker */}
          <GradientPalettePicker
            primaryColor={group.color}
            accentColor={group.accentColor}
            onAccentChange={(color) => onUpdate(group.id, { accentColor: color })}
            compact
          />

          <div className="text-right mr-3">
            <div className="text-sm font-bold text-gray-300 font-mono">
              {/* Context count placeholder */}
              0
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wider">
              Contexts
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {isEditing ? (
              <>
                <motion.button
                  onClick={handleSave}
                  className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  data-testid={`group-save-btn-${group.id}`}
                >
                  <Check className="w-4 h-4 text-green-400" />
                </motion.button>
                <motion.button
                  onClick={onCancelEdit}
                  className="p-2 hover:bg-gray-500/20 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  data-testid={`group-cancel-btn-${group.id}`}
                >
                  <X className="w-4 h-4 text-gray-400" />
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  onClick={onEdit}
                  className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  data-testid={`group-edit-btn-${group.id}`}
                >
                  <Edit2 className="w-4 h-4 text-blue-400" />
                </motion.button>
                <motion.button
                  onClick={() => onDelete(group.id)}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  data-testid={`group-delete-btn-${group.id}`}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
