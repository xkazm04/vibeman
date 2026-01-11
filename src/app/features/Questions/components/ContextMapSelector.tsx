'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Layers, AlertCircle, Wand2 } from 'lucide-react';
import { ContextMapEntry } from '../lib/questionsApi';

interface ContextMapSelectorProps {
  contexts: ContextMapEntry[];
  selectedContextIds: string[];
  onToggleContext: (contextId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  loading?: boolean;
  error?: string | null;
  onSetupContextMap?: () => Promise<void>;
}

export default function ContextMapSelector({
  contexts,
  selectedContextIds,
  onToggleContext,
  onSelectAll,
  onClearAll,
  loading = false,
  error = null,
  onSetupContextMap
}: ContextMapSelectorProps) {
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);

  const allSelected = contexts.length > 0 && selectedContextIds.length === contexts.length;
  const someSelected = selectedContextIds.length > 0;

  const handleSetup = async () => {
    if (!onSetupContextMap) return;

    setSetupLoading(true);
    setSetupSuccess(false);

    try {
      await onSetupContextMap();
      setSetupSuccess(true);
    } catch (err) {
      console.error('Failed to setup context map:', err);
    } finally {
      setSetupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/40">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading context map...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-amber-700/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-amber-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">{error}</p>
              {!setupSuccess && (
                <p className="text-sm text-gray-400 mt-1">
                  Setup the context-map-generator skill to create one.
                </p>
              )}
              {setupSuccess && (
                <p className="text-sm text-green-400 mt-1">
                  Skill and requirement files created. Run <code className="bg-gray-700 px-1 rounded">/generate-context-map</code> in Claude Code.
                </p>
              )}
            </div>
          </div>
          {onSetupContextMap && !setupSuccess && (
            <button
              onClick={handleSetup}
              disabled={setupLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {setupLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Setting up...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Setup Skill</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (contexts.length === 0) {
    return (
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/40">
        <div className="flex items-center gap-3 text-gray-400">
          <Layers className="w-5 h-5" />
          <span>No context map entries found. Select a project first.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/40 space-y-3">
      {/* Header with select/clear actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-300">
          <Layers className="w-4 h-4" />
          <span className="text-sm font-medium">Context Map Entries</span>
          <span className="text-xs text-gray-500">
            ({selectedContextIds.length}/{contexts.length} selected)
          </span>
        </div>
        <div className="flex gap-2">
          {!allSelected && (
            <button
              onClick={onSelectAll}
              className="text-xs px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 transition-colors"
            >
              Select All
            </button>
          )}
          {someSelected && (
            <button
              onClick={onClearAll}
              className="text-xs px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Context buttons */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {contexts.map((context, index) => {
            const isSelected = selectedContextIds.includes(context.id);
            const fileCount = [
              ...(context.filepaths.ui || []),
              ...(context.filepaths.lib || []),
              ...(context.filepaths.api || [])
            ].length;

            return (
              <motion.button
                key={context.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onToggleContext(context.id)}
                className={`
                  relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                  transition-all duration-200
                  ${isSelected
                    ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                    : 'bg-gray-700/30 border border-gray-600/30 text-gray-300 hover:bg-gray-700/50'
                  }
                `}
                title={context.summary}
              >
                {/* Selection indicator */}
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center
                  transition-colors
                  ${isSelected
                    ? 'border-blue-400 bg-blue-500'
                    : 'border-gray-500'
                  }
                `}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                {/* Context title */}
                <span className="font-medium">{context.title}</span>

                {/* File count badge */}
                <span className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${isSelected ? 'bg-blue-500/30 text-blue-200' : 'bg-gray-600/50 text-gray-400'}
                `}>
                  {fileCount}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
