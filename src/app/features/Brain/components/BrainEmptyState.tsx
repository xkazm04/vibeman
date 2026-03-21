'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface BrainEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function BrainEmptyState({ icon, title, description, action }: BrainEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
      className="flex flex-col items-center gap-3"
    >
      <motion.div
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {icon}
      </motion.div>
      <h3 className="text-lg font-medium text-zinc-400">{title}</h3>
      <p className="text-sm text-zinc-600 max-w-sm text-center">{description}</p>
      {action && <div className="mt-1">{action}</div>}
    </motion.div>
  );
}
