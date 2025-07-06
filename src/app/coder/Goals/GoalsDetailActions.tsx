'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Save, X } from 'lucide-react';
import { Goal } from '../../../types';

interface GoalsDetailActionsProps {
  goal: Goal;
  editedGoal: Goal;
  isEditing: boolean;
  isSaving: boolean;
  onEditToggle: () => void;
  onSave: () => Promise<void>;
  onClose: () => void;
  onDelete: (goalId: string) => Promise<boolean>;
}

export default function GoalsDetailActions({
  goal,
  editedGoal,
  isEditing,
  isSaving,
  onEditToggle,
  onSave,
  onClose,
  onDelete
}: GoalsDetailActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await onDelete(goal.id);
      if (success) {
        setDeleteStatus('success');
      } else {
        setDeleteStatus('error');
      }
    } catch (error) {
      setDeleteStatus('error');
    } finally {
      setIsDeleting(false);
    }
  };

  const showDeleteButton = !isEditing && deleteStatus === 'idle';
  const showEditButton = !isEditing && deleteStatus === 'idle';

  return (
    <div className="flex justify-between items-center pt-4 border-t border-slate-700/30">
      {/* Status Messages */}
      <div className="flex-1">
        {deleteStatus === 'success' && (
          <span className="text-green-400 text-sm font-medium">Deleted</span>
        )}
        {deleteStatus === 'error' && (
          <span className="text-red-400 text-sm font-medium">Deletion unsuccessful</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        {isEditing ? (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEditToggle}
              disabled={isSaving}
              className="px-6 py-2 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 text-slate-300 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSave}
              disabled={isSaving || !editedGoal.title.trim()}
              className="px-6 py-2 bg-gradient-to-r from-blue-600/50 to-indigo-600/50 hover:from-blue-500/60 hover:to-indigo-500/60 border border-blue-500/30 rounded-lg text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </motion.button>
          </>
        ) : (
          <>
            {showDeleteButton && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-red-400 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                title="Delete Goal"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </motion.button>
            )}
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-6 py-2 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 text-slate-300 rounded-lg transition-colors font-medium"
            >
              Close
            </motion.button>
            
            {showEditButton && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onEditToggle}
                className="px-6 py-2 bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-slate-600/60 hover:to-slate-700/60 border border-slate-600/30 rounded-lg text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Goal</span>
              </motion.button>
            )}
          </>
        )}
      </div>
    </div>
  );
} 