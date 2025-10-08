'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

const AnnetteBackground = () => {
  // Memoize particle positions to prevent recalculation on every render
  const particlePositions = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 4 + Math.random() * 4,
      xOffset: Math.random() * 60 - 30,
    })), []
  );

  // Optimized transition settings to reduce GPU load
  const orbTransition = {
    ease: "easeInOut",
    times: [0, 0.5, 1], // Simplified keyframes
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Primary Orbs - Reduced complexity */}
      <motion.div
        className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-500/15 to-cyan-500/8 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 30, 0],
          y: [0, -15, 0],
        }}
        transition={{ duration: 16, repeat: Infinity, ...orbTransition }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-500/15 to-pink-500/8 rounded-full blur-3xl"
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.4, 0.2, 0.4],
          x: [0, -25, 0],
          y: [0, 20, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ...orbTransition }}
      />

      {/* Secondary Orbs - Simplified animations */}
      <motion.div
        className="absolute top-1/3 left-1/4 w-48 h-48 bg-gradient-to-br from-cyan-500/12 to-blue-500/8 rounded-full blur-2xl"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-gradient-to-br from-violet-500/12 to-indigo-500/8 rounded-full blur-2xl"
        animate={{
          scale: [0.9, 1.2, 0.9],
          opacity: [0.15, 0.4, 0.15],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Optimized Neural Particles - Reduced count and complexity */}
      {particlePositions.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
          }}
          animate={{
            y: [0, -120, 0],
            x: [0, particle.xOffset, 0],
            opacity: [0, 0.8, 0],
            scale: [0, 1.2, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
            repeatDelay: 1, // Add delay between cycles to reduce constant animation
          }}
        />
      ))}

      {/* Optimized Neural Grid Pattern - Slower animation */}
      <motion.div
        className="absolute inset-0 opacity-3"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px', // Larger grid for better performance
          willChange: 'background-position', // Optimize for animation
        }}
        animate={{
          backgroundPosition: ['0px 0px', '50px 50px'],
        }}
        transition={{
          duration: 40, // Slower animation
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
};

export default AnnetteBackground;