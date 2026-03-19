'use client';

/**
 * ConductorQABanner — Appears above Session Health when any conductor run
 * has pending questions (intent refinement or triage checkpoint).
 *
 * Clicking navigates to the Conductor module for full Q&A interaction.
 */

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageCircleQuestion, ArrowRight } from 'lucide-react';
import { useOnboardingStore } from '@/stores/onboardingStore';

interface ConductorQABannerProps {
  qaCount: number;
}

export const ConductorQABanner = memo(function ConductorQABanner({ qaCount }: ConductorQABannerProps) {
  const setActiveModule = useOnboardingStore((s) => s.setActiveModule);

  const navigateToConductor = useCallback(() => {
    setActiveModule('conductor');
  }, [setActiveModule]);

  if (qaCount === 0) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={navigateToConductor}
      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-orange-500/5 hover:from-amber-500/15 hover:to-orange-500/10 transition-all duration-200 group active:scale-[0.99]"
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/20">
          <MessageCircleQuestion className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-left">
          <span className="text-xs font-semibold text-amber-400">Conductor Q&A</span>
          <span className="ml-2 text-2xs text-amber-500/70">
            {qaCount} question{qaCount !== 1 ? 's' : ''} waiting for your input
          </span>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-amber-500/50 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
    </motion.button>
  );
});
