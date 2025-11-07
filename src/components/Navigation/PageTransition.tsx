'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

// Smooth easing curve constant
const SMOOTH_EASING = [0.22, 1, 0.36, 1] as const;

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.02,
  },
} as const;

const pageTransition = {
  type: 'tween' as const,
  ease: SMOOTH_EASING,
  duration: 0.4,
};

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen pt-16" // Add padding-top to account for fixed topbar
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}