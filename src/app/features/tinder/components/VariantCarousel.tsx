'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Sparkles, ChevronLeft, ChevronRight,
  Zap, Target, Rocket, Star,
} from 'lucide-react';
import type { IdeaVariant } from '../lib/variantApi';
import { generateVariants, getPreferredScope, recordScopeChoice } from '../lib/variantApi';
import {
  effortScale,
  impactScale,
  riskScale,
  EffortIcon,
  ImpactIcon,
  RiskIcon,
} from '@/app/features/Ideas/lib/ideaConfig';

interface VariantCarouselProps {
  ideaId: string;
  ideaCategory: string;
  /** Called when user selects a variant to accept */
  onSelectVariant: (variant: IdeaVariant) => void;
  /** Called to close/dismiss the carousel */
  onClose: () => void;
}

const SCOPE_CONFIG = {
  mvp: {
    icon: Zap,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgGradient: 'from-emerald-500/10 to-emerald-600/5',
    label: 'MVP',
    description: '~30% scope',
  },
  standard: {
    icon: Target,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    bgGradient: 'from-blue-500/10 to-blue-600/5',
    label: 'Standard',
    description: 'Original scope',
  },
  ambitious: {
    icon: Rocket,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgGradient: 'from-purple-500/10 to-purple-600/5',
    label: 'Ambitious',
    description: 'Extended scope',
  },
} as const;

export default function VariantCarousel({
  ideaId,
  ideaCategory,
  onSelectVariant,
  onClose,
}: VariantCarouselProps) {
  const [variants, setVariants] = useState<IdeaVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(1); // Start on Standard
  const [preferredScope, setPreferredScope] = useState<IdeaVariant['scope'] | null>(null);

  // Load variants on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const result = await generateVariants(ideaId);
      if (cancelled) return;

      if (result.error) {
        setError(result.error);
      } else {
        // Sort: mvp, standard, ambitious
        const ordered = ['mvp', 'standard', 'ambitious'];
        const sorted = [...result.variants].sort(
          (a, b) => ordered.indexOf(a.scope) - ordered.indexOf(b.scope)
        );
        setVariants(sorted);

        // Check for preferred scope
        const pref = getPreferredScope(ideaCategory);
        if (pref) {
          setPreferredScope(pref);
          const prefIdx = sorted.findIndex(v => v.scope === pref);
          if (prefIdx >= 0) setActiveIndex(prefIdx);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ideaId, ideaCategory]);

  const goLeft = useCallback(() => {
    setActiveIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goRight = useCallback(() => {
    setActiveIndex(prev => Math.min(variants.length - 1, prev + 1));
  }, [variants.length]);

  const handleSelect = useCallback((variant: IdeaVariant) => {
    recordScopeChoice(ideaCategory, variant.scope);
    onSelectVariant(variant);
  }, [ideaCategory, onSelectVariant]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goLeft(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goRight(); }
      else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'Enter' && variants[activeIndex]) {
        e.preventDefault();
        handleSelect(variants[activeIndex]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goLeft, goRight, onClose, handleSelect, variants, activeIndex]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-3 py-8"
      >
        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        <span className="text-sm text-gray-400 font-mono">GENERATING_VARIANTS...</span>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-6"
      >
        <p className="text-sm text-red-400 mb-2">{error}</p>
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Dismiss
        </button>
      </motion.div>
    );
  }

  if (variants.length === 0) return null;

  const activeVariant = variants[activeIndex];
  const scopeConf = SCOPE_CONFIG[activeVariant.scope];
  const ScopeIcon = scopeConf.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      {/* Scope indicator dots + preferred badge */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={goLeft}
          disabled={activeIndex === 0}
          className="p-1 rounded-md hover:bg-gray-800 disabled:opacity-30 transition-all"
          aria-label="Previous variant"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>

        <div className="flex items-center gap-2">
          {variants.map((v, i) => {
            const conf = SCOPE_CONFIG[v.scope];
            const isActive = i === activeIndex;
            return (
              <button
                key={v.scope}
                onClick={() => setActiveIndex(i)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono transition-all border ${
                  isActive
                    ? `${conf.bgGradient.replace('from-', 'bg-gradient-to-r from-')} ${conf.color} ${conf.borderColor}`
                    : 'bg-gray-800/40 text-gray-500 border-gray-700/30 hover:text-gray-300 hover:border-gray-600/50'
                }`}
                aria-label={`${conf.label} variant`}
              >
                {conf.label.toUpperCase()}
                {preferredScope === v.scope && (
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={goRight}
          disabled={activeIndex === variants.length - 1}
          className="p-1 rounded-md hover:bg-gray-800 disabled:opacity-30 transition-all"
          aria-label="Next variant"
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Active variant card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeVariant.scope}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className={`relative bg-gradient-to-br ${scopeConf.bgGradient} border ${scopeConf.borderColor} rounded-xl p-5 backdrop-blur-sm`}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className={`p-2 bg-gray-900/60 rounded-lg border ${scopeConf.borderColor}`}>
              <ScopeIcon className={`w-5 h-5 ${scopeConf.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-mono uppercase tracking-wider ${scopeConf.color}`}>
                  {scopeConf.label} — {scopeConf.description}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white leading-snug">
                {activeVariant.title}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-300 leading-relaxed mb-4">
            {activeVariant.description}
          </p>

          {/* Scores row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/40">
              <EffortIcon className={`w-3.5 h-3.5 ${effortScale.colorOf(activeVariant.effort)}`} />
              <div>
                <div className="text-[9px] text-gray-500 uppercase">Effort</div>
                <div className={`text-sm font-bold font-mono ${effortScale.colorOf(activeVariant.effort)}`}>
                  {activeVariant.effort}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/40">
              <ImpactIcon className={`w-3.5 h-3.5 ${impactScale.colorOf(activeVariant.impact)}`} />
              <div>
                <div className="text-[9px] text-gray-500 uppercase">Impact</div>
                <div className={`text-sm font-bold font-mono ${impactScale.colorOf(activeVariant.impact)}`}>
                  {activeVariant.impact}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/40">
              <RiskIcon className={`w-3.5 h-3.5 ${riskScale.colorOf(activeVariant.risk)}`} />
              <div>
                <div className="text-[9px] text-gray-500 uppercase">Risk</div>
                <div className={`text-sm font-bold font-mono ${riskScale.colorOf(activeVariant.risk)}`}>
                  {activeVariant.risk}
                </div>
              </div>
            </div>
          </div>

          {/* Reasoning */}
          {activeVariant.reasoning && (
            <p className="text-[11px] text-gray-500 italic mb-4">
              {activeVariant.reasoning}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelect(activeVariant)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all border ${scopeConf.borderColor} bg-gradient-to-r ${scopeConf.bgGradient} hover:brightness-125 ${scopeConf.color}`}
            >
              <Sparkles className="w-4 h-4" />
              Accept {scopeConf.label}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 border border-gray-700/40 bg-gray-800/40 hover:bg-gray-800/60 transition-all"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Keyboard hints */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600 font-mono">
        <span>← → Navigate</span>
        <span>ENTER Accept</span>
        <span>ESC Cancel</span>
      </div>
    </motion.div>
  );
}
