'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRefactorStore } from '@/stores/refactorStore';
import { Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';

const steps = [
  { id: 'settings', label: 'Settings' },
  { id: 'scan', label: 'Scan' },
  { id: 'config', label: 'Configure' },
  { id: 'review', label: 'Review' },
  { id: 'execute', label: 'Create' },
  { id: 'results', label: 'Summary' },
] as const;

// Confetti particle component
function ConfettiParticle({ delay }: { delay: number }) {
  const randomX = Math.random() * 200 - 100;
  const randomRotation = Math.random() * 360;
  const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color, left: '50%', top: '0%' }}
      initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0.5],
        x: randomX,
        y: [0, -50, -80, -120],
        rotate: randomRotation,
      }}
      transition={{
        duration: 1.5,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

export default function WizardProgress() {
  const { currentStep } = useRefactorStore();
  const [showConfetti, setShowConfetti] = useState(false);

  const currentIndex = steps.findIndex(s => s.id === currentStep);
  const progressPercent = ((currentIndex + 1) / steps.length) * 100;
  const isComplete = currentIndex === steps.length - 1;

  // Trigger confetti when reaching 100%
  useEffect(() => {
    if (isComplete && !showConfetti) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, showConfetti]);

  // Calculate rocket height (0 to 100% of container)
  const rocketHeight = progressPercent;

  // Calculate rocket intensity/glow based on stage
  const getRocketIntensity = () => {
    if (currentIndex === 0) return 'low'; // Settings - starting
    if (currentIndex === 1 || currentIndex === 2) return 'medium'; // Scan/Config - warming up
    if (currentIndex === 3) return 'medium'; // Review - cruising
    if (currentIndex >= 4) return 'high'; // Execute/Results - max thrust
    return 'low';
  };

  const intensity = getRocketIntensity();

  return (
    <div className="mt-6 relative" data-testid="wizard-progress">
      {/* Step Labels */}
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center flex-1"
              data-testid={`wizard-step-${step.id}`}
            >
              <span
                className={`text-xs font-light whitespace-nowrap transition-colors duration-300 ${
                  isCurrent
                    ? 'text-cyan-300 font-medium'
                    : isCompleted
                    ? 'text-cyan-500/70'
                    : 'text-gray-600'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rocket Launch Track */}
      <div className="relative h-20 bg-black/30 rounded-lg border border-gray-800/50 overflow-hidden">
        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(0deg, transparent 24%, rgba(6, 182, 212, .2) 25%, rgba(6, 182, 212, .2) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, .2) 75%, rgba(6, 182, 212, .2) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(6, 182, 212, .2) 25%, rgba(6, 182, 212, .2) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, .2) 75%, rgba(6, 182, 212, .2) 76%, transparent 77%, transparent)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Progress Fill */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10"
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        {/* Launch Trail */}
        <motion.div
          className="absolute top-0 bottom-0"
          style={{ left: `${Math.max(0, rocketHeight - 2)}%` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: intensity === 'low' ? 0.3 : intensity === 'medium' ? 0.6 : 0.8 }}
          transition={{ duration: 0.3 }}
        >
          <div className="h-full w-8 bg-gradient-to-r from-cyan-400/20 via-blue-400/10 to-transparent blur-sm" />
        </motion.div>

        {/* Rocket */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: `${Math.min(rocketHeight, 96)}%` }}
          animate={{
            y: [-2, 2, -2],
          }}
          transition={{
            duration: intensity === 'high' ? 0.3 : intensity === 'medium' ? 0.5 : 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          data-testid="wizard-rocket"
        >
          {/* Rocket Body with Glow */}
          <motion.div
            className="relative"
            animate={{
              scale: intensity === 'high' ? [1, 1.05, 1] : [1, 1.02, 1],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Glow Effect */}
            <motion.div
              className={`absolute inset-0 rounded-full blur-md ${
                intensity === 'high'
                  ? 'bg-cyan-400/60'
                  : intensity === 'medium'
                  ? 'bg-cyan-400/40'
                  : 'bg-cyan-400/20'
              }`}
              animate={{
                scale: [1, 1.3, 1],
                opacity: intensity === 'high' ? [0.6, 0.9, 0.6] : [0.4, 0.7, 0.4],
              }}
              transition={{
                duration: intensity === 'high' ? 0.4 : 0.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Rocket Icon */}
            <Rocket
              className={`relative w-8 h-8 ${
                intensity === 'high'
                  ? 'text-cyan-300'
                  : intensity === 'medium'
                  ? 'text-cyan-400'
                  : 'text-cyan-500'
              } drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]`}
              style={{ transform: 'rotate(-45deg)' }}
            />

            {/* Thrust Flames */}
            <AnimatePresence>
              {intensity !== 'low' && (
                <motion.div
                  className="absolute"
                  style={{ bottom: '-4px', right: '-4px' }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                >
                  {/* Flame particles */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className={`absolute w-2 h-2 rounded-full ${
                        i === 0
                          ? 'bg-orange-400'
                          : i === 1
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                      }`}
                      style={{
                        bottom: `${i * 3}px`,
                        right: `${i * 3}px`,
                      }}
                      animate={{
                        scale: [0.5, 1, 0.5],
                        opacity: [0.8, 1, 0.8],
                      }}
                      transition={{
                        duration: intensity === 'high' ? 0.2 : 0.4,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Confetti Celebration at 100% */}
        <AnimatePresence>
          {showConfetti && (
            <div
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${Math.min(rocketHeight, 96)}%` }}
              data-testid="wizard-confetti"
            >
              {[...Array(15)].map((_, i) => (
                <ConfettiParticle key={i} delay={i * 0.05} />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Progress Percentage Label */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <motion.span
            className="text-xs font-mono text-cyan-400/80"
            key={progressPercent}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {Math.round(progressPercent)}%
          </motion.span>
        </div>
      </div>
    </div>
  );
}
