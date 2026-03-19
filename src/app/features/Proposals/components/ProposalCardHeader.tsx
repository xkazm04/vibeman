'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ProposalCardHeaderProps {
  isMain?: boolean;
}

export const ProposalCardHeader = React.memo(({ isMain = false }: ProposalCardHeaderProps) => {
  const reducedMotion = useReducedMotion();

  if (!isMain) return null;

  return (
    <div className="text-center mb-8">
      <motion.div
        className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-cyan-500/30"
        animate={reducedMotion ? undefined : {
          boxShadow: [
            '0 0 0 rgba(6, 182, 212, 0)',
            '0 0 30px rgba(6, 182, 212, 0.4)',
            '0 0 0 rgba(6, 182, 212, 0)'
          ]
        }}
        transition={reducedMotion ? undefined : { duration: 2, repeat: Infinity }}
      >
        {reducedMotion ? (
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
        ) : (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full"
          />
        )}
      </motion.div>

      <motion.h2
        className="text-sm font-bold bg-gradient-to-r from-cyan-400 via-slate-400 to-blue-400 bg-clip-text text-transparent font-mono uppercase tracking-wider"
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { delay: 0.2 }}
      >
        New Proposal
      </motion.h2>
    </div>
  );
});

ProposalCardHeader.displayName = 'ProposalCardHeader';


