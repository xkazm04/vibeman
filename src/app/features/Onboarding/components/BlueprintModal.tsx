'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import DarkBlueprint from '../sub_Blueprint/DarkBlueprintLayout';
import { useOnboardingStore } from '@/stores/onboardingStore';

interface BlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BlueprintModal({ isOpen, onClose }: BlueprintModalProps) {
  const { openControlPanel, closeBlueprint } = useOnboardingStore();

  const handleBackToGettingStarted = () => {
    closeBlueprint();
    openControlPanel();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with subtle grain texture */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
            }}
            onClick={onClose}
          />

          {/* Blueprint Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 200,
            }}
            className="fixed inset-8 z-50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with scan status */}
            <div className="relative mb-4 flex items-center justify-between">
              {/* Left - Back to Getting Started button */}
              <motion.button
                onClick={handleBackToGettingStarted}
                whileHover={{ scale: 1.05, x: -3 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900/80 backdrop-blur-xl border border-cyan-500/30 hover:border-cyan-400/50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-300">Getting Started</span>
              </motion.button>

              {/* Close button */}
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="p-3 rounded-full bg-gray-900/80 backdrop-blur-xl border border-white/10 hover:border-red-500/50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-red-400 transition-colors" />
              </motion.button>
            </div>

            {/* Blueprint Content */}
            <div className="flex-1 relative overflow-hidden rounded-2xl border-2 border-white/10 shadow-2xl">
              <DarkBlueprint />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
