'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X, Edit, Loader2, ChevronRight, AlertCircle, Zap } from 'lucide-react';
import { UniversalModal } from '@/components/UniversalModal';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

interface GoalCandidate {
  id: string;
  project_id: string;
  context_id: string | null;
  title: string;
  description: string | null;
  reasoning: string | null;
  priority_score: number;
  source: string;
  source_metadata: string | null;
  suggested_status: string;
  user_action: string | null;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
}

interface GoalCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalCreated?: () => void;
}

export default function GoalCandidatesModal({ isOpen, onClose, onGoalCreated }: GoalCandidatesModalProps) {
  const { activeProject } = useActiveProjectStore();
  const [candidates, setCandidates] = useState<GoalCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Load candidates when modal opens
  useEffect(() => {
    if (isOpen && activeProject?.id) {
      loadCandidates();
    }
  }, [isOpen, activeProject?.id]);

  const loadCandidates = async () => {
    if (!activeProject?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/goals/generate-candidates?projectId=${activeProject.id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load candidates');
      }

      const data = await response.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!activeProject?.id || !activeProject?.path) return;

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/goals/generate-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          projectPath: activeProject.path,
          scanDepth: 'standard',
          includeSources: ['repository', 'tech_debt', 'ideas', 'todos'],
          maxCandidates: 10
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate candidates');
      }

      // Reload candidates
      await loadCandidates();
    } catch (err) {      setError(err instanceof Error ? err.message : 'Failed to generate candidates');
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = async (candidateId: string) => {
    setProcessingIds(prev => new Set(prev).add(candidateId));

    try {
      const response = await fetch('/api/goals/generate-candidates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          action: 'accept'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept candidate');
      }

      // Remove from list and notify parent
      setCandidates(prev => prev.filter(c => c.id !== candidateId));

      if (onGoalCreated) {
        onGoalCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept candidate');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  };

  const handleReject = async (candidateId: string) => {
    setProcessingIds(prev => new Set(prev).add(candidateId));

    try {
      const response = await fetch('/api/goals/generate-candidates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          action: 'reject'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject candidate');
      }

      // Remove from list
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject candidate');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  };

  const handleStartEdit = (candidate: GoalCandidate) => {
    setEditingId(candidate.id);
    setEditTitle(candidate.title);
    setEditDescription(candidate.description || '');
  };

  const handleSaveEdit = async (candidateId: string) => {
    setProcessingIds(prev => new Set(prev).add(candidateId));

    try {
      const response = await fetch('/api/goals/generate-candidates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          action: 'accept',
          updates: {
            title: editTitle,
            description: editDescription
          }
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save changes');
      }

      // Remove from list and notify parent
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      setEditingId(null);

      if (onGoalCreated) {
        onGoalCreated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 90) return 'text-red-400 border-red-500/50 bg-red-500/10';
    if (score >= 70) return 'text-orange-400 border-orange-500/50 bg-orange-500/10';
    if (score >= 50) return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
    return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 90) return 'Critical';
    if (score >= 70) return 'High';
    if (score >= 50) return 'Medium';
    return 'Low';
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Goal Suggestions"
      subtitle="Review and accept LLM-generated goal candidates"
      icon={Sparkles}
      iconBgColor="from-purple-800/60 to-pink-900/60"
      iconColor="text-purple-300"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {candidates.length > 0 ? (
              <span>{candidates.length} pending suggestion{candidates.length !== 1 ? 's' : ''}</span>
            ) : (
              <span>No pending suggestions</span>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            disabled={generating}
            data-testid="generate-goals-btn"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-700/50 to-pink-700/50
                     hover:from-purple-600/60 hover:to-pink-600/60 border border-purple-600/30
                     rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 shadow-lg shadow-purple-500/20"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Generate Goals
              </>
            )}
          </motion.button>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        )}

        {/* Candidates List */}
        {!loading && candidates.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No goal suggestions yet</p>
            <p className="text-sm mt-2">Click &quot;Generate Goals&quot; to scan your project</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {!loading && candidates.map((candidate, index) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40
                       border border-slate-700/50 rounded-lg p-5 space-y-4"
            >
              {/* Priority Badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {editingId === candidate.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg
                               text-white focus:outline-none focus:border-purple-500/50"
                      autoFocus
                    />
                  ) : (
                    <h3 className="text-lg font-semibold text-white truncate">{candidate.title}</h3>
                  )}
                </div>

                <div className={`px-3 py-1 rounded-md border text-xs font-medium whitespace-nowrap ${getPriorityColor(candidate.priority_score)}`}>
                  {getPriorityLabel(candidate.priority_score)} ({candidate.priority_score})
                </div>
              </div>

              {/* Description */}
              {editingId === candidate.id ? (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg
                           text-white focus:outline-none focus:border-purple-500/50 resize-none"
                />
              ) : (
                <p className="text-sm text-slate-300 leading-relaxed">
                  {candidate.description || 'No description'}
                </p>
              )}

              {/* Reasoning (collapsible) */}
              {candidate.reasoning && editingId !== candidate.id && (
                <details className="group">
                  <summary className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer
                                    hover:text-slate-300 transition-colors">
                    <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                    AI Reasoning
                  </summary>
                  <p className="mt-2 ml-6 text-sm text-slate-400 leading-relaxed">
                    {candidate.reasoning}
                  </p>
                </details>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-700/30">
                {editingId === candidate.id ? (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSaveEdit(candidate.id)}
                      disabled={processingIds.has(candidate.id)}
                      data-testid={`save-candidate-${candidate.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600/30 hover:bg-green-600/50
                               border border-green-500/50 rounded-md text-green-300 text-sm font-medium
                               transition-all duration-200 disabled:opacity-50"
                    >
                      {processingIds.has(candidate.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Save & Accept
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 text-slate-400 hover:text-slate-300 text-sm transition-colors"
                    >
                      Cancel
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAccept(candidate.id)}
                      disabled={processingIds.has(candidate.id)}
                      data-testid={`accept-candidate-${candidate.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600/30 hover:bg-green-600/50
                               border border-green-500/50 rounded-md text-green-300 text-sm font-medium
                               transition-all duration-200 disabled:opacity-50"
                    >
                      {processingIds.has(candidate.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Accept
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStartEdit(candidate)}
                      disabled={processingIds.has(candidate.id)}
                      data-testid={`edit-candidate-${candidate.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600/30 hover:bg-blue-600/50
                               border border-blue-500/50 rounded-md text-blue-300 text-sm font-medium
                               transition-all duration-200 disabled:opacity-50"
                    >
                      <Edit className="w-4 h-4" />
                      Tweak
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleReject(candidate.id)}
                      disabled={processingIds.has(candidate.id)}
                      data-testid={`reject-candidate-${candidate.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600/30 hover:bg-red-600/50
                               border border-red-500/50 rounded-md text-red-300 text-sm font-medium
                               transition-all duration-200 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </UniversalModal>
  );
}
