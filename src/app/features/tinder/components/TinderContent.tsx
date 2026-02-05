'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Trash2, RefreshCw } from 'lucide-react';
import { DbIdea } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import { GradientButton } from '@/components/ui';
import IdeaCard from './IdeaCard';
import ActionButtons from './TinderButtons';
import SwipeProgress from './SwipeProgress';
import { KeyboardHintCompact } from '@/components/ui/KeyboardHintBar';
import { TINDER_CONSTANTS, TINDER_ANIMATIONS } from '../lib/tinderUtils';
import { Context } from '@/lib/queries/contextQueries';
import { getContextNameFromMap } from '@/app/features/Ideas/lib/contextLoader';

// Tinder keyboard hints
const TINDER_KEYBOARD_HINTS = [
  { key: 'A', label: 'Accept', color: 'green' as const },
  { key: 'Z', label: 'Reject', color: 'red' as const },
  { key: 'D', label: 'Delete', color: 'gray' as const },
];

interface TinderContentProps {
  ideas: DbIdea[];
  currentIndex: number;
  currentIdea: DbIdea | undefined;
  loading: boolean;
  processing: boolean;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onDelete: () => Promise<void>;
  onStartOver: () => void;
  onFlushComplete?: () => void;
  contextsMap?: Record<string, Context[]>;
}

export default function TinderContent({
  ideas,
  currentIndex,
  currentIdea,
  loading,
  processing,
  onAccept,
  onReject,
  onDelete,
  onStartOver,
  onFlushComplete,
  contextsMap = {},
}: TinderContentProps) {
  const { getProject, projects } = useProjectConfigStore();
  const { selectedProjectId } = useUnifiedProjectStore();
  const [flushing, setFlushing] = React.useState(false);
  const [flushError, setFlushError] = React.useState<string | null>(null);
  const [flushSuccess, setFlushSuccess] = React.useState(false);

  const handleFlush = async () => {
    // Confirmation dialog
    const projectName = selectedProjectId === 'all'
      ? 'all projects'
      : projects.find(p => p.id === selectedProjectId)?.name || 'this project';

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete all ideas from ${projectName}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setFlushing(true);
      setFlushError(null);
      setFlushSuccess(false);

      const response = await fetch('/api/ideas/tinder/flush', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to flush ideas');
      }

      console.log(`Flushed ${data.deletedCount} ideas`);
      setFlushSuccess(true);

      // Call the callback to refresh the ideas list
      if (onFlushComplete) {
        onFlushComplete();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setFlushSuccess(false), 3000);
    } catch (error) {
      console.error('Flush failed:', error);
      setFlushError(error instanceof Error ? error.message : 'Flush failed');

      // Clear error message after 5 seconds
      setTimeout(() => setFlushError(null), 5000);
    } finally {
      setFlushing(false);
    }
  };

  if (loading && currentIndex === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex flex-col items-center justify-center h-[600px]">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
          <p className="text-gray-400">Loading ideas...</p>
        </div>
      </div>
    );
  }

  if (!currentIdea) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex flex-col items-center justify-center h-[600px]">
          <Sparkles className="w-16 h-16 text-purple-400 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">All Done!</h2>
          <p className="text-gray-400 mb-6">
            You&apos;ve reviewed all pending ideas
          </p>
          <GradientButton
            onClick={onStartOver}
            colorScheme="pink"
            size="lg"
            animate={true}
          >
            Start Over
          </GradientButton>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 relative">
      {/* Flush Button - Top Right */}
      <div className="absolute top-4 right-6 z-50">
        <motion.button
          onClick={handleFlush}
          disabled={flushing || loading || processing}
          className={`p-2.5 rounded-lg border transition-all duration-200 ${
            flushing
              ? 'bg-gray-700/50 border-gray-600/50 cursor-not-allowed'
              : flushSuccess
              ? 'bg-green-500/20 border-green-500/40 text-green-400'
              : flushError
              ? 'bg-red-500/20 border-red-500/40 text-red-400'
              : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-red-400'
          }`}
          whileHover={flushing ? {} : { scale: 1.05 }}
          whileTap={flushing ? {} : { scale: 0.95, rotate: -5 }}
          title={
            flushing
              ? 'Flushing ideas...'
              : flushSuccess
              ? 'Ideas flushed!'
              : flushError
              ? flushError
              : 'Flush all ideas (permanent delete)'
          }
          data-testid="flush-ideas-btn"
        >
          {flushing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </motion.button>

        {/* Error/Success Tooltip */}
        {(flushError || flushSuccess) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg ${
              flushSuccess
                ? 'bg-green-500/90 text-white'
                : 'bg-red-500/90 text-white'
            }`}
          >
            {flushSuccess ? 'Ideas flushed!' : flushError}
          </motion.div>
        )}
      </div>

      {/* Card Stack */}
      <div className="relative h-[600px]">
        <AnimatePresence>
          {ideas.slice(currentIndex, currentIndex + TINDER_CONSTANTS.PREVIEW_CARDS).map((idea, index) => {
            const projectName = getProject(idea.project_id)?.name || 'Unknown Project';
            const contextName = idea.context_id
              ? getContextNameFromMap(idea.context_id, contextsMap)
              : 'General';

            return (
              <IdeaCard
                key={idea.id}
                idea={idea}
                projectName={projectName}
                contextName={contextName}
                onSwipeLeft={index === 0 ? onReject : () => {}}
                onSwipeRight={index === 0 ? onAccept : () => {}}
                style={{
                  zIndex: 10 - index,
                  ...TINDER_ANIMATIONS.CARD_STACK_TRANSFORM(index),
                }}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <ActionButtons
        onReject={onReject}
        onDelete={onDelete}
        onAccept={onAccept}
        disabled={processing}
      />

      {/* Keyboard Hints */}
      <div className="mt-4 flex justify-center">
        <KeyboardHintCompact hints={TINDER_KEYBOARD_HINTS} />
      </div>

      {/* Progress Indicator */}
      <div className="mt-6">
        <SwipeProgress
          total={ideas.length}
          reviewed={currentIndex}
          accepted={ideas.slice(0, currentIndex).filter(i => i.status === 'accepted').length}
          rejected={ideas.slice(0, currentIndex).filter(i => i.status === 'rejected').length}
        />
      </div>

      {/* Loading indicator for next batch */}
      {loading && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">Loading more ideas...</p>
        </div>
      )}
    </div>
  );
}