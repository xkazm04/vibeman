'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Goal } from '../../../../../types';
import { getStatusInfo } from '../lib';
import { UniversalSelect } from '@/components/ui/UniversalSelect';

interface Context {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface GoalFormProps {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  status: Goal['status'];
  setStatus: (status: Goal['status']) => void;
  contextId: string;
  setContextId: (contextId: string) => void;
  contexts: Context[];
  loadingContexts: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function GoalForm({
  title,
  setTitle,
  description,
  setDescription,
  status,
  setStatus,
  contextId,
  setContextId,
  contexts,
  loadingContexts,
  onSubmit,
  onClose,
}: GoalFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Title Field */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
          Title <span className="text-red-400">*</span>
        </label>
        <div className="relative group">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a clear and concise goal title..."
            className="w-full px-4 py-3 bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40
                     border border-slate-700/50 rounded-lg text-white placeholder-slate-400/60
                     focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20
                     transition-all duration-300 hover:border-slate-600/50"
            autoFocus
            data-testid="goal-title-input"
          />
          {/* Subtle glow on focus */}
          <div className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
               style={{
                 background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.05), transparent)',
                 filter: 'blur(8px)'
               }}
          />
        </div>
        {!title.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 mt-2 text-sm text-slate-500"
          >
            <AlertCircle className="w-3 h-3" />
            <span>Title is required</span>
          </motion.div>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
          Description <span className="text-slate-500">(Optional)</span>
        </label>
        <div className="relative group">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide a detailed description of the goal, including specific objectives and success criteria..."
            rows={4}
            className="w-full px-4 py-3 bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40
                     border border-slate-700/50 rounded-lg text-white placeholder-slate-400/60
                     focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20
                     transition-all duration-300 resize-none hover:border-slate-600/50
                     custom-scrollbar"
            data-testid="goal-description-input"
          />
          <div className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
               style={{
                 background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.05), transparent)',
                 filter: 'blur(8px)'
               }}
          />
        </div>
      </div>

      {/* Context Selection */}
      <UniversalSelect
        label="Context"
        value={contextId}
        onChange={setContextId}
        options={contexts.map(ctx => ({
          value: ctx.id,
          label: ctx.name
        }))}
        placeholder="No specific context"
        isLoading={loadingContexts}
        helperText={loadingContexts ? 'Loading contexts...' : undefined}
        variant="cyber"
      />

      {/* Status Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
          Initial Status
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['open', 'in_progress', 'done'] as const).map((statusOption) => {
            const statusInfo = getStatusInfo(statusOption);
            const isSelected = status === statusOption;

            return (
              <motion.button
                key={statusOption}
                type="button"
                onClick={() => setStatus(statusOption)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-3 rounded-lg border text-sm font-medium transition-all duration-300 overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-br from-cyan-800/30 via-slate-800/50 to-blue-800/30 border-cyan-500/50 text-cyan-100 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:bg-slate-700/50 hover:border-slate-600/50'
                }`}
                data-testid={`goal-status-${statusOption}`}
              >
                {/* Subtle animated gradient for selected */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.3), transparent)'
                    }}
                    animate={{
                      x: ['-100%', '100%']
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                  />
                )}
                <span className="relative z-10">{statusInfo.text}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700/30">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50
                   text-slate-300 rounded-lg transition-all duration-200 font-medium"
          data-testid="goal-cancel-btn"
        >
          Cancel
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={!title.trim()}
          className="relative px-6 py-2.5 bg-gradient-to-r from-cyan-700/50 to-blue-700/50
                   hover:from-cyan-600/60 hover:to-blue-600/60 border border-cyan-600/30
                   rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 shadow-lg shadow-cyan-500/20 overflow-hidden group"
          data-testid="goal-submit-btn"
        >
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.2), transparent)'
            }}
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear'
            }}
          />
          <span className="relative z-10">Add Goal</span>
        </motion.button>
      </div>
    </form>
  );
}
