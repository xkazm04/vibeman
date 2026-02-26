'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Trash2, RefreshCw } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import { GradientButton } from '@/components/ui';
import IdeaCard from './IdeaCard';
import DirectionCard from './DirectionCard';
import ActionButtons from './TinderButtons';
import VariantCarousel from './VariantCarousel';
import SwipeProgress from './SwipeProgress';
import { KeyboardHintCompact } from '@/components/ui/KeyboardHintBar';
import { TINDER_CONSTANTS, TINDER_ANIMATIONS } from '../lib/tinderUtils';
import {
  TinderItem,
  TinderFilterMode,
  TinderCombinedStats,
  isIdeaItem,
  isDirectionPairItem,
  getTinderItemId,
  getTinderItemProjectId,
} from '../lib/tinderTypes';
import { flushTinderItems } from '../lib/tinderItemsApi';
import { Context } from '@/lib/queries/contextQueries';
import { getContextNameFromMap } from '@/app/features/Ideas/lib/contextLoader';
import type { IdeaVariant } from '../lib/variantApi';

// Tinder keyboard hints
const TINDER_KEYBOARD_HINTS = [
  { key: 'A', label: 'Accept', color: 'green' as const },
  { key: 'Z', label: 'Reject', color: 'red' as const },
  { key: 'D', label: 'Delete', color: 'gray' as const },
  { key: 'V', label: 'Variants', color: 'purple' as const },
];

// ── Rejection Reason Picker ──────────────────────────────────────────────────

const REJECTION_REASONS = [
  { key: 'too_complex', label: 'Too Complex', emoji: '🏗️' },
  { key: 'already_exists', label: 'Already Exists', emoji: '🔄' },
  { key: 'wrong_scope', label: 'Wrong Scope', emoji: '🎯' },
  { key: 'not_valuable', label: 'Not Valuable', emoji: '📉' },
  { key: 'not_now', label: 'Not Now', emoji: '⏰' },
] as const;

function RejectionReasonPicker({
  onSelect,
  onSkip,
}: {
  onSelect: (reason: string) => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl"
    >
      <div className="bg-gray-900/95 border border-gray-700/50 rounded-xl p-4 mx-4 max-w-sm w-full shadow-2xl">
        <p className="text-xs text-gray-400 text-center mb-3">
          Why are you rejecting this? <span className="text-gray-600">(optional)</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {REJECTION_REASONS.map((reason, i) => (
            <button
              key={reason.key}
              onClick={() => onSelect(reason.key)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700/40 hover:border-red-500/30 hover:bg-red-500/10 text-sm text-gray-300 hover:text-red-300 transition-all"
            >
              <span className="text-2xs text-gray-600 font-mono w-3">{i + 1}</span>
              <span>{reason.emoji}</span>
              <span>{reason.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onSkip}
          className="w-full mt-2 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Skip <span className="text-gray-600 font-mono">(0)</span>
        </button>
      </div>
    </motion.div>
  );
}

interface TinderItemsContentProps {
  items: TinderItem[];
  currentIndex: number;
  currentItem: TinderItem | undefined;
  loading: boolean;
  processing: boolean;
  filterMode: TinderFilterMode;
  stats: TinderCombinedStats;
  onAccept: () => Promise<void>;
  onReject: (rejectionReason?: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onStartOver: () => void;
  onFlushComplete?: () => void;
  contextsMap?: Record<string, Context[]>;
  /** Map of goal_id -> goal_title for batch-fetched goals */
  goalTitlesMap?: Record<string, string>;
  // Idea scope variant handler
  onAcceptIdeaVariant?: (ideaId: string, variant: IdeaVariant) => Promise<void>;
  // Paired direction handlers
  onAcceptPairVariant?: (pairId: string, variant: 'A' | 'B') => Promise<void>;
  onRejectPair?: (pairId: string) => Promise<void>;
  onDeletePair?: (pairId: string) => Promise<void>;
}

export default function TinderItemsContent({
  items,
  currentIndex,
  currentItem,
  loading,
  processing,
  filterMode,
  stats,
  onAccept,
  onReject,
  onDelete,
  onStartOver,
  onFlushComplete,
  contextsMap = {},
  goalTitlesMap = {},
  onAcceptIdeaVariant,
  onAcceptPairVariant,
  onRejectPair,
  onDeletePair,
}: TinderItemsContentProps) {
  const { getProject, projects } = useProjectConfigStore();
  const { selectedProjectId } = useUnifiedProjectStore();
  const [flushing, setFlushing] = React.useState(false);
  const [flushError, setFlushError] = React.useState<string | null>(null);
  const [flushSuccess, setFlushSuccess] = React.useState(false);
  const [showVariants, setShowVariants] = React.useState(false);
  const [showRejectionPicker, setShowRejectionPicker] = React.useState(false);

  // Reset variant view and rejection picker when current item changes
  React.useEffect(() => {
    setShowVariants(false);
    setShowRejectionPicker(false);
  }, [currentItem ? getTinderItemId(currentItem) : null]);

  // Rejection picker handlers
  const triggerReject = React.useCallback(() => {
    if (!currentItem || processing) return;
    // Only show picker for idea items — directions reject directly
    if (isIdeaItem(currentItem)) {
      setShowRejectionPicker(true);
    } else {
      onReject();
    }
  }, [currentItem, processing, onReject]);

  const handleRejectWithReason = React.useCallback(async (reason: string) => {
    setShowRejectionPicker(false);
    await onReject(reason);
  }, [onReject]);

  const handleRejectSkip = React.useCallback(async () => {
    setShowRejectionPicker(false);
    await onReject();
  }, [onReject]);

  // Keyboard shortcuts: 'V' for variants, number keys for rejection picker, Escape to dismiss
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      // Rejection picker keyboard shortcuts
      if (showRejectionPicker) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowRejectionPicker(false);
        } else if (e.key >= '1' && e.key <= '5') {
          e.preventDefault();
          const idx = parseInt(e.key) - 1;
          if (idx < REJECTION_REASONS.length) {
            handleRejectWithReason(REJECTION_REASONS[idx].key);
          }
        } else if (e.key === '0' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          handleRejectSkip();
        }
        return;
      }

      // 'V' for variants
      if ((e.key === 'v' || e.key === 'V') && !showVariants && currentItem && isIdeaItem(currentItem) && !processing && onAcceptIdeaVariant) {
        e.preventDefault();
        setShowVariants(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showVariants, showRejectionPicker, currentItem, processing, onAcceptIdeaVariant, handleRejectWithReason, handleRejectSkip]);

  const handleSelectVariant = React.useCallback(async (variant: IdeaVariant) => {
    if (!currentItem || !isIdeaItem(currentItem) || !onAcceptIdeaVariant) return;
    setShowVariants(false);
    await onAcceptIdeaVariant(currentItem.data.id, variant);
  }, [currentItem, onAcceptIdeaVariant]);

  const getFlushItemTypeLabel = () => {
    switch (filterMode) {
      case 'ideas':
        return 'ideas';
      case 'directions':
        return 'directions';
      case 'both':
        return 'items';
    }
  };

  const handleFlush = async () => {
    const projectName = selectedProjectId === 'all'
      ? 'all projects'
      : projects.find(p => p.id === selectedProjectId)?.name || 'this project';

    const itemTypeLabel = getFlushItemTypeLabel();

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete all pending ${itemTypeLabel} from ${projectName}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setFlushing(true);
      setFlushError(null);
      setFlushSuccess(false);

      const result = await flushTinderItems(selectedProjectId, filterMode);

      console.log(result.message);
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
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex flex-col items-center justify-center h-[600px]">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
          <p className="text-gray-400">Loading {getFlushItemTypeLabel()}...</p>
        </div>
      </div>
    );
  }

  if (!currentItem) {
    const emptyMessage = filterMode === 'ideas'
      ? "You've reviewed all pending ideas"
      : filterMode === 'directions'
        ? "You've reviewed all pending directions"
        : "You've reviewed all pending items";

    return (
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex flex-col items-center justify-center h-[600px]">
          <Sparkles className="w-16 h-16 text-purple-400 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">All Done!</h2>
          <p className="text-gray-400 mb-6">{emptyMessage}</p>
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

  // Use wider container for direction pairs
  const isPairView = currentItem && isDirectionPairItem(currentItem);
  const containerClass = isPairView
    ? 'max-w-5xl mx-auto px-4 py-4 relative' // Wider for pair comparison
    : 'max-w-3xl mx-auto px-4 py-4 relative'; // Standard width for single cards

  return (
    <div className={containerClass}>
      {/* Flush Button - Top Right */}
      <div className="absolute top-0 right-4 z-50">
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
              ? `Flushing ${getFlushItemTypeLabel()}...`
              : flushSuccess
              ? 'Flushed!'
              : flushError
              ? flushError
              : `Flush all ${getFlushItemTypeLabel()} (permanent delete)`
          }
          data-testid="flush-items-btn"
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
            {flushSuccess ? 'Flushed!' : flushError}
          </motion.div>
        )}
      </div>

      {/* Card Stack or Variant Carousel */}
      <AnimatePresence mode="wait">
        {showVariants && currentItem && isIdeaItem(currentItem) ? (
          <motion.div
            key="variants-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-[600px] flex flex-col justify-center"
          >
            <div className="mb-4 text-center">
              <h3 className="text-sm font-semibold text-gray-300 mb-1">
                Scope Variants for
              </h3>
              <p className="text-lg font-bold text-white truncate px-8">
                {currentItem.data.title}
              </p>
            </div>
            <VariantCarousel
              ideaId={currentItem.data.id}
              ideaCategory={currentItem.data.category}
              onSelectVariant={handleSelectVariant}
              onClose={() => setShowVariants(false)}
            />
          </motion.div>
        ) : (
          <motion.div key="cards-view">
            {/* Card Stack - taller for pair comparison */}
            <div className={`relative ${isPairView ? 'h-[620px]' : 'h-[600px]'}`}>
              {/* Rejection Reason Picker Overlay */}
              <AnimatePresence>
                {showRejectionPicker && (
                  <RejectionReasonPicker
                    onSelect={handleRejectWithReason}
                    onSkip={handleRejectSkip}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {items.slice(currentIndex, currentIndex + TINDER_CONSTANTS.PREVIEW_CARDS).map((item, index) => {
                  const projectId = getTinderItemProjectId(item);
                  const projectName = getProject(projectId)?.name || 'Unknown Project';
                  const itemId = getTinderItemId(item);

                  if (isIdeaItem(item)) {
                    const contextName = item.data.context_id
                      ? getContextNameFromMap(item.data.context_id, contextsMap)
                      : 'General';
                    const goalTitle = item.data.goal_id ? goalTitlesMap[item.data.goal_id] : undefined;

                    return (
                      <IdeaCard
                        key={itemId}
                        idea={item.data}
                        projectName={projectName}
                        contextName={contextName}
                        goalTitle={goalTitle}
                        onSwipeLeft={index === 0 ? triggerReject : () => {}}
                        onSwipeRight={index === 0 ? onAccept : () => {}}
                        style={{
                          zIndex: 10 - index,
                          ...TINDER_ANIMATIONS.CARD_STACK_TRANSFORM(index),
                        }}
                      />
                    );
                  } else if (isDirectionPairItem(item)) {
                    // Paired directions - use unified DirectionCard with split view
                    return (
                      <DirectionCard
                        key={itemId}
                        direction={item.data.directionA}
                        directionB={item.data.directionB}
                        problemStatement={item.data.problemStatement}
                        pairId={item.data.pairId}
                        projectName={projectName}
                        onSwipeLeft={() => {}}
                        onSwipeRight={() => {}}
                        onAcceptVariant={index === 0 && onAcceptPairVariant
                          ? (variant) => onAcceptPairVariant(item.data.pairId, variant)
                          : undefined
                        }
                        onRejectBoth={index === 0 && onRejectPair ? () => onRejectPair(item.data.pairId) : undefined}
                        onDeleteBoth={index === 0 && onDeletePair ? () => onDeletePair(item.data.pairId) : undefined}
                        disabled={index !== 0 || processing}
                        style={{
                          zIndex: 10 - index,
                          ...TINDER_ANIMATIONS.CARD_STACK_TRANSFORM(index),
                        }}
                      />
                    );
                  } else {
                    // Single direction
                    return (
                      <DirectionCard
                        key={itemId}
                        direction={item.data}
                        projectName={projectName}
                        onSwipeLeft={index === 0 ? onReject : () => {}}
                        onSwipeRight={index === 0 ? onAccept : () => {}}
                        style={{
                          zIndex: 10 - index,
                          ...TINDER_ANIMATIONS.CARD_STACK_TRANSFORM(index),
                        }}
                      />
                    );
                  }
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons - Hide for paired directions and variant view */}
      {currentItem && !isDirectionPairItem(currentItem) && !showVariants && (
        <ActionButtons
          onReject={triggerReject}
          onDelete={onDelete}
          onAccept={onAccept}
          disabled={processing || showRejectionPicker}
          onVariants={isIdeaItem(currentItem) && onAcceptIdeaVariant ? () => setShowVariants(true) : undefined}
        />
      )}

      {/* Keyboard Hints - hide for paired directions and variant view */}
      {currentItem && !isDirectionPairItem(currentItem) && !showVariants && (
        <div className="mt-2 flex justify-center">
          <KeyboardHintCompact hints={isIdeaItem(currentItem) && onAcceptIdeaVariant ? TINDER_KEYBOARD_HINTS : TINDER_KEYBOARD_HINTS.filter(h => h.key !== 'V')} />
        </div>
      )}

      {/* Progress Indicator */}
      <div className="mt-3">
        <SwipeProgress
          total={items.length}
          reviewed={currentIndex}
          accepted={stats.accepted}
          rejected={stats.rejected}
        />
      </div>

      {/* Loading indicator for next batch */}
      {loading && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">Loading more {getFlushItemTypeLabel()}...</p>
        </div>
      )}
    </div>
  );
}
