'use client';

import { motion } from 'framer-motion';
import { transition, easing, fadeOnly } from '@/lib/motion';

interface LoadingOverlayProps {
  isVisible: boolean;
}

export default function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      variants={fadeOnly}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
      data-testid="loading-overlay"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: transition.deliberate.duration, ease: easing.entrance }}
        className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-8 flex flex-col items-center gap-4"
      >
        <motion.div
          className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p className="text-gray-300 text-sm font-light">Loading...</p>
      </motion.div>
    </motion.div>
  );
}