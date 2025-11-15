'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Loader2 } from 'lucide-react';
import ContextJailCard from '@/components/ContextComponents/ContextJailCard';
import { fetchContextsByGroup } from '../lib/contextApi';

export interface Context {
  id: string;
  name: string;
  groupId: string | null;
  preview?: string;
  testScenario?: string;
  testUpdated?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface BlueprintContextSelectorProps {
  selectedGroupId: string;
  groupColor: string;
  selectedContextId: string | null;
  onSelectContext: (contextId: string, context: Context) => void;
  className?: string;
}

/**
 * Context selector panel for Blueprint
 * Shows contexts from selected group in a row/multi-row layout
 */
export default function BlueprintContextSelector({
  selectedGroupId,
  groupColor,
  selectedContextId,
  onSelectContext,
  className = '',
}: BlueprintContextSelectorProps) {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load contexts when selected group changes
  useEffect(() => {
    if (!selectedGroupId) {
      setContexts([]);
      return;
    }

    const loadContexts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchContextsByGroup(selectedGroupId);
        setContexts(data);
      } catch (err) {
        setError('Failed to load contexts');
        console.error('[BlueprintContextSelector] Error loading contexts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContexts();
  }, [selectedGroupId]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center gap-3 p-6 ${className}`}
        data-testid="context-selector-loading"
      >
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
        <span className="text-sm text-gray-400 font-mono">Loading contexts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center gap-3 p-6 ${className}`}
        data-testid="context-selector-error"
      >
        <span className="text-sm text-red-400 font-mono">{error}</span>
      </div>
    );
  }

  if (!Array.isArray(contexts) || contexts.length === 0) {
    return (
      <div
        className={`flex items-center justify-center gap-3 p-6 ${className}`}
        data-testid="context-selector-empty"
      >
        <Layers className="w-5 h-5 text-gray-500" />
        <span className="text-sm text-gray-500 font-mono">No contexts in this group</span>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col ${className}`}
      data-testid="blueprint-context-selector"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-3 pt-3">
        <Layers className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-mono text-cyan-300 uppercase tracking-wider">
          Contexts
        </h3>
        <span className="text-xs text-gray-500 font-mono">({Array.isArray(contexts) ? contexts.length : 0})</span>
      </div>

      {/* Context cards - single column with no gap */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex flex-col">
          <AnimatePresence mode="popLayout">
            {Array.isArray(contexts) && contexts.map((context, index) => (
              <motion.div
                key={context.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.02 }}
                className="h-20"
              >
                <ContextJailCard
                  context={context}
                  group={{ color: groupColor }}
                  index={index}
                  fontSize="text-base font-extrabold"
                  onClick={(ctx) => onSelectContext(ctx.id, ctx)}
                  isSelected={selectedContextId === context.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
