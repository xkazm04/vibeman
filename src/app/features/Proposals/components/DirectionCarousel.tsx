'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, X, Code, Loader2, ChevronLeft, ChevronRight, Sparkles, MapPin, Zap, ChevronDown, ChevronUp, MessageCircleQuestion } from 'lucide-react';
import { DbDirection } from '@/app/db';
import { DirectionProposal, toDirectionProposal } from '../types';
import { explainDirection } from '@/app/features/Questions/lib/directionsApi';

// ─── Swipe threshold for accept/decline gestures ───────────────────
const SWIPE_THRESHOLD = 120;
const SWIPE_VELOCITY = 500;

interface DirectionCarouselProps {
  directions: DbDirection[];
  onAccept: (directionId: string) => void;
  onReject: (directionId: string) => void;
  onGenerateMore?: () => void;
  isLoading?: boolean;
}

export default function DirectionCarousel({
  directions,
  onAccept,
  onReject,
  onGenerateMore,
  isLoading = false,
}: DirectionCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedContent, setExpandedContent] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Only pending directions go into the carousel
  const proposals: DirectionProposal[] = useMemo(
    () => directions.filter(d => d.status === 'pending').map(toDirectionProposal),
    [directions]
  );

  const current = proposals[currentIndex] ?? null;
  const total = proposals.length;

  // ─── Swipe gesture ─────────────────────────────────────────────
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const acceptOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const declineOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const advance = useCallback(() => {
    setExplanation(null);
    setExpandedContent(false);
    if (currentIndex < total - 1) {
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, total]);

  const handleAccept = useCallback(async () => {
    if (!current || isProcessing) return;
    setIsProcessing(true);
    setExitDirection('right');
    onAccept(current.id);
    // Brief delay for exit animation
    await new Promise(r => setTimeout(r, 400));
    setExitDirection(null);
    setIsProcessing(false);
    advance();
  }, [current, isProcessing, onAccept, advance]);

  const handleReject = useCallback(async () => {
    if (!current || isProcessing) return;
    setIsProcessing(true);
    setExitDirection('left');
    onReject(current.id);
    await new Promise(r => setTimeout(r, 400));
    setExitDirection(null);
    setIsProcessing(false);
    advance();
  }, [current, isProcessing, onReject, advance]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY) {
      handleAccept();
    } else if (offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY) {
      handleReject();
    }
  }, [handleAccept, handleReject]);

  const handleExplainWhy = useCallback(async () => {
    if (!current || isExplaining) return;
    setIsExplaining(true);
    try {
      const result = await explainDirection(current.id);
      setExplanation(result.explanation);
    } catch {
      setExplanation('Unable to generate explanation at this time.');
    } finally {
      setIsExplaining(false);
    }
  }, [current, isExplaining]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setExplanation(null);
      setExpandedContent(false);
      setCurrentIndex(i => i - 1);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < total - 1) {
      setExplanation(null);
      setExpandedContent(false);
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, total]);

  // ─── Empty state ───────────────────────────────────────────────
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-800/40 border border-gray-700/30 flex items-center justify-center mb-4">
          <Sparkles className="w-7 h-7 text-gray-600" />
        </div>
        <p className="text-gray-400 text-sm mb-1">No pending directions to review</p>
        <p className="text-gray-500 text-xs mb-4">Generate some directions to start triaging</p>
        {onGenerateMore && (
          <button
            onClick={onGenerateMore}
            className="px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm font-medium hover:bg-purple-600/30 transition-colors"
          >
            Generate Directions
          </button>
        )}
      </div>
    );
  }

  // ─── Check if there's a paired direction ───────────────────────
  const pairedSibling = current?.pairId
    ? proposals.find(p => p.pairId === current.pairId && p.id !== current.id)
    : null;

  return (
    <div className="relative">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-mono">
            {currentIndex + 1} / {total}
          </span>
          <div className="flex gap-1">
            {proposals.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIndex(i); setExplanation(null); setExpandedContent(false); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex
                    ? 'bg-purple-400 scale-125'
                    : i < currentIndex
                      ? 'bg-gray-600'
                      : 'bg-gray-700/50'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="p-1.5 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === total - 1}
            className="p-1.5 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Swipe indicator overlays */}
      <div className="relative">
        <motion.div
          className="absolute inset-0 z-10 rounded-2xl border-2 border-green-500/50 bg-green-500/5 flex items-center justify-center pointer-events-none"
          style={{ opacity: acceptOpacity }}
        >
          <div className="px-6 py-2 rounded-xl bg-green-500/20 border border-green-500/40">
            <span className="text-green-400 font-bold text-lg">ACCEPT</span>
          </div>
        </motion.div>
        <motion.div
          className="absolute inset-0 z-10 rounded-2xl border-2 border-red-500/50 bg-red-500/5 flex items-center justify-center pointer-events-none"
          style={{ opacity: declineOpacity }}
        >
          <div className="px-6 py-2 rounded-xl bg-red-500/20 border border-red-500/40">
            <span className="text-red-400 font-bold text-lg">DECLINE</span>
          </div>
        </motion.div>

        {/* Card */}
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.id}
              className="relative cursor-grab active:cursor-grabbing touch-none"
              style={{ x, rotate }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={
                exitDirection === 'right'
                  ? { x: 400, opacity: 0, rotate: 15 }
                  : exitDirection === 'left'
                    ? { x: -400, opacity: 0, rotate: -15 }
                    : { opacity: 1, scale: 1, y: 0, x: 0 }
              }
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="relative bg-gradient-to-br from-gray-900/95 via-slate-900/40 to-blue-900/20 backdrop-blur-xl border border-gray-700/40 rounded-2xl shadow-2xl overflow-hidden">
                {/* Grid pattern */}
                <div
                  className="absolute inset-0 opacity-[0.03] rounded-2xl"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(99, 102, 241, 0.4) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(99, 102, 241, 0.4) 1px, transparent 1px)
                    `,
                    backgroundSize: '24px 24px'
                  }}
                />

                <div className="relative p-6">
                  {/* Context label + pair badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span className="text-[11px] text-cyan-300 font-medium">{current.contextLabel}</span>
                    </div>
                    {current.pairLabel && (
                      <div className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <span className="text-[11px] text-amber-300 font-medium">Variant {current.pairLabel}</span>
                      </div>
                    )}
                    {current.effort !== null && current.impact !== null && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-800/50 border border-gray-700/30">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="text-[10px] text-gray-300">E:{current.effort} I:{current.impact}</span>
                      </div>
                    )}
                  </div>

                  {/* Title / Summary */}
                  <h3 className="text-xl font-bold text-white leading-tight mb-3 font-mono">
                    {current.title}
                  </h3>

                  {/* Problem statement or rationale */}
                  {current.problemStatement && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                      <p className="text-xs text-amber-200/80 leading-relaxed">
                        {current.problemStatement}
                      </p>
                    </div>
                  )}

                  {/* Rationale snippet */}
                  <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4 backdrop-blur-sm mb-3">
                    <p className="text-sm text-gray-300 leading-relaxed font-mono">
                      {expandedContent
                        ? current.fullContent
                        : current.rationale + (current.fullContent.length > 250 ? '...' : '')}
                    </p>
                    {current.fullContent.length > 250 && (
                      <button
                        onClick={() => setExpandedContent(!expandedContent)}
                        className="mt-2 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        {expandedContent ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {expandedContent ? 'Show less' : 'Read full direction'}
                      </button>
                    )}
                  </div>

                  {/* Paired direction comparison */}
                  {pairedSibling && (
                    <div className="mb-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">
                          Alternative (Variant {pairedSibling.pairLabel})
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        <span className="text-indigo-300 font-medium">{pairedSibling.title}</span>
                        {' — '}
                        {pairedSibling.rationale.slice(0, 150)}...
                      </p>
                    </div>
                  )}

                  {/* Explain Why section */}
                  {explanation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs font-semibold text-purple-300">Why This Matters</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {explanation}
                      </p>
                    </motion.div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-2">
                    {/* Decline */}
                    <motion.button
                      onClick={handleReject}
                      disabled={isProcessing}
                      className="relative group p-3.5 bg-gradient-to-r from-red-500/15 to-orange-500/15 hover:from-red-500/25 hover:to-orange-500/25 rounded-xl border border-red-500/25 transition-all disabled:opacity-50"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isProcessing && exitDirection === 'left' ? (
                        <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
                      ) : (
                        <X className="w-6 h-6 text-red-400" />
                      )}
                    </motion.button>

                    {/* Middle: Explain Why */}
                    <motion.button
                      onClick={handleExplainWhy}
                      disabled={isExplaining || !!explanation}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/30 text-gray-400 hover:text-purple-300 hover:border-purple-500/30 transition-all disabled:opacity-50"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {isExplaining ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageCircleQuestion className="w-4 h-4" />
                      )}
                      <span className="text-xs font-medium">
                        {isExplaining ? 'Thinking...' : explanation ? 'Explained' : 'Explain Why'}
                      </span>
                    </motion.button>

                    {/* Right side: Accept with Code + Accept */}
                    <div className="flex gap-2">
                      <motion.button
                        onClick={handleAccept}
                        disabled={isProcessing}
                        className="relative group p-3.5 bg-gradient-to-r from-purple-500/15 to-violet-500/15 hover:from-purple-500/25 hover:to-violet-500/25 rounded-xl border border-purple-500/25 transition-all disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Accept with Code"
                      >
                        <Code className="w-6 h-6 text-purple-400" />
                      </motion.button>
                      <motion.button
                        onClick={handleAccept}
                        disabled={isProcessing}
                        className="relative group p-3.5 bg-gradient-to-r from-green-500/15 to-emerald-500/15 hover:from-green-500/25 hover:to-emerald-500/25 rounded-xl border border-green-500/25 transition-all disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Accept"
                      >
                        {isProcessing && exitDirection === 'right' ? (
                          <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                        ) : (
                          <Check className="w-6 h-6 text-green-400" />
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Swipe hint */}
                  <p className="text-center text-[10px] text-gray-600 mt-3 select-none">
                    Swipe right to accept, left to decline
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generate more button */}
      {onGenerateMore && currentIndex >= total - 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center mt-4"
        >
          <button
            onClick={onGenerateMore}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/15 border border-purple-500/25 text-purple-300 text-sm font-medium hover:bg-purple-600/25 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate More Directions
          </button>
        </motion.div>
      )}
    </div>
  );
}
