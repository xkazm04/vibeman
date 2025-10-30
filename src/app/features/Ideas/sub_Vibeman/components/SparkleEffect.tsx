'use client';
import React from 'react';
import { motion } from 'framer-motion';

interface SparkleEffectProps {
  trigger: number; // Changes when effect should play
}

const Sparkle = ({ delay, angle }: { delay: number; angle: number }) => {
  const radians = (angle * Math.PI) / 180;
  const distance = 15 + Math.random() * 10;
  const x = Math.cos(radians) * distance;
  const y = Math.sin(radians) * distance;

  return (
    <motion.div
      className="absolute w-1 h-1 bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 rounded-full"
      initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [0, x],
        y: [0, y],
        scale: [0, 1.5, 0.5, 0],
      }}
      transition={{
        duration: 0.6,
        delay,
        ease: 'easeOut',
      }}
      style={{
        filter: 'blur(0.5px)',
      }}
    />
  );
};

export default function SparkleEffect({ trigger }: SparkleEffectProps) {
  // Generate sparkles at different angles
  const sparkles = React.useMemo(() => {
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    return angles.map((angle, i) => (
      <Sparkle key={`${trigger}-${i}`} delay={i * 0.03} angle={angle} />
    ));
  }, [trigger]);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {sparkles}
    </div>
  );
}
