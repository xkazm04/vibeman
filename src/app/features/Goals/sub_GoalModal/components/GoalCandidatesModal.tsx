'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, AlertCircle, Zap } from 'lucide-react';
import { UniversalModal } from '@/components/UniversalModal';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import CandidateCard from './CandidateCard';

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
  const generatingRef = useRef(false);

  const loadCandidates = async (signal?: AbortSignal) => {
    if (!activeProject?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/goals/generate-candidates?projectId=${activeProject.id}`,
        { signal }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load candidates');
      }

      const data = await response.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  // Load candidates when modal opens
  useEffect(() => {
    if (!isOpen || !activeProject?.id) return;

    const controller = new AbortController();
    loadCandidates(controller.signal);
    return () => controller.abort();
  }, [isOpen, activeProject?.id]);

  const handleGenerate = async () => {
    if (!activeProject?.id || !activeProject?.path || generatingRef.current) return;

    generatingRef.current = true;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate candidates');
    } finally {
      setGenerating(false);
      generatingRef.current = false;
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
              data-testid="dismiss-error-btn"
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
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              index={index}
              isEditing={editingId === candidate.id}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editDescription={editDescription}
              setEditDescription={setEditDescription}
              isProcessing={processingIds.has(candidate.id)}
              onAccept={() => handleAccept(candidate.id)}
              onReject={() => handleReject(candidate.id)}
              onStartEdit={() => handleStartEdit(candidate)}
              onSaveEdit={() => handleSaveEdit(candidate.id)}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
        </AnimatePresence>
      </div>
    </UniversalModal>
  );
}
