'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Calendar, CheckCircle, Clock, Circle, Edit3, Save } from 'lucide-react';
import { Goal } from '../../../types';
import { UniversalModal } from '../../../components/UniversalModal';

interface GoalsDetailModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (goalId: string, updates: Partial<Goal>) => Promise<Goal | null>;
}

export default function GoalsDetailModal({ 
  goal, 
  isOpen, 
  onClose, 
  onSave
}: GoalsDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Goal | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset state when modal opens/closes or goal changes
  useEffect(() => {
    if (isOpen && goal) {
      setEditedGoal(goal);
      setIsEditing(false);
      setSaveError(null);
    }
  }, [isOpen, goal]);

  if (!goal || !editedGoal) return null;

  const getStatusInfo = (status: Goal['status']) => {
    switch (status) {
      case 'done':
        return {
          text: 'Completed',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
          icon: CheckCircle
        };
      case 'in_progress':
        return {
          text: 'In Progress',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          icon: Clock
        };
      case 'open':
        return {
          text: 'Open',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/30',
          icon: Circle
        };
    }
  };

  const statusInfo = getStatusInfo(editedGoal.status);
  const StatusIcon = statusInfo.icon;

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original goal
      setEditedGoal(goal);
      setSaveError(null);
    }
    setIsEditing(!isEditing);
  };

  const handleFieldChange = (field: keyof Goal, value: string | number) => {
    setEditedGoal(prev => prev ? { ...prev, [field]: value } : null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!onSave || !editedGoal) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const updatedGoal = await onSave(editedGoal.id, {
        title: editedGoal.title,
        description: editedGoal.description,
        status: editedGoal.status
      });

      if (updatedGoal) {
        setIsEditing(false);
        // Update the local goal state
        setEditedGoal(updatedGoal);
      } else {
        setSaveError('Failed to save changes');
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isEditing) {
      // Reset to original goal if editing
      setEditedGoal(goal);
      setIsEditing(false);
      setSaveError(null);
    }
    onClose();
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? "Edit Goal" : "Goal Details"}
      subtitle={isEditing ? "Modify goal information" : "View goal information"}
      icon={Target}
      iconBgColor="from-blue-600/20 to-indigo-600/20"
      iconColor="text-blue-400"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Title Section */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3 tracking-wide">Title</h3>
          {isEditing ? (
            <input
              type="text"
              value={editedGoal.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="Enter goal title..."
            />
          ) : (
            <p className="text-slate-200 leading-relaxed px-4 py-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
              {editedGoal.title}
            </p>
          )}
        </div>

        {/* Description Section */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3 tracking-wide">Description</h3>
          {isEditing ? (
            <textarea
              value={editedGoal.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
              placeholder="Enter goal description..."
            />
          ) : (
            <p className="text-slate-200 leading-relaxed px-4 py-3 bg-slate-800/30 rounded-lg border border-slate-700/30 min-h-[4rem]">
              {editedGoal.description || 'No description provided'}
            </p>
          )}
        </div>

        {/* Status Section */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3 tracking-wide">Status</h3>
          {isEditing ? (
            <select
              value={editedGoal.status}
              onChange={(e) => handleFieldChange('status', e.target.value as Goal['status'])}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          ) : (
            <div className="flex items-center space-x-2 px-4 py-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
              <span className={`text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3 tracking-wide">Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <h4 className="text-sm font-medium text-slate-300 mb-1">Order</h4>
              <p className="text-sm text-slate-400">#{editedGoal.order}</p>
            </div>
            {goal.created_at && (
              <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <h4 className="text-sm font-medium text-slate-300 mb-1">Created</h4>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className="text-sm text-slate-400">
                    {new Date(goal.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
            {goal.updated_at && goal.updated_at !== goal.created_at && (
              <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <h4 className="text-sm font-medium text-slate-300 mb-1">Last Updated</h4>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className="text-sm text-slate-400">
                    {new Date(goal.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {saveError && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{saveError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700/30">
          {isEditing ? (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEditToggle}
                disabled={isSaving}
                className="px-6 py-2 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 text-slate-300 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
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
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClose}
                className="px-6 py-2 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 text-slate-300 rounded-lg transition-colors font-medium"
              >
                Close
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEditToggle}
                className="px-6 py-2 bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-slate-600/60 hover:to-slate-700/60 border border-slate-600/30 rounded-lg text-white font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Goal</span>
              </motion.button>
            </>
          )}
        </div>
      </div>
    </UniversalModal>
  );
} 