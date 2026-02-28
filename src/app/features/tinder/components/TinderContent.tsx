'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, RefreshCw, X, Check } from 'lucide-react';
import IdeasLoadingState from '@/app/features/Ideas/components/IdeasLoadingState';
import { DbIdea } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import { GradientButton } from '@/components/ui';
import IdeaCard from './IdeaCard';
import { SideActionButton, CompactBottomBar } from './TinderButtons';
import ActionButtons from './TinderButtons';
import VariantCarousel from './VariantCarousel';
import { SwipeProgressCompact } from './SwipeProgress';
import { KeyboardHintCompact } from '@/components/ui/KeyboardHintBar';
import { TINDER_CONSTANTS, TINDER_ANIMATIONS } from '../lib/tinderUtils';
import { Context } from '@/lib/queries/contextQueries';
import { buildContextLookup, getContextNameFromLookup } from '@/app/features/Ideas/lib/contextLoader';
import type { IdeaVariant } from '../lib/variantApi';

// Tinder keyboard hints
const TINDER_KEYBOARD_HINTS = [
  { key: 'A', label: 'Accept', color: 'green' as const },
  { key: 'Z', label: 'Reject', color: 'red' as const },
  { key: 'D', label: 'Delete', color: 'gray' as const },
  { key: 'V', label: 'Variants', color: 'purple' as const },
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
  /** Called when user accepts a specific variant (updates idea then accepts) */
  onAcceptVariant?: (ideaId: string, variant: IdeaVariant) => Promise<void>;
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
  onAcceptVariant,
}: TinderContentProps) {
  const { getProject, projects } = useProjectConfigStore();
  const { selectedProjectId } = useUnifiedProjectStore();
  const [flushing, setFlushing] = React.useState(false);
  const [flushError, setFlushError] = React.useState<string | null>(null);
  const [flushSuccess, setFlushSuccess] = React.useState(false);
  const [showFlushConfirm, setShowFlushConfirm] = React.useState(false);
  const [showVariants, setShowVariants] = React.useState(false);
  const contextLookup = React.useMemo(() => buildContextLookup(contextsMap), [contextsMap]);

  // Reset variant view when idea changes
  React.useEffect(() => {
    setShowVariants(false);
  }, [currentIdea?.id]);

  // Keyboard shortcut for 'V' to toggle variants
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'v' || e.key === 'V') {
        if (!showVariants && currentIdea && !processing) {
          e.preventDefault();
          setShowVariants(true);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showVariants, currentIdea, processing]);

  const handleSelectVariant = React.useCallback(async (variant: IdeaVariant) => {
    if (!currentIdea || !onAcceptVariant) return;
    setShowVariants(false);
    await onAcceptVariant(currentIdea.id, variant);
  }, [currentIdea, onAcceptVariant]);

  const flushProjectName = selectedProjectId === 'all'
    ? 'all projects'
    : projects.find(p => p.id === selectedProjectId)?.name || 'this project';

  const handleFlushClick = () => {
    setShowFlushConfirm(true);
  };

  const handleFlushCancel = () => {
    setShowFlushConfirm(false);
  };

  const handleFlushConfirm = async () => {
    setShowFlushConfirm(false);
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

      if (onFlushComplete) {
        onFlushComplete();
      }

      setTimeout(() => setFlushSuccess(false), 3000);
    } catch (error) {
      console.error('Flush failed:', error);
      setFlushError(error instanceof Error ? error.message : 'Flush failed');
      setTimeout(() => setFlushError(null), 5000);
    } finally {
      setFlushing(false);
    }
  };

  if (loading && currentIndex === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <IdeasLoadingState size="lg" label="Loading ideas..." />
      </div>
    );
  }

  if (!currentIdea) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
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
    <div className="flex-1 min-h-0 flex flex-col px-6 relative">
      {/* Flush Button - Top Right */}
      <div className="absolute top-2 right-6 z-50">
        <AnimatePresence mode="wait">
          {showFlushConfirm ? (
            <motion.div
              key="flush-confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 shadow-lg backdrop-blur-sm"
            >
              <p className="text-xs text-red-300 mb-2 max-w-[200px]">
                Delete all ideas from {flushProjectName}? This cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFlushConfirm}
                  className="px-2.5 py-1 text-xs font-medium bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded text-red-300 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={handleFlushCancel}
                  className="px-2.5 py-1 text-xs font-medium bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/40 rounded text-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="flush-btn"
              onClick={handleFlushClick}
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
          )}
        </AnimatePresence>

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

      {/* Main content area: side buttons + card */}
      <AnimatePresence mode="wait">
        {showVariants && currentIdea ? (
          <motion.div
            key="variants"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 min-h-0 flex flex-col justify-center max-w-2xl lg:max-w-3xl mx-auto w-full"
          >
            <div className="mb-4 text-center">
              <h3 className="text-sm font-semibold text-gray-300 mb-1">
                Scope Variants for
              </h3>
              <p className="text-lg font-bold text-white truncate px-8">
                {currentIdea.title}
              </p>
            </div>
            <VariantCarousel
              ideaId={currentIdea.id}
              ideaCategory={currentIdea.category}
              onSelectVariant={handleSelectVariant}
              onClose={() => setShowVariants(false)}
            />
          </motion.div>
        ) : (
          <motion.div key="cards" className="flex-1 min-h-0 flex items-center justify-center gap-4 lg:gap-6 py-4">
            {/* Left: Reject button — desktop only */}
            <div className="hidden lg:flex items-center flex-shrink-0">
              <SideActionButton
                onClick={onReject}
                disabled={processing}
                color="red"
                icon={<X className="w-7 h-7" />}
                title="Reject (Swipe Left)"
                ariaLabel="Reject idea"
              />
            </div>

            {/* Center: Card stack */}
            <div className="relative flex-1 max-w-2xl lg:max-w-3xl h-full min-h-0">
              <AnimatePresence>
                {ideas.slice(currentIndex, currentIndex + TINDER_CONSTANTS.PREVIEW_CARDS).map((idea, index) => {
                  const projectName = getProject(idea.project_id)?.name || 'Unknown Project';
                  const contextName = idea.context_id
                    ? getContextNameFromLookup(idea.context_id, contextLookup)
                    : 'General';

                  return (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      projectName={projectName}
                      contextName={contextName}
                      onSwipeLeft={index === 0 ? onReject : () => {}}
                      onSwipeRight={index === 0 ? onAccept : () => {}}
                      className="max-h-full"
                      style={{
                        zIndex: 10 - index,
                        ...TINDER_ANIMATIONS.CARD_STACK_TRANSFORM(index),
                      }}
                    />
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Right: Accept button — desktop only */}
            <div className="hidden lg:flex items-center flex-shrink-0">
              <SideActionButton
                onClick={onAccept}
                disabled={processing}
                color="green"
                icon={<Check className="w-7 h-7" />}
                title="Accept (Swipe Right)"
                ariaLabel="Accept idea"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar: compact actions + progress + hints */}
      {!showVariants && (
        <div className="flex-shrink-0 pb-3 pt-1">
          {/* Mobile-only: full action buttons row (hidden on lg) */}
          <div className="lg:hidden">
            <ActionButtons
              onReject={onReject}
              onDelete={onDelete}
              onAccept={onAccept}
              disabled={processing}
              onVariants={onAcceptVariant ? () => setShowVariants(true) : undefined}
            />
          </div>

          {/* Desktop: compact bar with secondary actions + progress + hints */}
          <div className="flex items-center justify-between gap-4 mt-2 lg:mt-0">
            {/* Left: delete + variants */}
            <div className="hidden lg:block">
              <CompactBottomBar
                onDelete={onDelete}
                disabled={processing}
                onVariants={onAcceptVariant ? () => setShowVariants(true) : undefined}
              />
            </div>

            {/* Center: progress */}
            <div className="flex-1 max-w-xs mx-auto lg:mx-0">
              <SwipeProgressCompact
                current={currentIndex}
                total={ideas.length}
              />
            </div>

            {/* Right: keyboard hints */}
            <div className="hidden lg:block">
              <KeyboardHintCompact hints={TINDER_KEYBOARD_HINTS} />
            </div>
          </div>

          {/* Loading indicator for next batch */}
          {loading && (
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">Loading more ideas...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
