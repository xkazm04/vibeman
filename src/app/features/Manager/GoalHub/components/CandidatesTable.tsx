/**
 * CandidatesTable Component
 * Compact table showing goal candidates from automation
 * Inspired by BufferColumn pattern for space-efficient display
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface GoalCandidate {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  reasoning: string | null;
  priority_score: number;
  source: string;
  user_action: 'pending' | 'accepted' | 'rejected' | 'tweaked' | null;
  created_at: string;
}

interface CandidatesTableProps {
  projectId: string;
  onCandidateAccepted?: () => void;
}

export default function CandidatesTable({ projectId, onCandidateAccepted }: CandidatesTableProps) {
  const [candidates, setCandidates] = useState<GoalCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/goal-candidates?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleAccept = async (candidate: GoalCandidate) => {
    setProcessingId(candidate.id);
    try {
      // Create goal from candidate
      const goalResponse = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: candidate.project_id,
          title: candidate.title,
          description: candidate.description || candidate.reasoning,
          status: 'open',
        }),
      });

      if (goalResponse.ok) {
        // Update candidate status
        await fetch(`/api/goal-candidates/${candidate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_action: 'accepted' }),
        });

        // Remove from local state
        setCandidates(prev => prev.filter(c => c.id !== candidate.id));
        onCandidateAccepted?.();
      }
    } catch (error) {
      console.error('Failed to accept candidate:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (candidate: GoalCandidate) => {
    setProcessingId(candidate.id);
    try {
      await fetch(`/api/goal-candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_action: 'rejected' }),
      });

      setCandidates(prev => prev.filter(c => c.id !== candidate.id));
    } catch (error) {
      console.error('Failed to reject candidate:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (candidate: GoalCandidate) => {
    setProcessingId(candidate.id);
    try {
      await fetch(`/api/goal-candidates/${candidate.id}`, {
        method: 'DELETE',
      });

      setCandidates(prev => prev.filter(c => c.id !== candidate.id));
    } catch (error) {
      console.error('Failed to delete candidate:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 90) return 'text-red-400 bg-red-500/20';
    if (score >= 70) return 'text-orange-400 bg-orange-500/20';
    if (score >= 50) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-gray-400 bg-gray-500/20';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'automation':
      case 'pattern_detection':
        return <Sparkles className="w-3 h-3 text-purple-400" />;
      default:
        return <Sparkles className="w-3 h-3 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
        <span className="ml-2 text-sm text-gray-400">Loading candidates...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/40 border border-gray-700/40 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-gray-800/60 border-b border-gray-700/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-300">Goal Candidates</h3>
          <span className="text-xs text-gray-500 font-mono">({candidates.length})</span>
        </div>
        <button
          onClick={fetchCandidates}
          className="p-1 hover:bg-gray-700/50 rounded transition-colors"
          title="Refresh candidates"
        >
          <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Candidates List */}
      <div className="max-h-[300px] overflow-y-auto">
        {candidates.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
            No pending candidates
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {candidates.map((candidate) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-gray-700/30 last:border-0"
              >
                {/* Compact Row */}
                <div
                  className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-800/40 cursor-pointer transition-colors ${
                    processingId === candidate.id ? 'opacity-50' : ''
                  }`}
                  onClick={() => setExpandedId(expandedId === candidate.id ? null : candidate.id)}
                >
                  {/* Source Icon */}
                  {getSourceIcon(candidate.source)}

                  {/* Title */}
                  <span className="flex-1 text-sm text-gray-200 truncate">
                    {candidate.title}
                  </span>

                  {/* Priority Badge */}
                  <span className={`px-1.5 py-0.5 text-xs font-mono rounded ${getPriorityColor(candidate.priority_score)}`}>
                    {candidate.priority_score}
                  </span>

                  {/* Expand Icon */}
                  {expandedId === candidate.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleAccept(candidate)}
                      disabled={processingId === candidate.id}
                      className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
                      title="Accept and create goal"
                    >
                      {processingId === candidate.id ? (
                        <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(candidate)}
                      disabled={processingId === candidate.id}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors"
                      title="Reject candidate"
                    >
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedId === candidate.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-3 pb-3 bg-gray-800/20"
                    >
                      {candidate.description && (
                        <p className="text-xs text-gray-400 mb-2">{candidate.description}</p>
                      )}
                      {candidate.reasoning && (
                        <p className="text-xs text-gray-500 italic mb-2">{candidate.reasoning}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          {new Date(candidate.created_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleDelete(candidate)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
