'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlowWrapperProps {
  children: ReactNode;
  isActive: boolean;
  className?: string;
}

export default function GlowWrapper({ children, isActive, className = '' }: GlowWrapperProps) {
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Radiating waves from center */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden"
        style={{ zIndex: -1 }}
      >
        {/* Wave 1 - Inner */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.4) 0%, rgba(59, 130, 246, 0.2) 30%, transparent 70%)',
          }}
          animate={{
            scale: [0.5, 1.4],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />

        {/* Wave 2 - Middle */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.3) 0%, rgba(59, 130, 246, 0.15) 35%, transparent 75%)',
          }}
          animate={{
            scale: [0.5, 1.4],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
            delay: 0.3,
          }}
        />

        {/* Wave 3 - Outer */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.2) 0%, rgba(59, 130, 246, 0.1) 40%, transparent 80%)',
          }}
          animate={{
            scale: [0.5, 1.4],
            opacity: [0.4, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
            delay: 0.6,
          }}
        />
      </motion.div>

      {/* Subtle border glow */}
      <motion.div
        className="absolute -inset-px rounded-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.5), rgba(59, 130, 246, 0.5), rgba(34, 211, 238, 0.5))',
          zIndex: -1,
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}
