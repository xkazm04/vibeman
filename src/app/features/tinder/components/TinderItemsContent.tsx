'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Trash2, RefreshCw, Link2, AlertTriangle, Zap, X, Check } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import { GradientButton } from '@/components/ui';
import IdeaCard from './IdeaCard';
import DirectionCard from './DirectionCard';
import ActionButtons, { SideActionButton, CompactBottomBar } from './TinderButtons';
import VariantCarousel from './VariantCarousel';
import { SwipeProgressCompact } from './SwipeProgress';
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
import { buildContextLookup, getContextNameFromLookup } from '@/app/features/Ideas/lib/contextLoader';
import type { IdeaVariant } from '../lib/variantApi';
import type { PrerequisiteNotification } from '../lib/tinderTypes';

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
  // Dependency awareness
  prerequisiteNotification?: PrerequisiteNotification | null;
  onDismissPrerequisiteNotification?: () => void;
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
  prerequisiteNotification,
  onDismissPrerequisiteNotification,
}: TinderItemsContentProps) {
  const { getProject, projects } = useProjectConfigStore();
  const { selectedProjectId } = useUnifiedProjectStore();
  const [flushing, setFlushing] = React.useState(false);
  const [flushError, setFlushError] = React.useState<string | null>(null);
  const [flushSuccess, setFlushSuccess] = React.useState(false);
  const [showVariants, setShowVariants] = React.useState(false);
  const [showRejectionPicker, setShowRejectionPicker] = React.useState(false);
  const contextLookup = React.useMemo(() => buildContextLookup(contextsMap), [contextsMap]);

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

  const isPairView = currentItem && isDirectionPairItem(currentItem);
  const showSideButtons = currentItem && !isPairView && !showVariants;
  const keyboardHints = currentItem && isIdeaItem(currentItem) && onAcceptIdeaVariant
    ? TINDER_KEYBOARD_HINTS
    : TINDER_KEYBOARD_HINTS.filter(h => h.key !== 'V');

  if (loading && currentIndex === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center">
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
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center">
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

  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 relative">
      {/* Flush Button - Top Right */}
      <div className="absolute top-2 right-4 z-50">
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

      {/* Prerequisite/Unlock Notification Banner */}
      <AnimatePresence>
        {prerequisiteNotification && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="flex-shrink-0 mb-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <Link2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-300 mb-1.5">
                    Dependencies for &quot;{prerequisiteNotification.acceptedTitle}&quot;
                  </p>
                  {prerequisiteNotification.prerequisites.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400">
                        {prerequisiteNotification.prerequisites.length} prerequisite{prerequisiteNotification.prerequisites.length > 1 ? 's' : ''} pending:{' '}
                        {prerequisiteNotification.prerequisites.map(p => p.title).join(', ')}
                      </span>
                    </div>
                  )}
                  {prerequisiteNotification.unlocks.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400">
                        Unlocks {prerequisiteNotification.unlocks.length} idea{prerequisiteNotification.unlocks.length > 1 ? 's' : ''}:{' '}
                        {prerequisiteNotification.unlocks.map(u => u.title).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={onDismissPrerequisiteNotification}
                className="text-amber-500/60 hover:text-amber-400 transition-colors flex-shrink-0"
              >
                <span className="text-xs">Dismiss</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card area with side buttons */}
      <AnimatePresence mode="wait">
        {showVariants && currentItem && isIdeaItem(currentItem) ? (
          <motion.div
            key="variants-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 min-h-0 flex flex-col justify-center max-w-3xl mx-auto w-full"
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
          <motion.div
            key="cards-view"
            className={`flex-1 min-h-0 flex items-center justify-center gap-4 lg:gap-6 py-4 ${
              isPairView ? 'max-w-5xl' : 'max-w-3xl lg:max-w-[900px]'
            } mx-auto w-full`}
          >
            {/* Left: Reject button — desktop only, hide for pairs */}
            {showSideButtons && (
              <div className="hidden lg:flex items-center flex-shrink-0">
                <SideActionButton
                  onClick={triggerReject}
                  disabled={processing || showRejectionPicker}
                  color="red"
                  icon={<X className="w-7 h-7" />}
                  title="Reject (Swipe Left)"
                  ariaLabel="Reject"
                />
              </div>
            )}

            {/* Center: Card stack */}
            <div className="relative flex-1 h-full min-h-0">
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
                      ? getContextNameFromLookup(item.data.context_id, contextLookup)
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
                        className="max-h-full"
                        style={{
                          zIndex: 10 - index,
                          ...TINDER_ANIMATIONS.CARD_STACK_TRANSFORM(index),
                        }}
                      />
                    );
                  } else if (isDirectionPairItem(item)) {
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

            {/* Right: Accept button — desktop only, hide for pairs */}
            {showSideButtons && (
              <div className="hidden lg:flex items-center flex-shrink-0">
                <SideActionButton
                  onClick={onAccept}
                  disabled={processing || showRejectionPicker}
                  color="green"
                  icon={<Check className="w-7 h-7" />}
                  title="Accept (Swipe Right)"
                  ariaLabel="Accept"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      {!showVariants && (
        <div className="flex-shrink-0 pb-3 pt-1">
          {/* Mobile-only: full action buttons (hidden on lg), skip for pairs */}
          {currentItem && !isDirectionPairItem(currentItem) && (
            <div className="lg:hidden">
              <ActionButtons
                onReject={triggerReject}
                onDelete={onDelete}
                onAccept={onAccept}
                disabled={processing || showRejectionPicker}
                onVariants={isIdeaItem(currentItem) && onAcceptIdeaVariant ? () => setShowVariants(true) : undefined}
              />
            </div>
          )}

          {/* Desktop: compact bar with secondary actions + progress + hints */}
          <div className="flex items-center justify-between gap-4 mt-2 lg:mt-0">
            {/* Left: delete + variants (desktop only, skip for pairs) */}
            {currentItem && !isDirectionPairItem(currentItem) && (
              <div className="hidden lg:block">
                <CompactBottomBar
                  onDelete={onDelete}
                  disabled={processing || showRejectionPicker}
                  onVariants={isIdeaItem(currentItem) && onAcceptIdeaVariant ? () => setShowVariants(true) : undefined}
                />
              </div>
            )}

            {/* Center: progress */}
            <div className="flex-1 max-w-xs mx-auto lg:mx-0">
              <SwipeProgressCompact
                current={currentIndex}
                total={items.length}
              />
            </div>

            {/* Right: keyboard hints (desktop only) */}
            {currentItem && !isDirectionPairItem(currentItem) && (
              <div className="hidden lg:block">
                <KeyboardHintCompact hints={keyboardHints} />
              </div>
            )}
          </div>

          {/* Loading indicator for next batch */}
          {loading && (
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">Loading more {getFlushItemTypeLabel()}...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
