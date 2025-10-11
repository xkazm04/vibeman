'use client';
import React, { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { Goal } from '../../../types';
import { UniversalModal } from '../../../components/UniversalModal';
import { useGoals } from '../../../hooks/useGoals';
import GoalsDetailDescription from './GoalsDetailDescription';
import GoalsDetailActions from './GoalsDetailActions';
import { getStatusInfo } from './lib';

interface GoalsDetailModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (goalId: string, updates: Partial<Goal>) => Promise<Goal | null>;
  projectId: string | null;
}

export default function GoalsDetailModal({ 
  goal, 
  isOpen, 
  onClose, 
  onSave,
  projectId
}: GoalsDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Goal | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const { deleteGoal } = useGoals(projectId);

  // Reset state when modal opens/closes or goal changes
  useEffect(() => {
    if (isOpen && goal) {
      setEditedGoal(goal);
      setIsEditing(false);
      setSaveError(null);
    }
  }, [isOpen, goal]);

  if (!goal || !editedGoal) return null;

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

  const handleDelete = async (goalId: string): Promise<boolean> => {
    return await deleteGoal(goalId);
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? "Edit Goal" : "Goal Details"}
      subtitle={isEditing ? "Modify goal information" : "View goal information"}
      icon={Target}
      iconBgColor="from-blue-600/20 to-slate-600/20"
      iconColor="text-blue-400"
      maxWidth="max-w-6xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Title and Status */}
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
                <option value="undecided">Undecided</option>
                <option value="rejected">Rejected</option>
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

          {/* Metadata Section */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3 tracking-wide">Metadata</h3>
            <div className="space-y-3 px-4 py-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Order:</span>
                <span className="text-sm text-slate-200">#{editedGoal.order}</span>
              </div>
              {editedGoal.created_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Created:</span>
                  <span className="text-sm text-slate-200">
                    {new Date(editedGoal.created_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {editedGoal.updated_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Updated:</span>
                  <span className="text-sm text-slate-200">
                    {new Date(editedGoal.updated_at).toLocaleDateString()}
                  </span>
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
        </div>

        {/* Right Column - Description and Details */}
        <div>
          <GoalsDetailDescription
            goal={goal}
            editedGoal={editedGoal}
            isEditing={isEditing}
            onFieldChange={handleFieldChange}
          />
        </div>
      </div>

      {/* Actions Footer */}
      <GoalsDetailActions
        goal={goal}
        editedGoal={editedGoal}
        isEditing={isEditing}
        isSaving={isSaving}
        onEditToggle={handleEditToggle}
        onSave={handleSave}
        onClose={handleClose}
        onDelete={handleDelete}
      />
    </UniversalModal>
  );
} 