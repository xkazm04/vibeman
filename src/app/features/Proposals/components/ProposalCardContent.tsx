'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ProposalCardContentProps {
  title: string;
  rationale: string;
  isMain?: boolean;
}

export const ProposalCardContent = React.memo(({ 
  title, 
  rationale, 
  isMain = false 
}: ProposalCardContentProps) => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className={`font-bold text-white leading-tight font-mono ${isMain ? 'text-2xl' : 'text-xl'}`}>
          {title}
        </h3>
      </motion.div>

      {/* Rationale */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gray-800/30 border border-gray-700/30 rounded-2xl p-6 backdrop-blur-sm"
      >
        <p className={`text-gray-300 leading-relaxed font-mono ${isMain ? 'text-sm' : 'text-sm'}`}>
          {rationale}
        </p>
      </motion.div>
    </div>
  );
});

ProposalCardContent.displayName = 'ProposalCardContent';


