import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedCardProps {
  index: number;
  children: React.ReactNode;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ index, children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-4 rounded-lg bg-gray-800/30 border border-gray-700/20 hover:border-gray-600/40 transition-colors"
    >
      {children}
    </motion.div>
  );
};
