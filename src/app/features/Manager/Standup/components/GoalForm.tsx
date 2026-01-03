/**
 * GoalForm Component
 * Form for entering goal title and description
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, AlertCircle } from 'lucide-react';

interface GoalFormProps {
  onSubmit: (title: string, description: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export function GoalForm({ onSubmit, onCancel, isSubmitting, error }: GoalFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState({ title: false, description: false });

  const titleError = touched.title && !title.trim() ? 'Title is required' : null;
  const descriptionError = touched.description && !description.trim() ? 'Description is required' : null;
  const canSubmit = title.trim() && description.trim() && !isSubmitting;

  const handleSubmit = () => {
    setTouched({ title: true, description: true });
    if (canSubmit) {
      onSubmit(title.trim(), description.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-gray-800/60 rounded-lg border border-gray-700/50 p-3 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium text-gray-200">New Goal</span>
      </div>

      {/* Title Input */}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, title: true }))}
          placeholder="Goal title *"
          disabled={isSubmitting}
          className={`w-full px-3 py-2 bg-gray-900/60 border rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 transition-colors ${
            titleError
              ? 'border-red-500/50 focus:ring-red-500/50'
              : 'border-gray-700/50 focus:ring-purple-500/50'
          }`}
        />
        {titleError && (
          <p className="text-xs text-red-400 mt-1">{titleError}</p>
        )}
      </div>

      {/* Description Input */}
      <div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, description: true }))}
          placeholder="Goal description *"
          disabled={isSubmitting}
          rows={2}
          className={`w-full px-3 py-2 bg-gray-900/60 border rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 transition-colors resize-none ${
            descriptionError
              ? 'border-red-500/50 focus:ring-red-500/50'
              : 'border-gray-700/50 focus:ring-purple-500/50'
          }`}
        />
        {descriptionError && (
          <p className="text-xs text-red-400 mt-1">{descriptionError}</p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-2 py-1.5 rounded">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Hint */}
      <p className="text-[10px] text-gray-500">
        Select a context below to save the goal
      </p>
    </motion.div>
  );
}

export default GoalForm;
