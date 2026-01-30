/**
 * ContextEmptyState
 *
 * Empty state shown when groups exist but no contexts are found.
 * Offers option to scan codebase for automatic context generation.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Scan, Boxes, ArrowRight, Sparkles } from 'lucide-react';
import { Caveat } from 'next/font/google';
import { ContextGenerationScanButton } from './ContextGenerationScanButton';

const caveat = Caveat({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

interface ContextEmptyStateProps {
  projectId: string;
  groupCount: number;
}

export const ContextEmptyState: React.FC<ContextEmptyStateProps> = ({
  projectId,
  groupCount,
}) => {
  return (
    <div className="relative py-16 px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-cyan-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 0.1 }}
          className="relative mb-6"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Boxes className="w-12 h-12 text-cyan-400" />
          </div>
          {/* Floating sparkle */}
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </motion.div>
        </motion.div>

        {/* Heading */}
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`${caveat.className} text-4xl font-bold text-white mb-3`}
        >
          Your groups are ready for contexts
        </motion.h3>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-400 mb-8 leading-relaxed"
        >
          You have {groupCount} context {groupCount === 1 ? 'group' : 'groups'} set up.
          Now let Claude analyze your codebase and automatically create contexts
          that map your business features, not just architecture layers.
        </motion.p>

        {/* Scan Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ContextGenerationScanButton projectId={projectId} />
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 grid grid-cols-3 gap-6 text-left"
        >
          {[
            {
              title: 'Business-First',
              description: 'Groups by user features, not code layers',
            },
            {
              title: 'Full Coverage',
              description: 'UI + Logic + API + Types in each context',
            },
            {
              title: 'Smart Grouping',
              description: 'Creates relationships between contexts',
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/50 hover:border-gray-600/50 transition-all duration-200 cursor-default"
            >
              <ArrowRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0 transition-transform group-hover:translate-x-0.5" />
              <div>
                <div className="text-sm font-medium text-white">{feature.title}</div>
                <div className="text-xs text-gray-500">{feature.description}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Alternative action */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-xs text-gray-500"
        >
          Or add contexts manually using the + button in each group
        </motion.p>
      </div>
    </div>
  );
};

export default ContextEmptyState;
