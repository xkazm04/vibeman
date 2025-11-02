'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { useDecisionQueueStore } from '@/stores/decisionQueueStore';
import { useBadgeStore } from '@/stores/badgeStore';

// Map decision types to badge IDs
const DECISION_BADGE_MAP: Record<string, string> = {
  'structure-scan': 'structure-strategist',
  'build-fix': 'build-scanner',
  'context-scan': 'context-curator',
  'build-scan': 'build-scanner',
  'photo-scan': 'visual-architect',
  'vision-scan': 'vision-keeper',
  'architecture-scan': 'architecture-explorer',
  'dependency-scan': 'dependency-detective',
  'documentation-scan': 'documentation-master',
  'snapshot-scan': 'snapshot-specialist',
  'goal-scan': 'goal-setter',
};

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
};

const SEVERITY_COLORS = {
  info: {
    bg: 'from-blue-600/40 to-cyan-500/40',
    border: 'border-cyan-500/50',
    text: 'text-cyan-300',
    glow: 'shadow-cyan-500/50',
  },
  warning: {
    bg: 'from-yellow-600/40 to-amber-500/40',
    border: 'border-yellow-500/50',
    text: 'text-yellow-300',
    glow: 'shadow-yellow-500/50',
  },
  error: {
    bg: 'from-red-600/40 to-rose-500/40',
    border: 'border-red-500/50',
    text: 'text-red-300',
    glow: 'shadow-red-500/50',
  },
};

export default function DecisionPanel() {
  const { currentDecision, isProcessing, acceptDecision, rejectDecision } = useDecisionQueueStore();
  const awardBadge = useBadgeStore((state) => state.awardBadge);

  // Enhanced accept handler that awards badges
  const handleAccept = async () => {
    if (!currentDecision) return;

    // Award badge based on decision type
    const badgeId = DECISION_BADGE_MAP[currentDecision.type];
    if (badgeId) {
      awardBadge(badgeId);
    }

    // Call original accept logic
    await acceptDecision();
  };

  if (!currentDecision) {
    return null;
  }

  const severity = currentDecision.severity || 'info';
  const colors = SEVERITY_COLORS[severity];
  const Icon = SEVERITY_ICONS[severity];

  // Check if this is a notification-only decision (no accept action needed)
  const isNotification = currentDecision.type.includes('error') ||
                         currentDecision.type.includes('notification') ||
                         currentDecision.type.includes('abort');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.9 }}
        transition={{
          type: 'spring',
          damping: 25,
          stiffness: 300,
        }}
        className="relative w-full max-w-5xl mx-auto"
      >
        {/* Main decision card */}
        <div className="relative bg-gray-900/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl">
          {/* Ambient glow based on severity */}
          <div
            className={`absolute inset-0 bg-gradient-to-r ${colors.bg} opacity-5 blur-2xl pointer-events-none`}
          />

          {/* Top accent line */}
          <div className={`h-1 bg-gradient-to-r ${colors.bg} opacity-60`} />

          {/* Content */}
          <div className="relative p-6">
            <div className="flex items-start gap-6">
              {/* Icon + Count Badge */}
              <div className="relative flex-shrink-0">
                {/* Icon circle */}
                <div className={`w-16 h-16 rounded-full border-2 ${colors.border} bg-gradient-to-br ${colors.bg} flex items-center justify-center`}>
                  <Icon className={`w-8 h-8 ${colors.text}`} />
                </div>

                {/* Count badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 500, damping: 20 }}
                  className={`absolute -bottom-2 -right-2 min-w-[2.5rem] h-10 px-3 rounded-full border-2 ${colors.border} bg-gray-950 flex items-center justify-center`}
                >
                  <span className={`text-lg font-bold font-mono ${colors.text}`}>
                    {currentDecision.count}
                  </span>
                </motion.div>

                {/* Pulsing outer ring */}
                <motion.div
                  className={`absolute inset-0 rounded-full border-2 ${colors.border}`}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`text-2xl font-bold ${colors.text} mb-2`}
                >
                  {currentDecision.title}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-sm text-gray-400"
                >
                  {currentDecision.description}
                </motion.p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {isNotification ? (
                  /* Close button for notifications */
                  <motion.button
                    onClick={rejectDecision}
                    disabled={isProcessing}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="group relative px-10 py-4 rounded-xl bg-gradient-to-r from-cyan-600/60 to-blue-500/60 hover:from-cyan-500/70 hover:to-blue-400/70 border-2 border-cyan-500/60 hover:border-cyan-400/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                  >
                    {/* Outer glow */}
                    <div className="absolute inset-0 rounded-xl bg-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

                    <div className="relative flex items-center gap-2">
                      <X className="w-5 h-5 text-white" />
                      <span className="text-sm font-bold tracking-wide text-white uppercase">
                        Close
                      </span>
                    </div>
                  </motion.button>
                ) : (
                  <>
                    {/* Reject button */}
                    <motion.button
                      onClick={rejectDecision}
                      disabled={isProcessing}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="group relative px-8 py-4 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 border-2 border-gray-600/50 hover:border-red-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 rounded-xl bg-red-500/0 group-hover:bg-red-500/10 blur-xl transition-all duration-300 -z-10" />

                      <div className="flex items-center gap-2">
                        <X className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
                        <span className="text-sm font-bold tracking-wide text-gray-300 group-hover:text-red-300 transition-colors uppercase">
                          Reject
                        </span>
                      </div>
                    </motion.button>

                    {/* Accept button */}
                    <motion.button
                      onClick={handleAccept}
                      disabled={isProcessing}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                      className="group relative px-10 py-4 rounded-xl bg-gradient-to-r from-green-600/60 to-emerald-500/60 hover:from-green-500/70 hover:to-emerald-400/70 border-2 border-green-500/60 hover:border-green-400/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
                      data-testid="decision-accept-btn"
                    >
                      {/* Outer glow */}
                      <div className="absolute inset-0 rounded-xl bg-green-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

                      {/* Shimmer effect */}
                      <motion.div
                        className="absolute inset-0 rounded-xl overflow-hidden"
                        animate={{
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                          backgroundSize: '200% 100%',
                        }}
                      />

                      <div className="relative flex items-center gap-2">
                        {isProcessing ? (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                          <Check className="w-5 h-5 text-white" />
                        )}
                        <span className="text-sm font-bold tracking-wide text-white uppercase">
                          {isProcessing ? 'Processing...' : 'Accept'}
                        </span>
                      </div>
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom accent line */}
          <div className={`h-0.5 bg-gradient-to-r ${colors.bg} opacity-40`} />
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-1 h-1 rounded-full bg-gradient-to-r ${colors.bg}`}
              animate={{
                x: [Math.random() * 100 + '%', Math.random() * 100 + '%'],
                y: ['100%', '-10%'],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeInOut',
              }}
              style={{
                left: `${20 + i * 30}%`,
              }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
