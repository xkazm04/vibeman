/**
 * GoalCandidatesModal Component
 * Review and accept/reject LLM-generated goal candidates
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Trash2,
  Sparkles,
  Target,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface GoalCandidate {
  title: string;
  description: string;
  reasoning: string;
  priorityScore: number;
  suggestedContext?: string;
  category: string;
  source: string;
  relatedItems?: string[];
}

interface ProjectCandidates {
  projectId: string;
  projectName: string;
  candidates: GoalCandidate[];
}

interface GoalCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectCandidates: ProjectCandidates[];
  onAccept: (projectId: string, candidates: GoalCandidate[]) => Promise<void>;
}

export default function GoalCandidatesModal({
  isOpen,
  onClose,
  projectCandidates,
  onAccept,
}: GoalCandidatesModalProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<Map<string, Set<number>>>(
    new Map()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);

  // Initialize selection when projectCandidates changes - all selected by default
  useEffect(() => {
    if (projectCandidates.length > 0) {
      const initial = new Map<string, Set<number>>();
      projectCandidates.forEach(pc => {
        initial.set(pc.projectId, new Set(pc.candidates.map((_, i) => i)));
      });
      setSelectedCandidates(initial);
      setSuccessCount(0);
      setError(null);
    }
  }, [projectCandidates]);

  const toggleCandidate = (projectId: string, index: number) => {
    setSelectedCandidates(prev => {
      const newMap = new Map(prev);
      const projectSet = new Set(newMap.get(projectId) || []);

      if (projectSet.has(index)) {
        projectSet.delete(index);
      } else {
        projectSet.add(index);
      }

      newMap.set(projectId, projectSet);
      return newMap;
    });
  };

  const selectAll = (projectId: string, candidates: GoalCandidate[]) => {
    setSelectedCandidates(prev => {
      const newMap = new Map(prev);
      newMap.set(projectId, new Set(candidates.map((_, i) => i)));
      return newMap;
    });
  };

  const selectNone = (projectId: string) => {
    setSelectedCandidates(prev => {
      const newMap = new Map(prev);
      newMap.set(projectId, new Set());
      return newMap;
    });
  };

  const handleAcceptSelected = async () => {
    setIsSubmitting(true);
    setError(null);
    let totalCreated = 0;

    try {
      for (const pc of projectCandidates) {
        const selectedIndices = selectedCandidates.get(pc.projectId) || new Set();
        if (selectedIndices.size === 0) continue;

        const candidatesToAccept = pc.candidates.filter((_, i) => selectedIndices.has(i));
        await onAccept(pc.projectId, candidatesToAccept);
        totalCreated += candidatesToAccept.length;
      }

      setSuccessCount(totalCreated);

      // Close after a short delay to show success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goals');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCandidates = projectCandidates.reduce((sum, pc) => sum + pc.candidates.length, 0);
  const totalSelected = Array.from(selectedCandidates.values()).reduce(
    (sum, set) => sum + set.size,
    0
  );

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
    if (score >= 60) return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      feature: 'text-blue-400 bg-blue-500/20',
      refactor: 'text-purple-400 bg-purple-500/20',
      testing: 'text-green-400 bg-green-500/20',
      docs: 'text-amber-400 bg-amber-500/20',
      performance: 'text-orange-400 bg-orange-500/20',
      security: 'text-red-400 bg-red-500/20',
    };
    return colors[category] || 'text-gray-400 bg-gray-500/20';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-gray-900 rounded-2xl border border-gray-700/50 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Review Goal Candidates</h2>
                <p className="text-sm text-gray-400">
                  {totalCandidates} candidates generated across {projectCandidates.length} project(s)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {projectCandidates.map(pc => (
              <div key={pc.projectId} className="space-y-3">
                {/* Project header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <h3 className="font-medium text-white">{pc.projectName}</h3>
                    <span className="text-xs text-gray-500">
                      ({selectedCandidates.get(pc.projectId)?.size || 0}/{pc.candidates.length} selected)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectAll(pc.projectId, pc.candidates)}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Select all
                    </button>
                    <span className="text-gray-600">|</span>
                    <button
                      onClick={() => selectNone(pc.projectId)}
                      className="text-xs text-gray-400 hover:text-gray-300"
                    >
                      Select none
                    </button>
                  </div>
                </div>

                {/* Candidates list */}
                <div className="space-y-2">
                  {pc.candidates.map((candidate, index) => {
                    const isSelected = selectedCandidates.get(pc.projectId)?.has(index) || false;

                    return (
                      <div
                        key={index}
                        onClick={() => toggleCandidate(pc.projectId, index)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-500/10 border-purple-500/40'
                            : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Selection indicator */}
                          <div
                            className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-purple-500 border-purple-500'
                                : 'border-gray-600 hover:border-gray-500'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-medium text-white">{candidate.title}</h4>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(
                                  candidate.category
                                )}`}
                              >
                                {candidate.category}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(
                                  candidate.priorityScore
                                )}`}
                              >
                                {candidate.priorityScore}%
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 mb-2">{candidate.description}</p>
                            <p className="text-xs text-gray-500 italic">{candidate.reasoning}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700/50 bg-gray-800/50">
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {successCount > 0 && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Created {successCount} goal(s) successfully!</span>
              </div>
            )}

            {!error && !successCount && (
              <div className="text-sm text-gray-400">
                {totalSelected} of {totalCandidates} candidates selected
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptSelected}
                disabled={isSubmitting || totalSelected === 0}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Accept {totalSelected} Goal{totalSelected !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
