/**
 * ManagerCardGrid Component
 * Grid view for displaying implementation log cards with animation support
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import ImplementationLogCard from './ImplementationLogCard';
import type { EnrichedImplementationLog } from '../lib/types';

interface ManagerCardGridProps {
  logs: EnrichedImplementationLog[];
  onLogClick: (log: EnrichedImplementationLog) => void;
  isFiltered?: boolean;
}

export default function ManagerCardGrid({
  logs,
  onLogClick,
  isFiltered = false
}: ManagerCardGridProps) {
  return (
    <motion.div
      layout
      className={isFiltered
        ? "flex flex-col gap-3 overflow-y-auto h-full p-4"
        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      }
      data-testid="manager-card-grid"
    >
      <AnimatePresence mode="popLayout">
        {logs.map((log, index) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ delay: index * 0.02 }}
          >
            <ImplementationLogCard
              log={log}
              index={index}
              onClick={() => onLogClick(log)}
              compact={isFiltered}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
