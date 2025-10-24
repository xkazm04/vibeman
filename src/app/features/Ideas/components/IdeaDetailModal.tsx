import React from 'react';
import { motion } from 'framer-motion';
import { DbIdea } from '@/app/db';
import { X, Check, XCircle, Star, Trash2 } from 'lucide-react';
import { generateRequirementForGoal } from '@/app/Claude/lib/requirementApi';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

interface IdeaDetailModalProps {
  idea: DbIdea;
  onClose: () => void;
  onUpdate: (updatedIdea: DbIdea) => void;
  onDelete: (ideaId: string) => void;
}

export default function IdeaDetailModal({ idea, onClose, onUpdate, onDelete }: IdeaDetailModalProps) {
  const [userFeedback, setUserFeedback] = React.useState(idea.user_feedback || '');
  const [userPattern, setUserPattern] = React.useState(idea.user_pattern === 1);
  const [saving, setSaving] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const { projects, initializeProjects } = useProjectConfigStore();

  // Ensure projects are loaded
  React.useEffect(() => {
    if (projects.length === 0) {
      initializeProjects();
    }
  }, [projects.length, initializeProjects]);

  const handleAccept = async () => {
    try {
      // 1. Create a goal from this idea
      const goalResponse = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: idea.project_id,
          contextId: idea.context_id,
          title: idea.title,
          description: idea.description,
          status: 'open',
        }),
      });

      if (!goalResponse.ok) {
        console.error('Failed to create goal from idea');
      } else {
        const goalData = await goalResponse.json();
        console.log('Created goal from idea:', goalData.goal);

        // 2. Generate Claude requirement for this goal (async, non-blocking)
        const project = projects.find(p => p.id === idea.project_id);
        if (project && goalData.goal) {
          // Fire and forget - start requirement generation in background
          generateRequirementForGoal(project.path, idea.project_id, goalData.goal.id)
            .then(() => {
              console.log('Requirement generation started for goal:', goalData.goal.id);
            })
            .catch((error) => {
              console.error('Failed to start requirement generation:', error);
            });
        }
      }
    } catch (error) {
      console.error('Error creating goal from idea:', error);
    }

    // 3. Update idea status to accepted (this happens regardless of goal creation)
    await updateIdea({ status: 'accepted' });
  };

  const handleReject = async () => {
    await updateIdea({ status: 'rejected' });
  };

  const handleSaveFeedback = async () => {
    await updateIdea({
      user_feedback: userFeedback,
      user_pattern: userPattern
    });
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/ideas?id=${encodeURIComponent(idea.id)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onDelete(idea.id);
      }
    } catch (error) {
      console.error('Error deleting idea:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateIdea = async (updates: Partial<DbIdea>) => {
    try {
      setSaving(true);
      const response = await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: idea.id,
          ...updates
        })
      });

      if (response.ok) {
        const data = await response.json();
        onUpdate(data.idea);
      }
    } catch (error) {
      console.error('Error updating idea:', error);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      functionality: '⚡',
      performance: '📊',
      maintenance: '🔧',
      ui: '🎨',
      code_quality: '💻',
      user_benefit: '❤️',
    };
    return emojis[category] || '💡';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'implemented': return 'text-amber-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/40 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-gray-700/40">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-3xl">{getCategoryEmoji(idea.category)}</span>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">
                    {idea.title}
                  </h2>
                  <p className={`text-sm font-semibold uppercase mt-1 ${getStatusColor(idea.status)}`}>
                    {idea.status}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/40 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Meta info */}
          <div className="flex items-center space-x-4 mt-4 text-xs text-gray-400">
            <span className="font-mono">{new Date(idea.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span className="px-2 py-1 bg-gray-700/40 rounded">
              {idea.category.replace('_', ' ')}
            </span>
            {idea.context_id && (
              <>
                <span>•</span>
                <span>Context: {idea.context_id}</span>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {idea.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                Description
              </h3>
              <p className="text-white leading-relaxed">
                {idea.description}
              </p>
            </div>
          )}

          {/* Reasoning */}
          {idea.reasoning && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                LLM Reasoning
              </h3>
              <p className="text-gray-300 leading-relaxed italic">
                {idea.reasoning}
              </p>
            </div>
          )}

          {/* User Feedback Section */}
          <div className="pt-4 border-t border-gray-700/40">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
              Your Feedback
            </h3>

            <textarea
              value={userFeedback}
              onChange={(e) => setUserFeedback(e.target.value)}
              placeholder="Add your thoughts, comments, or rationale..."
              className="w-full bg-gray-800/60 border border-gray-700/40 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/40 resize-none"
              rows={3}
            />

            {/* User Pattern Checkbox */}
            <motion.label
              className="flex items-center space-x-3 mt-4 cursor-pointer group"
              whileHover={{ x: 2 }}
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={userPattern}
                  onChange={(e) => setUserPattern(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 border-2 rounded transition-all duration-300 ${
                  userPattern
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-transparent border-gray-600 group-hover:border-blue-500/40'
                }`}>
                  {userPattern && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Star className="w-3 h-3 text-white m-auto" />
                    </motion.div>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                Mark as valuable pattern (apply across projects)
              </span>
            </motion.label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700/40">
            <div className="flex items-center space-x-3">
              {/* Delete Button */}
              {!showDeleteConfirm ? (
                <motion.button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 font-semibold transition-all disabled:opacity-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </motion.button>
              ) : (
                <div className="flex items-center space-x-2">
                  <motion.button
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-500/30 hover:bg-red-500/40 border border-red-500/60 rounded-lg text-red-300 font-semibold transition-all disabled:opacity-50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </motion.button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {idea.status !== 'accepted' && (
                <motion.button
                  onClick={handleAccept}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-300 font-semibold transition-all disabled:opacity-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Check className="w-4 h-4" />
                  <span>Accept</span>
                </motion.button>
              )}

              {idea.status !== 'rejected' && (
                <motion.button
                  onClick={handleReject}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-300 font-semibold transition-all disabled:opacity-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </motion.button>
              )}
            </div>

            <motion.button
              onClick={handleSaveFeedback}
              disabled={saving}
              className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-300 font-semibold transition-all disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {saving ? 'Saving...' : 'Save Feedback'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
