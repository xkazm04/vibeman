'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Plus, Loader2 } from 'lucide-react';
import { InlineErrorDisplay } from '@/components/errors/ErrorBoundary';
import { ClassifiedError } from '@/lib/errorClassifier';

interface CodeRequirementFormProps {
  requirementName: string;
  setRequirementName: (name: string) => void;
  requirementDescription: string;
  setRequirementDescription: (description: string) => void;
  isCreating: boolean;
  isError: boolean;
  error: ClassifiedError | null;
  clearError: () => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function CodeRequirementForm({
  requirementName,
  setRequirementName,
  requirementDescription,
  setRequirementDescription,
  isCreating,
  isError,
  error,
  clearError,
  onClose,
  onSubmit,
}: CodeRequirementFormProps) {
  return (
    <div className="space-y-6">
      {/* Name Field */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
          Requirement Name <span className="text-red-400">*</span>
        </label>
        <div className="relative group">
          <input
            type="text"
            value={requirementName}
            onChange={(e) => setRequirementName(e.target.value)}
            placeholder="e.g., add-auth, fix-login-bug"
            className="w-full px-4 py-3 bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40
                     border border-slate-700/50 rounded-lg text-white placeholder-slate-400/60
                     focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                     transition-all duration-300 hover:border-slate-600/50"
            disabled={isCreating}
            autoFocus
            data-testid="requirement-name-input"
          />
          <div className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
               style={{
                 background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.05), transparent)',
                 filter: 'blur(8px)'
               }}
          />
        </div>
        {!requirementName.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 mt-2 text-sm text-slate-500"
          >
            <AlertCircle className="w-3 h-3" />
            <span>Requirement name is required</span>
          </motion.div>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3 tracking-wide">
          Description <span className="text-red-400">*</span>
        </label>
        <div className="relative group">
          <textarea
            value={requirementDescription}
            onChange={(e) => setRequirementDescription(e.target.value)}
            placeholder="What should Claude Code do? Be specific about your requirements..."
            rows={6}
            className="w-full px-4 py-3 bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40
                     border border-slate-700/50 rounded-lg text-white placeholder-slate-400/60
                     focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20
                     transition-all duration-300 resize-none hover:border-slate-600/50
                     custom-scrollbar"
            disabled={isCreating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && !isCreating) {
                onSubmit();
              }
            }}
            data-testid="requirement-description-input"
          />
          <div className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
               style={{
                 background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.05), transparent)',
                 filter: 'blur(8px)'
               }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-500">Press Ctrl+Enter to submit</p>
      </div>

      {/* Error Display */}
      {isError && error && (
        <div className="mt-2">
          <InlineErrorDisplay
            error={error}
            onDismiss={clearError}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700/30">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50
                   text-slate-300 rounded-lg transition-all duration-200 font-medium"
          disabled={isCreating}
          data-testid="requirement-cancel-btn"
        >
          Cancel
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onSubmit}
          disabled={isCreating || !requirementName.trim() || !requirementDescription.trim()}
          className="relative px-6 py-2.5 bg-gradient-to-r from-purple-700/50 to-pink-700/50
                   hover:from-purple-600/60 hover:to-pink-600/60 border border-purple-600/30
                   rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 shadow-lg shadow-purple-500/20 overflow-hidden group"
          data-testid="requirement-submit-btn"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Creating...
            </>
          ) : (
            <>
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.2), transparent)'
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
              <Plus className="w-4 h-4 inline mr-2" />
              <span className="relative z-10">Create Requirement</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
