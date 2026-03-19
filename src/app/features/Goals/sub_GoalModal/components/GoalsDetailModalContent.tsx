'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Save, Edit3, Trash2, Loader2 } from 'lucide-react';
import { Goal } from '../../../../../types';
import { useGoals } from '../../../../../hooks/useGoals';
import { validateGoalData } from '../lib';
import GoalLifecyclePanel from '../../components/GoalLifecyclePanel';
import type { LifecycleData } from '../../components/GoalLifecyclePanel';

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [lifecycleData, setLifecycleData] = useState<LifecycleData | null>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const { deleteGoal } = useGoals(projectId);

  const fetchLifecycleData = useCallback(async (signal?: AbortSignal) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/goals/lifecycle?goalId=${goal.id}`, { signal });
      if (res.ok) {
        const json = await res.json();
        setLifecycleData(json.data);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Lifecycle is supplementary — silent fail
    } finally {
      setLifecycleLoading(false);
    }
  }, [goal.id, projectId]);

  // Fetch lifecycle data when goal changes
  useEffect(() => {
    if (!projectId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLifecycleLoading(true);
    fetchLifecycleData(controller.signal);
    return () => controller.abort();
  }, [fetchLifecycleData, projectId]);

  const handleLifecycleRefresh = useCallback(() => {
    fetchLifecycleData();
  }, [fetchLifecycleData]);

  // Update editedGoal when goal prop changes
  useEffect(() => {
    setEditedGoal(goal);
    setIsEditing(false);
    setIsDeleteConfirming(false);
    setSaveError(null);
  }, [goal]);

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

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteGoal(editedGoal.id);
      if (success) onClose();
      setIsDeleteConfirming(false);
    } finally {
      setIsDeleting(false);
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
        {/* Right Column - Title & Description */}
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center space-x-2 tracking-wide uppercase">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span>Description</span>
            </h3>
            {isEditing ? (
              <textarea
                value={editedGoal.description || ''}
                onChange={(e) => setEditedGoal(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all resize-none text-sm"
                placeholder="Describe your goal in detail..."
              />
            ) : (
              <div className="min-h-[120px] p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-white/80 leading-relaxed whitespace-pre-wrap text-sm">
                  {editedGoal.description || (
                    <span className="text-white/40 italic">No description provided</span>
                  )}
                </p>
              </div>
            )}
          </div>
      </div>

      {/* Lifecycle Engine Panel */}
      {projectId && lifecycleLoading && (
        <div className="flex items-center gap-2 py-4 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading lifecycle data...</span>
        </div>
      )}
      {projectId && lifecycleData && (
        <GoalLifecyclePanel data={lifecycleData} projectId={projectId} onRefresh={handleLifecycleRefresh} />
      )}

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
        
        <AnimatePresence mode="wait">
          {isDeleteConfirming ? (
            <motion.div
              key="delete-confirm"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs text-red-200/90">Are you sure?</span>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-lg text-red-300 text-sm font-medium transition-all duration-300 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setIsDeleteConfirming(false)}
                disabled={isDeleting}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 hover:text-white/90 text-sm font-medium transition-all duration-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="delete-action"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              onClick={() => setIsDeleteConfirming(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-red-500/20 to-rose-600/20 hover:from-red-500/30 hover:to-rose-600/30 backdrop-blur-xl border border-red-400/30 rounded-lg text-red-300 font-medium transition-all duration-300 hover:scale-105 flex items-center space-x-2 shadow-lg shadow-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
