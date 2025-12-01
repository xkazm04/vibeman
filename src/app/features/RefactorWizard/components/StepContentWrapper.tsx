'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StepContentWrapperProps {
  children: ReactNode;
  className?: string;
}

// Container animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

// Child item animation variants
const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24
    }
  }
};

export function StepContentWrapper({ children, className }: StepContentWrapperProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
      data-testid="step-content-wrapper"
    >
      {children}
    </motion.div>
  );
}

export function StepItem({ children, className }: StepContentWrapperProps) {
  return (
    <motion.div variants={itemVariants} className={className} data-testid="step-item">
      {children}
    </motion.div>
  );
}

// Pre-configured section components
export function StepHeader({ children }: { children: ReactNode }) {
  return (
    <StepItem className="mb-6">
      {children}
    </StepItem>
  );
}

export function StepCard({ children, className = '' }: StepContentWrapperProps) {
  return (
    <StepItem className={`rounded-xl border border-cyan-500/20 bg-gray-900/50 ${className}`}>
      {children}
    </StepItem>
  );
}

export function StepActions({ children }: { children: ReactNode }) {
  return (
    <StepItem className="flex gap-4 mt-6">
      {children}
    </StepItem>
  );
}

// Export variants for external use
export { containerVariants, itemVariants };
