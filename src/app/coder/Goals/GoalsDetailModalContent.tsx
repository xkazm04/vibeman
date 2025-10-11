'use client';
import React, { useState, useEffect } from 'react';
import { Hash, Calendar, Save, Edit3, Trash2 } from 'lucide-react';
import { Goal } from '../../../types';
import { useGoals } from '../../../hooks/useGoals';
import { getStatusConfig, formatDate, validateGoalData } from './lib';

interface GoalsDetailModalContentProps {
  goal: Goal;
  projectId: string | null;
  onSave?: (goalId: string, updates: Partial<Goal>) => Promise<Goal | null>;
  onClose: () => void;
}

export default function GoalsDetailModalContent({
  goal,
  projectId,
  onSave,
  onClose
}: GoalsDetailModalContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Goal>(goal);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const { deleteGoal } = useGoals(projectId);

  // Update editedGoal when goal prop changes
  useEffect(() => {
    setEditedGoal(goal);
    setIsEditing(false);
    setSaveError(null);
  }, [goal]);

  const statusConfig = getStatusConfig(editedGoal.status);
  const StatusIcon = statusConfig.icon;

  const handleSave = async () => {
    if (!onSave || !validateGoalData(editedGoal)) return;
    
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
        setEditedGoal(updatedGoal);
      } else {
        setSaveError('Unable to save changes. Please try again.');
      }
    } catch {
      setSaveError('An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      const success = await deleteGoal(editedGoal.id);
      if (success) onClose();
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedGoal(goal);
    setSaveError(null);
  };

  return (
    <div className="space-y-6">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Status & Metadata */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center space-x-2 tracking-wide uppercase">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Status</span>
            </h3>
            {isEditing ? (
              <select
                value={editedGoal.status}
                onChange={(e) => setEditedGoal(prev => ({ ...prev, status: e.target.value as Goal['status'] }))}
                className="w-full p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white/90 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all text-sm"
              >
                <option value="open" className="bg-slate-800">Open</option>
                <option value="in_progress" className="bg-slate-800">In Progress</option>
                <option value="done" className="bg-slate-800">Completed</option>
                <option value="undecided" className="bg-slate-800">Under Review</option>
                <option value="rejected" className="bg-slate-800">Archived</option>
              </select>
            ) : (
              <div className={`bg-gradient-to-r ${statusConfig.gradient} backdrop-blur-xl border ${statusConfig.borderColor} rounded-lg p-3.5 ${statusConfig.glow} shadow-lg`}>
                <div className="flex items-center space-x-3">
                  <StatusIcon className={`w-5 h-5 ${statusConfig.textColor}`} />
                  <span className={`font-medium text-sm ${statusConfig.textColor}`}>
                    {statusConfig.text}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center space-x-2 tracking-wide uppercase">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Information</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center space-x-2 text-white/60">
                  <Hash className="w-4 h-4" />
                  <span className="text-sm">Order</span>
                </div>
                <span className="text-white/90 font-medium text-sm">#{editedGoal.order}</span>
              </div>
              {editedGoal.created_at && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center space-x-2 text-white/60">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Created</span>
                  </div>
                  <span className="text-white/90 font-medium text-sm">
                    {formatDate(editedGoal.created_at)}
                  </span>
                </div>
              )}
              {editedGoal.updated_at && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center space-x-2 text-white/60">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Updated</span>
                  </div>
                  <span className="text-white/90 font-medium text-sm">
                    {formatDate(editedGoal.updated_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Title & Description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center space-x-2 tracking-wide uppercase">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Title</span>
            </h3>
            {isEditing ? (
              <input
                type="text"
                value={editedGoal.title}
                onChange={(e) => setEditedGoal(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all text-base"
                placeholder="Enter goal title..."
              />
            ) : (
              <h4 className="text-lg font-medium text-white/90 leading-relaxed">
                {editedGoal.title}
              </h4>
            )}
          </div>

          {/* Description */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center space-x-2 tracking-wide uppercase">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span>Description</span>
            </h3>
            {isEditing ? (
              <textarea
                value={editedGoal.description || ''}
                onChange={(e) => setEditedGoal(prev => ({ ...prev, description: e.target.value }))}
                rows={10}
                className="w-full p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all resize-none text-sm"
                placeholder="Describe your goal in detail..."
              />
            ) : (
              <div className="min-h-[240px] p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-white/80 leading-relaxed whitespace-pre-wrap text-sm">
                  {editedGoal.description || (
                    <span className="text-white/40 italic">No description provided</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {saveError && (
        <div className="p-4 bg-red-500/20 backdrop-blur-xl border border-red-400/30 rounded-lg">
          <p className="text-red-300 text-sm">{saveError}</p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-white/10">
        <div className="flex space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving || !validateGoalData(editedGoal)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 backdrop-blur-xl border border-blue-400/30 rounded-lg text-blue-300 font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center space-x-2 shadow-lg shadow-blue-500/10"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-lg text-white/70 hover:text-white/90 font-medium transition-all duration-300 hover:scale-105"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500/20 to-green-600/20 hover:from-emerald-500/30 hover:to-green-600/30 backdrop-blur-xl border border-emerald-400/30 rounded-lg text-emerald-300 font-medium transition-all duration-300 hover:scale-105 flex items-center space-x-2 shadow-lg shadow-emerald-500/10"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Goal</span>
            </button>
          )}
        </div>
        
        <button
          onClick={handleDelete}
          className="px-6 py-2.5 bg-gradient-to-r from-red-500/20 to-rose-600/20 hover:from-red-500/30 hover:to-rose-600/30 backdrop-blur-xl border border-red-400/30 rounded-lg text-red-300 font-medium transition-all duration-300 hover:scale-105 flex items-center space-x-2 shadow-lg shadow-red-500/10"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}
