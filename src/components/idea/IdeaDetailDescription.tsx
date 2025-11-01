'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, Save } from 'lucide-react';

interface IdeaDetailDescriptionProps {
  description: string;
  isEditing: boolean;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onChange: (value: string) => void;
}

export default function IdeaDetailDescription({
  description,
  isEditing,
  saving,
  onEdit,
  onSave,
  onCancel,
  onChange,
}: IdeaDetailDescriptionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Description
        </h3>
        {!isEditing ? (
          <motion.button
            onClick={onEdit}
            className="p-1.5 hover:bg-gray-700/40 rounded transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Edit description"
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-400" />
          </motion.button>
        ) : (
          <div className="flex items-center gap-2">
            <motion.button
              onClick={onSave}
              disabled={saving}
              className="p-1.5 hover:bg-green-500/20 rounded transition-colors disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Save description"
            >
              <Save className="w-3.5 h-3.5 text-green-400" />
            </motion.button>
            <button
              onClick={onCancel}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {!isEditing ? (
        <p className="text-sm text-white leading-relaxed">
          {description || 'No description provided'}
        </p>
      ) : (
        <textarea
          value={description}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter description..."
          className="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all resize-none"
          rows={4}
          autoFocus
        />
      )}
    </div>
  );
}
