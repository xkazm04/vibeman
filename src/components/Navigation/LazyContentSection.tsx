'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LazyContentSectionProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

// Animation constants
const SMOOTH_EASING = [0.22, 1, 0.36, 1] as const;

export default function LazyContentSection({
  children,
  delay = 0,
  className = '',
}: LazyContentSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay,
        ease: SMOOTH_EASING,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}