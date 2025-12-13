/**
 * New Hypothesis Modal
 * Form for creating a new hypothesis manually
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { useGoalHubStore } from '@/stores/goalHubStore';
import type { HypothesisCategory } from '@/app/db/models/goal-hub.types';

interface NewHypothesisModalProps {
  onClose: () => void;
}

const CATEGORIES: Array<{ value: HypothesisCategory; label: string }> = [
  { value: 'behavior', label: 'Behavior' },
  { value: 'performance', label: 'Performance' },
  { value: 'security', label: 'Security' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'ux', label: 'User Experience' },
  { value: 'integration', label: 'Integration' },
  { value: 'edge_case', label: 'Edge Case' },
  { value: 'data', label: 'Data' },
  { value: 'error', label: 'Error Handling' },
  { value: 'custom', label: 'Custom' },
];

export default function NewHypothesisModal({ onClose }: NewHypothesisModalProps) {
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [category, setCategory] = useState<HypothesisCategory>('behavior');
  const [priority, setPriority] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createHypothesis } = useGoalHubStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !statement.trim()) return;

    setIsSubmitting(true);
    await createHypothesis({
      title: title.trim(),
      statement: statement.trim(),
      reasoning: reasoning.trim() || undefined,
      category,
      priority,
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">New Hypothesis</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-white rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short descriptive title"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Statement */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Statement *
            </label>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="When [condition], then [expected outcome]"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
              rows={3}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Use format: When [condition], then [expected outcome] because [reasoning]
            </p>
          </div>

          {/* Reasoning */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Reasoning
            </label>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Why is this hypothesis important?"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
              rows={2}
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HypothesisCategory)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                {CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Priority (1-10)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !statement.trim() || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Create Hypothesis'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
