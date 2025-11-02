'use client';

import { motion } from 'framer-motion';
import { Caveat } from 'next/font/google';
import { StarterBlueprintProps } from '../lib/types';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

/**
 * Blueprint Access Button Component
 * Hand-written style button to open the full Blueprint view
 */
export default function StarterBlueprint({ onOpenBlueprint }: StarterBlueprintProps) {
  return (
    <>
      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.8 }}
        className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent my-8"
      />

      {/* Blueprint Access Button - Hand-written style */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onOpenBlueprint}
        data-testid="blueprint-access-button"
        className="group relative w-full py-8 flex items-center justify-center"
      >
        {/* Hand-written text */}
        <div className="relative">
          <motion.h2
            className={`${caveat.className} text-6xl font-bold text-cyan-300/80 group-hover:text-cyan-200 transition-all duration-300`}
            style={{
              textShadow: '0 0 20px rgba(34, 211, 238, 0.3)',
              transform: 'rotate(-2deg)',
            }}
            whileHover={{
              textShadow: '0 0 30px rgba(34, 211, 238, 0.6)',
              letterSpacing: '0.05em',
            }}
          >
            BLUEPRINT
          </motion.h2>

          {/* Underline accent */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent origin-left"
            style={{
              transform: 'rotate(-1deg)',
            }}
          />
        </div>

        {/* Animated arrow */}
        <motion.div
          animate={{ x: [0, 8, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute right-8 text-4xl text-cyan-400/60 group-hover:text-cyan-400 transition-colors"
        >
          →
        </motion.div>

        {/* Glow effect on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent rounded-xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />
      </motion.button>
    </>
  );
}
