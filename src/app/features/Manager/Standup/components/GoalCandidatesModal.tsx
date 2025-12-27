/**
 * GoalCandidatesModal Component
 * Review and accept/reject LLM-generated goal candidates
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Sparkles,
  Target,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { ProjectCandidates, GoalCandidate } from '../types';
import { useCandidateSelection } from '../hooks';
import { CandidateCard } from './CandidateCard';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);

  const {
    totalSelected,
    toggleCandidate,
    selectAll,
    selectNone,
    isSelected,
    getSelectedCount,
    getSelectedCandidates,
  } = useCandidateSelection(projectCandidates);

  const totalCandidates = projectCandidates.reduce(
    (sum, pc) => sum + pc.candidates.length,
    0
  );

  const handleAcceptSelected = async () => {
    setIsSubmitting(true);
    setError(null);
    let totalCreated = 0;

    try {
      for (const pc of projectCandidates) {
        const candidatesToAccept = getSelectedCandidates(pc.projectId, pc.candidates);
        if (candidatesToAccept.length === 0) continue;

        await onAccept(pc.projectId, candidatesToAccept);
        totalCreated += candidatesToAccept.length;
      }

      setSuccessCount(totalCreated);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goals');
    } finally {
      setIsSubmitting(false);
    }
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
                <h2 className="text-lg font-semibold text-white">
                  Review Goal Candidates
                </h2>
                <p className="text-sm text-gray-400">
                  {totalCandidates} candidates generated across{' '}
                  {projectCandidates.length} project(s)
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
                      ({getSelectedCount(pc.projectId)}/{pc.candidates.length}{' '}
                      selected)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectAll(pc.projectId, pc.candidates.length)}
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
                  {pc.candidates.map((candidate, index) => (
                    <CandidateCard
                      key={index}
                      candidate={candidate}
                      isSelected={isSelected(pc.projectId, index)}
                      onToggle={() => toggleCandidate(pc.projectId, index)}
                    />
                  ))}
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
