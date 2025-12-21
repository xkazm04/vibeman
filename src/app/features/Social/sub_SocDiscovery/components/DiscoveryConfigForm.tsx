'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Save, X, Sparkles } from 'lucide-react';
import type { DiscoveryFormState } from '../lib/types';

interface DiscoveryConfigFormProps {
  formState: DiscoveryFormState;
  setFormState: React.Dispatch<React.SetStateAction<DiscoveryFormState>>;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
}

export function DiscoveryConfigForm({
  formState,
  setFormState,
  isEditing,
  onSave,
  onCancel,
  isNew = false,
}: DiscoveryConfigFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formState.name.trim() && formState.query.trim()) {
      onSave();
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-medium text-gray-200">
          {isNew ? 'New Discovery' : 'Edit Discovery'}
        </h3>
      </div>

      {/* Name Field */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">
          Name
        </label>
        <input
          type="text"
          value={formState.name}
          onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., React News, AI Updates..."
          className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700/60
            text-gray-200 placeholder-gray-500 text-sm
            focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
        />
      </div>

      {/* Query Field */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">
          What to search for
        </label>
        <textarea
          value={formState.query}
          onChange={(e) => setFormState(prev => ({ ...prev, query: e.target.value }))}
          placeholder="Describe what you want to find in natural language...

Example: Find tweets about new React features, React 19 updates, or discussions about React Server Components from developers and tech influencers"
          rows={4}
          className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700/60
            text-gray-200 placeholder-gray-500 text-sm resize-none
            focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
        />
        <p className="mt-1.5 text-xs text-gray-500">
          Use natural language to describe the content you want to discover on X.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={!formState.name.trim() || !formState.query.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
            bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          {isNew ? 'Create' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
            bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 text-sm font-medium
            transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </motion.form>
  );
}
