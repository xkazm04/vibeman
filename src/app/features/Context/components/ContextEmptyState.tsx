/**
 * ContextEmptyState
 *
 * Empty state shown when groups exist but no contexts are found.
 * Composes the unified EmptyState component with context-specific
 * scan button and feature highlights.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Boxes, ArrowRight } from 'lucide-react';
import { transition, hover as hoverPresets, fadeSlideUp } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import EmptyState from '@/components/ui/EmptyState';
import { ContextGenerationScanButton } from './ContextGenerationScanButton';

interface ContextEmptyStateProps {
  projectId: string;
  groupCount: number;
}

const features = [
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
];

export const ContextEmptyState: React.FC<ContextEmptyStateProps> = ({
  projectId,
  groupCount,
}) => {
  const prefersReduced = useReducedMotion();
  return (
    <div className="relative py-16 px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-cyan-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Core empty state */}
        <EmptyState
          icon={Boxes}
          title="Your groups are ready for contexts"
          description={`You have ${groupCount} context ${groupCount === 1 ? 'group' : 'groups'} set up. Now let Claude analyze your codebase and automatically create contexts that map your business features, not just architecture layers.`}
          className="py-0"
        />

        {/* Scan Button */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transition.deliberate, delay: prefersReduced ? 0 : 0.4 }}
        >
          <ContextGenerationScanButton projectId={projectId} />
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...transition.normal, delay: prefersReduced ? 0 : 0.6 }}
          className="mt-10 grid grid-cols-3 gap-6 text-left"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={prefersReduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition.deliberate, delay: prefersReduced ? 0 : 0.7 + index * 0.1 }}
              whileHover={!prefersReduced ? hoverPresets.button : undefined}
              className="flex items-start gap-3 p-4 rounded-xl bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/50 hover:border-gray-600/50 transition-all duration-200 cursor-default"
            >
              <ArrowRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
              <div>
                <div className="text-sm font-medium text-white">{feature.title}</div>
                <div className="text-xs text-gray-500">{feature.description}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Alternative action */}
        <motion.p
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...transition.normal, delay: prefersReduced ? 0 : 0.8 }}
          className="mt-8 text-xs text-gray-500"
        >
          Or add contexts manually using the + button in each group
        </motion.p>
      </div>
    </div>
  );
};

export default ContextEmptyState;
