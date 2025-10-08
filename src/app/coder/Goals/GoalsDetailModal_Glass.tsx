'use client';
import React, { useState, useEffect } from 'react';
import { Target, CheckCircle, Clock, Circle, X, Edit3, Save, Trash2, Calendar, Hash } from 'lucide-react';
import { Goal } from '../../../types';
import { useGoals } from '../../../hooks/useGoals';

interface GoalsDetailModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (goalId: string, updates: Partial<Goal>) => Promise<Goal | null>;
  projectId: string | null;
}

export default function GoalsDetailModalGlass({ 
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
  const [isVisible, setIsVisible] = useState(false);
  
  const { deleteGoal } = useGoals(projectId);

  useEffect(() => {
    if (isOpen && goal) {
      setEditedGoal(goal);
      setIsEditing(false);
      setSaveError(null);
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, goal]);

  if (!isOpen || !goal || !editedGoal) return null;

  const getStatusConfig = (status: Goal['status']) => {
    const configs = {
      'done': { 
        text: 'Completed', 
        gradient: 'from-emerald-400/20 to-green-500/20',
        border: 'border-emerald-400/30',
        textColor: 'text-emerald-300',
        icon: CheckCircle,
        glow: 'shadow-emerald-500/20'
      },
      'in_progress': { 
        text: 'In Progress', 
        gradient: 'from-amber-400/20 to-yellow-500/20',
        border: 'border-amber-400/30',
        textColor: 'text-amber-300',
        icon: Clock,
        glow: 'shadow-amber-500/20'
      },
      'open': { 
        text: 'Open', 
        gradient: 'from-blue-400/20 to-cyan-500/20',
        border: 'border-blue-400/30',
        textColor: 'text-blue-300',
        icon: Circle,
        glow: 'shadow-blue-500/20'
      },
      'undecided': { 
        text: 'Under Review', 
        gradient: 'from-blue-400/20 to-violet-500/20',
        border: 'border-blue-400/30',
        textColor: 'text-blue-300',
        icon: Circle,
        glow: 'shadow-blue-500/20'
      },
      'rejected': { 
        text: 'Archived', 
        gradient: 'from-red-400/20 to-rose-500/20',
        border: 'border-red-400/30',
        textColor: 'text-red-300',
        icon: Circle,
        glow: 'shadow-red-500/20'
      }
    };
    return configs[status] || configs.open;
  };

  const statusConfig = getStatusConfig(editedGoal.status);
  const StatusIcon = statusConfig.icon;

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
        setEditedGoal(updatedGoal);
      } else {
        setSaveError('Unable to save changes. Please try again.');
      }
    } catch (error) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl transition-opacity duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-6xl transform transition-all duration-500 ${
        isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8'
      }`}>
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-white/10 via-white/5 to-white/10 backdrop-blur-xl border-b border-white/10 p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center shadow-lg shadow-blue-500/10">
                    <Target className="w-8 h-8 text-blue-300" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl blur opacity-50"></div>
                </div>
                <div>
                  <h1 className="text-3xl font-light text-white/90 tracking-wide">
                    {isEditing ? 'Edit Goal' : 'Goal Details'}
                  </h1>
                  <p className="text-white/60 font-light mt-1">
                    {isEditing ? 'Refine your objective' : 'Review and manage your objective'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl border border-white/20 flex items-center justify-center transition-all duration-300 hover:scale-105 group"
              >
                <X className="w-5 h-5 text-white/70 group-hover:text-white/90 transition-colors" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Status & Metadata */}
              <div className="space-y-6">
                {/* Status */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-lg">
                  <h3 className="text-lg font-medium text-white/90 mb-4 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Status</span>
                  </h3>
                  {isEditing ? (
                    <select
                      value={editedGoal.status}
                      onChange={(e) => setEditedGoal(prev => prev ? { ...prev, status: e.target.value as Goal['status'] } : null)}
                      className="w-full p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white/90 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
                    >
                      <option value="open" className="bg-slate-800">Open</option>
                      <option value="in_progress" className="bg-slate-800">In Progress</option>
                      <option value="done" className="bg-slate-800">Completed</option>
                      <option value="undecided" className="bg-slate-800">Under Review</option>
                      <option value="rejected" className="bg-slate-800">Archived</option>
                    </select>
                  ) : (
                    <div className={`bg-gradient-to-r ${statusConfig.gradient} backdrop-blur-xl border ${statusConfig.border} rounded-xl p-4 ${statusConfig.glow} shadow-lg`}>
                      <div className="flex items-center space-x-3">
                        <StatusIcon className={`w-5 h-5 ${statusConfig.textColor}`} />
                        <span className={`font-medium ${statusConfig.textColor}`}>
                          {statusConfig.text}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-lg">
                  <h3 className="text-lg font-medium text-white/90 mb-4 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Information</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center space-x-2 text-white/60">
                        <Hash className="w-4 h-4" />
                        <span className="text-sm">Order</span>
                      </div>
                      <span className="text-white/90 font-medium">#{editedGoal.order}</span>
                    </div>
                    {editedGoal.created_at && (
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center space-x-2 text-white/60">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">Created</span>
                        </div>
                        <span className="text-white/90 font-medium text-sm">
                          {new Date(editedGoal.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
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
                          {new Date(editedGoal.updated_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Title & Description */}
              <div className="lg:col-span-2 space-y-6">
                {/* Title */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-lg">
                  <h3 className="text-lg font-medium text-white/90 mb-4 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Title</span>
                  </h3>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedGoal.title}
                      onChange={(e) => setEditedGoal(prev => prev ? { ...prev, title: e.target.value } : null)}
                      className="w-full p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all text-lg"
                      placeholder="Enter goal title..."
                    />
                  ) : (
                    <h4 className="text-xl font-medium text-white/90 leading-relaxed">
                      {editedGoal.title}
                    </h4>
                  )}
                </div>

                {/* Description */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-lg">
                  <h3 className="text-lg font-medium text-white/90 mb-4 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                    <span>Description</span>
                  </h3>
                  {isEditing ? (
                    <textarea
                      value={editedGoal.description || ''}
                      onChange={(e) => setEditedGoal(prev => prev ? { ...prev, description: e.target.value } : null)}
                      rows={8}
                      className="w-full p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all resize-none"
                      placeholder="Describe your goal in detail..."
                    />
                  ) : (
                    <div className="min-h-[200px] p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
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
              <div className="mt-6 p-4 bg-red-500/20 backdrop-blur-xl border border-red-400/30 rounded-xl">
                <p className="text-red-300 text-sm">{saveError}</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gradient-to-r from-white/5 via-white/10 to-white/5 backdrop-blur-xl border-t border-white/10 p-6">
            <div className="flex justify-between items-center">
              <div className="flex space-x-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 backdrop-blur-xl border border-blue-400/30 rounded-xl text-blue-300 font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center space-x-2 shadow-lg shadow-blue-500/10"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedGoal(goal);
                        setSaveError(null);
                      }}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-xl text-white/70 hover:text-white/90 font-medium transition-all duration-300 hover:scale-105"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500/20 to-green-600/20 hover:from-emerald-500/30 hover:to-green-600/30 backdrop-blur-xl border border-emerald-400/30 rounded-xl text-emerald-300 font-medium transition-all duration-300 hover:scale-105 flex items-center space-x-2 shadow-lg shadow-emerald-500/10"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Goal</span>
                  </button>
                )}
              </div>
              
              <button
                onClick={handleDelete}
                className="px-6 py-3 bg-gradient-to-r from-red-500/20 to-rose-600/20 hover:from-red-500/30 hover:to-rose-600/30 backdrop-blur-xl border border-red-400/30 rounded-xl text-red-300 font-medium transition-all duration-300 hover:scale-105 flex items-center space-x-2 shadow-lg shadow-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}