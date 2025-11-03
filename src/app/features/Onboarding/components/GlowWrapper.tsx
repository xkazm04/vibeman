'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlowWrapperProps {
  children: ReactNode;
  isActive: boolean;
  className?: string;
}

interface WaveProps {
  background: string;
  delay?: number;
  startOpacity: number;
}

const Wave = ({ background, delay = 0, startOpacity }: WaveProps) => (
  <motion.div
    className="absolute inset-0"
    style={{ background }}
    animate={{
      scale: [0.5, 1.4],
      opacity: [startOpacity, 0],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'easeOut',
      delay,
    }}
  />
);

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
        <Wave
          background="radial-gradient(circle at center, rgba(34, 211, 238, 0.4) 0%, rgba(59, 130, 246, 0.2) 30%, transparent 70%)"
          startOpacity={0.8}
        />
        <Wave
          background="radial-gradient(circle at center, rgba(34, 211, 238, 0.3) 0%, rgba(59, 130, 246, 0.15) 35%, transparent 75%)"
          delay={0.3}
          startOpacity={0.6}
        />
        <Wave
          background="radial-gradient(circle at center, rgba(34, 211, 238, 0.2) 0%, rgba(59, 130, 246, 0.1) 40%, transparent 80%)"
          delay={0.6}
          startOpacity={0.4}
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
