'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield } from 'lucide-react';
import { useDebtPredictionStore } from '@/stores/debtPredictionStore';
import DebtPredictionDashboard from './components/DebtPredictionDashboard';

interface DebtPredictionLayoutProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DebtPredictionLayout({
  isOpen,
  onClose,
}: DebtPredictionLayoutProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          data-testid="debt-prediction-modal"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-7xl h-[90vh] bg-gray-900/90 backdrop-blur-xl border border-cyan-500/20 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col relative"
          >
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-blue-500/5 pointer-events-none" />

            {/* Animated Grid Pattern */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-hidden">
              <DebtPredictionDashboard />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 group p-2 hover:bg-white/5 rounded-full transition-colors"
              data-testid="close-debt-prediction"
            >
              <X className="w-6 h-6 text-cyan-400/60 group-hover:text-cyan-400 transition-colors" />
              <span className="sr-only">Close</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
