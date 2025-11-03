'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface WizardStepContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * WizardStepContainer - Animated container for wizard steps
 *
 * Provides consistent fade-in/fade-out animations for wizard step transitions
 */
export default function WizardStepContainer({ children, className = '' }: WizardStepContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`space-y-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}
