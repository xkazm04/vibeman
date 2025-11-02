'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface IdeaDetailFeedbackProps {
  userFeedback: string;
  userPattern: boolean;
  onFeedbackChange: (value: string) => void;
  onPatternChange: (value: boolean) => void;
}

export default function IdeaDetailFeedback({
  userFeedback,
  userPattern,
  onFeedbackChange,
  onPatternChange,
}: IdeaDetailFeedbackProps) {
  return (
    <div className="pt-3 border-t border-gray-700/40">
      <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
        Your Feedback
      </h3>

      <textarea
        data-testid="idea-feedback-textarea"
        value={userFeedback}
        onChange={(e) => onFeedbackChange(e.target.value)}
        placeholder="Add your thoughts, comments, or rationale..."
        className="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all resize-none"
        rows={3}
      />

      {/* User Pattern Checkbox */}
      <motion.label
        className="flex items-center gap-2 mt-3 cursor-pointer group"
        whileHover={{ x: 2 }}
      >
        <div className="relative">
          <input
            type="checkbox"
            data-testid="idea-feedback-pattern-checkbox"
            checked={userPattern}
            onChange={(e) => onPatternChange(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-4 h-4 border-2 rounded transition-all duration-300 ${
            userPattern
              ? 'bg-cyan-500 border-cyan-500'
              : 'bg-transparent border-gray-600 group-hover:border-cyan-500/40'
          }`}>
            {userPattern && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Star className="w-2.5 h-2.5 text-white m-auto" />
              </motion.div>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
          Mark as valuable pattern (apply across projects)
        </span>
      </motion.label>
    </div>
  );
}
