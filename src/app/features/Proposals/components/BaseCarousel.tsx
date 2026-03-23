'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { transitions } from '@/lib/design-tokens';
import type { CarouselState, CarouselActions } from '../lib/useCarousel';
import type { CarouselItem } from '../lib/useCarousel';

// ─── Progress Dots ──────────────────────────────────────────────────

interface ProgressDotsProps {
  total: number;
  currentIndex: number;
  onDotClick?: (index: number) => void;
  activeColor?: string;
}

export const ProgressDots = React.memo(({
  total,
  currentIndex,
  onDotClick,
  activeColor = 'bg-purple-400',
}: ProgressDotsProps) => (
  <div className="flex gap-1">
    {Array.from({ length: total }).map((_, i) => (
      <button
        key={i}
        onClick={() => onDotClick?.(i)}
        className={`w-2 h-2 rounded-full ${transitions.normal} ${
          i === currentIndex
            ? `${activeColor} scale-125`
            : i < currentIndex
              ? 'bg-gray-600'
              : 'bg-gray-700/50'
        }`}
      />
    ))}
  </div>
));
ProgressDots.displayName = 'ProgressDots';

// ─── Progress Bar (counter + dots + nav arrows) ─────────────────────

interface ProgressBarProps {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onDotClick?: (index: number) => void;
  activeColor?: string;
}

export const ProgressBar = React.memo(({
  currentIndex,
  total,
  onPrev,
  onNext,
  onDotClick,
  activeColor,
}: ProgressBarProps) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-400 font-mono">
        {currentIndex + 1} / {total}
      </span>
      <ProgressDots
        total={total}
        currentIndex={currentIndex}
        onDotClick={onDotClick}
        activeColor={activeColor}
      />
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        disabled={currentIndex === 0}
        className={`p-1.5 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white disabled:opacity-30 ${transitions.colors}`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={onNext}
        disabled={currentIndex === total - 1}
        className={`p-1.5 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white disabled:opacity-30 ${transitions.colors}`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </div>
));
ProgressBar.displayName = 'ProgressBar';

// ─── Keyboard-navigable carousel container ──────────────────────────

interface CarouselContainerProps<T extends CarouselItem> {
  state: CarouselState<T>;
  actions: CarouselActions;
  /** Allow prev/next via arrow keys (default true) */
  arrowNav?: boolean;
  /** aria-label for the region */
  label?: string;
  children: React.ReactNode;
  className?: string;
  /** Additional keydown handler for consumer-specific keys */
  onExtraKeyDown?: (e: React.KeyboardEvent) => void;
}

function CarouselContainerInner<T extends CarouselItem>({
  state,
  actions,
  arrowNav = true,
  label = 'Carousel',
  children,
  className = '',
  onExtraKeyDown,
}: CarouselContainerProps<T>, ref: React.ForwardedRef<HTMLDivElement>) {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (ref as React.RefObject<HTMLDivElement>) ?? internalRef;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (state.isProcessing) return;
    switch (e.key) {
      case 'ArrowLeft':
        if (arrowNav) { e.preventDefault(); actions.goToPrev(); }
        break;
      case 'ArrowRight':
        if (arrowNav) { e.preventDefault(); actions.goToNext(); }
        break;
      case 'Enter':
        e.preventDefault();
        actions.accept();
        break;
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        actions.decline();
        break;
      default:
        onExtraKeyDown?.(e);
    }
  }, [state.isProcessing, arrowNav, actions, onExtraKeyDown]);

  useEffect(() => {
    containerRef.current?.focus();
  }, [containerRef]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`relative outline-none ${className}`}
      role="region"
      aria-label={label}
      aria-roledescription="carousel"
    >
      {children}
    </div>
  );
}

export const CarouselContainer = React.forwardRef(CarouselContainerInner) as <T extends CarouselItem>(
  props: CarouselContainerProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement | null;

// ─── Keyboard hint overlay ──────────────────────────────────────────

interface KeyboardHintProps {
  visible: boolean;
}

export const KeyboardHint = React.memo(({ visible }: KeyboardHintProps) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-800/90 border border-gray-600/40 backdrop-blur-sm shadow-lg"
      >
        <span className="flex items-center gap-1 text-xs text-gray-300">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-700 border border-gray-600 text-2xs font-mono">&larr;</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-gray-700 border border-gray-600 text-2xs font-mono">&rarr;</kbd>
          <span className="ml-1">Navigate</span>
        </span>
        <span className="text-gray-600">|</span>
        <span className="flex items-center gap-1 text-xs text-gray-300">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-700 border border-gray-600 text-2xs font-mono">Enter</kbd>
          <span className="ml-1">Accept</span>
        </span>
        <span className="text-gray-600">|</span>
        <span className="flex items-center gap-1 text-xs text-gray-300">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-700 border border-gray-600 text-2xs font-mono">Del</kbd>
          <span className="ml-1">Decline</span>
        </span>
      </motion.div>
    )}
  </AnimatePresence>
));
KeyboardHint.displayName = 'KeyboardHint';
