'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Edit, Loader2, ChevronRight } from 'lucide-react';

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

interface CandidateCardProps {
  candidate: GoalCandidate;
  index: number;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (title: string) => void;
  editDescription: string;
  setEditDescription: (description: string) => void;
  isProcessing: boolean;
  onAccept: () => void;
  onReject: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

function getPriorityColor(score: number) {
  if (score >= 90) return 'text-red-400 border-red-500/50 bg-red-500/10';
  if (score >= 70) return 'text-orange-400 border-orange-500/50 bg-orange-500/10';
  if (score >= 50) return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
  return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
}

function getPriorityLabel(score: number) {
  if (score >= 90) return 'Critical';
  if (score >= 70) return 'High';
  if (score >= 50) return 'Medium';
  return 'Low';
}

export default function CandidateCard({
  candidate,
  index,
  isEditing,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  isProcessing,
  onAccept,
  onReject,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: CandidateCardProps) {
  return (
    <motion.div
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
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg
                       text-white focus:outline-none focus:border-purple-500/50"
              autoFocus
              data-testid={`edit-title-${candidate.id}`}
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
      {isEditing ? (
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg
                   text-white focus:outline-none focus:border-purple-500/50 resize-none"
          data-testid={`edit-description-${candidate.id}`}
        />
      ) : (
        <p className="text-sm text-slate-300 leading-relaxed">
          {candidate.description || 'No description'}
        </p>
      )}

      {/* Reasoning (collapsible) */}
      {candidate.reasoning && !isEditing && (
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
        {isEditing ? (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSaveEdit}
              disabled={isProcessing}
              data-testid={`save-candidate-${candidate.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-600/30 hover:bg-green-600/50
                       border border-green-500/50 rounded-md text-green-300 text-sm font-medium
                       transition-all duration-200 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save & Accept
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCancelEdit}
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
              onClick={onAccept}
              disabled={isProcessing}
              data-testid={`accept-candidate-${candidate.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-600/30 hover:bg-green-600/50
                       border border-green-500/50 rounded-md text-green-300 text-sm font-medium
                       transition-all duration-200 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Accept
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartEdit}
              disabled={isProcessing}
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
              onClick={onReject}
              disabled={isProcessing}
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
  );
}
